import { useEffect, useState } from 'react';
import { StandardCardHeader } from 'components/Card/CardHeader/StandardCardHeader';
import { Condition } from 'components/Card/Condition/Condition';
import { CurrentTemp } from 'components/Card/CurrentTemp/CurrentTemp';
import { AirQuality } from 'components/Card/Measurement/AirQuality';
import { Humidity } from 'components/Card/Measurement/Humidity';
import { Precipitation } from 'components/Card/Measurement/Precipitation';
import { Pressure } from 'components/Card/Measurement/Pressure';
import { UVIndex } from 'components/Card/Measurement/UVIndex';
import { Wind } from 'components/Card/Measurement/Wind';
import { AppThemeHelper } from 'helpers/app-theme-helper';
import { Observations, SunTimesObservations } from 'models/api/observations.model';
import { Color } from 'models/color.enum';
import { UnitChoices, UnitType } from 'models/unit.enum';

import styles from './Card.module.css';

const getIsNight = (sunData?: SunTimesObservations) => {
  let isNight: boolean | undefined;
  if (sunData?.sunrise != null && sunData?.sunset != null) {
    const now = new Date();
    const sunrise = new Date(sunData.sunrise * 1_000);
    const sunset = new Date(sunData.sunset * 1_000);
    isNight = now < sunrise || sunset < now;
  }
  return isNight;
};

export function ObservationsCard({
  units,
  isLoading,
  latestReadTime,
  observations
}: {
  units: Pick<UnitChoices, UnitType.wind | UnitType.pressure | UnitType.precipitation>;
  isLoading?: boolean;
  latestReadTime?: number;
  observations?: Observations;
}) {
  const [isNight, setIsNight] = useState<boolean>();
  useEffect(() => {
    const newIsNight = getIsNight(observations?.sun);
    if (newIsNight !== isNight) {
      setIsNight(newIsNight);
      AppThemeHelper.updateColorScheme(newIsNight ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observations?.sun]);

  return (
    <article className={styles.card}>
      <StandardCardHeader
        backgroundColor={Color.INDIGO}
        foregroundColor={Color.WHITE}
        isLoading={isLoading}
        label="Now"
        lastUpdatedTime={latestReadTime}
      />
      <div className={styles['card-contents']}>
        <div className={styles['card-contents__overview']}>
          <CurrentTemp observations={observations?.wl ?? observations?.nws} />
          <Condition condition={observations?.nws?.textDescription} isNight={isNight} size="large" />
        </div>
        <div className={styles['card-contents__measurements']}>
          <Wind includeGustSpeed units={units} wind={observations?.wl?.wind ?? observations?.nws?.wind} />
          <UVIndex epaData={observations?.epa} />
          <AirQuality airnowData={observations?.airnow} />
          <Humidity humidity={observations?.wl?.humidity ?? observations?.nws?.humidity} />
          <Pressure pressure={observations?.wl?.pressure ?? observations?.nws?.pressure} units={units} />
          {observations?.wl?.rainfall?.last24Hrs != null ? (
            <Precipitation
              label="Last 24hr Rainfall"
              precipitation={observations.wl.rainfall.last24Hrs}
              units={units}
            />
          ) : (
            <Precipitation
              label="Last 6hr Precip"
              precipitation={observations?.nws?.precipitation?.last6Hrs}
              units={units}
            />
          )}
        </div>
      </div>
    </article>
  );
}
