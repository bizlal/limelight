import { useState, useEffect } from 'react';
import { ButtonLink } from '@/components/Button';
import { Container, Spacer, Wrapper } from '@/components/Layout';
import Link from 'next/link';
import styles from './Hero.module.css';

/**
 * Simple equirectangular projection for a 1000 x 500 map:
 *   - Lat in [-90, +90]
 *   - Lon in [-180, +180]
 */
function latLonToXY(lat, lon, width, height) {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

export default function Hero({
  totalUsers = 24010,
  totalArtists = 3450,
  totalFans = 7400,
  totalCities = 820,
  totalFanbaseGrowth = 12000,
}) {
  const [userLatLon, setUserLatLon] = useState({ lat: 0, lon: 0 });
  const [hasLocation, setHasLocation] = useState(false);

  // Example track markers
  const [nearbyTracks] = useState([
    {
      id: 'track1',
      title: 'Song A',
      artist: 'Artist A',
      latitude: 34.0522,
      longitude: -118.2437, // Los Angeles
    },
    {
      id: 'track2',
      title: 'Song B',
      artist: 'Artist B',
      latitude: 40.7128,
      longitude: -74.006, // New York
    },
  ]);

  // Fetch user lat/lon via IP
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.latitude && data.longitude) {
          setUserLatLon({ lat: data.latitude, lon: data.longitude });
          setHasLocation(true);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch IP location', err);
      });
  }, []);

  return (
    <div className={styles.heroWrapper}>
      <Wrapper>
        {/* -- Hero Heading & Subtitle -- */}
        <div className={styles.heroInner}>
          <h1 className={styles.title}>Welcome to Limelight</h1>
          <p className={styles.subtitle}>
            Shine a spotlight on your music and connect with fans worldwide.
          </p>

          {/* -- Buttons -- */}
          <Container justifyContent="center" className={styles.buttons}>
            <Container>
              <Link legacyBehavior passHref href="/feed">
                <ButtonLink className={styles.button}>Explore Feed</ButtonLink>
              </Link>
            </Container>
            <Spacer axis="horizontal" size={1} />
            <Container>
              <Link legacyBehavior passHref href="/sign-up">
                <ButtonLink type="success" className={styles.button}>
                  Sign Up
                </ButtonLink>
              </Link>
            </Container>
          </Container>

          {/* -- Stats Section -- */}
          <div className={styles.statsContainer}>
            <div className={styles.statItem}>
              <h3>{totalUsers.toLocaleString()}</h3>
              <p>Users</p>
            </div>
            <div className={styles.statItem}>
              <h3>{totalArtists.toLocaleString()}</h3>
              <p>Artists</p>
            </div>
            <div className={styles.statItem}>
              <h3>{totalFans.toLocaleString()}</h3>
              <p>Fans</p>
            </div>
            <div className={styles.statItem}>
              <h3>{totalCities.toLocaleString()}</h3>
              <p>Cities Reached</p>
            </div>
            <div className={styles.statItem}>
              <h3>{totalFanbaseGrowth.toLocaleString()}</h3>
              <p>Fanbase Growth</p>
            </div>
          </div>
        </div>
      </Wrapper>

      <Wrapper>
        <div className={styles.infoSections}>
          <section className={styles.infoSection}>
            <h2 className={styles.infoTitle}>How It Works</h2>
            <p className={styles.infoText}>
              Limelight provides artists with powerful tools to upload and share
              their music, while fans discover new favorites and directly engage
              with creators. Create an account, explore curated feeds, follow
              artists, and get real-time updates on new releases.
            </p>
          </section>

          <section className={styles.infoSection}>
            <h2 className={styles.infoTitle}>Who It’s For</h2>
            <p className={styles.infoText}>
              This platform is designed for both aspiring and established
              artists looking to expand their fanbase. It’s also for dedicated
              music lovers who want an easy way to discover fresh sounds and
              support their favorite artists.
            </p>
          </section>

          <section className={styles.infoSection}>
            <h2 className={styles.infoTitle}>How It Helps</h2>
            <p className={styles.infoText}>
              Limelight bridges the gap between creators and their audience,
              offering instant feedback, organic growth, and a personalized
              listening experience. Artists can build loyal communities, while
              fans access exclusive content and early releases from rising
              stars.
            </p>
          </section>
        </div>
      </Wrapper>

      {/* -- Token & Roadmap Sections -- */}
      <Wrapper>
        {/* Token Details */}
        <div className={styles.tokenSection}>
          <h2 className={styles.tokenTitle}>Introducing LMLT</h2>
          <p className={styles.tokenText}>
            LMLT (Limelight Token) is our native ERC-20 token that powers
            transactions and rewards within the Limelight ecosystem. Artists and
            fans can earn LMLT by engaging with content, and spend it on
            exclusive features, merchandise, and premium access. Holding LMLT
            also grants voting rights in platform governance, enabling our
            community to shape the future of Limelight.
          </p>
          <ul className={styles.tokenBenefits}>
            <li>
              <strong>Symbol:</strong> LMLT
            </li>
            <li>
              <strong>Standard:</strong> ERC-20
            </li>
            <li>
              <strong>Total Supply:</strong> 100M tokens
            </li>
            <li>
              <strong>Utility:</strong> Rewards, Governance, Premium Access
            </li>
          </ul>
        </div>

        <Spacer size={3} axis="vertical" />

        {/* Artist Tokens & Bonding Curve */}
        <div className={styles.artistTokensSection}>
          <h2 className={styles.artistTokensTitle}>
            Artist Tokens & Bonding Curves
          </h2>
          <p className={styles.artistTokensText}>
            Each artist on Limelight can launch their own token, providing fans
            with a unique way to invest and participate in an artist’s success.
            These <strong>Artist Tokens</strong> follow a dynamic{' '}
            <strong>bonding curve</strong> mechanism, which automatically
            adjusts the token price based on supply and demand. As more fans buy
            an artist’s token, its price increases following the curve’s
            formula—and if tokens are sold, the price decreases accordingly.
            This ensures transparent, real-time valuation of an artist’s market
            momentum.
          </p>
          <ul className={styles.bondingCurveBenefits}>
            <li>Fair, algorithmic pricing based on real demand</li>
            <li>
              Early supporters benefit from appreciation as the artist grows
            </li>
            <li>Artists gain immediate liquidity without intermediaries</li>
          </ul>
        </div>

        <Spacer size={3} axis="vertical" />

        {/* Roadmap */}
        <div className={styles.roadmapSection}>
          <h2 className={styles.roadmapTitle}>Our Roadmap</h2>
          <ol className={styles.roadmapList}>
            <li>
              <strong>Phase 1: Beta Launch</strong>
              <p>
                Core platform features, basic user onboarding, initial token
                distribution.
              </p>
            </li>
            <li>
              <strong>Phase 2: Community Growth</strong>
              <p>
                Introduce new social features, expand geographic reach, build up
                LMLT liquidity pools.
              </p>
            </li>
            <li>
              <strong>Phase 3: Marketplace & Governance</strong>
              <p>
                Enable NFT marketplace, staking rewards, and DAO-like governance
                with LMLT voting.
              </p>
            </li>
            <li>
              <strong>Phase 4: Global Expansion</strong>
              <p>
                Further partnerships, multi-language support, and large-scale
                marketing campaigns.
              </p>
            </li>
          </ol>
          <p className={styles.roadmapCurrent}>
            <em>Current Stage:</em> We’re wrapping up Phase 2 and preparing to
            launch Phase 3.
          </p>
        </div>
      </Wrapper>
    </div>
  );
}
