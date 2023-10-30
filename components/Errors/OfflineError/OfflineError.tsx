import ErrorComponent from 'components/Errors/ErrorComponent';
import { WiFiOffIcon } from 'components/Icons';

export default function OfflineError() {
  return (
    <ErrorComponent
      errorMessage="Reconnect to the internet to check the weather"
      errorTitle="You are offline"
      icon={<WiFiOffIcon />}
    />
  );
}
