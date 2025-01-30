// deploy/01_deploy_AssetToken.js

const { ethers } = require('hardhat');

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  // Define Testnets
  const testnetChainIds = ['5', '80001', '84532']; // Goerli, Mumbai, base_sepolia

  // Deploy AssetToken only on testnets
  if (!testnetChainIds.includes(chainId)) {
    log(`Skipping AssetToken deployment on chainId: ${chainId}`);
    return;
  }

  // Check if AssetToken is already deployed
  try {
    await deployments.get('AssetToken');
    log('AssetToken is already deployed.');
    return;
  } catch (error) {
    // AssetToken not deployed, proceed to deploy
    log('Deploying FERC20 (Asset Token)...');
  }

  const assetTokenDeployment = await deploy('FERC20', {
    from: deployer,
    args: [
      'Asset Token', // name_
      'ASTK', // symbol_
      ethers.utils.parseEther('1000000'), // supply (1,000,000 tokens)
      1, // maxTx (1%)
    ],
    log: true,
    waitConfirmations: chainId === '1' ? 6 : 2,
  });

  const assetToken = await ethers.getContractAt(
    'FERC20',
    assetTokenDeployment.address,
    deployer
  );

  log(`FERC20 deployed at: ${assetToken.address}`);
};

module.exports.tags = ['AssetToken'];
