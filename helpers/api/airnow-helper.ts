import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import fetch from 'node-fetch';
import { AIRNOW_RECORDING_INTERVAL, AIRNOW_UPLOAD_DELAY } from 'constants/server';
import { CoordinatesHelper } from 'helpers';
import { CurrentObservations } from 'models/airnow';
import { AirNowObservations } from 'models/api';
import { MinimalQueriedCity } from 'models/cities';
import { Cachable, CachableEntry } from './cachable';
import { LoggerHelper } from './logger-helper';

dayjs.extend(customParseFormat);
dayjs.extend(timezone);
dayjs.extend(utc);

type CurrentObservationsWithTz = { observations: CurrentObservations } & Pick<MinimalQueriedCity, 'timeZone'>;

export class AirNowHelper {
  private static readonly CLASS_NAME = 'AirNowHelper';
  private static readonly apiKey = process.env.AIRNOW_API_KEY!;
  private static readonly userAgent = process.env.USER_AGENT!;

  private static getRequestUrlFor(minQueriedCity: MinimalQueriedCity) {
    const coordinatesArr = CoordinatesHelper.cityToNumArr(minQueriedCity);
    return `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${coordinatesArr[0]}&longitude=${coordinatesArr[1]}&distance=100&API_KEY=${this.apiKey}`;
  }

  private static getLatestReadTime(observationsWithTz: CurrentObservationsWithTz) {
    const readTimes = observationsWithTz.observations.map(observation => {
      const stringToParse = `${observation?.DateObserved?.trim()} ${observation?.HourObserved}`;
      try {
        return dayjs.tz(stringToParse, 'YYYY-M-D H', observationsWithTz.timeZone).unix();
      } catch (err) {
        LoggerHelper.getLogger(`${this.CLASS_NAME}.getLatestReadTime()`).error(
          `Couldn't parse "${stringToParse}" - ${err}`
        );
        return 0;
      }
    });
    return Math.max(0, ...readTimes);
  }

  private static readonly current = new Cachable<CurrentObservationsWithTz, MinimalQueriedCity>(
    async (minQueriedCity: MinimalQueriedCity) => {
      const currentObservations = (await (
        await fetch(this.getRequestUrlFor(minQueriedCity), { headers: { 'User-Agent': this.userAgent } })
      ).json()) as CurrentObservations;
      return {
        observations: currentObservations,
        timeZone: minQueriedCity.timeZone
      };
    },
    async (_: string, newItem: CurrentObservationsWithTz) => {
      const latestReadTime = this.getLatestReadTime(newItem);
      return latestReadTime ? latestReadTime + AIRNOW_RECORDING_INTERVAL + AIRNOW_UPLOAD_DELAY : 0;
    },
    LoggerHelper.getLogger(`${this.CLASS_NAME}.current`)
  );
  static async getCurrent(minQueriedCity: MinimalQueriedCity) {
    return this.current.get(CoordinatesHelper.cityToStr(minQueriedCity), minQueriedCity);
  }

  static mapCurrentToAirNowObservations(cacheEntry: CachableEntry<CurrentObservationsWithTz>): AirNowObservations {
    return {
      readTime: this.getLatestReadTime(cacheEntry.item),
      validUntil: cacheEntry.validUntil,
      observations: cacheEntry.item.observations
        .map(observation => ({
          pollutant: observation.ParameterName,
          aqi: observation.AQI,
          aqiLevelName: observation.Category.Name
        }))
        .sort((a, b) => b.aqi - a.aqi)
    };
  }
}
