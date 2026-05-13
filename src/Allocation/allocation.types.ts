/** MCDM weights (must sum to 1.0) */
export interface ScoringWeights {
  locationMatch: 0.3;
  typeMatch: 0.25;
  priceFit: 0.2;
  vehicleRating: 0.15;
  fleetReliability: 0.1;
}

export interface VehicleScore {
  vehicleId: number;
  totalScore: number;
  breakdown: {
    locationScore: number;
    typeScore: number;
    priceScore: number;
    ratingScore: number;
    reliabilityScore: number;
  };
  reasoning: string[];
  vehicle: {
    id: number;
    make: string;
    model: string;
    year: number;
    vehicleType: string;
    color: string | null;
    seatingCapacity: number;
    transmissionType: string;
    fuelType: string;
    selfDriveBaseRate: number;
    driverIncludedRate: number;
    licensePlate: string;
    fleetId: number;
    fleetName: string;
    fleetCity: string;
    fleetCountry: string;
    averageRating: number;
    totalRatings: number;
    /** Same source as public catalog `coverImageUrl` (image_coverimg document). */
    coverImageUrl: string | null;
  };
}

export interface AllocationResult {
  recommendations: VehicleScore[];
  totalCandidates: number;
  requestSummary: {
    requestedType: string;
    requestedCity: string;
    budgetPerDay: number | null;
    pickupDate: string;
    returnDate: string;
    totalDays: number;
  };
  agentExplanation: string;
  scoredAt: string;
}

export interface AllocationStatsResult {
  totalAvailable: number;
  byCity: { city: string; count: number }[];
  byType: { type: string; count: number }[];
  lastUpdated: string;
}
