import { ComponentPropsWithoutRef } from 'react';
import { Overlay } from 'components/Header/Overlay/Overlay';
import { SettingsOverlayProps } from 'components/Header/SettingsOverlay/SettingsOverlay.types';
import { SearchQueryHelper } from 'helpers/search-query-helper';
import { SearchResultCity } from 'models/cities/cities.model';

import styles from './SettingsOverlay.module.css';
import homeStyles from 'styles/Home.module.css';

const NotificationsRow = ({
  city,
  className,
  ...props
}: { city: SearchResultCity } & Omit<ComponentPropsWithoutRef<'input'>, 'children' | 'name' | 'type'>) => (
  <label className={`${styles['notifications-row__label']} ${className ?? ''}`}>
    <input name={city.geonameid} type="checkbox" {...props} />
    <span>{SearchQueryHelper.getCityAndStateCode(city)}</span>
  </label>
);

const Radio = ({
  className,
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<'input'>, 'type'> &
  Required<Pick<ComponentPropsWithoutRef<'input'>, 'name' | 'children'>>) => (
  <label className={`${styles['radio-label']} ${className ?? ''}`}>
    <input type="radio" {...props} />
    <span>{children}</span>
  </label>
);

export function SettingsOverlay({ showOverlay }: SettingsOverlayProps) {
  // TODO - handle ESC key press
  return (
    <Overlay innerClassName={`${styles.inner} ${homeStyles.container__content}`} showOverlay={showOverlay}>
      <div className={styles['form-container']}>
        {/* TODO - WIP */}
        <form className={`animated ${styles['form']} ${showOverlay ? styles['form--end'] : ''}`}>
          <fieldset>
            <legend className={styles.section__header}>Theme</legend>
            <div className={styles['section__radio-group']}>
              <Radio name="theme">Auto</Radio>
              <Radio name="theme">System</Radio>
              <Radio name="theme">Light</Radio>
              <Radio name="theme">Dark</Radio>
            </div>
          </fieldset>
          <fieldset>
            <legend className={styles.section__header}>Units</legend>
            <div className={`${styles.section__sub} ${styles['section__sub--units']}`}>
              <legend className={styles.section__sub__header}>Temperature</legend>
              <Radio className={styles['section__sub__grid-col-3']} name="temperature">
                °F
              </Radio>
              <Radio name="temperature">°C</Radio>
              <legend className={styles.section__sub__header}>Wind Speed</legend>
              <Radio className={styles['section__sub__grid-col-3']} name="windSpeed">
                miles
              </Radio>
              <Radio name="windSpeed">meters</Radio>
              <legend className={styles.section__sub__header}>Pressure</legend>
              <Radio name="pressure">in</Radio>
              <Radio name="pressure">mb</Radio>
              <Radio name="pressure">pa</Radio>
              <legend className={styles.section__sub__header}>Precipitation</legend>
              <Radio className={styles['section__sub__grid-col-3']} name="precipitation">
                in
              </Radio>
              <Radio name="precipitation">mm</Radio>
            </div>
          </fieldset>
          <fieldset>
            <legend className={styles.section__header}>
              Notifications
              <span className={styles.section__header__description}>
                Receive severe weather alerts for selected cities
              </span>
            </legend>

            <div className={styles.section__notifications}>
              <NotificationsRow city={{ geonameid: '4560349', cityAndStateCode: 'Philadelphia, PA' }} />
              <NotificationsRow city={{ geonameid: '', cityAndStateCode: 'New York City, NY' }} />
              <NotificationsRow city={{ geonameid: '', cityAndStateCode: 'Washington, DC' }} />
            </div>
          </fieldset>
        </form>
      </div>
    </Overlay>
  );
}
