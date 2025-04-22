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

// Assuming ButtonLink, Wrapper, Container, Spacer might be replaced or adapted
// For this example, we'll replace them with standard divs and Tailwind
// import { ButtonLink } from '@/components/Button';
// import { Container, Spacer, Wrapper } from '@/components/Layout';

import { useState } from 'react';
import map from '@/assets/images/map.png';
// Removed: import styles from './Hero.module.css';

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

// --- Framer Motion Animation Variants (Retained) ---
const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const sectionHoverEffect = {
  scale: 1.03,
  y: -5,
  transition: { duration: 0.2, ease: 'easeOut' },
};

const buttonHoverEffect = {
  scale: 1.05,
  opacity: 0.9, // Match hover:opacity-90
  transition: { duration: 0.15 },
};

const buttonTapEffect = {
  scale: 0.95,
};

// --- Chart Components (Styling updated for Tailwind context if needed) ---

function TokenDistributionChart() {
  const data = {
    /* ... data ... */
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
        hoverOffset: 8,
        borderColor: 'rgba(0,0,0,0.2)',
        borderWidth: 1,
      },
    ],
  };
  const options = {
    /* ... options ... */ responsive: true,
    animation: { duration: 1000, easing: 'easeOutQuart' },
    plugins: {
      legend: { position: 'bottom', labels: { color: '#fff' } }, // White text matches dark theme
      tooltip: {
        titleColor: '#fff',
        bodyColor: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 10,
        cornerRadius: 4,
      },
    },
  };
  return <Pie data={data} options={options} />;
}

function VestingChart() {
  /* ... logic ... */
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
    /* ... options ... */ responsive: true,
    animation: { duration: 1000, easing: 'easeOutQuart' },
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
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      }, // Added grid color
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Percentage of Total Supply',
          color: '#fff',
        },
        ticks: { color: '#fff', callback: (v) => v + '%' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      }, // Added grid color
    },
  };
  return <Bar data={data} options={options} />;
}

function BondingCurveChart() {
  /* ... logic ... */
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
        backgroundColor: '#60a5fa33',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#60a5fa',
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#60a5fa',
      },
    ],
  };
  const options = {
    /* ... options ... */ responsive: true,
    animation: { duration: 1200, easing: 'easeOutCubic' },
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
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      }, // Added grid color
      y: {
        title: { display: true, text: 'Token Price (LMLT)', color: '#fff' },
        ticks: { color: '#fff', callback: (v) => v.toFixed(3) + ' LMLT' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      }, // Added grid color
    },
  };
  return <Line data={data} options={options} />;
}

// --- FAQ Components (Using Tailwind) ---

function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <motion.div
      className={`bg-black/20 border border-black/50 rounded-lg mb-3 overflow-hidden ${
        isOpen ? 'bg-black/30' : ''
      }`}
    >
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/30 transition"
        onClick={onToggle}
      >
        <span className="text-sm font-medium text-white">{question}</span>
        <motion.span
          className="text-gray-400"
          animate={{ rotate: isOpen ? 45 : 0 }} // Rotate '+' to 'x'
          transition={{ duration: 0.3 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </motion.span>
      </div>
      <motion.div
        initial={false} // Prevent initial animation on load
        animate={{
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0,
          paddingTop: isOpen ? '0' : '0', // Adjust padding within the inner p tag
          paddingBottom: isOpen ? '0.75rem' : '0', // pb-3
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{ overflow: 'hidden' }}
      >
        {/* Added inner padding for the text */}
        <p className="text-xs text-gray-300 px-3 leading-relaxed">{answer}</p>
      </motion.div>
    </motion.div>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const faqData = [
    /* ... faq data ... */
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
    // Use Tailwind card styles
    <motion.div
      className="bg-black/70 backdrop-blur-md border border-black/50 rounded-lg shadow-lg p-6"
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      whileHover={sectionHoverEffect}
    >
      <h2 className="text-xl font-semibold text-white mb-4 border-b border-black/50 pb-2">
        Frequently Asked Questions
      </h2>
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

// --- Roadmap Components (Using Tailwind) ---

function RoadmapSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const roadmapPhases = [
    /* ... roadmap data ... */
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
      className="bg-black/70 backdrop-blur-md border border-black/50 rounded-lg shadow-lg p-6"
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      whileHover={sectionHoverEffect}
    >
      <h2 className="text-xl font-semibold text-white mb-4 border-b border-black/50 pb-2">
        Our Roadmap
      </h2>
      {roadmapPhases.map((item, idx) => (
        // Reusing FAQItem structure/styling logic with different class names if needed, but structure is same
        <motion.div
          key={idx}
          className={`bg-black/20 border border-black/50 rounded-lg mb-3 overflow-hidden ${
            openIndex === idx ? 'bg-black/30' : ''
          }`}
        >
          <div
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/30 transition"
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
          >
            <span className="text-sm font-medium text-white">{item.phase}</span>
            <motion.span
              className="text-gray-400"
              animate={{ rotate: openIndex === idx ? 45 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </motion.span>
          </div>
          <motion.div
            initial={false}
            animate={{
              height: openIndex === idx ? 'auto' : 0,
              opacity: openIndex === idx ? 1 : 0,
              paddingBottom: openIndex === idx ? '0.75rem' : '0',
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <p className="text-xs text-gray-300 px-3 leading-relaxed">
              {item.details}
            </p>
          </motion.div>
        </motion.div>
      ))}
      <p className="text-xs text-gray-400 italic mt-4 text-center">
        <em>Current Stage:</em> We’re wrapping up Phase 2 and preparing to
        launch Phase 3.
      </p>
    </motion.div>
  );
}

// --- Animated Number (Retained) ---
function AnimatedNumber({ value }) {
  const props = useSpring({
    number: value,
    from: { number: 0 },
    config: { duration: 2000, easing: (t) => 1 - Math.pow(1 - t, 3) },
  });
  return (
    <animated.span>
      {props.number.to((n) => Math.floor(n).toLocaleString())}
    </animated.span>
  );
}

// --- Main Hero Component (Using Tailwind) ---
export default function Hero({
  totalUsers = 24010,
  totalArtists = 3450,
  totalFans = 7400, // Renamed to totalStreams for clarity
  totalCities = 820,
}) {
  return (
    <>
      <Head>
        {/* ... Head content ... */}
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
        <meta property="og:image" content="/images/limelight-hero.jpg" />{' '}
        {/* Ensure this path is correct */}
        <meta property="og:url" content="https://lmlt.ai" />{' '}
        {/* Replace with actual URL */}
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Limelight Music Platform" />
        <meta
          name="twitter:description"
          content="Upload, discover, and earn with our music ecosystem. Artists and fans unite on Limelight."
        />
        <meta name="twitter:image" content="/images/limelight-hero.jpg" />{' '}
        {/* Ensure this path is correct */}
      </Head>
      {/* Hero Wrapper with Gradient Background */}
      <motion.div
        className="bg-gradient-to-br from-purple-800 via-pink-700 to-blue-600 min-h-screen relative overflow-hidden" // Adjusted gradient
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        {/* Map Background Image */}
        <div className="absolute inset-0 z-0 opacity-50 mix-blend-overlay">
          {' '}
          {/* Adjusted blend mode */}
          <Image
            src={map} // Ensure 'map' is imported correctly and path is valid
            alt="Map background"
            layout="fill"
            objectFit="cover"
            objectPosition="center"
            priority
          />
        </div>
        {/* Content Wrapper */}
        <div className="relative z-20 container mx-auto px-4">
          {/* Inner Hero Content */}
          <div className="text-center pt-20 md:pt-28 pb-16 md:pb-20">
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4 text-shadow-md" // Tailwind text shadow utility if configured, or use custom
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Welcome to Limelight
            </motion.h1>
            <motion.p
              className="text-lg sm:text-xl max-w-2xl mx-auto text-gray-200 mb-8 text-shadow-sm" // Tailwind text shadow
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Shine a spotlight on your music and connect with fans worldwide.
            </motion.p>

            {/* Buttons Container */}
            <div className="flex justify-center mb-16">
              <motion.div
                whileHover={buttonHoverEffect}
                whileTap={buttonTapEffect}
              >
                {/* Using standard Link with styled <a> tag */}
                <Link href="/feed" passHref legacyBehavior>
                  <a className="bg-black/60 backdrop-blur-md border border-black/50 text-white px-6 py-3 rounded-lg hover:opacity-90 transition text-base font-semibold shadow-md">
                    Explore Feed
                  </a>
                </Link>
              </motion.div>
              {/* Add more buttons here if needed, maybe with mx-2 for spacing */}
            </div>

            {/* Stats Section */}
            <motion.div
              className="max-w-4xl mx-auto p-6 md:p-8 bg-black/70 backdrop-blur-md border border-black/50 rounded-lg shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="flex flex-wrap justify-around gap-4 md:gap-8">
                <div className="text-center">
                  <h3 className="text-2xl md:text-3xl font-bold text-white">
                    <AnimatedNumber value={totalUsers} />
                  </h3>
                  <p className="text-xs md:text-sm text-gray-300 mt-1">Users</p>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl md:text-3xl font-bold text-white">
                    <AnimatedNumber value={totalArtists} />
                  </h3>
                  <p className="text-xs md:text-sm text-gray-300 mt-1">
                    Artists
                  </p>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl md:text-3xl font-bold text-white">
                    <AnimatedNumber value={totalFans} />
                  </h3>
                  <p className="text-xs md:text-sm text-gray-300 mt-1">
                    Total Streams
                  </p>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl md:text-3xl font-bold text-white">
                    <AnimatedNumber value={totalCities} />
                  </h3>
                  <p className="text-xs md:text-sm text-gray-300 mt-1">
                    Cities Reached
                  </p>
                </div>
              </div>
            </motion.div>
          </div>{' '}
          {/* End heroInner */}
          {/* Info Sections */}
          <div className="py-12 md:py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <motion.div
                className="bg-black/70 backdrop-blur-md border border-black/50 rounded-lg shadow-lg p-6" // Card style
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                whileHover={sectionHoverEffect}
              >
                <h2 className="text-xl font-semibold text-white mb-3">
                  How It Works
                </h2>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Limelight provides artists with powerful tools to upload and
                  share their music, while fans discover new favorites and
                  directly engage with creators.
                </p>
              </motion.div>
              <motion.div
                className="bg-black/70 backdrop-blur-md border border-black/50 rounded-lg shadow-lg p-6" // Card style
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                whileHover={sectionHoverEffect}
              >
                <h2 className="text-xl font-semibold text-white mb-3">
                  Who It’s For
                </h2>
                <p className="text-sm text-gray-300 leading-relaxed">
                  This platform is designed for both aspiring and established
                  artists, as well as dedicated music lovers who want an easy
                  way to discover fresh sounds and support their favorite
                  creators.
                </p>
              </motion.div>
              <motion.div
                className="bg-black/70 backdrop-blur-md border border-black/50 rounded-lg shadow-lg p-6" // Card style
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                whileHover={sectionHoverEffect}
              >
                <h2 className="text-xl font-semibold text-white mb-3">
                  How It Helps
                </h2>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Limelight bridges the gap between creators and their audience,
                  offering instant feedback, organic growth, and a personalized
                  listening experience.
                </p>
              </motion.div>
            </div>
          </div>
          {/* Token & Roadmap Sections */}
          <div className="py-12 md:py-16 space-y-12 md:space-y-16">
            {' '}
            {/* Added spacing */}
            {/* TOKEN DETAILS */}
            <motion.div
              className="bg-black/70 backdrop-blur-md border border-black/50 rounded-lg shadow-lg p-6 md:p-8" // Card style
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              whileHover={sectionHoverEffect}
            >
              <h2 className="text-2xl font-semibold text-white mb-4 border-b border-black/50 pb-3">
                Introducing LMLT
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                LMLT (Limelight Token) is our native ERC-20 token that powers
                transactions and rewards within the Limelight ecosystem...
              </p>
              <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm">
                <li className="bg-black/30 p-3 rounded-md border border-black/50">
                  <strong className="block text-gray-400 text-xs">
                    Symbol:
                  </strong>{' '}
                  LMLT
                </li>
                <li className="bg-black/30 p-3 rounded-md border border-black/50">
                  <strong className="block text-gray-400 text-xs">
                    Standard:
                  </strong>{' '}
                  ERC-20
                </li>
                <li className="bg-black/30 p-3 rounded-md border border-black/50">
                  <strong className="block text-gray-400 text-xs">
                    Supply:
                  </strong>{' '}
                  100M
                </li>
                <li className="bg-black/30 p-3 rounded-md border border-black/50">
                  <strong className="block text-gray-400 text-xs">
                    Utility:
                  </strong>{' '}
                  Rewards, Governance, Access
                </li>
              </ul>

              {/* Distribution Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Token Distribution
                </h3>
                {/* Consider flex layout for chart + table on larger screens */}
                <div className="flex flex-col lg:flex-row gap-6 items-center">
                  <div className="w-full lg:w-1/2 max-w-sm mx-auto mb-4 lg:mb-0">
                    <TokenDistributionChart />
                  </div>
                  <div className="w-full lg:flex-1 overflow-x-auto">
                    <table className="min-w-full text-xs border border-gray-700 bg-black/30 rounded">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="p-2 text-left font-medium text-gray-300">
                            Category
                          </th>
                          <th className="p-2 text-left font-medium text-gray-300">
                            Allocation
                          </th>
                          <th className="p-2 text-left font-medium text-gray-300">
                            Description
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-300">
                        <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                          <td className="p-2">Team &amp; Advisors</td>
                          <td className="p-2">20%</td>
                          <td className="p-2">Core team, long-term vesting</td>
                        </tr>
                        <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                          <td className="p-2">Marketing</td>
                          <td className="p-2">10%</td>
                          <td className="p-2">Promotions, brand awareness</td>
                        </tr>
                        <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                          <td className="p-2">Ecosystem/Rewards</td>
                          <td className="p-2">40%</td>
                          <td className="p-2">
                            In-app rewards, user incentives
                          </td>
                        </tr>
                        <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                          <td className="p-2">Liquidity</td>
                          <td className="p-2">15%</td>
                          <td className="p-2">DEX/CEX liquidity pools</td>
                        </tr>
                        <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                          <td className="p-2">Partnerships</td>
                          <td className="p-2">15%</td>
                          <td className="p-2">
                            Strategic integrations, expansions
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Vesting Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Vesting &amp; Circulating Supply
                </h3>
                <div className="max-w-3xl mx-auto mb-4 bg-black/20 p-4 rounded-lg border border-black/50">
                  <VestingChart />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed text-center max-w-3xl mx-auto">
                  The Team &amp; Advisors tokens (20% total) have a 3-month
                  cliff with linear vesting over the following 12 months. Other
                  allocations unlock immediately. This chart shows the
                  contribution to circulating supply over time.
                </p>
              </div>
            </motion.div>
            {/* ARTIST TOKENS */}
            <motion.div
              className="bg-black/70 backdrop-blur-md border border-black/50 rounded-lg shadow-lg p-6 md:p-8" // Card style
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              whileHover={sectionHoverEffect}
            >
              <h2 className="text-2xl font-semibold text-white mb-4 border-b border-black/50 pb-3">
                Artist Tokens &amp; Bonding Curves
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">
                Each artist on Limelight can launch their own token, providing
                fans with a unique way to invest and participate in the artist’s
                growth. These <strong>Artist Tokens</strong> follow a dynamic{' '}
                <strong>bonding curve</strong>...
              </p>
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                Launching an Artist Token costs <strong>0.05 ETH</strong> for
                smart contract deployment and initial setup...
              </p>

              {/* Bonding Curve Demo Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Bonding Curve Demo
                </h3>
                <div className="flex flex-col lg:flex-row gap-6 items-center">
                  <div className="w-full lg:w-1/2 max-w-xl mx-auto mb-4 lg:mb-0 bg-black/20 p-4 rounded-lg border border-black/50">
                    <BondingCurveChart />
                  </div>
                  <div className="w-full lg:flex-1 overflow-x-auto">
                    <table className="min-w-full text-xs border border-gray-700 bg-black/30 rounded">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="p-2 text-left font-medium text-gray-300">
                            Supply
                          </th>
                          <th className="p-2 text-left font-medium text-gray-300">
                            Price (LMLT)
                          </th>
                          <th className="p-2 text-left font-medium text-gray-300">
                            Price (USD)
                          </th>
                          <th className="p-2 text-left font-medium text-gray-300">
                            Key Benefit
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-300">
                        <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                          <td className="p-2">0</td>
                          <td className="p-2">0 LMLT</td>
                          <td className="p-2">$0.00</td>
                          <td className="p-2">Initial launch price...</td>
                        </tr>
                        <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                          <td className="p-2">1,000</td>
                          <td className="p-2">~0.0001 LMLT</td>
                          <td className="p-2">~$0.0001</td>
                          <td className="p-2">Early supporters acquire...</td>
                        </tr>
                        <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                          <td className="p-2">5,000</td>
                          <td className="p-2">~0.0025 LMLT</td>
                          <td className="p-2">~$0.0025</td>
                          <td className="p-2">Artist gains traction...</td>
                        </tr>
                        <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                          <td className="p-2">10,000</td>
                          <td className="p-2">~0.01 LMLT</td>
                          <td className="p-2">~$0.01</td>
                          <td className="p-2">New fans drive demand...</td>
                        </tr>
                        <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                          <td className="p-2">50,000</td>
                          <td className="p-2">~0.10 LMLT</td>
                          <td className="p-2">~$0.10</td>
                          <td className="p-2">
                            Significant fanbase expansion...
                          </td>
                        </tr>
                        <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                          <td className="p-2">100,000</td>
                          <td className="p-2">~0.25 LMLT</td>
                          <td className="p-2">~$0.25</td>
                          <td className="p-2">
                            Artist token sees mainstream...
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Purchase Scenarios Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Purchase Scenarios
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  Below are a few scenarios showing how fans might buy/sell an
                  Artist Token.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border border-gray-700 bg-black/30 rounded">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th className="p-2 text-left font-medium text-gray-300">
                          Action
                        </th>
                        <th className="p-2 text-left font-medium text-gray-300">
                          Approx. Tokens
                        </th>
                        <th className="p-2 text-left font-medium text-gray-300">
                          Market Impact
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                        <td className="p-2">$100 purchase</td>
                        <td className="p-2">
                          ~1,200 <em className="text-gray-500">(depends...)</em>
                        </td>
                        <td className="p-2">Incrementally raises price</td>
                      </tr>
                      <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                        <td className="p-2">$1,000 purchase</td>
                        <td className="p-2">
                          ~12,000{' '}
                          <em className="text-gray-500">(depends...)</em>
                        </td>
                        <td className="p-2">Significant price jump</td>
                      </tr>
                      <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                        <td className="p-2">$50 sale</td>
                        <td className="p-2">
                          ~600 <em className="text-gray-500">(depends...)</em>
                        </td>
                        <td className="p-2">Slightly decreases price</td>
                      </tr>
                      <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                        <td className="p-2">$500 sale</td>
                        <td className="p-2">
                          ~6,000 <em className="text-gray-500">(depends...)</em>
                        </td>
                        <td className="p-2">Noticeable price drop</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Market Cap Unlocks Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Market Cap Unlocks
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  As an Artist Token’s market cap grows, new features become
                  available.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border border-gray-700 bg-black/30 rounded">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th className="p-2 text-left font-medium text-gray-300">
                          Market Cap
                        </th>
                        <th className="p-2 text-left font-medium text-gray-300">
                          Unlocked Feature
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                        <td className="p-2">$50k</td>
                        <td className="p-2">
                          Early merch drop & limited-edition collectibles
                        </td>
                      </tr>
                      <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                        <td className="p-2">$100k</td>
                        <td className="p-2">
                          Livestream events + token-gated Q&amp;A sessions
                        </td>
                      </tr>
                      <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                        <td className="p-2">$250k</td>
                        <td className="p-2">
                          Exclusive singles or pre-release tracks
                        </td>
                      </tr>
                      <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                        <td className="p-2">$500k</td>
                        <td className="p-2">
                          Official album release via Limelight (NFTs, etc.)
                        </td>
                      </tr>
                      <tr className="border-t border-gray-700 hover:bg-gray-800/50">
                        <td className="p-2">$1M+</td>
                        <td className="p-2">
                          Full-scale tours, festival partnerships, DAO
                          governance
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
            {/* Roadmap Section */}
            <RoadmapSection />
          </div>{' '}
          {/* End Token & Roadmap Sections container */}
          {/* FAQ Section */}
          <div className="pb-16 md:pb-20">
            {' '}
            {/* Add padding at the bottom */}
            <FAQSection />
          </div>
        </div>{' '}
        {/* End Content Wrapper (container) */}
      </motion.div>{' '}
      {/* End Hero Wrapper */}
    </>
  );
}
