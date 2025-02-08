require('dotenv').config();
const hre = require('hardhat');
const { ethers, upgrades } = hre;
const fs = require('fs');
const path = require('path');

// Path to the JSON file that will store deployed contract addresses.
const deployedFilePath = path.join(__dirname, 'deployedContracts.json');
let deployed = {};

if (fs.existsSync(deployedFilePath)) {
  deployed = JSON.parse(fs.readFileSync(deployedFilePath, 'utf8'));
}

function saveDeployed() {
  fs.writeFileSync(deployedFilePath, JSON.stringify(deployed, null, 2));
}

async function main() {
  console.log('Compiling contracts...');
  await hre.run('compile');
  console.log('Compilation finished.\n');

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log('-----------------------------------------------------');
  console.log('Deploying contracts with the account:', deployer.address);
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.utils.formatEther(balance), 'ETH\n');

  // Determine network and chain id
  const network = hre.network.name;
  const chainId =
    hre.network.config.chainId || (await hre.ethers.provider.getNetwork()).chainId;
  console.log(`Network: ${network}`);
  console.log(`Chain ID: ${chainId}\n`);

  // 1. Deploy or use existing Asset Token (FERC20) (non-upgradeable)
  let assetTokenAddress = process.env.ASSET_TOKEN_ADDRESS;
  if (
    !assetTokenAddress ||
    assetTokenAddress === '0x0000000000000000000000000000000000000000'
  ) {
    if (!deployed.assetTokenAddress) {
      const supportedChainIds = ['84532', '5', '1', '80001', '137', '31337'];
      if (supportedChainIds.includes(chainId.toString())) {
        console.log('No existing Asset Token provided. Deploying FERC20...');
        const FERC20 = await ethers.getContractFactory('FERC20');
        // Use BigNumber.from for raw supply values:
        const initialSupply = process.env.INITIAL_SUPPLY;
        const maxTx = process.env.MAX_TX || '1000000000';
        const assetToken = await FERC20.deploy('Limelight', 'LMLT', initialSupply, maxTx);
        await assetToken.deployed();
        assetTokenAddress = assetToken.address;
        deployed.assetTokenAddress = assetTokenAddress;
        saveDeployed();
        console.log('AssetToken deployed at:', assetTokenAddress, '\n');
      } else {
        throw new Error(`Unsupported network chainId: ${chainId}`);
      }
    } else {
      assetTokenAddress = deployed.assetTokenAddress;
      console.log('Using previously deployed Asset Token at:', assetTokenAddress, '\n');
    }
  } else {
    console.log('Using existing Asset Token address from ENV:', assetTokenAddress, '\n');
  }

  // 2. Deploy FFactory (Upgradeable)
  let fFactory;
  if (!deployed.fFactoryAddress) {
    console.log('Deploying FFactory...');
    const FFactory = await ethers.getContractFactory('FFactory');
    fFactory = await upgrades.deployProxy(
      FFactory,
      [process.env.TAX_VAULT, process.env.BUY_TAX, process.env.SELL_TAX],
      { initializer: 'initialize' }
    );
    await fFactory.deployed();
    deployed.fFactoryAddress = fFactory.address;
    saveDeployed();
    console.log('FFactory deployed at:', fFactory.address, '\n');
  } else {
    console.log('Using previously deployed FFactory at:', deployed.fFactoryAddress, '\n');
    const FFactory = await ethers.getContractFactory('FFactory');
    fFactory = await ethers.getContractAt('FFactory', deployed.fFactoryAddress);
  }

  // 3. Deploy FRouter (Upgradeable)
  let fRouter;
  if (!deployed.fRouterAddress) {
    console.log('Deploying FRouter...');
    const FRouter = await ethers.getContractFactory('FRouter');
    fRouter = await upgrades.deployProxy(
      FRouter,
      [fFactory.address, assetTokenAddress],
      { initializer: 'initialize' }
    );
    await fRouter.deployed();
    deployed.fRouterAddress = fRouter.address;
    saveDeployed();
    console.log('FRouter deployed at:', fRouter.address, '\n');
  } else {
    console.log('Using previously deployed FRouter at:', deployed.fRouterAddress, '\n');
    const FRouter = await ethers.getContractFactory('FRouter');
    fRouter = await ethers.getContractAt('FRouter', deployed.fRouterAddress);
  }

  // 4. Grant roles and set router in FFactory and FRouter
  const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ADMIN_ROLE'));
  const CREATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('CREATOR_ROLE'));
  const EXECUTOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('EXECUTOR_ROLE'));

  console.log('Granting ADMIN_ROLE and CREATOR_ROLE to deployer in FFactory...');
  await (await fFactory.grantRole(ADMIN_ROLE, deployer.address)).wait();
  await (await fFactory.grantRole(CREATOR_ROLE, deployer.address)).wait();
  console.log('Roles granted in FFactory.\n');

  console.log('Setting FRouter in FFactory...');
  await (await fFactory.setRouter(fRouter.address)).wait();
  console.log('Router set in FFactory.\n');

  console.log('Granting EXECUTOR_ROLE to deployer in FRouter...');
  await (await fRouter.grantRole(EXECUTOR_ROLE, deployer.address)).wait();
  console.log('EXECUTOR_ROLE granted in FRouter.\n');

  // 5. Deploy ArtistNft (Upgradeable)
  let artistNft;
  if (!deployed.artistNftAddress) {
    console.log('Deploying ArtistNft...');
    const ArtistNft = await ethers.getContractFactory('ArtistNft');
    artistNft = await upgrades.deployProxy(ArtistNft, [deployer.address], {
      unsafeAllow: ['internal-function-storage'],
    });
    await artistNft.deployed();
    deployed.artistNftAddress = artistNft.address;
    saveDeployed();
    console.log('ArtistNft deployed at:', artistNft.address, '\n');
  } else {
    console.log('Using previously deployed ArtistNft at:', deployed.artistNftAddress, '\n');
    const ArtistNft = await ethers.getContractFactory('ArtistNft');
    artistNft = await ethers.getContractAt('ArtistNft', deployed.artistNftAddress);
  }

  // 6. Deploy ContributionNft (Upgradeable)
  let contribution;
  if (!deployed.contributionAddress) {
    console.log('Deploying ContributionNft...');
    const ContributionNft = await ethers.getContractFactory('ContributionNft');
    contribution = await upgrades.deployProxy(ContributionNft, [artistNft.address], {});
    await contribution.deployed();
    deployed.contributionAddress = contribution.address;
    saveDeployed();
    console.log('ContributionNft deployed at:', contribution.address, '\n');
  } else {
    console.log('Using previously deployed ContributionNft at:', deployed.contributionAddress, '\n');
    const ContributionNft = await ethers.getContractFactory('ContributionNft');
    contribution = await ethers.getContractAt('ContributionNft', deployed.contributionAddress);
  }

  // 7. Deploy ServiceNft (Upgradeable)
  let service;
  if (!deployed.serviceAddress) {
    console.log('Deploying ServiceNft...');
    const ServiceNft = await ethers.getContractFactory('ServiceNft');
    service = await upgrades.deployProxy(
      ServiceNft,
      [artistNft.address, contribution.address, process.env.DATASET_SHARES],
      {}
    );
    await service.deployed();
    deployed.serviceAddress = service.address;
    saveDeployed();
    console.log('ServiceNft deployed at:', service.address, '\n');
  } else {
    console.log('Using previously deployed ServiceNft at:', deployed.serviceAddress, '\n');
    const ServiceNft = await ethers.getContractFactory('ServiceNft');
    service = await ethers.getContractAt('ServiceNft', deployed.serviceAddress);
  }

  // Set the Contribution and Service NFT addresses on ArtistNft
  await artistNft.setContributionService(contribution.address, service.address);
  console.log('Set Contribution and Service NFTs on ArtistNft.\n');

  // 8. Deploy ArtistVeToken (Non-upgradeable)
  let artistVeToken;
  if (!deployed.artistVeTokenAddress) {
    console.log('Deploying ArtistVeToken...');
    const ArtistVeToken = await ethers.getContractFactory('ArtistVeToken');
    artistVeToken = await ArtistVeToken.deploy();
    await artistVeToken.deployed();
    deployed.artistVeTokenAddress = artistVeToken.address;
    saveDeployed();
    console.log('ArtistVeToken deployed at:', artistVeToken.address, '\n');
  } else {
    console.log('Using previously deployed ArtistVeToken at:', deployed.artistVeTokenAddress, '\n');
    const ArtistVeToken = await ethers.getContractFactory('ArtistVeToken');
    artistVeToken = await ethers.getContractAt('ArtistVeToken', deployed.artistVeTokenAddress);
  }

  // 9. Deploy ArtistToken (Non-upgradeable)
  let artistToken;
  if (!deployed.artistTokenAddress) {
    console.log('Deploying ArtistToken (implementation)...');
    const ArtistToken = await ethers.getContractFactory('ArtistToken');
    artistToken = await ArtistToken.deploy();
    await artistToken.deployed();
    deployed.artistTokenAddress = artistToken.address;
    saveDeployed();
    console.log('ArtistToken deployed at:', artistToken.address, '\n');
  } else {
    console.log('Using previously deployed ArtistToken at:', deployed.artistTokenAddress, '\n');
    const ArtistToken = await ethers.getContractFactory('ArtistToken');
    artistToken = await ethers.getContractAt('ArtistToken', deployed.artistTokenAddress);
  }

  // 10. Deploy TBA Registry (ERC6551Registry)
  let tbaRegistry;
  if (!deployed.tbaRegistryAddress) {
    console.log('Deploying TBA Registry...');
    const TBARegistryFactory = await ethers.getContractFactory('ERC6551Registry');
    tbaRegistry = await TBARegistryFactory.deploy();
    await tbaRegistry.deployed();
    deployed.tbaRegistryAddress = tbaRegistry.address;
    saveDeployed();
    console.log('TBA Registry deployed at:', tbaRegistry.address, '\n');
  } else {
    console.log('Using previously deployed TBA Registry at:', deployed.tbaRegistryAddress, '\n');
    const TBARegistryFactory = await ethers.getContractFactory('ERC6551Registry');
    tbaRegistry = await ethers.getContractAt('ERC6551Registry', deployed.tbaRegistryAddress);
  }

  // 11. Deploy ArtistDAO (Upgradeable) with initialization
  let artistDAO;
  if (!deployed.artistDAOAddress) {
    console.log('Deploying ArtistDAO...');
    const ArtistDAO = await ethers.getContractFactory('ArtistDAO');
    // Since ArtistDAO does not do token scaling, we convert daoThreshold with parseEther:
    const daoThreshold = ethers.utils.parseEther(process.env.DAO_THRESHOLD || '1000');
    const daoVotingPeriod = process.env.DAO_VOTING_PERIOD || 600;
    artistDAO = await upgrades.deployProxy(
      ArtistDAO,
      ["Artist DAO", artistVeToken.address, artistNft.address, daoThreshold, daoVotingPeriod],
      { initializer: 'initialize' }
    );
    await artistDAO.deployed();
    deployed.artistDAOAddress = artistDAO.address;
    saveDeployed();
    console.log('ArtistDAO deployed at:', artistDAO.address, '\n');
  } else {
    console.log('Using previously deployed ArtistDAO at:', deployed.artistDAOAddress, '\n');
    const ArtistDAO = await ethers.getContractFactory('ArtistDAO');
    artistDAO = await ethers.getContractAt('ArtistDAO', deployed.artistDAOAddress);
  }

  // 12. Deploy ArtistFactory (Upgradeable)
  let artistFactory;
  if (!deployed.artistFactoryAddress) {
    console.log('Deploying ArtistFactory...');
    const ArtistFactory = await ethers.getContractFactory('ArtistFactory');
    artistFactory = await upgrades.deployProxy(
      ArtistFactory,
      [
        artistToken.address,
        artistVeToken.address,
        artistDAO.address,
        tbaRegistry.address,
        assetTokenAddress,
        artistNft.address,
        ethers.utils.parseEther(process.env.APPLICATION_THRESHOLD || '50000'),
        process.env.ARTIST_VAULT,
        0,
      ],
      { initializer: 'initialize' }
    );
    await artistFactory.deployed();
    deployed.artistFactoryAddress = artistFactory.address;
    saveDeployed();
    console.log('ArtistFactory deployed at:', artistFactory.address, '\n');
  } else {
    console.log('Using previously deployed ArtistFactory at:', deployed.artistFactoryAddress, '\n');
    const ArtistFactory = await ethers.getContractFactory('ArtistFactory');
    artistFactory = await ethers.getContractAt('ArtistFactory', deployed.artistFactoryAddress);
  }

  // 13. Grant MINTER_ROLE in ArtistNft to ArtistFactory and set parameters
  const MINTER_ROLE_CONTRACT = await artistNft.MINTER_ROLE();
  await (await artistNft.grantRole(MINTER_ROLE_CONTRACT, artistFactory.address)).wait();
  console.log('Granted MINTER_ROLE in ArtistNft to ArtistFactory.\n');
  await artistFactory.setMaturityDuration(86400 * 365 * 10); // 10 years
  await artistFactory.setUniswapRouter(process.env.UNISWAP_ROUTER);
  await artistFactory.setTokenAdmin(deployer.address);
  await artistFactory.setTokenSupplyParams(
    process.env.ARTIST_TOKEN_SUPPLY,
    process.env.ARTIST_TOKEN_LP_SUPPLY,
    process.env.ARTIST_TOKEN_VAULT_SUPPLY,
    "1000000",
    "100000",
    process.env.BOT_PROTECTION,
    deployer.address
  );
  await artistFactory.setTokenTaxParams(
    process.env.TAX,
    process.env.TAX,
    process.env.SWAP_THRESHOLD,
    deployer.address
  );
  console.log('ArtistFactory parameters set.\n');

  // 14. Deploy Bonding Contract (Upgradeable)
  let bonding;
  if (!deployed.bondingAddress) {
    console.log('Deploying Bonding Contract...');
    const Bonding = await ethers.getContractFactory('Bonding');
    // Note: Bonding is deployed without an initializer.
    bonding = await upgrades.deployProxy(Bonding, [], { initializer: false });
    await bonding.deployed();
    deployed.bondingAddress = bonding.address;
    saveDeployed();
    console.log('Bonding deployed at:', bonding.address, '\n');
  } else {
    console.log('Using previously deployed Bonding Contract at:', deployed.bondingAddress, '\n');
    const Bonding = await ethers.getContractFactory('Bonding');
    bonding = await ethers.getContractAt('Bonding', deployed.bondingAddress);
  }

  // 15. Grant roles for Bonding
  const BONDING_ROLE = await artistFactory.BONDING_ROLE();
  await (await artistFactory.grantRole(BONDING_ROLE, bonding.address)).wait();
  console.log('Granted BONDING_ROLE to Bonding in ArtistFactory.\n');
  await (await fFactory.grantRole(CREATOR_ROLE, bonding.address)).wait();
  console.log('Granted CREATOR_ROLE to Bonding in FFactory.\n');
  const hasCreatorRole = await fFactory.hasRole(CREATOR_ROLE, bonding.address);
  if (!hasCreatorRole) {
    throw new Error('Failed to grant CREATOR_ROLE to Bonding in FFactory.');
  }
  console.log('Bonding verified with CREATOR_ROLE in FFactory.\n');
  await (await fRouter.grantRole(EXECUTOR_ROLE, bonding.address)).wait();
  console.log('Granted EXECUTOR_ROLE to Bonding in FRouter.\n');

  // 16. Initialize Bonding Contract
  console.log('Initializing Bonding Contract...');
  console.log('Initialization Parameters:');
  console.log('  FFactory:', fFactory.address);
  console.log('  FRouter:', fRouter.address);
  console.log('  FEE_TO:', process.env.FEE_TO);
  console.log('  FEE_RATE:', process.env.FEE_RATE || '0.01');
  // For Bonding.initialize, we pass INITIAL_SUPPLY and MAX_TX as raw strings because
  // the contract multiplies by 10**18 internally.
  console.log('  INITIAL_SUPPLY:', process.env.INITIAL_SUPPLY || '1000000000');
  console.log('  ASSET_RATE:', process.env.ASSET_RATE || '1');
  console.log('  MAX_TX:', process.env.MAX_TX || '1000000000');
  console.log('  ARTIST_FACTORY:', artistFactory.address);
  console.log('  GRAD_THRESHOLD:', process.env.GRAD_THRESHOLD || '3000000', '\n');

  // Note: We pass process.env.INITIAL_SUPPLY and process.env.MAX_TX directly (not parsed)
  await bonding.initialize(
    fFactory.address,
    fRouter.address,
    process.env.FEE_TO,
    process.env.FEE_RATE,
    process.env.INITIAL_SUPPLY,
    process.env.ASSET_RATE,
    process.env.MAX_TX,
    artistFactory.address,
    ethers.utils.parseEther('85000000')
  );
  console.log('Bonding initialized successfully.\n');

  // Set deploy parameters for the bonding curve using genesisInput values
  const genesisInput = {
    name: 'Jessica',
    symbol: 'JSC',
    tokenURI: 'http://jessica',
    daoName: 'Jessica DAO',
    cores: [0, 1, 2],
    tbaSalt:
      '0xa7647ac9429fdce477ebd9a95510385b756c757c26149e740abbab0ad1be2f16',
    tbaImplementation: process.env.TBA_REGISTRY, // or use process.env.TBA_IMPLEMENTATION if appropriate
    daoVotingPeriod: 600,
    daoThreshold: 1000000000000000000000n,
  };

  await bonding.setDeployParams([
    genesisInput.tbaSalt,
    genesisInput.tbaImplementation,
    genesisInput.daoVotingPeriod,
    genesisInput.daoThreshold,
  ]);

  const bondingFee = await bonding.fee();
  console.log('Bonding Fee:', ethers.utils.formatEther(bondingFee), 'AST');
  const bondingAssetRate = await bonding.assetRate();
  console.log('Bonding Asset Rate:', bondingAssetRate.toString(), '\n');
  if (bondingAssetRate.eq(0)) {
    throw new Error('Bonding Asset Rate is zero, which will cause division by zero.');
  }

  // 17. Example Artist Launch
  console.log('Launching an example artist...');
  const assetTokenContract = await ethers.getContractAt('FERC20', assetTokenAddress);
  const purchaseAmount = ethers.utils.parseEther(process.env.PURCHASE_AMOUNT || '2');
  // Here feeAmount is computed on-chain based on FEE_RATE; for logging we compute similarly.
  const feeAmount = process.env.FEE_RATE;
  console.log('Purchase Amount:', purchaseAmount, 'AST');
  console.log('Bonding Fee:', ethers.utils.formatEther(feeAmount), 'AST\n');

  if (purchaseAmount.lte(feeAmount)) {
    throw new Error(
      `Purchase amount (${ethers.utils.formatEther(purchaseAmount)} AST) must exceed the fee (${ethers.utils.formatEther(feeAmount)} AST).`
    );
  }
  const deployerBalanceTokens = await assetTokenContract.balanceOf(deployer.address);
  console.log('Deployer Token Balance:', ethers.utils.formatEther(deployerBalanceTokens), 'AST\n');
  if (purchaseAmount.gt(deployerBalanceTokens)) {
    throw new Error('Insufficient balance for purchase.');
  }
  console.log('Approving Bonding contract to spend Asset Tokens...');
  await (await assetTokenContract.approve(bonding.address, purchaseAmount)).wait();
  console.log('Approved Bonding contract to spend Asset Tokens.\n');
  const allowanceAfterApproval = await assetTokenContract.allowance(deployer.address, bonding.address);
  console.log('Bonding Contract Allowance after approval:', ethers.utils.formatEther(allowanceAfterApproval), 'AST\n');

  // Listen for the Launched event from the Bonding contract
  bonding.on('Launched', (token, pair, tokenIndex) => {
    console.log(`Launched Event: Token Address=${token}, Pair Address=${pair}, Token Index=${tokenIndex}`);
  });

  let artistTokenAddress;
  try {
    console.log('Calling Bonding.launch()...');
    const txLaunch = await bonding.launch(
      'HASSAN SHAH',
      'HASSANSHAH',
      [1, 2, 3],
      'Pakistani musician creating waves globally.',
      'https://asset.dr.dk/imagescaler/?protocol=https&server=www.dr.dk&file=%2Fimages%2Fother%2F2021%2F02%2F12%2F20160807-105814-pf-1920x1279we.jpg&scaleAfter=crop&quality=70&w=720&h=479',
      [
        'https://twitter.com/hassanshah',
        'https://t.me/hassanshah',
        'https://youtube.com/hassanshah',
        'https://hassanshah.com',
      ],
      ethers.utils.parseEther('2')
    );
    const receiptLaunch = await txLaunch.wait();
    for (const log of receiptLaunch.logs) {
      try {
        const parsedLog = bonding.interface.parseLog(log);
        if (parsedLog.name === 'Launched') {
          artistTokenAddress = parsedLog.args.token;
          console.log('Artist Token Address:', artistTokenAddress, '\n');
          break;
        }
      } catch (error) {
        // Ignore logs not belonging to Bonding
      }
    }
    if (!artistTokenAddress) {
      throw new Error('Launched event not found in transaction receipt.');
    }
  } catch (launchError) {
    console.error('Artist Launch Error:', launchError);
    throw launchError;
  }
  bonding.removeAllListeners('Launched');

  const artistTokenContract = await ethers.getContractAt('FERC20', artistTokenAddress);
  async function getTokenData(bondingContract, tokenAddress) {
    return await bondingContract.tokenInfo(tokenAddress);
  }
  console.log('Retrieving Artist Token Data Before Forced Graduation...');
  let tokenData = await getTokenData(bonding, artistTokenAddress);
  console.log('Initial Token Data:', tokenData);

  const chunkSize = ethers.utils.parseEther('10000');
  let done = false;
  let iteration = 0;
  const maxIterations = 5000;

  // Fund Bonding contract if needed
  const fundingAmount = ethers.utils.parseEther('100000'); // 100,000 AST
  await (await assetTokenContract.transfer(bonding.address, fundingAmount)).wait();
  const bondingBalanceUpdated = await assetTokenContract.balanceOf(bonding.address);
  console.log('Updated Bonding Contract Asset Balance:', ethers.utils.formatEther(bondingBalanceUpdated));

  while (!done && iteration < maxIterations) {
    iteration++;
    await assetTokenContract.approve(fRouter.address, chunkSize);
    console.log(`Iteration #${iteration}, attempting to buy ${ethers.utils.formatEther(chunkSize)} AST...`);
    const bondingAssetBalance = await assetTokenContract.balanceOf(bonding.address);
    console.log('Bonding Contract Asset Balance:', ethers.utils.formatEther(bondingAssetBalance));

    try {
      await bonding.callStatic.buy(chunkSize, artistTokenAddress);
    } catch (error) {
      console.log(`CallStatic.buy simulation failed at iteration ${iteration}: ${error}`);
      console.log("Likely the token has graduated. Stopping further buys.");
      done = true;
      break;
    }
    try {
      const txBuy = await bonding.buy(chunkSize, artistTokenAddress, { gasLimit: 500000 });
      await txBuy.wait();
    } catch (error) {
      console.log(`Actual buy failed at iteration ${iteration}: ${error}`);
      console.log("Likely the token has graduated. Stopping further buys.");
      done = true;
      break;
    }
    const tokenDataAfterBuy = await getTokenData(bonding, artistTokenAddress);
    console.log('Token Data after buy:', tokenDataAfterBuy);

    if (tokenDataAfterBuy.tradingOnUniswap) {
      console.log('Token successfully graduated to Uniswap!');
      done = true;
      break;
    }
  }
  if (!done) {
    console.log('Token not yet graduated. Consider increasing chunk size or iterations.');
  }
  console.log('Retrieving Artist Token Data After Forced Graduation...');
  const tokenDataAfterForcedBuy = await getTokenData(bonding, artistTokenAddress);
  console.log('Artist Token Data After Forced Graduation:', tokenDataAfterForcedBuy, '\n');

  console.log('Performing Sell Operation...');
  const sellAmountIn = ethers.utils.parseEther('10');
  const deployerArtistTokenBalance = await artistTokenContract.balanceOf(deployer.address);
  if (sellAmountIn.gt(deployerArtistTokenBalance)) {
    throw new Error('Insufficient artist token balance for sell operation.');
  }
  const currentSellAllowance = await artistTokenContract.allowance(deployer.address, fRouter.address);
  if (currentSellAllowance.lt(sellAmountIn)) {
    console.log('Approving FRouter to spend additional artist tokens for sell...');
    await (await artistTokenContract.approve(fRouter.address, sellAmountIn)).wait();
    console.log('Approved additional artist tokens for sell.\n');
  }
  try {
    const txSell = await bonding.sell(sellAmountIn, artistTokenAddress);
    const receiptSell = await txSell.wait();
    console.log('Sell executed successfully:', receiptSell.transactionHash, '\n');
  } catch (sellError) {
    console.error('Sell Execution Error:', sellError);
    throw sellError;
  }
  console.log('Retrieving Artist Token Data After Sell...');
  const tokenDataAfterSell = await getTokenData(bonding, artistTokenAddress);
  console.log('Artist Token Data After Sell:', tokenDataAfterSell, '\n');

  // ---------------------------------------------------------------
  //                VERIFICATION SECTION
  // ---------------------------------------------------------------
  if (network !== 'local' && network !== 'hardhat') {
    console.log('Starting contract verification on Etherscan...');
    console.log('Waiting 60 seconds for contracts to be indexed on Etherscan...');
    await new Promise((resolve) => setTimeout(resolve, 60000));

    // Utility to run the verify task
    async function verifyContract(address, contractName, constructorArgs = []) {
      console.log(`Verifying ${contractName} at address ${address}...`);
      try {
        await hre.run('verify:verify', {
          address: address,
          constructorArguments: constructorArgs,
        });
        console.log(`${contractName} verified successfully.\n`);
      } catch (verifyError) {
        console.error(`${contractName} Verification Error:`, verifyError);
      }
    }

    // 1) FERC20 is non-upgradeable, pass constructor arguments
    await verifyContract(assetTokenAddress, 'FERC20', [
      'Limelight',
      'LMLT',
      process.env.INITIAL_SUPPLY || '1000000000',
      process.env.MAX_TX || '1000000000',
    ]);

    // For upgradeable proxies, we must verify the *implementation* address
    async function getImplementation(proxyAddress) {
      return upgrades.erc1967.getImplementationAddress(proxyAddress);
    }

    // 2) FFactory => Implementation
    {
      const impl = await getImplementation(deployed.fFactoryAddress);
      await verifyContract(impl, 'FFactory'); 
    }
    // 3) FRouter => Implementation
    {
      const impl = await getImplementation(deployed.fRouterAddress);
      await verifyContract(impl, 'FRouter');
    }
    // 4) ArtistNft => Implementation
    {
      const impl = await getImplementation(deployed.artistNftAddress);
      // ArtistNft’s constructor is empty in an upgradeable pattern => no args
      await verifyContract(impl, 'ArtistNft');
    }
    // 5) ContributionNft => Implementation
    {
      const impl = await getImplementation(deployed.contributionAddress);
      // Because it's upgradeable, the real constructor is likely empty or minimal.
      // But if it DOES have a constructor that expects the artistNft address, pass it here:
      // In many OZ upgradeable patterns, the real constructor is empty and the logic is in initialize().
      // We'll try no args first:
      await verifyContract(impl, 'ContributionNft');
    }
    // 6) ServiceNft => Implementation
    {
      const impl = await getImplementation(deployed.serviceAddress);
      await verifyContract(impl, 'ServiceNft');
    }
    // 7) ArtistDAO => Implementation
    {
      const impl = await getImplementation(deployed.artistDAOAddress);
      await verifyContract(impl, 'ArtistDAO');
    }
    // 8) ArtistFactory => Implementation
    {
      const impl = await getImplementation(deployed.artistFactoryAddress);
      await verifyContract(impl, 'ArtistFactory');
    }
    // 9) Bonding => Implementation
    {
      const impl = await getImplementation(deployed.bondingAddress);
      await verifyContract(impl, 'Bonding');
    }

    // Non-upgradeable => verify direct
    //  - ArtistVeToken
    await verifyContract(deployed.artistVeTokenAddress, 'ArtistVeToken');
    //  - ArtistToken
    await verifyContract(deployed.artistTokenAddress, 'ArtistToken');
    //  - TBA Registry
    await verifyContract(deployed.tbaRegistryAddress, 'ERC6551Registry');
  } else {
    console.log('Local network detected. Skipping contract verification.\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deployment Error:', error);

  });
