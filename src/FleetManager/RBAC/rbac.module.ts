import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FM_RBACService } from './rbac.service';
import { FM_RBACController } from './rbac.controller';
import { FmModules } from 'src/entities/entities/FmModules';
import { FmRelationModule } from 'src/entities/entities/FmRelationModule';
import { FmRolePermissions } from 'src/entities/entities/FmRolePermissions';
import { FMUsersModule } from '../User/user.module';
import { FMAuthModule } from '../Auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FmModules, FmRelationModule, FmRolePermissions]),
    forwardRef(() => FMUsersModule),
    forwardRef(() => FMAuthModule),
  ],
  providers: [FM_RBACService],
  controllers: [FM_RBACController],
  exports: [FM_RBACService, TypeOrmModule],
})
export class FM_RBACModule {}
