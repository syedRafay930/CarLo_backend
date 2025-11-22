import {
  Body,
  Controller,
  Post,
  Get,
  Request,
  UseGuards,
  ForbiddenException,
  Param,
  Put,
  Patch,
  Delete,
} from '@nestjs/common';
import { JwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { RBACService } from './rbac.service';
import { AssignPermissionDto } from './dto/assign_permission.dto';
import { AddRoleDto } from './dto/add_adminRole.dto';
import { UsersService } from '../User/user.service';

@Controller('admin/rbac')
export class RBACController {
  constructor(
    private readonly rbacService: RBACService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtBlacklistGuard)
  @Post('add-role')
  async addRole(@Body() roleDto: AddRoleDto , @Request() req: any) {
    return this.rbacService.addRole(roleDto);
}

  @UseGuards(JwtBlacklistGuard)
  @Get('get-roles')
  async getRoles(@Request() req: any) {
    const roles = await this.rbacService.getRoles();
    return roles;
  }

  @UseGuards(JwtBlacklistGuard)
  @Patch('edit-role/:id')
  async editRole(@Param('id') id: number, @Body() roleDto: AddRoleDto , @Request() req: any) {
    return this.rbacService.editRole(id, roleDto);
  }

  @UseGuards(JwtBlacklistGuard)
  @Delete('delete-role/:id')
  async deleteRole(@Param('id') id: number , @Request() req: any) {
    const role = await this.rbacService.deleteRole(id);
    return{
      message: 'Role deleted successfully',
      role
    }
    }


  @UseGuards(JwtBlacklistGuard)
  @Post('assign-permissions')
  async assignPermissions(
    @Body() dto: AssignPermissionDto,
    @Request() req: any,
  ) {
    if (!req.user || req.user.admin_role !== 1) {
      throw new ForbiddenException('Only SuperAdmin can assign permissions.');
    }
    return this.rbacService.assignPermissions(
      dto.role_id,
      dto.module_id,
      dto.is_enable,
      req.user.admin_id,
    );
  }

  @Get('sidebar/:roleId')
  async getSidebarModules(@Param('roleId') roleId: number) {
    return this.rbacService.getModulesByRole(roleId);
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('permissions-matrix')
  async getAllRolesPermissionMatrix() {
    return this.rbacService.getAllRolesPermissionMatrix();
  }
}
