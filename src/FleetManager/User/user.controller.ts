import {
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  ForbiddenException,
  Body,
  Patch,
  Param,
  Req,
  Query,
} from '@nestjs/common';
import { FMJwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { FMUsersService } from './user.service';
import { AddInternalUserDto } from 'src/Admin/User/dto/add_internal_user.dto';
import { FM_EditInternalUserDto } from './dto/edit.internal.user.dto';
import { ResetPasswordDto } from '../Auth/dto/reset_password.dto';
import { FMAuthService } from '../Auth/auth.service';
//import { Audit } from '../admin-logs/admin-logs.decorators';

@Controller('fm/users')
export class FMUsersController {
  constructor(
    private readonly usersService: FMUsersService,
    private readonly authService: FMAuthService,
  ) {}

  @UseGuards(FMJwtBlacklistGuard)
  @Post('add-internal-user')
  async createInternalUser(@Request() req, @Body() addDto: AddInternalUserDto) {
    const user = await this.usersService.createInternalUser(addDto);
    await this.usersService.generateJwtTokenAndResetLink(user);

    return {
      message: 'Internal user created successfully',
      user,
    };
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Patch('edit-internal-user/:id')
  async editInternalUser(
    @Param('id') id: number,
    @Request() req,
    @Body() editDto: FM_EditInternalUserDto,
  ) {
    const user = await this.usersService.editInternalUserIncludingSelf(
      id,
      editDto,
    );
    return {
      message: 'Internal user updated successfully',
      user,
    };
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Patch('edit-profile')
  async editProfile(@Request() req, @Body() editDto: FM_EditInternalUserDto) {
    const currentUser = req.user as { admin_email: string };
    const user = await this.usersService.findByEmail(currentUser.admin_email);
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    await this.usersService.editInternalUserIncludingSelf(user.id, editDto);
    return {
      message: 'Profile updated successfully',
    };
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Get('view-internal-user')
  async viewInternalUsers(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('role') role?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('search') search?: string,
  ) {
    return this.usersService.getInternalUsersExcludingSelf(
      req.user.admin_id,
      req.user.admin_role,
      +page,
      +limit,
      role,
      status,
      search,
    );
  }

  @UseGuards(FMJwtBlacklistGuard)
  @Patch('soft-delete-internal-user/:id')
  async softDeleteUser(@Param('id') id: number, @Body() isdelete: boolean) {
    return this.usersService.softDeleteUser(+id, isdelete);
  }
}
