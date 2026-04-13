export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  revenueChange: number;
  revenueByPeriod: TimeSeriesPoint[];
  revenueByCity: { city: string; revenue: number }[];
}

export interface BookingAnalytics {
  totalBookings: number;
  bookingChange: number;
  bookingsByPeriod: TimeSeriesPoint[];
  bookingsByStatus: {
    status: string;
    count: number;
    percentage: number;
  }[];
}

export interface VehicleAnalytics {
  totalVehicles: number;
  activeVehicles: number;
  topPerformingVehicles: {
    vehicleId: number;
    make: string;
    model: string;
    year: number;
    vehicleType: string;
    totalBookings: number;
    totalRevenue: number;
    utilizationRate: number;
  }[];
  utilizationByType: {
    vehicleType: string;
    count: number;
    avgUtilization: number;
  }[];
}

export interface AnalyticsSummary {
  period: '7d' | '30d' | '90d';
  startDate: string;
  endDate: string;
  revenue: RevenueAnalytics;
  bookings: BookingAnalytics;
  vehicles: VehicleAnalytics;
  generatedAt: string;
}

export interface FleetAnalyticsSummary extends AnalyticsSummary {
  fleetId: number;
  fleetName: string;
  fleetCity: string;
}

export interface PlatformAnalyticsSummary extends AnalyticsSummary {
  totalFleets: number;
  activeFleets: number;
  newClientsInPeriod: number;
  topFleets: {
    fleetId: number;
    fleetName: string;
    city: string;
    totalRevenue: number;
    totalBookings: number;
  }[];
}
