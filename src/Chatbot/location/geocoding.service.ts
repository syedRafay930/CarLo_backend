import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly apiKey: string;

  // Pakistan city bounding-box fallback used when API is unavailable
  // Covers the cities already in production data
  private readonly CITY_BOUNDS: Array<{
    city: string;
    latMin: number;
    latMax: number;
    lngMin: number;
    lngMax: number;
  }> = [
    { city: 'karachi', latMin: 24.74, latMax: 25.1, lngMin: 66.85, lngMax: 67.45 },
    { city: 'lahore', latMin: 31.4, latMax: 31.7, lngMin: 74.2, lngMax: 74.55 },
    { city: 'islamabad', latMin: 33.6, latMax: 33.8, lngMin: 72.8, lngMax: 73.2 },
    { city: 'rawalpindi', latMin: 33.52, latMax: 33.68, lngMin: 72.98, lngMax: 73.12 },
    { city: 'peshawar', latMin: 33.95, latMax: 34.1, lngMin: 71.4, lngMax: 71.7 },
    { city: 'quetta', latMin: 30.15, latMax: 30.3, lngMin: 66.95, lngMax: 67.1 },
    { city: 'multan', latMin: 30.15, latMax: 30.3, lngMin: 71.4, lngMax: 71.6 },
    { city: 'faisalabad', latMin: 31.35, latMax: 31.55, lngMin: 73.0, lngMax: 73.2 },
  ];

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENCAGE_API_KEY') ?? '';
  }

  /**
   * Resolves lat/lng to a lowercase city name.
   * Returns null if resolution fails — caller must handle fallback.
   *
   * Strategy:
   *   1. Try OpenCage Geocoding API (if key present)
   *   2. Fall back to bounding-box lookup
   *   3. Return null if neither resolves
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (this.apiKey) {
      try {
        const url =
          `https://api.opencagedata.com/geocode/v1/json` +
          `?q=${lat}+${lng}` +
          `&key=${this.apiKey}` +
          `&no_annotations=1` +
          `&limit=1` +
          `&language=en`;

        const res = await axios.get(url, { timeout: 3000 });
        const results = res.data?.results;

        if (Array.isArray(results) && results.length > 0) {
          const components = results[0].components;

          const city =
            components?.city ??
            components?.town ??
            components?.village ??
            components?.county ??
            components?.state_district;

          if (city) return (city as string).toLowerCase().trim();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `OpenCage reverse geocoding failed (${lat}, ${lng}): ${msg}. Using bounding-box fallback.`,
        );
      }
    }

    const match = this.CITY_BOUNDS.find(
      (b) =>
        lat >= b.latMin &&
        lat <= b.latMax &&
        lng >= b.lngMin &&
        lng <= b.lngMax,
    );
    return match?.city ?? null;
  }
}
