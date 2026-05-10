import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FmModules } from 'src/entities/entities/FmModules';
import { FmRelationModule } from 'src/entities/entities/FmRelationModule';
import { FmRolePermissions } from 'src/entities/entities/FmRolePermissions';
import { FleetManagerUsers } from 'src/entities/entities/FleetManagerUsers';
import { FleetManagerUsersRole } from 'src/entities/entities/FleetManagerUsersRole';
import { AddFMRoleDto } from './dto/add_FMRole.dto';
import {
  TRUE_RECURSIVE_RELATION_QUERY,
  FALSE_RECURSIVE_RELATION_QUERY,
} from './fm_recursive_permissions.query';

@Injectable()
export class FM_RBACService {
  constructor(
    @InjectRepository(FmModules)
    private readonly moduleRepo: Repository<FmModules>,

    @InjectRepository(FmRelationModule)
    private readonly relationRepo: Repository<FmRelationModule>,

    @InjectRepository(FmRolePermissions)
    private readonly permissionRepo: Repository<FmRolePermissions>,

    @InjectRepository(FleetManagerUsersRole)
    private readonly roleRepo: Repository<FleetManagerUsersRole>,

    @InjectRepository(FleetManagerUsers)
    private readonly adminRepo: Repository<FleetManagerUsers>,
  ) {}

  private sortModulesById(modules: any[]): any[] {
    return modules
      .sort((a, b) => a.id - b.id)
      .map((module) => {
        const sortedChildren = module.children
          ? this.sortModulesById(module.children)
          : [];

        const { children, ...rest } = module;
        return sortedChildren.length > 0
          ? { ...rest, children: sortedChildren }
          : { ...rest };
      });
  }

  async getRoles(fleet_id: number) {
    return await this.roleRepo.find({
      where: { fleetManager: { id: fleet_id } },
    });
  }

  async editRole(id: number, roleDto: AddFMRoleDto) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found.');
    }
    const roleExists = await this.roleRepo.findOne({
      where: {
        roleName: roleDto.role_name,
        fleetManager: { id: roleDto.fleet_id },
      },
    });
    if (roleExists) {
      throw new ConflictException('Role name already exists.');
    }
    role.roleName = roleDto.role_name;
    return await this.roleRepo.save(role);
  }

  async deleteRole(id: number, fleet_id: number) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    if (role.roleName?.toLowerCase() === 'superadmin') {
      throw new ForbiddenException('Cannot delete SuperAdmin role.');
    }

    // Step 1: Delete all role_permissions linked to this role
    await this.permissionRepo.delete({ role: { id }, fleet: { id: fleet_id } });

    // Step 2: Delete the role
    return await this.roleRepo.remove(role);
  }

  async addRole(roleDto: AddFMRoleDto) {
    const roleExists = await this.roleRepo.findOne({
      where: {
        roleName: roleDto.role_name,
        fleetManager: { id: roleDto.fleet_id },
      },
    });
    if (roleExists) {
      throw new ConflictException('Role name already exists.');
    }

    // Step 1: Create the role
    const role = this.roleRepo.create({
      roleName: roleDto.role_name,
      fleetManager: { id: roleDto.fleet_id },
    });
    const savedRole = await this.roleRepo.save(role);

    // Step 2: Fetch all relation_ids from relation_module
    const allRelations = await this.relationRepo.find(); // assuming this is your RelationModule repository

    // Step 3: Create default role_permission records
    const defaultPermissions = allRelations.map((rel) =>
      this.permissionRepo.create({
        role: savedRole,
        relation: rel,
        isEnable: false,
        fleet: { id: roleDto.fleet_id },
      }),
    );

    // Step 4: Save in bulk
    await this.permissionRepo.save(defaultPermissions);

    return {
      message: 'Role created with default false permissions.',
      id: savedRole.id,
      name: savedRole.roleName,
      permissionsCreated: defaultPermissions.length,
    };
  }

  async assignPermissions(
    roleId: number,
    fleetId: number,
    moduleId: number,
    isEnable: boolean,
    currentUser: FleetManagerUsers,
  ) {
    let relationIdsResult: { id: number }[] = [];

    // Always include direct relations
    const baseRelations = await this.relationRepo.query(
      `SELECT id FROM fm_relation_module WHERE parent_module_id = $1 OR child_module_id = $1`,
      [moduleId],
    );

    // Recursive get relation IDs (bottom to top + top to bottom)
    if (isEnable) {
      relationIdsResult = await this.relationRepo.query(
        TRUE_RECURSIVE_RELATION_QUERY,
        [moduleId],
      );
    } else {
      const recursiveResult = await this.relationRepo.query(
        FALSE_RECURSIVE_RELATION_QUERY,
        [moduleId],
      );
      relationIdsResult = [...recursiveResult, ...baseRelations];
    }

    const relationIds = Array.from(new Set(relationIdsResult.map((r) => r.id)));

    // Only update records (no insert logic)
    const result = await this.permissionRepo
      .createQueryBuilder()
      .update(FmRolePermissions)
      .set({ isEnable })
      .where('relation_id IN (:...ids)', { ids: relationIds })
      .andWhere('role_id = :roleId', { roleId })
      .andWhere('fleet_id = :fleetId', { fleetId })
      .execute();

    // Optional: return updated permission matrix for UI
    const updatedMatrix = await this.getModulesByRole(roleId, fleetId);

    return {
      message: `Permissions ${isEnable ? 'enabled' : 'disabled'} for role`,
      moduleId,
      totalUpdated: relationIds.length,
      updatedMatrix,
    };
  }

  async getModulesByRole(roleId: number, fleetId: number) {
    const isSuperAdmin = roleId === 1;

    const permissions = isSuperAdmin
      ? await this.permissionRepo.find({
          where: { fleet: { id: fleetId } },
          relations: [
            'relation',
            'relation.parentModule',
            'relation.childModule',
            'role',
          ],
        })
      : await this.permissionRepo.find({
          where: { roleId: roleId, fleet: { id: fleetId } },
          relations: [
            'relation',
            'relation.parentModule',
            'relation.childModule',
            'role',
          ],
        });

    const moduleMap = new Map<number, any>();
    const childToParentMap = new Map<number, number>();

    for (const perm of permissions) {
      const rel = perm.relation;
      const parent = rel.parentModule;
      const child = rel.childModule;

      if (!parent) continue;

      // Parent add/update
      if (!moduleMap.has(parent.id)) {
        moduleMap.set(parent.id, {
          id: parent.id,
          name: parent.moduleName,
          is_enable: perm.isEnable,
          ...(child ? { children: [] } : {}),
        });
      } else if (perm.isEnable) {
        moduleMap.get(parent.id).is_enable ||= true;
      }

      // Child add/update
      if (child) {
        if (!moduleMap.has(child.id)) {
          moduleMap.set(child.id, {
            id: child.id,
            name: child.moduleName,
            is_enable: perm.isEnable,
          });
        } else if (perm.isEnable) {
          moduleMap.get(child.id).is_enable ||= true;
        }

        childToParentMap.set(child.id, parent.id);

        //  Force parent to true if child is true
        if (perm.isEnable) {
          const parentModule = moduleMap.get(parent.id);
          if (parentModule) {
            parentModule.is_enable = true;
          }
        }
      }
    }

    // Nesting children into parents
    for (const [childId, parentId] of childToParentMap.entries()) {
      const parent = moduleMap.get(parentId);
      const child = moduleMap.get(childId);
      if (parent && child) {
        if (!parent.children) parent.children = [];
        parent.children.push(child);
      }
    }

    const allChildIds = new Set(childToParentMap.keys());
    const roots = [...moduleMap.values()].filter(
      (mod) => !allChildIds.has(mod.id),
    );

    return this.sortModulesById(roots);
  }

  async getAllRolesPermissionMatrix() {
    const roles = await this.roleRepo.find();

    const results: { role_id: number; role_name: string; modules: any[] }[] =
      [];

    for (const role of roles) {
      results.push({
        role_id: role.id,
        role_name: role.roleName ?? '',
        modules: await this.getModulesByRole(role.id, role.fleetManager.id),
      });
    }
    return results;
  }
}
