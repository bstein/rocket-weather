import { useEffect, useState } from 'react';
import { Color } from 'models';
import { NwsPeriod } from 'models/api';
import StandardCardHeader from './CardHeader/StandardCardHeader';
import Forecast from './Forecast/Forecast';
import ForecastTemps from './ForecastTemps/ForecastTemps';
import styles from './Card.module.css';

const ANIMATED_HOURLY_FORECASTS_WRAPPER_ID = 'HourlyForecastsWrapper';

export default function ForecastCard({
  isLoading,
  latestReadTime,
  period,
  _key
}: {
  isLoading?: boolean;
  latestReadTime?: number;
  period: NwsPeriod;
  _key: string;
}) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [animatedContentsWrapperIds, setAnimatedContentsWrapperIds] = useState<string[]>([
    `${ANIMATED_HOURLY_FORECASTS_WRAPPER_ID}-day`,
    `${ANIMATED_HOURLY_FORECASTS_WRAPPER_ID}-night`
  ]);
  useEffect(() => {
    const baseId = `${ANIMATED_HOURLY_FORECASTS_WRAPPER_ID}-${_key}`;
    setAnimatedContentsWrapperIds([`${baseId}-day`, `${baseId}-night`]);
  }, [_key]);

  return (
    <article className={styles.card}>
      <StandardCardHeader
        isLoading={isLoading}
        lastUpdatedTime={latestReadTime}
        label={period.dayName}
        secondaryLabel={period.shortDateName}
        backgroundColor={Color.ONYX}
        disabledExpand={!period.dayHourlyForecasts?.length && !period.nightHourlyForecasts?.length}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        ariaControls={animatedContentsWrapperIds.join(',')}
      ></StandardCardHeader>
      <div className={styles['card-contents']}>
        <div className={`${styles['card-contents__overview']} ${styles['card-contents__overview--forecast']}`}>
          <ForecastTemps
            highTemperature={period.dayForecast?.temperature}
            lowTemperature={period.nightForecast?.temperature}
          ></ForecastTemps>
        </div>
        <div className={styles['card-contents__forecasts']}>
          <Forecast
            isDaytime={true}
            isExpanded={isExpanded}
            summaryForecast={period.dayForecast}
            hourlyForecasts={period.dayHourlyForecasts}
            animatedContentsWrapperId={animatedContentsWrapperIds[0]}
          ></Forecast>
          <Forecast
            isDaytime={false}
            isExpanded={isExpanded}
            summaryForecast={period.nightForecast}
            hourlyForecasts={period.nightHourlyForecasts}
            animatedContentsWrapperId={animatedContentsWrapperIds[1]}
          ></Forecast>
        </div>
      </div>
    </article>
  );
}
