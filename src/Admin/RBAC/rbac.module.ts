import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RBACService } from './rbac.service';
import { RBACController } from './rbac.controller';
import { Modules } from 'src/entities/entities/Modules';
import { RelationModule } from 'src/entities/entities/RelationModule';
import { RolePermissions } from 'src/entities/entities/RolePermissions';
import { UsersModule } from '../User/user.module';
import { AuthModule } from '../Auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Modules, RelationModule, RolePermissions]),
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
  ],
  providers: [RBACService],
  controllers: [RBACController],
  exports: [RBACService, TypeOrmModule],
})
export class RBACModule {}
