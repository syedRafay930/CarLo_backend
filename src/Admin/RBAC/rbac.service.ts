import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Modules } from 'src/entities/entities/Modules';
import { RelationModule } from 'src/entities/entities/RelationModule';
import { RolePermissions } from 'src/entities/entities/RolePermissions';
import { AdminRole } from 'src/entities/entities/AdminRole';
import { Admin } from 'src/entities/entities/Admin';
import { AddRoleDto } from './dto/add_adminRole.dto';
import {
  TRUE_RECURSIVE_RELATION_QUERY,
  FALSE_RECURSIVE_RELATION_QUERY,
} from './recursive_permissions.query';

@Injectable()
export class RBACService {
  constructor(
    @InjectRepository(Modules)
    private readonly moduleRepo: Repository<Modules>,

    @InjectRepository(RelationModule)
    private readonly relationRepo: Repository<RelationModule>,

    @InjectRepository(RolePermissions)
    private readonly permissionRepo: Repository<RolePermissions>,

    @InjectRepository(AdminRole)
    private readonly roleRepo: Repository<AdminRole>,

    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
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

  async getRoles() {
    return await this.roleRepo.find();
  }

  async editRole(id: number, roleDto: AddRoleDto) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found.');
    }
    const roleExists = await this.roleRepo.findOne({
      where: { name: roleDto.role_name },
    });
    if (roleExists) {
      throw new ConflictException('Role name already exists.');
    }
    role.name = roleDto.role_name;
    return await this.roleRepo.save(role);
  }

  async deleteRole(id: number) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    if (role.name.toLowerCase() === 'superadmin') {
      throw new ForbiddenException('Cannot delete SuperAdmin role.');
    }

    // Step 1: Delete all role_permissions linked to this role
    await this.permissionRepo.delete({ role: { id } });

    // Step 2: Delete the role
    return await this.roleRepo.remove(role);
  }

  async addRole(roleDto: AddRoleDto) {
    const roleExists = await this.roleRepo.findOne({
      where: { name: roleDto.role_name },
    });
    if (roleExists) {
      throw new ConflictException('Role name already exists.');
    }

    // Step 1: Create the role
    const role = this.roleRepo.create({ name: roleDto.role_name });
    const savedRole = await this.roleRepo.save(role);

    // Step 2: Fetch all relation_ids from relation_module
    const allRelations = await this.relationRepo.find(); // assuming this is your RelationModule repository

    // Step 3: Create default role_permission records
    const defaultPermissions = allRelations.map((rel) =>
      this.permissionRepo.create({
        role: savedRole,
        relation: rel,
        isEnable: false,
      }),
    );

    // Step 4: Save in bulk
    await this.permissionRepo.save(defaultPermissions);

    return {
      message: 'Role created with default false permissions.',
      id: savedRole.id,
      name: savedRole.name,
      permissionsCreated: defaultPermissions.length,
    };
  }

  async assignPermissions(
    roleId: number,
    moduleId: number,
    isEnable: boolean,
    currentUser: Admin,
  ) {
    let relationIdsResult: { id: number }[] = [];

    // Always include direct relations
    const baseRelations = await this.relationRepo.query(
      `SELECT id FROM relation_module WHERE parent_module_id = $1 OR child_module_id = $1`,
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
      .update(RolePermissions)
      .set({ isEnable })
      .where('relation_id IN (:...ids)', { ids: relationIds })
      .andWhere('role_id = :roleId', { roleId })
      .execute();

    // Optional: return updated permission matrix for UI
    const updatedMatrix = await this.getModulesByRole(roleId);

    return {
      message: `Permissions ${isEnable ? 'enabled' : 'disabled'} for role`,
      moduleId,
      totalUpdated: relationIds.length,
      updatedMatrix,
    };
  }

  async getModulesByRole(roleId: number) {
    const isSuperAdmin = roleId === 1;

    const permissions = isSuperAdmin
      ? await this.permissionRepo.find({
          relations: [
            'relation',
            'relation.parentModule',
            'relation.childModule',
            'roles',
          ],
        })
      : await this.permissionRepo.find({
          where: { roleId: roleId },
          relations: [
            'relation',
            'relation.parentModule',
            'relation.childModule',
            'roles',
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
        role_name: role.name,
        modules: await this.getModulesByRole(role.id),
      });
    }
    return results;
  }
}
