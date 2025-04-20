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
import { motion } from 'framer-motion'; // Import Framer Motion

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

// --- Framer Motion Animation Variants ---
const cardVariants = {
  hidden: { opacity: 0, y: 30 }, // Start slightly lower and invisible
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const sectionHoverEffect = {
  scale: 1.03, // Slightly scale up
  y: -5, // Lift slightly
  transition: { duration: 0.2, ease: 'easeOut' },
};

const buttonHoverEffect = {
  scale: 1.05,
  transition: { duration: 0.15 },
};

const buttonTapEffect = {
  scale: 0.95,
};

// --- Chart Components (No changes needed here, but ensure options enable animation) ---

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
          '#f87171',
          '#fbbf24',
          '#34d399',
          '#60a5fa',
          '#a78bfa',
        ],
        hoverOffset: 8, // Increased hover offset slightly
        borderColor: 'rgba(0,0,0,0.2)', // Subtle border
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    animation: {
      // Ensure animations are configured
      duration: 1000,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#fff' },
      },
      tooltip: {
        titleColor: '#fff',
        bodyColor: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker tooltip
        padding: 10,
        cornerRadius: 4,
      },
    },
  };

  return <Pie data={data} options={options} />;
}

/**
 * Example Bar Chart: Vesting & Circulating Supply
 */
function VestingChart() {
  // ... (VestingChart logic remains the same) ...
  const labels = [];
  for (let i = 0; i <= 12; i++) labels.push(`Month ${i}`);
  const marketing = 10,
    ecosystem = 40,
    liquidity = 15,
    partnerships = 15;
  function getTeamVested(month) {
    if (month < 3) return 0;
    const v = 20 * ((month - 3) / 12);
    return v > 20 ? 20 : v;
  }
  const teamData = labels.map((_, idx) => getTeamVested(idx));
  const marketingData = labels.map(() => marketing);
  const ecosystemData = labels.map(() => ecosystem);
  const liquidityData = labels.map(() => liquidity);
  const partnershipsData = labels.map(() => partnerships);

  const data = {
    labels,
    datasets: [
      { label: 'Team & Advisors', data: teamData, backgroundColor: '#f87171' },
      { label: 'Marketing', data: marketingData, backgroundColor: '#fbbf24' },
      {
        label: 'Ecosystem/Rewards',
        data: ecosystemData,
        backgroundColor: '#34d399',
      },
      { label: 'Liquidity', data: liquidityData, backgroundColor: '#60a5fa' },
      {
        label: 'Partnerships',
        data: partnershipsData,
        backgroundColor: '#a78bfa',
      },
    ],
  };

  const options = {
    responsive: true,
    animation: { duration: 1000, easing: 'easeOutQuart' }, // Added animation config
    plugins: {
      legend: { position: 'bottom', labels: { color: '#fff' } },
      tooltip: {
        titleColor: '#fff',
        bodyColor: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 10,
        cornerRadius: 4,
      },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        stacked: true,
        title: { display: true, text: 'Time (Months)', color: '#fff' },
        ticks: { color: '#fff' },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Percentage of Total Supply',
          color: '#fff',
        },
        ticks: { color: '#fff', callback: (v) => v + '%' },
      },
    },
  };
  return <Bar data={data} options={options} />;
}

/**
 * Example Line Chart: Bonding Curve for Artist Tokens
 */
function BondingCurveChart() {
  // ... (BondingCurveChart logic remains the same) ...
  const labels = [],
    dataPoints = [],
    k = 0.0000001;
  for (let s = 0; s <= 10000; s += 1000) {
    labels.push(s.toString());
    dataPoints.push(k * s * s);
  }

  const data = {
    labels,
    datasets: [
      {
        label: 'Artist Token Price (LMLT)',
        data: dataPoints,
        borderColor: '#60a5fa',
        backgroundColor: '#60a5fa33', // Reduced opacity slightly
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#60a5fa',
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#60a5fa',
      },
    ], // Added point styling
  };

  const options = {
    responsive: true,
    animation: { duration: 1200, easing: 'easeOutCubic' }, // Added animation config
    plugins: {
      legend: { position: 'bottom', labels: { color: '#fff' } },
      tooltip: {
        titleColor: '#fff',
        bodyColor: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 10,
        cornerRadius: 4,
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
        title: { display: true, text: 'Token Price (LMLT)', color: '#fff' },
        ticks: { color: '#fff', callback: (v) => v.toFixed(3) + ' LMLT' },
      },
    },
  };
  return <Line data={data} options={options} />;
}

// --- FAQ Components ---

function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    // Added motion.div for potential future item-level animations if needed
    <motion.div
      className={`${styles.faqItem} ${isOpen ? styles.expanded : ''}`}
    >
      <div className={styles.faqQuestion} onClick={onToggle}>
        <span>{question}</span>
        {/* Animate the icon rotation */}
        <motion.span
          className={styles.faqIcon}
          animate={{ rotate: isOpen ? 180 : 0 }} // Rotate icon
          transition={{ duration: 0.3 }}
        >
          {'+'} {/* Use '+' always, rotation handles visual change */}
        </motion.span>
      </div>
      {/* Animate the answer panel */}
      <motion.div
        className={styles.faqAnswer}
        initial={{ height: 0, opacity: 0 }}
        animate={{
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0,
          paddingTop: isOpen ? '0.75rem' : '0',
          paddingBottom: isOpen ? '0.75rem' : '0',
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{ overflow: 'hidden' }} // Keep overflow hidden
      >
        <p>{answer}</p>
      </motion.div>
    </motion.div>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const faqData = [
    /* ... faq data remains the same ... */
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
    // Apply card animation variants to the whole section
    <motion.div
      className={`${styles.faqSection} ${styles.card}`}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }} // Trigger earlier
      whileHover={sectionHoverEffect}
    >
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
    </motion.div>
  );
}

// --- Roadmap Components (Similar animation enhancements as FAQ) ---

function RoadmapSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const roadmapPhases = [
    /* ... roadmap data remains the same ... */
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
    <motion.div
      className={`${styles.roadmapSection} ${styles.card}`}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      whileHover={sectionHoverEffect}
    >
      <h2 className={styles.roadmapTitle}>Our Roadmap</h2>
      {roadmapPhases.map((item, idx) => (
        <motion.div // Wrap item for potential stagger later
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
            <motion.span
              className={styles.roadmapIcon}
              animate={{ rotate: openIndex === idx ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {'+'}
            </motion.span>
          </div>
          <motion.div
            className={styles.roadmapAnswer}
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: openIndex === idx ? 'auto' : 0,
              opacity: openIndex === idx ? 1 : 0,
              paddingTop: openIndex === idx ? '0.75rem' : '0',
              paddingBottom: openIndex === idx ? '0.75rem' : '0',
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <p>{item.details}</p>
          </motion.div>
        </motion.div>
      ))}
      <p className={styles.roadmapCurrent}>
        <em>Current Stage:</em> We’re wrapping up Phase 2 and preparing to
        launch Phase 3.
      </p>
    </motion.div>
  );
}

// --- Animated Number (No changes needed) ---
function AnimatedNumber({ value }) {
  const props = useSpring({
    number: value,
    from: { number: 0 },
    config: { duration: 2000, easing: (t) => 1 - Math.pow(1 - t, 3) }, // Added easing
  });
  return (
    <animated.span>
      {props.number.to((n) => Math.floor(n).toLocaleString())}
    </animated.span>
  );
}

// --- Main Hero Component ---
export default function Hero({
  totalUsers = 24010,
  totalArtists = 3450,
  totalFans = 7400, // Assuming this meant total streams or similar metric
  totalCities = 820,
}) {
  return (
    <>
      <Head>
        {/* ... Head content remains the same ... */}
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

      {/* Use motion.div for potential top-level animations */}
      <motion.div
        className={styles.heroWrapper}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Wrapper>
          <div className={styles.heroInner}>
            {/* Animate Title and Subtitle */}
            <motion.h1
              className={styles.title}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Welcome to Limelight
            </motion.h1>
            <motion.p
              className={styles.subtitle}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Shine a spotlight on your music and connect with fans worldwide.
            </motion.p>

            <Container justifyContent="center" className={styles.buttons}>
              {/* Animate Button */}
              <motion.div
                whileHover={buttonHoverEffect}
                whileTap={buttonTapEffect}
              >
                <Link legacyBehavior passHref href="/feed">
                  <ButtonLink className={styles.button}>
                    Explore Feed
                  </ButtonLink>
                </Link>
              </motion.div>
              {/* Add more buttons similarly if needed */}
              <Spacer axis="horizontal" size={1} />
            </Container>

            {/* Map Background - consider subtle parallax or zoom effect if desired */}
            <div className={styles.mapBackground}>
              <Image
                src={map}
                alt="Map background"
                layout="fill"
                objectFit="cover"
                objectPosition="center"
                priority
                // Optional: Add subtle animation/effect to image if needed
                // style={{ transform: 'scale(1.05)' }} // Example subtle zoom
              />
            </div>

            {/* Stats Section - Animate wrapper */}
            <motion.div
              className={styles.statsWrapper}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className={styles.statsContainer}>
                {/* Individual stat items could also be animated with stagger */}
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
                  <p>Total Streams</p> {/* Changed label for clarity */}
                </div>
                <div className={styles.statItem}>
                  <h3>
                    <AnimatedNumber value={totalCities} />
                  </h3>
                  <p>Cities Reached</p>
                </div>
              </div>
            </motion.div>
          </div>
        </Wrapper>
        {/* Info Sections - Wrapped with motion.section inside */}
        <Wrapper>
          <div className={styles.infoSections}>
            <motion.section
              className={`${styles.infoSection} ${styles.card}`}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              whileHover={sectionHoverEffect}
            >
              <h2 className={styles.infoTitle}>How It Works</h2>
              <p className={styles.infoText}>
                Limelight provides artists with powerful tools...
              </p>
            </motion.section>
            <motion.section
              className={`${styles.infoSection} ${styles.card}`}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              whileHover={sectionHoverEffect}
            >
              <h2 className={styles.infoTitle}>Who It’s For</h2>
              <p className={styles.infoText}>
                This platform is designed for both aspiring...
              </p>
            </motion.section>
            <motion.section
              className={`${styles.infoSection} ${styles.card}`}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              whileHover={sectionHoverEffect}
            >
              <h2 className={styles.infoTitle}>How It Helps</h2>
              <p className={styles.infoText}>
                Limelight bridges the gap between creators...
              </p>
            </motion.section>
          </div>
        </Wrapper>
        {/* Token & Roadmap Sections */}
        <Wrapper>
          {/* TOKEN DETAILS - Wrapped with motion.div */}
          <motion.div
            className={`${styles.tokenSection} ${styles.card}`}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            whileHover={sectionHoverEffect}
          >
            <h2 className={styles.tokenTitle}>Introducing LMLT</h2>
            <p className={styles.tokenText}>
              LMLT (Limelight Token) is our native ERC-20 token...
            </p>
            <ul className={styles.tokenBenefits}>
              {/* ... list items ... */}
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

            <div className={styles.distributionSection}>
              <h3 className={styles.distributionTitle}>Token Distribution</h3>
              <div className={styles.distributionContent}>
                <div className={styles.chartWrapper}>
                  <TokenDistributionChart />
                </div>
                <table className={styles.distributionTable}>
                  {/* ... table content ... */}
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

            <div className={styles.vestingSection}>
              <h3 className={styles.vestingTitle}>
                Vesting &amp; Circulating Supply
              </h3>
              <div className={styles.chartWrapper}>
                <VestingChart />
              </div>
              <p className={styles.vestingInfo}>
                The Team &amp; Advisors tokens (20% total)...
              </p>
            </div>
          </motion.div>
          <Spacer size={1} axis="vertical" /> {/* Added spacer */}
          {/* ARTIST TOKENS - Wrapped with motion.div */}
          <motion.div
            className={`${styles.artistTokensSection} ${styles.card}`}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            whileHover={sectionHoverEffect}
          >
            <h2 className={styles.artistTokensTitle}>
              Artist Tokens &amp; Bonding Curves
            </h2>
            <p className={styles.artistTokensText}>
              Each artist on Limelight can launch...
            </p>
            <p className={styles.artistTokensText}>
              Launching an Artist Token costs <strong>0.05 ETH</strong>...
            </p>

            <div className={styles.distributionSection}>
              <h3 className={styles.distributionTitle}>Bonding Curve Demo</h3>
              <div className={styles.chartWrapper}>
                <BondingCurveChart />
              </div>
              <table className={styles.distributionTable}>
                {/* ... table content ... */}
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
                    <td>Initial launch price...</td>
                  </tr>
                  <tr>
                    <td>1,000</td>
                    <td>~0.0001 LMLT</td>
                    <td>~$0.0001</td>
                    <td>Early supporters acquire...</td>
                  </tr>
                  <tr>
                    <td>5,000</td>
                    <td>~0.0025 LMLT</td>
                    <td>~$0.0025</td>
                    <td>Artist gains traction...</td>
                  </tr>
                  <tr>
                    <td>10,000</td>
                    <td>~0.01 LMLT</td>
                    <td>~$0.01</td>
                    <td>New fans drive demand...</td>
                  </tr>
                  <tr>
                    <td>50,000</td>
                    <td>~0.10 LMLT</td>
                    <td>~$0.10</td>
                    <td>Significant fanbase expansion...</td>
                  </tr>
                  <tr>
                    <td>100,000</td>
                    <td>~0.25 LMLT</td>
                    <td>~$0.25</td>
                    <td>Artist token sees mainstream...</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={styles.examplesSection}>
              <h3 className={styles.examplesTitle}>Purchase Scenarios</h3>
              <p>Below are a few scenarios...</p>
              <table className={styles.purchaseTable}>
                {/* ... table content ... */}
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
                    <td>
                      ~1,200 tokens <em>(depends...)</em>
                    </td>
                    <td>Incrementally raises...</td>
                  </tr>
                  <tr>
                    <td>$1,000 purchase</td>
                    <td>
                      ~12,000 tokens <em>(depends...)</em>
                    </td>
                    <td>Significant price move...</td>
                  </tr>
                  <tr>
                    <td>$50 sale</td>
                    <td>
                      ~600 tokens <em>(depends...)</em>
                    </td>
                    <td>Slightly decreases...</td>
                  </tr>
                  <tr>
                    <td>$500 sale</td>
                    <td>
                      ~6,000 tokens <em>(depends...)</em>
                    </td>
                    <td>Noticeable price drop...</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={styles.unlocksSection}>
              <h3 className={styles.unlocksTitle}>Market Cap Unlocks</h3>
              <p>
                As an Artist Token’s <strong>market cap</strong>...
              </p>
              <table className={styles.unlocksTable}>
                {/* ... table content ... */}
                <thead>
                  <tr>
                    <th>Market Cap</th>
                    <th>Unlocked Feature</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>$50k</td>
                    <td>Early merch drop...</td>
                  </tr>
                  <tr>
                    <td>$100k</td>
                    <td>Livestream events...</td>
                  </tr>
                  <tr>
                    <td>$250k</td>
                    <td>Exclusive singles...</td>
                  </tr>
                  <tr>
                    <td>$500k</td>
                    <td>Artist can officially release...</td>
                  </tr>
                  <tr>
                    <td>$1M+</td>
                    <td>Full-scale tours...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
          <Spacer size={1} axis="vertical" /> {/* Added spacer */}
          {/* Roadmap Section - Already wrapped */}
          <RoadmapSection />
        </Wrapper>
        <Spacer size={3} axis="vertical" />
        {/* FAQ Section - Already wrapped */}
        <Wrapper>
          {' '}
          {/* Added wrapper for consistent padding */}
          <FAQSection />
        </Wrapper>
        <Spacer size={3} axis="vertical" /> {/* Footer Spacer */}
      </motion.div>
    </>
  );
}
