import { AQ_COORDINATES_STR } from 'constants/server';
import { DEFAULT_UNITS } from 'constants/shared';
import geodist from 'geodist';
import { Cached, CacheEntry } from 'helpers/api/cached';
import { LoggerHelper } from 'helpers/api/logger-helper';
import { CoordinatesHelper } from 'helpers/coordinates-helper';
import { NumberHelper } from 'helpers/number-helper';
import { WlObservations } from 'models/api/observations.model';
import { ReqQuery } from 'models/api/req-query.model';
import { MinimalQueriedCity } from 'models/cities/cities.model';
import { Unit, UnitType } from 'models/unit.enum';
import { BarometerSensorData, CurrentConditions, MainSensorData } from 'models/weatherlink/current-conditions.model';
import { SensorType } from 'models/weatherlink/sensor-type.enum';
import { Station } from 'models/weatherlink/stations.model';
import { default as WeatherLink } from 'weatherlink';

export class WeatherlinkHelper {
  private static readonly CLASS_NAME = 'WeatherlinkHelper';
  private static readonly apiKey = process.env.WEATHERLINK_API_KEY!;
  private static readonly apiSecret = process.env.WEATHERLINK_API_SECRET!;
  private static readonly wl = WeatherLink({ apiKey: this.apiKey, apiSecret: this.apiSecret });

  private static readonly getAllStationsPromise = this.wl.getAllStations();
  private static async getMainStation(): Promise<Station | undefined> {
    try {
      return (await this.getAllStationsPromise).stations[0];
    } catch (err) {
      LoggerHelper.getLogger(`${this.CLASS_NAME}.getMainStation()`).error(`Couldn't fetch due to an exception`);
      console.error(err);
    }
  }

  static shouldUse(minQueriedCity: MinimalQueriedCity) {
    const distanceToAQ = geodist(
      CoordinatesHelper.strToNumArr(AQ_COORDINATES_STR),
      CoordinatesHelper.cityToNumArr(minQueriedCity),
      {
        exact: true,
        unit: Unit.MILES
      }
    );
    return distanceToAQ < 5;
  }

  private static readonly current = new Cached<CurrentConditions | undefined, undefined>(
    async () => {
      let currentConditions: CurrentConditions | undefined;
      try {
        currentConditions = (await this.wl.getCurrent({
          stationId: (await this.getMainStation())!.station_id
        })) as CurrentConditions;
      } catch (err) {
        LoggerHelper.getLogger(`${this.CLASS_NAME}.current.getItemOnMiss()`).error(
          `Couldn't fetch due to an exception`
        );
        console.error(err);
      }
      return currentConditions;
    },
    async (_: string, newItem: CurrentConditions | undefined) => {
      const lastReading = newItem?.sensors.find(sensor => sensor.sensor_type === SensorType.MAIN)?.data[0]?.ts ?? 0;
      const recordingInterval = ((await this.getMainStation())?.recording_interval ?? 0) * 60;
      return lastReading ? lastReading + recordingInterval + 10 : 0;
    },
    LoggerHelper.getLogger(`${this.CLASS_NAME}.current`)
  );
  static async getCurrent() {
    return this.current.get(AQ_COORDINATES_STR, undefined);
  }

  static mapCurrentToWlObservations(
    cacheEntry: CacheEntry<CurrentConditions | undefined>,
    reqQuery: ReqQuery
  ): WlObservations {
    const wlMain = (cacheEntry.item?.sensors.find(sensor => sensor.sensor_type === SensorType.MAIN)?.data[0] ??
      {}) as MainSensorData;
    const wlBarometer = (cacheEntry.item?.sensors.find(sensor => sensor.sensor_type === SensorType.BAROMETER)
      ?.data[0] ?? {}) as BarometerSensorData;

    const units = NumberHelper.getUnitMappings(DEFAULT_UNITS, reqQuery);

    return {
      readTime: wlMain.ts ?? 0,
      validUntil: cacheEntry.validUntil,
      temperature: NumberHelper.convert(wlMain.temp, units[UnitType.temp]),
      heatIndex: NumberHelper.convert(wlMain.heat_index, units[UnitType.temp]),
      dewPoint: NumberHelper.convert(wlMain.dew_point, units[UnitType.temp]),
      humidity: NumberHelper.round(wlMain.hum, 0),
      wind: {
        speed: NumberHelper.convert(wlMain.wind_speed_avg_last_10_min, units[UnitType.wind]),
        directionDeg: NumberHelper.round(wlMain.wind_dir_scalar_avg_last_10_min, 0),
        gustSpeed: NumberHelper.convert(wlMain.wind_speed_hi_last_10_min, units[UnitType.wind])
      },
      feelsLike: NumberHelper.convert(wlMain.thsw_index ?? wlMain.thw_index, units[UnitType.temp]),
      pressure: {
        atSeaLevel: NumberHelper.convert(
          wlBarometer.bar_sea_level,
          units[UnitType.pressure],
          units[UnitType.pressure].to === Unit.INCHES ? 2 : 1
        ),
        trend: NumberHelper.convert(
          wlBarometer.bar_trend,
          units[UnitType.pressure],
          units[UnitType.pressure].to === Unit.INCHES ? 3 : 1
        )
      },
      rainfall: {
        last15Mins: NumberHelper.convert(wlMain.rainfall_last_15_min_in, units[UnitType.precipitation], 2),
        last1Hrs: NumberHelper.convert(wlMain.rainfall_last_60_min_in, units[UnitType.precipitation], 2),
        last24Hrs: NumberHelper.convert(wlMain.rainfall_last_24_hr_in, units[UnitType.precipitation], 2)
      }
    };
  }
}
