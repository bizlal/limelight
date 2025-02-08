// deploy/02_deploy_Bonding.js

const { ethers } = require('hardhat');

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

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
    // Check if AssetToken was deployed
    try {
      const assetTokenDeployment = await deployments.get('AssetToken');
      assetTokenAddress = assetTokenDeployment.address;
      log(`Using deployed AssetToken at: ${assetTokenAddress}`);
    } catch (error) {
      assetTokenAddress = process.env.BASE_SEPOLIA_ASSET_TOKEN_ADDRESS;
      log(
        'AssetToken not found in deployments. Ensure it is deployed before deploying Bonding.'
      );
      if (!assetTokenAddress) {
        throw new Error(
          'Asset token address is not set in the environment variables.'
        );
      }
    }
  } else {
    log(`Unsupported network with chainId: ${chainId}`);
    return;
  }

  if (!assetTokenAddress) {
    if (['5', '80001', '84532'].includes(chainId)) {
      throw new Error(
        'Asset token address is not set in the environment variables and AssetToken deployment failed.'
      );
    } else {
      throw new Error(
        'Asset token address is not set in the environment variables.'
      );
    }
  }

  log(`Deploying Bonding on chainId: ${chainId}`);
  log(`Asset Token Address: ${assetTokenAddress}`);

  // Retrieve deployed FFactory and FRouter contracts
  const factoryDeployment = await deployments.get('FFactory');
  const factory = await ethers.getContractAt(
    'FFactory',
    factoryDeployment.address,
    deployer
  );

  const routerDeployment = await deployments.get('FRouter');
  const router = await ethers.getContractAt(
    'FRouter',
    routerDeployment.address,
    deployer
  );

  // Address of the Artist Factory
  const artistFactoryAddress = process.env.ARTIST_FACTORY_ADDRESS;
  if (!artistFactoryAddress) {
    throw new Error(
      'Artist Factory address is not set in the environment variables.'
    );
  }

  // Deploy Bonding
  const bondingDeployment = await deploy('Bonding', {
    from: deployer,
    args: [
      factory.address, // factory_
      router.address, // router_
      process.env.FEE_TO_ADDRESS, // feeTo_
      ethers.BigNumber.from(process.env.FEE_RATE), // fee_ (in basis points)
      ethers.BigNumber.from(process.env.INITIAL_SUPPLY), // initialSupply_
      ethers.BigNumber.from(process.env.ASSET_RATE), // assetRate_
      ethers.BigNumber.from(process.env.MAX_TX), // maxTx_
      artistFactoryAddress, // artistFactory_
      ethers.BigNumber.from(process.env.GRAD_THRESHOLD), // gradThreshold_
    ],
    log: true,
    waitConfirmations: chainId === '1' ? 6 : 2,
  });

  const bonding = await ethers.getContractAt(
    'Bonding',
    bondingDeployment.address,
    deployer
  );

  log(`Bonding deployed at: ${bonding.address}`);
};

module.exports.tags = ['Bonding'];
