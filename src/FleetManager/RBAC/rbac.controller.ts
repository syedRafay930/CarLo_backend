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
import { FMJwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { FM_RBACService } from './rbac.service';
import { AssignPermissionDto } from './dto/assign_permission.dto';
import { AddFMRoleDto } from './dto/add_FMRole.dto';
import { FMUsersService } from '../User/user.service';

@Controller('fm/rbac')
export class FM_RBACController {
  constructor(
    private readonly rbacService: FM_RBACService,
    private readonly usersService: FMUsersService,
  ) {}

  @UseGuards(FMJwtBlacklistGuard)
  @Post('add-role')
  async addRole(@Body() roleDto: AddFMRoleDto , @Request() req: any) {
    return this.rbacService.addRole(roleDto);
}

  @UseGuards(FMJwtBlacklistGuard)
  @Get('get-roles')
  async getRoles(@Request() req: any) {
    const roles = await this.rbacService.getRoles(req.user.fleet_id);
    return roles;
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Patch('edit-role/:id')
  async editRole(@Param('id') id: number, @Body() roleDto: AddFMRoleDto , @Request() req: any) {
    return this.rbacService.editRole(id, roleDto);
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Delete('delete-role/:id')
  async deleteRole(@Param('id') id: number , @Request() req: any) {
    const role = await this.rbacService.deleteRole(id,req.user.fleet_id);
    return{
      message: 'Role deleted successfully',
      role
    }
    }

  @UseGuards(FMJwtBlacklistGuard)
  @Post('assign-permissions')
  async assignPermissions(
    @Body() dto: AssignPermissionDto,
    @Request() req: any,
  ) {
    return this.rbacService.assignPermissions(
      dto.role_id,
      dto.fleet_id,
      dto.module_id,
      dto.is_enable,
      req.user.fleet_id,
    );  
  }

  @Get('sidebar/:roleId/:fleetId')
  async getSidebarModules(@Param('roleId') roleId: number, @Param('fleetId') fleetId: number) {
    return this.rbacService.getModulesByRole(roleId, fleetId);
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Get('permissions-matrix')
  async getAllRolesPermissionMatrix() {
    return this.rbacService.getAllRolesPermissionMatrix();
  }
}
