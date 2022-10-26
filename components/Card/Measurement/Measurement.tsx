import { cloneElement, ReactElement, ReactNode } from 'react';
import styles from './Measurement.module.css';

export default function Measurement({
  value,
  secondaryValue,
  icon,
  label
}: {
  value?: string | number;
  secondaryValue?: string | number;
  icon?: ReactElement;
  label?: string;
}) {
  return (
    <div className={styles.measurement}>
      <p className={styles['measurement__value']}>{value}</p>
      {secondaryValue ? <p className={styles['measurement__secondary-value']}>{secondaryValue}</p> : <></>}
      <div className={styles['measurement__description']}>
        {icon != null ? (
          cloneElement(icon, { className: `${icon.props.className ?? ''} ${styles['measurement__description__icon']}` })
        ) : (
          <></>
        )}
        <p className={styles['measurement__description__label']}>{label}</p>
      </div>
    </div>
  );
}