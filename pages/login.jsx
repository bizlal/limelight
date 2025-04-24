import { ConnectAudius } from '@/components/ConnectAudius/ConnectSpotify/ConnectAudius';
import Head from 'next/head';

const LoginPage = () => {
  return (
    <>
      <Head>
        <title>Login</title>
      </Head>

      <ConnectAudius />
    </>
  );
};

export default LoginPage;
