require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-solhint');
require('@nomiclabs/hardhat-etherscan');
require('hardhat-abi-exporter');
require('hardhat-docgen');
require('hardhat-tracer');
require('hardhat-gas-reporter');
require('solidity-coverage');
require('hardhat-preprocessor');
require('@nomiclabs/hardhat-ethers');
require('@openzeppelin/hardhat-upgrades');

const fs = require('fs');

const etherscanApiKey = getEtherscanApiKey();

function getRemappings() {
  return fs
    .readFileSync('remappings.txt', 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.trim().split('='));
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
  // This fully resolves paths for imports in the ./lib directory for Hardhat
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
    apiKey: `${etherscanApiKey}`,
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
  let accountPrivateKey = process.env.PRIVATE_KEY;

  if (process.env.PRIVATE_KEY) {
    accountPrivateKey = `${process.env.PRIVATE_KEY}`;
  }
  return {
    url,
    accounts: [
      '0x895cbd523b351cad3ca6f8110e6cc5eb34de1a0f7dd3634616f9bb7470cd6290',
    ],
  };
}

function getEtherscanApiKey() {
  let apiKey = '';
  if (process.env.ETHERSCAN_API_KEY) {
    apiKey = `${process.env.ETHERSCAN_API_KEY}`;
  }
  return apiKey;
}
