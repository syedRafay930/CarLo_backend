import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDynamicPricingFields1734000000000 implements MigrationInterface {
  name = 'AddDynamicPricingFields1734000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE fleet_manager_vehicles
        ADD COLUMN IF NOT EXISTS max_adjustment_percent integer DEFAULT 30,
        ADD COLUMN IF NOT EXISTS dynamic_pricing_enabled boolean DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE vehicle_dynamic_pricing
        ADD COLUMN IF NOT EXISTS engine_breakdown_json text
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vehicle_dynamic_pricing
        DROP COLUMN IF EXISTS engine_breakdown_json
    `);
    await queryRunner.query(`
      ALTER TABLE fleet_manager_vehicles
        DROP COLUMN IF EXISTS max_adjustment_percent,
        DROP COLUMN IF EXISTS dynamic_pricing_enabled
    `);
  }
}
