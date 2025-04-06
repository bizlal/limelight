import { sdk } from '@audius/sdk';

let audiusSdk = null;

const initAudiusSdk = () => {
  audiusSdk = sdk({
    appName: 'limelight',
    apiKey: process.env.AUDIUS_KEY,
    apiSecret: process.env.AUDIUS_SECRET,
  });
};

initAudiusSdk();

export { audiusSdk };
