// deploy/00_deploy_Factory_and_Router.js

const { ethers } = require('hardhat');

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy, log } = deployments;

  // Retrieve named accounts
  const namedAccounts = await getNamedAccounts();
  console.log('Named Accounts:', namedAccounts); // Debugging

  // Destructure deployer from named accounts
  const deployer = namedAccounts.deployer;
  console.log('Deployer Address:', deployer); // Debugging

  // Ensure deployer is defined
  if (!deployer) {
    throw new Error(
      'Deployer account not found. Please check your namedAccounts configuration.'
    );
  }

  // Get current chain ID
  const chainId = await getChainId();
  console.log('Chain ID:', chainId); // Debugging

  // Determine Asset Token Address based on Network
  let assetTokenAddress;
  if (chainId === '5') {
    // Goerli
    assetTokenAddress = process.env.BASE_SEPOLIA_ASSET_TOKEN_ADDRESS;
  } else if (chainId === '1') {
    // Mainnet
    assetTokenAddress = process.env.BASE_MAINNET_ASSET_TOKEN_ADDRESS;
  } else if (chainId === '80001') {
    // Mumbai
    assetTokenAddress = process.env.MUMBAI_ASSET_TOKEN_ADDRESS;
  } else if (chainId === '137') {
    // Polygon Mainnet
    assetTokenAddress = process.env.POLYGON_MAINNET_ASSET_TOKEN_ADDRESS;
  } else if (chainId === '84532') {
    // base_sepolia
    assetTokenAddress = process.env.BASE_SEPOLIA_ASSET_TOKEN_ADDRESS;
  } else {
    log(`Unsupported network with chainId: ${chainId}`);
    return;
  }

  console.log('Asset Token Address:', assetTokenAddress); // Debugging

  if (!assetTokenAddress) {
    if (chainId === '84532') {
      log(
        'No existing Asset Token found for base_sepolia. You will deploy a new one.'
      );
    } else {
      throw new Error(
        'Asset token address is not set in the environment variables.'
      );
    }
  }

  // Log critical environment variables
  console.log('TAX_VAULT:', process.env.TAX_VAULT);
  console.log('BUY_TAX:', process.env.BUY_TAX);
  console.log('SELL_TAX:', process.env.SELL_TAX);

  log(`Deploying FFactory and FRouter on chainId: ${chainId}`);

  // Deploy FFactory
  const factoryDeployment = await deploy('FFactory', {
    from: deployer,
    args: [
      process.env.TAX_VAULT, // taxVault_
      ethers.BigNumber.from(process.env.BUY_TAX), // buyTax_
      ethers.BigNumber.from(process.env.SELL_TAX), // sellTax_
    ],
    log: true,
    waitConfirmations: chainId === '1' ? 6 : 2, // More confirmations for mainnet
  });

  // Retrieve deployed FFactory contract
  const factory = await ethers.getContractAt(
    'FFactory',
    factoryDeployment.address,
    deployer
  );

  // Deploy FRouter
  const routerDeployment = await deploy('FRouter', {
    from: deployer,
    args: [
      factory.address, // factory_
      assetTokenAddress || ethers.constants.AddressZero, // assetToken_
    ],
    log: true,
    waitConfirmations: chainId === '1' ? 6 : 2,
  });

  // Retrieve deployed FRouter contract
  const router = await ethers.getContractAt(
    'FRouter',
    routerDeployment.address,
    deployer
  );

  log(`FFactory deployed at: ${factory.address}`);
  log(`FRouter deployed at: ${router.address}`);
};

module.exports.tags = ['FFactory', 'FRouter'];
