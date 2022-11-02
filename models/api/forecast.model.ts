import { DataSource } from '../data-source.enum';
import { DetailedWindDirection } from '../detailed-wind-direction.enum';
import { WindDirection } from '../wind-direction.enum';
import { Wind } from './observations.model';

export interface Forecast {
  [DataSource.NATIONAL_WEATHER_SERVICE]?: NwsForecast;
}

export interface BaseForecast {
  readTime: number;
  validUntil: number;
}

export interface NwsForecast extends BaseForecast {
  forecasts: Array<NwsForecastPeriod>;
}

export interface NwsForecastPeriod {
  dayName: string | null;
  shortDateName: string | null;
  periodStart: number | null;
  periodEnd: number | null;
  isDaytime: boolean | null;
  temperature: number | null;
  wind: WindForecast;
  shortForecast: string | null;
  detailedForecast: string | null;
}

export interface WindForecast extends Omit<Wind, 'direction'> {
  minSpeed: number | null;
  maxSpeed: number | null;
  minGustSpeed: number | null;
  maxGustSpeed: number | null;
  direction: WindDirection | DetailedWindDirection | null;
}