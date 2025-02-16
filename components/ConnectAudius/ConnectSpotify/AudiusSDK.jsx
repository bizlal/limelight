import { sdk } from '@audius/sdk';

let audiusSdk = null;

const initAudiusSdk = () => {
  audiusSdk = sdk({ appName: 'limelight', apiKey: process.env.AUDIUS_KEY });
};

initAudiusSdk();

export { audiusSdk };
