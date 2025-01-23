import Head from 'next/head';
import Footer from './Footer';
import styles from './Layout.module.css';
import Nav from './Nav';

const Layout = ({ children }) => {
  return (
    <>
      <Head>
        <title>Limelight</title>
        <meta
          key="viewport"
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta
          name="description"
          content="Limelight provides artists with powerful tools to upload and share their music, while fans discover new favorites and directly engage with creators."
        />
        <meta property="og:title" content="Limelight" />
        <meta
          property="og:description"
          content="Limelight provides artists with powerful tools to upload and share their music, while fans discover new favorites and directly engage with creators."
        />
        <meta
          property="og:image"
          content="https://example.com/path-to-your-image.jpg"
        />
      </Head>
      <Nav />
      <main className={styles.main}>{children}</main>
      <Footer />
    </>
  );
};

export default Layout;
