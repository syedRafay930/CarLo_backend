import {
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  ForbiddenException,
  Body,
  Put,
  Patch,
  Param,
  Req,
  Query,
} from '@nestjs/common';
import { JwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { UsersService } from './user.service';
import { AddInternalUserDto } from './dto/add_internal_user.dto';
import { EditInternalUserDto } from './dto/edit_internal_user.dto';
import { ResetPasswordDto } from '../Auth/dto/reset_password.dto';
import { DeleteInternalUserDto } from './dto/delete_internal_user.dto';
import { AuthService } from '../Auth/auth.service';
//import { Audit } from '../admin-logs/admin-logs.decorators';

@Controller('admin/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @UseGuards(JwtBlacklistGuard)
  @Post('add-internal-user')
  async createInternalUser(@Request() req, @Body() addDto: AddInternalUserDto) {
    
    const user = await this.usersService.createInternalUser(addDto);
    await this.usersService.generateJwtTokenAndResetLink(user);

    return {
      message: 'Internal user created successfully',
      user,
    };
  }

  @UseGuards(JwtBlacklistGuard)
  @Patch('edit-internal-user/:id')
  async editInternalUser(
    @Param('id') id: number,
    @Request() req,
    @Body() editDto: EditInternalUserDto,
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

  @UseGuards(JwtBlacklistGuard)
  @Patch('edit-profile')
  async editProfile(@Request() req, @Body() editDto: EditInternalUserDto) {
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

  @UseGuards(JwtBlacklistGuard)
  @Get('view-internal-user')
  async viewInternalUsers(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('role') role?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('search') search?: string,
  ) {

    console.log(req.user)
    
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

  @UseGuards(JwtBlacklistGuard)
  @Patch('soft-delete-internal-user/:id')
  async softDeleteUser(
    @Param('id') id: number,
    @Body() dto: DeleteInternalUserDto,
  ) {
    return this.usersService.softDeleteUser(+id, dto.isdelete);
  }
}
