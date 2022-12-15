import styles from './Icon.module.css';

export enum ThermometerLevel {
  LOW,
  MEDIUM,
  HIGH
}

// Source (adaptation of): Dept Icon Kit/SVG/34-Weather/06-Temperatures/temperature-thermometer-high.svg
export default function ThermometerIcon({ level }: { level: ThermometerLevel }) {
  return (
    <svg className={styles.icon} aria-hidden="true" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      {level === ThermometerLevel.LOW ? (
        <path d="M8.01001 13.9973C7.18268 13.9973 6.51001 13.3247 6.51001 12.4973C6.51001 11.8573 6.92001 11.292 7.51001 11.0833V9.99733C7.51001 9.72133 7.73401 9.49733 8.01001 9.49733C8.28601 9.49733 8.51001 9.72133 8.51001 9.99733V11.0833C9.10001 11.292 9.51001 11.8573 9.51001 12.4973C9.51001 13.3247 8.83668 13.9973 8.01001 13.9973ZM8.01001 11.9973C7.73401 11.9973 7.51001 12.2213 7.51001 12.4973C7.51001 12.7733 7.73401 12.9973 8.01001 12.9973C8.28601 12.9973 8.51001 12.7733 8.51001 12.4973C8.51001 12.2213 8.28534 11.9973 8.01001 11.9973Z" />
      ) : (
        <></>
      )}
      {level === ThermometerLevel.MEDIUM ? (
        <path d="M8.00818 13.9857C7.18085 13.9857 6.50818 13.3136 6.50818 12.4869C6.50818 11.8475 6.91818 11.2826 7.50818 11.0741V6.9915C7.50818 6.71573 7.73218 6.49192 8.00818 6.49192C8.28418 6.49192 8.50818 6.71573 8.50818 6.9915V11.0741C9.09818 11.2826 9.50818 11.8475 9.50818 12.4869C9.50818 13.3136 8.83485 13.9857 8.00818 13.9857ZM8.00818 11.9873C7.73218 11.9873 7.50818 12.2112 7.50818 12.4869C7.50818 12.7627 7.73218 12.9865 8.00818 12.9865C8.28418 12.9865 8.50818 12.7627 8.50818 12.4869C8.50818 12.2112 8.28351 11.9873 8.00818 11.9873Z" />
      ) : (
        <></>
      )}
      {level === ThermometerLevel.HIGH ? (
        <path d="M8.01001 13.9973C7.18268 13.9973 6.51001 13.3247 6.51001 12.4973C6.51001 11.8573 6.92001 11.292 7.51001 11.0833V2.49733C7.51001 2.22133 7.73401 1.99733 8.01001 1.99733C8.28601 1.99733 8.51001 2.22133 8.51001 2.49733V11.0833C9.10001 11.292 9.51001 11.8573 9.51001 12.4973C9.51001 13.3247 8.83668 13.9973 8.01001 13.9973ZM8.01001 11.9973C7.73401 11.9973 7.51001 12.2213 7.51001 12.4973C7.51001 12.7733 7.73401 12.9973 8.01001 12.9973C8.28601 12.9973 8.51001 12.7733 8.51001 12.4973C8.51001 12.2213 8.28534 11.9973 8.01001 11.9973Z" />
      ) : (
        <></>
      )}
      <path d="M8.00757 15.9973C7.0109 15.9973 6.05957 15.573 5.3969 14.833C4.1569 13.4475 4.21157 11.3692 5.50557 10.0536V2.49525C5.50557 1.11773 6.6269 -0.00266647 8.00557 -0.00266647C9.38424 -0.00266647 10.5056 1.11773 10.5056 2.49525V10.0543C10.5422 10.0923 10.5789 10.1309 10.6142 10.1702C11.9009 11.607 11.7776 13.8225 10.3389 15.1081C9.69757 15.6816 8.86957 15.9973 8.00757 15.9973ZM8.00624 0.996501C7.1789 0.996501 6.50624 1.66861 6.50624 2.49525V10.2674C6.50624 10.4093 6.44557 10.5452 6.33957 10.6398C5.8429 11.0841 5.54824 11.6956 5.5109 12.363C5.47357 13.0298 5.69824 13.6706 6.14224 14.1669C6.6149 14.6951 7.2949 14.9982 8.0069 14.9982C8.6229 14.9982 9.21424 14.7724 9.67224 14.3634C10.1689 13.9191 10.4629 13.3076 10.5002 12.6408C10.5376 11.974 10.3129 11.3332 9.8689 10.837C9.80757 10.7684 9.7409 10.7017 9.67224 10.6405C9.56624 10.5459 9.50557 10.41 9.50557 10.2681V2.49525C9.50624 1.66927 8.8329 0.996501 8.00624 0.996501Z" />
    </svg>
  );
}