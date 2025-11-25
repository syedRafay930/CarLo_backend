import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Subscriptions } from "src/entities/entities/Subscriptions";
import { FleetManagerSubscriptions } from "src/entities/entities/FleetManagerSubscriptions";
@Module({
    imports: [TypeOrmModule.forFeature([Subscriptions, FleetManagerSubscriptions])],
    //controllers: [FleetController],
    //providers: [FleetService],
})
export class SubscriptionModule {}
