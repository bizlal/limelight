require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-solhint');
require('@nomiclabs/hardhat-etherscan'); // Deprecated; consider migrating to hardhat-verify later.
require('hardhat-abi-exporter');
require('hardhat-docgen');
require('hardhat-tracer');
require('hardhat-gas-reporter');
require('solidity-coverage');
require('hardhat-preprocessor');
require('@nomiclabs/hardhat-ethers');
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

const fs = require('fs');

function getRemappings() {
  return fs
    .readFileSync('remappings.txt', 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.trim().split('='));
}

function getEtherscanApiKey() {
  // You can leave this function if you want a fallback,
  // but here we use a mapping for each network.
  return process.env.ETHERSCAN_API_KEY || "";
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    sources: './src', // Use ./src rather than ./contracts as Hardhat expects
    cache: './cache_hardhat', // Use a different cache for Hardhat than Foundry
  },
  // Preprocess imports using remappings from the remappings.txt file
  preprocess: {
    eachLine: (hre) => ({
      transform: (line) => {
        if (line.match(/^\s*import /i)) {
          getRemappings().forEach(([find, replace]) => {
            if (line.match(find)) {
              line = line.replace(find, replace);
            }
          });
        }
        return line;
      },
    }),
  },

  networks: {
    mainnet: mainnetNetworkConfig(),
    goerli: goerliNetworkConfig(),
    baseSepolia: baseSepoliaNetworkConfig(),
    local: {
      url: 'http://127.0.0.1:8545',
    },
  },
  abiExporter: {
    path: './build/abi',
    clear: true,
    flat: true,
    spacing: 2,
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true,
  },
  gasReporter: {
    currency: 'USD',
  },
  etherscan: {
    // Map network names to API keys.
    // Ensure you have set BASESEP_API_KEY in your .env file for baseSepolia.
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      goerli: process.env.ETHERSCAN_API_KEY,
      baseSepolia: process.env.ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "baseSepolia", // Must match your network configuration name
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org/"
        }
      }
    ],
  },

};

function mainnetNetworkConfig() {
  let url = 'https://mainnet.infura.io/v3/';
  let accountPrivateKey =
    '0x0000000000000000000000000000000000000000000000000000000000000000';
  if (process.env.MAINNET_ENDPOINT) {
    url = `${process.env.MAINNET_ENDPOINT}`;
  }
  if (process.env.MAINNET_PRIVATE_KEY) {
    accountPrivateKey = `${process.env.MAINNET_PRIVATE_KEY}`;
  }
  return {
    url: url,
    accounts: [accountPrivateKey],
  };
}

function goerliNetworkConfig() {
  let url = 'https://goerli.infura.io/v3/';
  let accountPrivateKey =
    '0x0000000000000000000000000000000000000000000000000000000000000000';
  if (process.env.GOERLI_ENDPOINT) {
    url = `${process.env.GOERLI_ENDPOINT}`;
  }
  if (process.env.GOERLI_PRIVATE_KEY) {
    accountPrivateKey = `${process.env.GOERLI_PRIVATE_KEY}`;
  }
  return {
    url: url,
    accounts: [accountPrivateKey],
  };
}

function baseSepoliaNetworkConfig() {
  let url = 'https://sepolia.base.org';
  let accountPrivateKey = process.env.PRIVATE_KEY || "";
  return {
    url,
    accounts: [
      // Ensure that the account address below is derived from your PRIVATE_KEY, or replace it with the appropriate key.
      accountPrivateKey ? accountPrivateKey : '0x895cbd523b351cad3ca6f8110e6cc5eb34de1a0f7dd3634616f9bb7470cd6290',
    ],
  };
}
