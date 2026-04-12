import { Injectable } from '@nestjs/common';

export interface PricingBreakdown {
  dayOfWeek: number;
  season: number;
  demand: number;
  utilization: number;
  competition: number;
  totalRaw: number;
  totalCapped: number;
}

@Injectable()
export class PricingEngineService {
  calculateAdjustment(params: {
    baseRate: number;
    vehicleType: string;
    city: string;
    targetDate: Date;
    recentBookingCount: number;
    vehicleUtilizationDays: number;
    competitorCount: number;
    maxAdjustmentPercent: number;
  }): {
    adjustedRate: number;
    multiplier: number;
    breakdown: PricingBreakdown;
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    let totalMultiplier = 0;

    const day = params.targetDate.getDay();
    let dowContribution = 0;
    if (day === 5 || day === 6) {
      dowContribution = 0.15;
      reasoning.push('Weekend surge: +15%');
    } else if (day === 0) {
      dowContribution = 0.1;
      reasoning.push('Sunday premium: +10%');
    } else {
      reasoning.push('Weekday: no adjustment');
    }
    totalMultiplier += dowContribution;

    const month = params.targetDate.getMonth() + 1;
    let seasonContribution = 0;
    const peakMonths = [6, 7, 8, 12];
    const shoulderMonths = [3, 4, 5, 11];
    if (peakMonths.includes(month)) {
      seasonContribution = 0.2;
      reasoning.push('Peak season: +20%');
    } else if (shoulderMonths.includes(month)) {
      seasonContribution = 0.05;
      reasoning.push('Shoulder season: +5%');
    } else {
      seasonContribution = -0.1;
      reasoning.push('Low season: -10%');
    }
    totalMultiplier += seasonContribution;

    let demandContribution = 0;
    if (params.recentBookingCount >= 5) {
      demandContribution = 0.15;
      reasoning.push(
        `High demand (${params.recentBookingCount} recent bookings): +15%`,
      );
    } else if (params.recentBookingCount >= 2) {
      demandContribution = 0.05;
      reasoning.push(
        `Medium demand (${params.recentBookingCount} recent bookings): +5%`,
      );
    } else {
      demandContribution = -0.05;
      reasoning.push(
        `Low demand (${params.recentBookingCount} recent bookings): -5%`,
      );
    }
    totalMultiplier += demandContribution;

    const utilizationRate = params.vehicleUtilizationDays / 30;
    let utilizationContribution = 0;
    if (utilizationRate >= 0.7) {
      utilizationContribution = 0.1;
      reasoning.push(
        `High utilization (${Math.round(utilizationRate * 100)}%): +10%`,
      );
    } else if (utilizationRate >= 0.3) {
      utilizationContribution = 0;
      reasoning.push(
        `Medium utilization (${Math.round(utilizationRate * 100)}%): no adjustment`,
      );
    } else {
      utilizationContribution = -0.1;
      reasoning.push(
        `Low utilization (${Math.round(utilizationRate * 100)}%): -10%`,
      );
    }
    totalMultiplier += utilizationContribution;

    let competitionContribution = 0;
    if (params.competitorCount <= 2) {
      competitionContribution = 0.1;
      reasoning.push(
        `Low competition (${params.competitorCount} alternatives): +10%`,
      );
    } else if (params.competitorCount <= 5) {
      competitionContribution = 0;
      reasoning.push(
        `Moderate competition (${params.competitorCount} alternatives): no adjustment`,
      );
    } else {
      competitionContribution = -0.05;
      reasoning.push(
        `High competition (${params.competitorCount} alternatives): -5%`,
      );
    }
    totalMultiplier += competitionContribution;

    const maxMultiplier = params.maxAdjustmentPercent / 100;
    const cappedMultiplier = Math.max(
      -maxMultiplier,
      Math.min(maxMultiplier, totalMultiplier),
    );

    if (cappedMultiplier !== totalMultiplier) {
      reasoning.push(
        `Capped at ±${params.maxAdjustmentPercent}% FM limit (raw: ${Math.round(totalMultiplier * 100)}%)`,
      );
    }

    const rawAdjusted = params.baseRate * (1 + cappedMultiplier);
    const adjustedRate = Math.round(rawAdjusted / 50) * 50;

    const breakdown: PricingBreakdown = {
      dayOfWeek: Math.round(dowContribution * 100),
      season: Math.round(seasonContribution * 100),
      demand: Math.round(demandContribution * 100),
      utilization: Math.round(utilizationContribution * 100),
      competition: Math.round(competitionContribution * 100),
      totalRaw: Math.round(totalMultiplier * 100),
      totalCapped: Math.round(cappedMultiplier * 100),
    };

    return {
      adjustedRate,
      multiplier: cappedMultiplier,
      breakdown,
      reasoning,
    };
  }
}
