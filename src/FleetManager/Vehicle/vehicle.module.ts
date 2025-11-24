import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FleetManagerVehicles } from "src/entities/entities/FleetManagerVehicles";
import { FleetManagerVehicleDocuments } from "src/entities/entities/FleetManagerVehicleDocuments";
import { VehicleDynamicPricing } from "src/entities/entities/VehicleDynamicPricing";
@Module({
    imports: [TypeOrmModule.forFeature([FleetManagerVehicles, FleetManagerVehicleDocuments, VehicleDynamicPricing])],
    //controllers: [FleetController],
    //providers: [FleetService],
})
export class VehicleModule {}
