import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useSpring, animated } from 'react-spring';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

import { ButtonLink } from '@/components/Button';
import { Container, Spacer, Wrapper } from '@/components/Layout';
import { useState } from 'react';
import map from '@/assets/images/map.png';
import styles from './Hero.module.css';

// Register all necessary Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

/**
 * Example Pie Chart: Token Distribution
 */
function TokenDistributionChart() {
  const data = {
    labels: [
      'Team & Advisors',
      'Marketing',
      'Ecosystem/Rewards',
      'Liquidity',
      'Partnerships',
    ],
    datasets: [
      {
        label: 'Token Allocation',
        data: [20, 10, 40, 15, 15],
        backgroundColor: [
          '#f87171', // red
          '#fbbf24', // amber
          '#34d399', // green
          '#60a5fa', // blue
          '#a78bfa', // purple
        ],
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#fff',      // <-- White legend text
        },
      },
      tooltip: {
        titleColor: '#fff',  // <-- White tooltip text
        bodyColor: '#fff',
      },
    },
  };

  return <Pie data={data} options={options} />;
}

/********************************************************
 * FAQ Item (expand/collapse)
 ********************************************************/
function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className={`${styles.faqItem} ${isOpen ? styles.expanded : ''}`}>
      <div className={styles.faqQuestion} onClick={onToggle}>
        <span>{question}</span>
        <span className={styles.faqIcon}>{isOpen ? '-' : '+'}</span>
      </div>
      <div
        className={styles.faqAnswer}
        style={{
          maxHeight: isOpen ? '300px' : '0px',
          padding: isOpen ? '0.75rem 0' : '0',
        }}
      >
        <p>{answer}</p>
      </div>
    </div>
  );
}

/********************************************************
 * FAQ Section
 ********************************************************/
function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqData = [
    {
      question: 'How do I launch an Artist Token?',
      answer:
        'Simply navigate to the “Launch Token” wizard in your dashboard. Pay the 0.05 ETH setup fee, choose a token name, and your token will be live with our bonding curve.',
    },
    {
      question: 'What is LMLT?',
      answer:
        'LMLT (Limelight Token) is our native ERC-20 token for rewards, governance, and transactions across the Limelight ecosystem.',
    },
    {
      question: 'Can I withdraw my Artist Tokens at any time?',
      answer:
        'Yes, your tokens follow our bonding curve, so you can buy or sell them anytime. Price adjusts dynamically based on supply and demand.',
    },
    {
      question: 'Are there fees for trading Artist Tokens?',
      answer:
        'A small transaction fee is taken to cover gas costs and support platform development. The exact fee varies based on network congestion.',
    },
  ];

  return (
    <div className={`${styles.faqSection} ${styles.card}`}>
      <h2 className={styles.faqTitle}>Frequently Asked Questions</h2>
      {faqData.map((item, idx) => (
        <FAQItem
          key={idx}
          question={item.question}
          answer={item.answer}
          isOpen={openIndex === idx}
          onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
        />
      ))}
    </div>
  );
}

/**
 * Example Bar Chart: Vesting & Circulating Supply
 * Team & Advisors has 3-month cliff, then linear vesting over 12 months.
 */
function VestingChart() {
  const labels = [];
  for (let i = 0; i <= 12; i++) {
    labels.push(`Month ${i}`);
  }

  // Other allocations fully unlocked at T=0 for simplicity
  const marketing = 10; 
  const ecosystem = 40;
  const liquidity = 15;
  const partnerships = 15;

  // Team logic: 3-month cliff => 0% until Month 3, then vest over next 12 months
  function getTeamVested(month) {
    if (month < 3) return 0;
    const totalVestingMonths = 12; // from month 3..15
    const monthsSinceCliff = month - 3;
    const fraction = monthsSinceCliff / totalVestingMonths;
    const vested = 20 * fraction; 
    return vested > 20 ? 20 : vested;
  }

  const teamData = labels.map((_, idx) => getTeamVested(idx));
  const marketingData = labels.map(() => marketing);
  const ecosystemData = labels.map(() => ecosystem);
  const liquidityData = labels.map(() => liquidity);
  const partnershipsData = labels.map(() => partnerships);

  const data = {
    labels,
    datasets: [
      {
        label: 'Team & Advisors',
        data: teamData,
        backgroundColor: '#f87171',
      },
      {
        label: 'Marketing',
        data: marketingData,
        backgroundColor: '#fbbf24',
      },
      {
        label: 'Ecosystem/Rewards',
        data: ecosystemData,
        backgroundColor: '#34d399',
      },
      {
        label: 'Liquidity',
        data: liquidityData,
        backgroundColor: '#60a5fa',
      },
      {
        label: 'Partnerships',
        data: partnershipsData,
        backgroundColor: '#a78bfa',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#fff',      // <-- White legend text
        },
      },
      tooltip: {
        titleColor: '#fff',  // <-- White tooltip text
        bodyColor: '#fff',
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'Time (Months)',
          color: '#fff',      // <-- White axis label
        },
        ticks: {
          color: '#fff',      // <-- White axis ticks
        },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Percentage of Total Supply',
          color: '#fff',
        },
        ticks: {
          color: '#fff',
          callback: function (value) {
            return value + '%';
          },
        },
      },
    },
  };

  return <Bar data={data} options={options} />;
}

/**
 * Example Line Chart: Bonding Curve for Artist Tokens
 * Price = k * supply^2 (for demonstration).
 */
function BondingCurveChart() {
  const labels = [];
  const dataPoints = [];
  const k = 0.0000001; // small constant

  // E.g., supply from 0..10000
  for (let supply = 0; supply <= 10000; supply += 1000) {
    labels.push(supply.toString());
    dataPoints.push(k * supply * supply);
  }

  const data = {
    labels,
    datasets: [
      {
        label: 'Artist Token Price (LMLT)',
        data: dataPoints,
        borderColor: '#60a5fa',
        backgroundColor: '#60a5fa88',
        fill: true,
        tension: 0.2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#fff', // White legend text
        },
      },
      tooltip: {
        titleColor: '#fff', // White tooltip text
        bodyColor: '#fff',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Supply of Artist Tokens',
          color: '#fff',
        },
        ticks: { color: '#fff' },
      },
      y: {
        title: {
          display: true,
          text: 'Token Price (LMLT)',
          color: '#fff',
        },
        ticks: {
          color: '#fff',
          // e.g., custom formatting
          callback: function (value) {
            return value.toFixed(3) + ' LMLT';
          },
        },
      },
    },
  };

  return <Line data={data} options={options} />;
}


/********************************************************
 *  Roadmap FAQ-Style
 ********************************************************/
function RoadmapSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const roadmapPhases = [
    {
      phase: 'Phase 1: Beta Launch',
      details: `Core platform features, basic user onboarding, initial token distribution.`,
    },
    {
      phase: 'Phase 2: Community Growth',
      details: `Introduce new social features, expand geographic reach, build up LMLT liquidity pools.`,
    },
    {
      phase: 'Phase 3: Marketplace & Governance',
      details: `Enable NFT marketplace, staking rewards, and DAO-like governance with LMLT voting.`,
    },
    {
      phase: 'Phase 4: Global Expansion',
      details: `Further partnerships, multi-language support, and large-scale marketing campaigns.`,
    },
  ];

  return (
    <div className={`${styles.roadmapSection} ${styles.card}`}>
      <h2 className={styles.roadmapTitle}>Our Roadmap</h2>

      {/* Map each phase as a collapsible item */}
      {roadmapPhases.map((item, idx) => (
        <div
          key={idx}
          className={`${styles.roadmapItem} ${
            openIndex === idx ? styles.expanded : ''
          }`}
        >
          <div
            className={styles.roadmapQuestion}
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
          >
            <span>{item.phase}</span>
            <span className={styles.roadmapIcon}>
              {openIndex === idx ? '-' : '+'}
            </span>
          </div>
          <div
            className={styles.roadmapAnswer}
            style={{
              maxHeight: openIndex === idx ? '200px' : '0px',
              padding: openIndex === idx ? '0.75rem 0' : '0',
            }}
          >
            <p>{item.details}</p>
          </div>
        </div>
      ))}

      {/* Current stage text below the items */}
      <p className={styles.roadmapCurrent}>
        <em>Current Stage:</em> We’re wrapping up Phase 2 and preparing to
        launch Phase 3.
      </p>
    </div>
  );
}

/**
 * AnimatedNumber: Animates numeric value using react-spring
 */
function AnimatedNumber({ value }) {
  const props = useSpring({
    number: value,
    from: { number: 0 },
    config: { duration: 2000 },
  });
  return (
    <animated.span>
      {props.number.to((n) => Math.floor(n).toLocaleString())}
    </animated.span>
  );
}

export default function Hero({
  totalUsers = 24010,
  totalArtists = 3450,
  totalFans = 7400,
  totalCities = 820,
}) {
  return (
    <>
      {/* SEO Head Section */}
      <Head>
        <title>Limelight: Shine a Spotlight on Your Music</title>
        <meta
          name="description"
          content="Limelight is a platform for artists to connect with fans worldwide, showcase music, earn through tokens, and build loyal communities."
        />
        <meta
          name="keywords"
          content="limelight, music platform, artists, fans, tokens, streaming, discover"
        />
        <meta property="og:title" content="Limelight Music Platform" />
        <meta
          property="og:description"
          content="Shine a spotlight on your music and connect with fans worldwide on Limelight."
        />
        <meta property="og:image" content="/images/limelight-hero.jpg" />
        <meta property="og:url" content="https://lmlt.ai" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Limelight Music Platform" />
        <meta
          name="twitter:description"
          content="Upload, discover, and earn with our music ecosystem. Artists and fans unite on Limelight."
        />
        <meta name="twitter:image" content="/images/limelight-hero.jpg" />
      </Head>

      <div className={styles.heroWrapper}>
        <Wrapper>
          <div className={styles.heroInner}>
            <h1 className={styles.title}>Welcome to Limelight</h1>
            <p className={styles.subtitle}>
              Shine a spotlight on your music and connect with fans worldwide.
            </p>

            <Container justifyContent="center" className={styles.buttons}>
              <Container>
                <Link legacyBehavior passHref href="/feed">
                  <ButtonLink className={styles.button}>Explore Feed</ButtonLink>
                </Link>
              </Container>
              <Spacer axis="horizontal" size={1} />
            </Container>

            <div className={styles.mapBackground}>
              <Image
                src={map}
                alt="Map background"
                layout="fill"
                objectFit="cover"
                objectPosition="center"
                priority
              />
            </div>

            {/* Stats */}
            <div className={styles.statsWrapper}>
              <div className={styles.statsContainer}>
                <div className={styles.statItem}>
                  <h3>
                    <AnimatedNumber value={totalUsers} />
                  </h3>
                  <p>Users</p>
                </div>
                <div className={styles.statItem}>
                  <h3>
                    <AnimatedNumber value={totalArtists} />
                  </h3>
                  <p>Artists</p>
                </div>
                <div className={styles.statItem}>
                  <h3>
                    <AnimatedNumber value={totalFans} />
                  </h3>
                  <p>Total Streams</p>
                </div>
                <div className={styles.statItem}>
                  <h3>
                    <AnimatedNumber value={totalCities} />
                  </h3>
                  <p>Cities Reached</p>
                </div>
              </div>
            </div>
          </div>
        </Wrapper>

        {/* Info Sections */}
        <Wrapper>
          <div className={styles.infoSections}>
            <section className={`${styles.infoSection} ${styles.card}`}>
              <h2 className={styles.infoTitle}>How It Works</h2>
              <p className={styles.infoText}>
                Limelight provides artists with powerful tools to upload and
                share their music, while fans discover new favorites and
                directly engage with creators.
              </p>
            </section>

            <section className={`${styles.infoSection} ${styles.card}`}>
              <h2 className={styles.infoTitle}>Who It’s For</h2>
              <p className={styles.infoText}>
                This platform is designed for both aspiring and established
                artists, as well as dedicated music lovers who want an easy way
                to discover fresh sounds and support their favorite creators.
              </p>
            </section>

            <section className={`${styles.infoSection} ${styles.card}`}>
              <h2 className={styles.infoTitle}>How It Helps</h2>
              <p className={styles.infoText}>
                Limelight bridges the gap between creators and their audience,
                offering instant feedback, organic growth, and a personalized
                listening experience. Artists can build loyal communities while
                fans enjoy exclusive content and early releases.
              </p>
            </section>
          </div>
        </Wrapper>

        {/* Token & Roadmap Sections */}
        <Wrapper>
          {/* TOKEN DETAILS */}
          <div className={`${styles.tokenSection} ${styles.card}`}>
            <h2 className={styles.tokenTitle}>Introducing LMLT</h2>
            <p className={styles.tokenText}>
              LMLT (Limelight Token) is our native ERC-20 token that powers
              transactions and rewards within the Limelight ecosystem. Artists
              and fans can earn LMLT by engaging with content, and spend it on
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

            {/* Distribution Chart + Table */}
            <div className={styles.distributionSection}>
              <h3 className={styles.distributionTitle}>Token Distribution</h3>
              <div className={styles.distributionContent}>
                <div className={styles.chartWrapper}>
                  <TokenDistributionChart />
                </div>

                <table className={styles.distributionTable}>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Allocation</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Team &amp; Advisors</td>
                      <td>20%</td>
                      <td>Core team, long-term vesting</td>
                    </tr>
                    <tr>
                      <td>Marketing</td>
                      <td>10%</td>
                      <td>Promotions, brand awareness</td>
                    </tr>
                    <tr>
                      <td>Ecosystem/Rewards</td>
                      <td>40%</td>
                      <td>In-app rewards, user incentives</td>
                    </tr>
                    <tr>
                      <td>Liquidity</td>
                      <td>15%</td>
                      <td>DEX/CEX liquidity pools</td>
                    </tr>
                    <tr>
                      <td>Partnerships</td>
                      <td>15%</td>
                      <td>Strategic integrations, expansions</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vesting Chart + Explanation */}
                  <div className={styles.vestingSection}>
                    <h3 className={styles.vestingTitle}>Vesting &amp; Circulating Supply</h3>
                    <div className={styles.chartWrapper}>
                    <VestingChart />
                    </div>
                    <p className={styles.vestingInfo}>
                    The Team &amp; Advisors tokens (20% total) have a 3-month cliff
                    with linear vesting over the following 12 months. Other
                    allocations unlock immediately. This chart shows how each
                    category’s percentage contributes to circulating supply over
                    time.
                    </p>
                  </div>
                  </div>

                  <Spacer size={0} axis="vertical" />

                
<div className={`${styles.artistTokensSection} ${styles.card}`}>
  <h2 className={styles.artistTokensTitle}>Artist Tokens &amp; Bonding Curves</h2>
  <p className={styles.artistTokensText}>
    Each artist on Limelight can launch their own token, providing
    fans with a unique way to invest and participate in the artist’s
    growth. These <strong>Artist Tokens</strong> follow a dynamic
    <strong> bonding curve</strong>, where the price adjusts in real
    time based on supply and demand. Early supporters benefit as
    price rises with demand, while artists gain immediate liquidity
    to fund future projects.
  </p>


    <p className={styles.artistTokensText}>
      Launching an Artist Token costs <strong>0.05 ETH</strong> for
      smart contract deployment and initial setup. This fee covers the
      secure creation of your token contract, the bonding curve logic,
      and your personalized token dashboard. In return, you gain full
      access to Limelight’s suite of tools for token management,
      analytics, and fan engagement.
    </p>

    <div className={styles.distributionSection}>
      <h3 className={styles.distributionTitle}>Bonding Curve Demo</h3>
      <div className={styles.chartWrapper}>
        <BondingCurveChart />
      </div>
      <table className={styles.distributionTable}>
        <thead>
          <tr>
            <th>Supply</th>
            <th>Price (LMLT)</th>
            <th>Price (USD)</th>
            <th>Key Benefit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0</td>
            <td>0 LMLT</td>
            <td>$0.00</td>
            <td>Initial launch price (essentially free to mint first tokens)</td>
          </tr>
          <tr>
            <td>1,000</td>
            <td>~0.0001 LMLT</td>
            <td>~$0.0001</td>
            <td>Early supporters acquire tokens at a fractional cost</td>
          </tr>
          <tr>
            <td>5,000</td>
            <td>~0.0025 LMLT</td>
            <td>~$0.0025</td>
            <td>Artist gains traction, price reflects rising demand</td>
          </tr>
          <tr>
            <td>10,000</td>
            <td>~0.01 LMLT</td>
            <td>~$0.01</td>
            <td>New fans drive demand, increasing token price further</td>
          </tr>
          <tr>
            <td>50,000</td>
            <td>~0.10 LMLT</td>
            <td>~$0.10</td>
            <td>Significant fanbase expansion, strong liquidity</td>
          </tr>
          <tr>
            <td>100,000</td>
            <td>~0.25 LMLT</td>
            <td>~$0.25</td>
            <td>Artist token sees mainstream attention & coverage</td>
          </tr>
        </tbody>
      </table>
    </div>

    {/* Purchase Examples */}
    <div className={styles.examplesSection}>
      <h3 className={styles.examplesTitle}>Purchase Scenarios</h3>
      <p>
        Below are a few scenarios showing how fans might buy into an
        Artist Token on the bonding curve.
      </p>
      <table className={styles.purchaseTable}>
        <thead>
          <tr>
            <th>Fan Purchase</th>
            <th>Approx. Tokens Received</th>
            <th>Market Impact</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>$100 purchase</td>
            <td>~1,200 tokens <em>(depends on current price)</em></td>
            <td>Incrementally raises the token price for subsequent buyers</td>
          </tr>
          <tr>
            <td>$1,000 purchase</td>
            <td>~12,000 tokens <em>(depends on current price)</em></td>
            <td>Significant price move, triggers a noticeable jump in the bonding curve</td>
          </tr>
          <tr>
            <td>$50 sale</td>
            <td>~600 tokens <em>(depends on current price)</em></td>
            <td>Slightly decreases the token price for subsequent buyers</td>
          </tr>
          <tr>
            <td>$500 sale</td>
            <td>~6,000 tokens <em>(depends on current price)</em></td>
            <td>Noticeable price drop, triggers a significant decrease in the bonding curve</td>
          </tr>
        </tbody>
      </table>
    </div>


  <div className={styles.unlocksSection}>
    <h3 className={styles.unlocksTitle}>Market Cap Unlocks</h3>
    <p>
      As an Artist Token’s <strong>market cap</strong> (price × supply)
      grows, new features become available to the artist for deeper
      engagement. For example:
    </p>
    <table className={styles.unlocksTable}>
      <thead>
        <tr>
          <th>Market Cap</th>
          <th>Unlocked Feature</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>$50k</td>
          <td>Early merch drop & limited-edition collectibles</td>
        </tr>
        <tr>
          <td>$100k</td>
          <td>Livestream events + token-gated Q&amp;A sessions</td>
        </tr>
        <tr>
          <td>$250k</td>
          <td>Exclusive singles or pre-release tracks for token holders</td>
        </tr>
        <tr>
          <td>$500k</td>
          <td>Artist can officially release a <strong>new album</strong>
          via Limelight’s platform, token holders get first access
          or NFT editions</td>
        </tr>
        <tr>
          <td>$1M+</td>
          <td>Full-scale tours, festival partnerships, advanced DAO
          governance features (e.g., letting top holders vote on
          setlists or collaborations)</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>


                  <Spacer size={0} axis="vertical" />

                  {/* Roadmap */}
     
          <RoadmapSection />
        </Wrapper>
        <Spacer size={3} axis="vertical" />
        <FAQSection />
      </div>
 
    </>
  );
}
