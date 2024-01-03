import dayjs, { Dayjs } from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import duration from 'dayjs/plugin/duration';
import localeData from 'dayjs/plugin/localeData';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { CacheEntry } from 'helpers/api/cached';
import { FeelsHelper } from 'helpers/api/feels-helper';
import { LoggerHelper } from 'helpers/api/logger-helper';
import { NumberHelper } from 'helpers/number-helper';
import { WindHelper } from 'helpers/wind-helper';
import { DescriptionItem, NwsAlert, NwsAlerts } from 'models/api/alerts.model';
import { NwsForecast, NwsHourlyPeriodForecast, NwsPeriod, NwsPeriodForecast } from 'models/api/forecast.model';
import { NwsObservations, Wind } from 'models/api/observations.model';
import { ReqQuery } from 'models/api/req-query.model';
import { AlertSeverity, AlertsResponse, AlertStatus } from 'models/nws/alerts.model';
import {
  ForecastGridData,
  ForecastGridDataDatapoints,
  ForecastGridDataResponse,
  WeatherIntensity,
  WeatherValueLayer
} from 'models/nws/forecast-grid-data.model';
import { NwsUnits } from 'models/nws/nws-units';
import { ObservationResponse } from 'models/nws/observation.model';
import {
  GridpointQuantitativeValue,
  QuantitativeMinMaxValue,
  QuantitativeValue
} from 'models/nws/quantitative-value.model';
import { SummaryForecastPeriod, SummaryForecastResponse } from 'models/nws/summary-forecast.model';
import { Unit, UnitType } from 'models/unit.enum';

dayjs.extend(advancedFormat);
dayjs.extend(duration);
dayjs.extend(localeData);
dayjs.extend(timezone);
dayjs.extend(utc);

type HourlyForecastsMetadata = { unitsOfMeasure: (string | undefined)[]; dpRefIdxsByTime: Record<number, number[]> };

const NWS_ALERTS_SYSTEM_CODE_REGEX = /^[A-Z]{3}$/;
const NWS_ALERTS_HEADING_REGEX = /(\w+( +\w+)*)(?=\.{3})/;
const NWS_ALERTS_BODY_REGEX = /(?<=\.{3})(.*)/m;

export class NwsMapHelper {
  private static readonly CLASS_NAME = 'NwsMapHelper';

  private static getIsoTzString(time: Dayjs) {
    return time.format('YYYY-MM-DDTHH:mm:ssZ');
  }

  static mapCurrentToNwsObservations(cacheEntry: CacheEntry<ObservationResponse>, reqQuery: ReqQuery): NwsObservations {
    const nwsCurrent = cacheEntry.item?.properties;
    const pressureUnitMapping = nwsCurrent?.seaLevelPressure?.unitCode
      ? NumberHelper.getUnitMapping(UnitType.pressure, NwsUnits[nwsCurrent.seaLevelPressure.unitCode], reqQuery)
      : null;

    if (nwsCurrent == null && 'status' in cacheEntry.item) {
      LoggerHelper.getLogger(`${this.CLASS_NAME}.mapCurrentToNwsObservations()`).error(
        `${cacheEntry.item.status} error on response`
      );
      console.error(cacheEntry.item);
    }

    return {
      readTime: nwsCurrent?.timestamp ? dayjs(nwsCurrent.timestamp).unix() : 0,
      validUntil: cacheEntry.validUntil,
      temperature: NumberHelper.convertNws(nwsCurrent?.temperature, UnitType.temp, reqQuery),
      feelsLike: FeelsHelper.getFromNwsObservations(nwsCurrent, reqQuery),
      heatIndex: NumberHelper.convertNws(nwsCurrent?.heatIndex, UnitType.temp, reqQuery),
      dewPoint: NumberHelper.convertNws(nwsCurrent?.dewpoint, UnitType.temp, reqQuery),
      humidity: NumberHelper.roundNws(nwsCurrent?.relativeHumidity),
      wind: {
        speed: NumberHelper.convertNws(nwsCurrent?.windSpeed, UnitType.wind, reqQuery),
        directionDeg: nwsCurrent?.windDirection?.value,
        gustSpeed: NumberHelper.convertNws(nwsCurrent?.windGust, UnitType.wind, reqQuery)
      },
      pressure: {
        atSeaLevel: NumberHelper.convert(
          nwsCurrent?.seaLevelPressure?.value,
          pressureUnitMapping,
          pressureUnitMapping?.to === Unit.INCHES ? 2 : 1
        )
      },
      precipitation: {
        last1Hrs: NumberHelper.convertNws(nwsCurrent?.precipitationLastHour, UnitType.precipitation, reqQuery, 2),
        last3Hrs: NumberHelper.convertNws(nwsCurrent?.precipitationLast3Hours, UnitType.precipitation, reqQuery, 2),
        last6Hrs: NumberHelper.convertNws(nwsCurrent?.precipitationLast6Hours, UnitType.precipitation, reqQuery, 2)
      },
      textDescription: nwsCurrent?.textDescription ?? null
    };
  }

  private static readonly CHANCE_OF_PRECIP_SEARCH_TEXT = 'Chance of precipitation is';

  private static get NWS_HOURLY_DATAPOINT_KEYS() {
    const NWS_HOURLY_DATAPOINT_KEYS_ARR: Partial<keyof ForecastGridDataDatapoints>[] = [
      'temperature',
      'dewpoint',
      'relativeHumidity',
      'apparentTemperature',
      'skyCover',
      'windDirection',
      'windSpeed',
      'windGust',
      'weather',
      'probabilityOfPrecipitation',
      'quantitativePrecipitation'
    ];

    const entries: Partial<Record<keyof ForecastGridDataDatapoints, number>> = {};
    NWS_HOURLY_DATAPOINT_KEYS_ARR.forEach((key, idx) => (entries[key] = idx));

    return entries;
  }

  private static isTimeBeforeEndOfDay(time: Dayjs, timeZone: string) {
    return time.isBefore(dayjs().tz(timeZone).endOf('day'));
  }

  private static getWind(
    period: SummaryForecastPeriod,
    reqQuery: ReqQuery,
    hourlyPeriodForecasts: NwsHourlyPeriodForecast[]
  ): Wind {
    const wind: Wind = {
      speed: null,
      gustSpeed: null,
      directionDeg: WindHelper.dirToDeg(period.windDirection)
    };

    // Map the wind speeds from the hourlyPeriodForecasts
    const hourlyPeriodWindSpeeds = hourlyPeriodForecasts
      .map(hourForecast => hourForecast.wind.speed)
      .filter(windSpeed => windSpeed != null);
    if (hourlyPeriodWindSpeeds.length) {
      // Use the max non-null hourly wind speed
      wind.speed = Math.max(...(hourlyPeriodWindSpeeds as number[]));
    } else {
      // Use the summary wind speed
      const speedAsValue = period.windSpeed as QuantitativeValue;
      const speedAsMinMax = period.windSpeed as QuantitativeMinMaxValue;
      if (speedAsValue?.value != null) {
        wind.speed = NumberHelper.convertNws(speedAsValue, UnitType.wind, reqQuery);
      } else if (speedAsMinMax?.maxValue != null) {
        wind.speed = NumberHelper.convertNwsRawValueAndUnitCode(
          speedAsMinMax.maxValue,
          speedAsMinMax.unitCode,
          UnitType.wind,
          reqQuery
        );
      }
    }

    const gustSpeedAsValue = period.windGust as QuantitativeValue;
    const gustSpeedAsMinMax = period.windGust as QuantitativeMinMaxValue;
    if (gustSpeedAsValue?.value != null) {
      wind.gustSpeed = NumberHelper.convertNws(gustSpeedAsValue, UnitType.wind, reqQuery);
    } else if (gustSpeedAsMinMax?.maxValue != null) {
      wind.gustSpeed = NumberHelper.convertNwsRawValueAndUnitCode(
        gustSpeedAsMinMax.maxValue,
        gustSpeedAsMinMax.unitCode,
        UnitType.wind,
        reqQuery
      );
    }

    return wind;
  }

  private static getChanceOfPrecip(period: SummaryForecastPeriod, hourlyPeriodForecasts: NwsHourlyPeriodForecast[]) {
    if (period.detailedForecast) {
      // Search for chance of precip in text summary
      const dfSplitOnSearchText = period.detailedForecast.split(
        new RegExp(` *${this.CHANCE_OF_PRECIP_SEARCH_TEXT} *`, 'i')
      );
      if (dfSplitOnSearchText.length === 2) {
        const chanceOfPrecipStr = dfSplitOnSearchText[1].split('%')[0];
        const chanceOfPrecipNum = Number(chanceOfPrecipStr);
        if (chanceOfPrecipStr.length > 0 && chanceOfPrecipNum != null && !isNaN(chanceOfPrecipNum)) {
          return chanceOfPrecipNum;
        }
      }
    }

    // Map the chance of precips from the hourlyPeriodForecasts
    const hourlyPeriodChanceOfPrecips = hourlyPeriodForecasts
      .map(hourForecast => hourForecast.chanceOfPrecip)
      .filter(chanceOfPrecip => chanceOfPrecip != null);
    if (hourlyPeriodChanceOfPrecips.length) {
      // Fallback to max non-null hourly chance of precip
      return Math.max(...(hourlyPeriodChanceOfPrecips as number[]));
    }

    return null;
  }

  private static getSummaryPeriodForecast(
    period: SummaryForecastPeriod,
    hourlyPeriodForecasts: NwsHourlyPeriodForecast[],
    timeZone: string,
    reqQuery: ReqQuery
  ): NwsPeriodForecast {
    const start = dayjs(period.startTime).tz(timeZone);
    return {
      start: start.unix(),
      startIsoTz: this.getIsoTzString(start),
      condition: period.shortForecast,
      temperature: NumberHelper.convertNws(period.temperature, UnitType.temp, reqQuery),
      wind: this.getWind(period, reqQuery, hourlyPeriodForecasts),
      chanceOfPrecip: this.getChanceOfPrecip(period, hourlyPeriodForecasts)
    };
  }

  private static getHourlyForecastsMetadata(
    forecastGridData: ForecastGridData | undefined
  ): HourlyForecastsMetadata | undefined {
    if (forecastGridData == null) return undefined;

    const datapointKeysEntries = Object.entries(this.NWS_HOURLY_DATAPOINT_KEYS) as [
      keyof ForecastGridDataDatapoints,
      number
    ][];
    const unitsOfMeasure: Array<string | undefined> = Array(datapointKeysEntries.length);
    const dpRefIdxsByTime: Record<number, number[]> = {};

    for (const [key, keyIdx] of datapointKeysEntries) {
      const valueLayer = forecastGridData[key];
      unitsOfMeasure[keyIdx] = 'uom' in valueLayer ? valueLayer.uom : undefined;

      for (let valueIdx = 0; valueIdx < valueLayer.values.length; valueIdx++) {
        const [effectiveStartStr, effectiveDurationStr] = valueLayer.values[valueIdx].validTime.split('/');
        const effectiveStart = dayjs(effectiveStartStr);
        const effectiveEnd = effectiveStart.add(dayjs.duration(effectiveDurationStr));
        for (let time = effectiveStart; time.isBefore(effectiveEnd); time = time.add(1, 'hour')) {
          if (dpRefIdxsByTime[time.unix()] == null) dpRefIdxsByTime[time.unix()] = Array(datapointKeysEntries.length);
          dpRefIdxsByTime[time.unix()][keyIdx] = valueIdx;
        }
      }
    }

    return { unitsOfMeasure, dpRefIdxsByTime };
  }

  private static getCondition(
    skyCover: number | null,
    weatherValueLayer: WeatherValueLayer | null,
    isDaytime: boolean
  ) {
    let condition: string | null = null;
    if (skyCover != null) {
      if (skyCover < 5.5) condition = isDaytime ? 'Sunny' : 'Clear';
      else if (skyCover < 25.5) condition = isDaytime ? 'Sunny' : 'Mostly Clear';
      else if (skyCover < 50.5) condition = isDaytime ? 'Mostly Sunny' : 'Partly Cloudy';
      else if (skyCover < 69.5) condition = isDaytime ? 'Partly Sunny' : 'Mostly Cloudy';
      // NWS uses 'Considerable Cloudiness' during the night, but this is pretty long; just use 'Mostly Cloudy'
      else if (skyCover < 87.5) condition = 'Mostly Cloudy';
      else condition = isDaytime ? 'Cloudy' : 'Overcast';
    }

    if (weatherValueLayer?.value[0].weather != null) {
      let intensity = '';
      if (weatherValueLayer.value[0].intensity === WeatherIntensity.HEAVY) {
        intensity = 'Heavy ';
      } else if (
        weatherValueLayer.value[0].intensity === WeatherIntensity.LIGHT ||
        weatherValueLayer.value[0].intensity === WeatherIntensity.VERY_LIGHT
      ) {
        intensity = 'Light ';
      }

      const formattedWeather = (weatherValueLayer.value[0].weather as string)
        .split('_')
        .map(word => `${word[0].toUpperCase()}${word.substring(1)}`)
        .join(' ');

      condition = `${intensity}${formattedWeather}`;
    }
    return condition;
  }

  private static getHourlyForecastsFor(
    forecastGridData: ForecastGridData | undefined,
    hourlyForecastsMetadata: HourlyForecastsMetadata | undefined,
    startTime: Dayjs,
    endTime: Dayjs,
    isDaytime: boolean,
    reqQuery: ReqQuery
  ): NwsHourlyPeriodForecast[] {
    const hourlyForecasts: NwsHourlyPeriodForecast[] = [];

    if (forecastGridData != null && hourlyForecastsMetadata != null) {
      const uomFor = (key: keyof ForecastGridDataDatapoints) =>
        hourlyForecastsMetadata.unitsOfMeasure[datapointKeys[key]!];
      const valueLayerFor = <T>(key: keyof ForecastGridDataDatapoints, refIdxs: number[]) =>
        (forecastGridData[key].values[refIdxs[datapointKeys[key]!]] ?? null) as T | null;
      const valueFor = (key: keyof ForecastGridDataDatapoints, refIdxs: number[]) => {
        const valueLayer = valueLayerFor<GridpointQuantitativeValue>(key, refIdxs);
        return valueLayer?.value ?? null;
      };
      const qvFor = (key: keyof ForecastGridDataDatapoints, refIdxs: number[]): QuantitativeValue => ({
        value: valueFor(key, refIdxs),
        unitCode: uomFor(key)!
      });

      const datapointKeys = this.NWS_HOURLY_DATAPOINT_KEYS;
      const datapointKeysEntries = Object.entries(datapointKeys) as [keyof ForecastGridDataDatapoints, number][];

      const oneHourAgo = dayjs().subtract(1, 'hour');
      for (let time = startTime; time.isBefore(endTime); time = time.add(1, 'hour')) {
        if (time.isAfter(oneHourAgo)) {
          const startUnix = time.unix();
          const refIdxs = hourlyForecastsMetadata.dpRefIdxsByTime[startUnix] ?? Array(datapointKeysEntries.length);

          hourlyForecasts.push({
            start: startUnix,
            startIsoTz: this.getIsoTzString(time),
            startLabel: time.format(`h${time.minute() > 0 ? ':mm' : ''} A`),
            condition: this.getCondition(valueFor('skyCover', refIdxs), valueLayerFor('weather', refIdxs), isDaytime),
            temperature: NumberHelper.convertNws(qvFor('temperature', refIdxs), UnitType.temp, reqQuery),
            feelsLike: NumberHelper.convertNws(qvFor('apparentTemperature', refIdxs), UnitType.temp, reqQuery),
            dewPoint: NumberHelper.convertNws(qvFor('dewpoint', refIdxs), UnitType.temp, reqQuery),
            humidity: NumberHelper.round(valueFor('relativeHumidity', refIdxs)),
            wind: {
              speed: NumberHelper.convertNws(qvFor('windSpeed', refIdxs), UnitType.wind, reqQuery),
              gustSpeed: NumberHelper.convertNws(qvFor('windGust', refIdxs), UnitType.wind, reqQuery),
              directionDeg: valueFor('windDirection', refIdxs)
            },
            chanceOfPrecip: NumberHelper.round(valueFor('probabilityOfPrecipitation', refIdxs)),
            precipAmount: NumberHelper.convertNws(
              qvFor('quantitativePrecipitation', refIdxs),
              UnitType.precipitation,
              reqQuery
            )
          });
        }
      }
    }

    return hourlyForecasts;
  }

  static mapForecastsToNwsForecast(
    summaryForecastCacheEntry: CacheEntry<SummaryForecastResponse | null>,
    forecastGridDataCacheEntry: CacheEntry<ForecastGridDataResponse | null>,
    timeZone: string,
    reqQuery: ReqQuery
  ): NwsForecast {
    const summaryForecast = summaryForecastCacheEntry.item?.properties;
    const forecastGridData = forecastGridDataCacheEntry.item?.properties;
    const hourlyForecastsMetadata = this.getHourlyForecastsMetadata(forecastGridData);

    const periods: NwsPeriod[] = [];
    for (let i = 0; i < (summaryForecast?.periods ?? []).length; ) {
      const startTime = dayjs(summaryForecast!.periods[i].startTime).tz(timeZone);
      const endTime = dayjs(summaryForecast!.periods[i].endTime).tz(timeZone);
      let dayName = dayjs.weekdays()[startTime.day()];
      if (this.isTimeBeforeEndOfDay(startTime, timeZone)) {
        if (summaryForecast!.periods[i].isDaytime) {
          dayName = 'Today';
        } else if (this.isTimeBeforeEndOfDay(endTime, timeZone)) {
          dayName = 'Overnight';
        } else {
          dayName = 'Tonight';
        }
      }
      const shortDateName = startTime.format('MMM D');

      let dayForecast: NwsPeriodForecast | null = null;
      let dayHourlyForecasts: NwsHourlyPeriodForecast[] = [];

      let nightForecast: NwsPeriodForecast | null = null;
      let nightHourlyForecasts: NwsHourlyPeriodForecast[] = [];

      if (summaryForecast!.periods[i].isDaytime) {
        dayHourlyForecasts = this.getHourlyForecastsFor(
          forecastGridData,
          hourlyForecastsMetadata,
          startTime,
          endTime,
          true,
          reqQuery
        );
        dayForecast = this.getSummaryPeriodForecast(
          summaryForecast!.periods[i],
          dayHourlyForecasts,
          timeZone,
          reqQuery
        );

        if (i + 1 < summaryForecast!.periods.length) {
          nightHourlyForecasts = this.getHourlyForecastsFor(
            forecastGridData,
            hourlyForecastsMetadata,
            dayjs(summaryForecast!.periods[i + 1].startTime).tz(timeZone),
            dayjs(summaryForecast!.periods[i + 1].endTime).tz(timeZone),
            false,
            reqQuery
          );
          nightForecast = this.getSummaryPeriodForecast(
            summaryForecast!.periods[i + 1],
            nightHourlyForecasts,
            timeZone,
            reqQuery
          );
        }

        i += 2;
      } else {
        nightHourlyForecasts = this.getHourlyForecastsFor(
          forecastGridData,
          hourlyForecastsMetadata,
          startTime,
          endTime,
          false,
          reqQuery
        );
        nightForecast = this.getSummaryPeriodForecast(
          summaryForecast!.periods[i],
          nightHourlyForecasts,
          timeZone,
          reqQuery
        );
        i += 1;
      }

      periods.push({
        dayName,
        shortDateName,
        dayForecast,
        dayHourlyForecasts,
        nightForecast,
        nightHourlyForecasts
      });
    }

    const summaryForecastReadTime = summaryForecast?.updateTime ? dayjs(summaryForecast.updateTime).unix() : 0;
    const forecastGridDataReadTime = forecastGridData?.updateTime ? dayjs(forecastGridData.updateTime).unix() : 0;
    const nextHourAtOneMin = dayjs().add(1, 'hour').startOf('hour').add(1, 'minute').unix();
    return {
      readTime: periods.length ? Math.max(summaryForecastReadTime, forecastGridDataReadTime) : 0,
      validUntil: Math.min(
        summaryForecastCacheEntry.validUntil,
        forecastGridDataCacheEntry.validUntil,
        nextHourAtOneMin
      ),
      periods
    };
  }

  private static getDayjsFormatTemplate(includeDay: boolean, time: Dayjs) {
    return `${includeDay ? 'ddd ' : ''}h${time.minute() > 0 ? ':mm' : ''}a`;
  }

  private static getFormatted(includeDay: boolean, time: Dayjs) {
    return {
      label: time.format(this.getDayjsFormatTemplate(includeDay, time)),
      shortTz: time.format('z')
    };
  }

  private static getNumericSeverity(severity: AlertSeverity) {
    if (severity === AlertSeverity.EXTREME) return 4;
    else if (severity === AlertSeverity.SEVERE) return 3;
    else if (severity === AlertSeverity.MODERATE) return 2;
    else if (severity === AlertSeverity.MINOR) return 1;
    return 0;
  }

  static mapAlertsToNwsAlerts(response: AlertsResponse, timeZone: string): NwsAlerts {
    const now = dayjs().tz(timeZone);
    const alerts = response.features
      .filter(
        alert =>
          alert.properties.status === AlertStatus.ACTUAL &&
          (alert.properties.ends ? dayjs(alert.properties.ends).isAfter(now) : true) &&
          dayjs(alert.properties.expires).isAfter(now)
      )
      .map((alert): NwsAlert => {
        const rawDescription = alert.properties.description;

        // Split raw description on '\n\n' if present or '\n' if it has headings; otherwise, don't split
        let splitRawDescription = [rawDescription];
        if (rawDescription.includes('\n\n')) splitRawDescription = rawDescription.split('\n\n');
        else if (NWS_ALERTS_HEADING_REGEX.exec(rawDescription)) splitRawDescription = rawDescription.split('\n');

        const description = splitRawDescription
          .filter((descItemStr, idx) => !(idx === 0 && NWS_ALERTS_SYSTEM_CODE_REGEX.test(descItemStr)))
          .map((descItemStr): DescriptionItem => {
            const normDescItemStr = descItemStr.replaceAll('\n', ' ');
            const headingExecd = NWS_ALERTS_HEADING_REGEX.exec(normDescItemStr);
            const bodyExecd = NWS_ALERTS_BODY_REGEX.exec(normDescItemStr);

            const heading = headingExecd && headingExecd.length > 0 ? headingExecd[0].toUpperCase() : undefined;
            const body = bodyExecd && bodyExecd.length > 0 ? bodyExecd[0] : undefined;
            return heading != null && body != null
              ? {
                  heading,
                  body
                }
              : { body: normDescItemStr };
          });
        const instruction =
          alert.properties.instruction
            ?.split('\n\n')
            ?.map((insParagraph: string) => insParagraph.replaceAll('\n', ' ')) ?? [];

        const onsetDayjs = dayjs(alert.properties.onset ?? alert.properties.effective).tz(timeZone);
        const onsetIncludeDay = !onsetDayjs.isSame(now, 'day');
        const onsetFormatted = this.getFormatted(onsetIncludeDay, onsetDayjs);

        const endsDayjs = dayjs(alert.properties.ends ?? alert.properties.expires).tz(timeZone);
        const endsIncludeDay =
          !endsDayjs.isSame(now, 'day') && !(endsDayjs.isSame(onsetDayjs, 'day') && onsetDayjs.isAfter(now));
        const endsFormatted = this.getFormatted(endsIncludeDay, endsDayjs);

        return {
          onset: onsetDayjs.unix(),
          onsetIsoTz: this.getIsoTzString(onsetDayjs),
          onsetLabel: onsetFormatted.label,
          onsetShortTz: onsetFormatted.shortTz,
          ends: endsDayjs.unix(),
          endsIsoTz: this.getIsoTzString(endsDayjs),
          endsLabel: endsFormatted.label,
          endsShortTz: endsFormatted.shortTz,
          severity: alert.properties.severity,
          senderName: alert.properties.senderName,
          title: alert.properties.event,
          description,
          instruction
        };
      })
      .sort((alert1, alert2) => this.getNumericSeverity(alert2.severity) - this.getNumericSeverity(alert1.severity));

    return {
      readTime: response.updated ? dayjs(response.updated).unix() : 0,
      alerts
    };
  }
}
