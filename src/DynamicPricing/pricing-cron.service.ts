import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DynamicPricingService } from './dynamic-pricing.service';

@Injectable()
export class PricingCronService implements OnModuleInit {
  private readonly logger = new Logger(PricingCronService.name);

  constructor(private dynamicPricingService: DynamicPricingService) {}

  onModuleInit() {
    this.logger.log(
      '[PricingCronService] Initializing nightly cron (0 2 * * *)',
    );
  }

  @Cron('0 2 * * *')
  async runNightlyPricingUpdate() {
    this.logger.log('[DynamicPricing] Starting nightly pricing cycle...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.dynamicPricingService.runPricingCycle(tomorrow);
    this.logger.log(
      `[DynamicPricing] Cycle complete — processed: ${result.processed}, skipped: ${result.skipped}, errors: ${result.errors}`,
    );
  }
}
