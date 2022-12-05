import styles from './Icon.module.css';

// Source: Dept Icon Kit/SVG/01-Interface Essential/14-Alerts/alert-diamond.svg
export default function AlertDiamondIcon({ useInverseFill }: { useInverseFill?: boolean }) {
  return (
    <svg
      className={`${styles.icon} ${useInverseFill ? styles['icon--inverse-fill'] : ''}`}
      aria-hidden="true"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 11.9987C8.41421 11.9987 8.75 11.6629 8.75 11.2487C8.75 10.8344 8.41421 10.4987 8 10.4987C7.58579 10.4987 7.25 10.8344 7.25 11.2487C7.25 11.6629 7.58579 11.9987 8 11.9987Z" />
      <path d="M8 9.49866C7.724 9.49866 7.5 9.27466 7.5 8.99866V3.99866C7.5 3.72266 7.724 3.49866 8 3.49866C8.276 3.49866 8.5 3.72266 8.5 3.99866V8.99866C8.5 9.27466 8.27533 9.49866 8 9.49866Z" />
      <path d="M7.99998 15.998C7.54398 15.998 7.11531 15.8207 6.79331 15.4993L0.499977 9.20666C-0.165357 8.54133 -0.165357 7.458 0.499977 6.79266L6.79331 0.499995C7.11464 0.177995 7.54264 -4.72006e-06 7.99798 -0.000671387C8.45464 -0.000671387 8.88264 0.175995 9.20464 0.497329C9.20931 0.501995 15.5006 6.79266 15.5006 6.79266C16.1653 7.45866 16.1653 8.54133 15.5006 9.20666L9.20731 15.4993C8.88464 15.8207 8.45598 15.998 7.99998 15.998ZM7.49998 14.792C7.63331 14.9247 7.81064 14.998 7.99998 14.998C8.18931 14.998 8.36664 14.9247 8.49998 14.7913L14.7933 8.49866C15.0686 8.22266 15.0686 7.77399 14.7933 7.49799L8.49931 1.20666C8.49264 1.20066 8.48331 1.19 8.47731 1.18333C8.36264 1.07066 8.18598 0.999329 8.00198 0.999329C7.80998 0.999329 7.63331 1.07333 7.49998 1.20666L1.20598 7.5C0.930643 7.776 0.930643 8.22466 1.20598 8.5L7.49998 14.792Z" />
    </svg>
  );
}