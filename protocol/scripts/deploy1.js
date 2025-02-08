require('dotenv').config();
const hre = require('hardhat');
const { ethers } = hre;
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

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('-----------------------------------------------------');
  console.log('Deploying contracts with the account:', deployer.address);
  const balance = await deployer.getBalance();
  console.log('Account balance:', ethers.utils.formatEther(balance), 'ETH\n');

  // ------------------------------------------------------------------------
  // 1. Deploy or use an existing Asset Token (FERC20)
  // ------------------------------------------------------------------------
  let assetTokenAddress = process.env.ASSET_TOKEN_ADDRESS;
  if (
    !assetTokenAddress ||
    assetTokenAddress === '0x0000000000000000000000000000000000000000'
  ) {
    console.log('Deploying Asset Token (FERC20)...');
    const FERC20 = await ethers.getContractFactory('FERC20');
    // The constructor parameters are: (name, symbol, supply, maxTx)
    // NOTE: supply is provided in whole units (the contract multiplies by 10^18).
    const initialSupply = process.env.INITIAL_SUPPLY; // e.g. "1000000000"
    const maxTx = process.env.MAX_TX || '5'; // Must be <= 5 (represents max tx as a percentage)
    const assetToken = await FERC20.deploy('Limelight', 'LMLT', initialSupply, maxTx);
    await assetToken.deployed();
    assetTokenAddress = assetToken.address;
    deployed.assetTokenAddress = assetTokenAddress;
    saveDeployed();
    console.log('Asset Token deployed at:', assetTokenAddress, '\n');
  } else {
    console.log('Using existing Asset Token at:', assetTokenAddress, '\n');
  }
  const assetToken = await ethers.getContractAt('FERC20', assetTokenAddress);

  // ------------------------------------------------------------------------
  // 2. Deploy Factory contract
  // ------------------------------------------------------------------------
  let factoryAddress = deployed.factoryAddress;
  if (!factoryAddress) {
    console.log('Deploying Factory...');
    const Factory = await ethers.getContractFactory('Factory');
    // The Factory constructor requires a feeTo address.
    const feeTo = process.env.FEE_TO;
    const factory = await Factory.deploy(feeTo);
    await factory.deployed();
    factoryAddress = factory.address;
    deployed.factoryAddress = factoryAddress;
    saveDeployed();
    console.log('Factory deployed at:', factoryAddress, '\n');
  } else {
    console.log('Using previously deployed Factory at:', factoryAddress, '\n');
  }

  // ------------------------------------------------------------------------
  // 3. Deploy Router contract
  // ------------------------------------------------------------------------
  let routerAddress = deployed.routerAddress;
  if (!routerAddress) {
    console.log('Deploying Router...');
    const Router = await ethers.getContractFactory('Router');
    // The Router constructor takes: (factory address, assetToken address, referralFee)
    const referralFee = process.env.REFERRAL_FEE || '1'; // default referral fee percentage
    const router = await Router.deploy(factoryAddress, assetTokenAddress, referralFee);
    await router.deployed();
    routerAddress = router.address;
    deployed.routerAddress = routerAddress;
    saveDeployed();
    console.log('Router deployed at:', routerAddress, '\n');
  } else {
    console.log('Using previously deployed Router at:', routerAddress, '\n');
  }

  // ------------------------------------------------------------------------
  // 4. Deploy LimelightBonding contract
  // ------------------------------------------------------------------------
  let bondingAddress = deployed.bondingAddress;
  if (!bondingAddress) {
    console.log('Deploying LimelightBonding contract...');
    const LimelightBonding = await ethers.getContractFactory('LimelightBonding');
    // The LimelightBonding constructor takes: 
    //    (factory address, router address, feeTo address, fee, assetToken address)
    // Here the "launch fee" is set from the env variable LAUNCH_FEE.
    const launchFee = process.env.LAUNCH_FEE || '1';
    const bonding = await LimelightBonding.deploy(
      factoryAddress,
      routerAddress,
      process.env.FEE_TO,
      launchFee,
      assetTokenAddress
    );
    await bonding.deployed();
    bondingAddress = bonding.address;
    deployed.bondingAddress = bondingAddress;
    saveDeployed();
    console.log('LimelightBonding deployed at:', bondingAddress, '\n');
  } else {
    console.log('Using previously deployed LimelightBonding at:', bondingAddress, '\n');
  }
  const bonding = await ethers.getContractAt('LimelightBonding', bondingAddress);

  // ------------------------------------------------------------------------
  // 5. Launch an Artist Token via LimelightBonding and simulate graduation
  // ------------------------------------------------------------------------
  console.log('-----------------------------------------------------');
  console.log('Launching an example artist token via LimelightBonding...');

  // Determine the purchase amount (in asset tokens) required for launch.
  // (Make sure the deployer has enough asset token balance.)
  const purchaseAmount = ethers.utils.parseEther(process.env.PURCHASE_AMOUNT || '2');
  // Approve the bonding contract to spend the purchaseAmount of asset tokens.
  console.log('Approving Bonding contract to spend asset tokens for launch...');
  await (await assetToken.approve(bondingAddress, purchaseAmount)).wait();

  // Call the launch function.
  // The launch() parameters are:
  //    _name, _ticker, description, image, [twitter, telegram, youtube, website],
  //    _supply, maxTx, purchaseAmount
  const txLaunch = await bonding.launch(
    "Test Artist",                     // _name
    "TART",                            // _ticker
    "A test artist token launch",      // description
    "https://example.com/image.png",   // image URL
    [
      "https://twitter.com/test",
      "https://t.me/test",
      "https://youtube.com/test",
      "https://example.com"
    ],                                 // urls array
    "1000000",                         // _supply (in whole units; contract scales it)
    5,                                 // maxTx (percentage; must be <= 5)
    purchaseAmount                     // purchaseAmount
  );
  const receiptLaunch = await txLaunch.wait();

  // Retrieve the launched token address from the Launched event.
  let artistTokenAddress;
  for (const log of receiptLaunch.logs) {
    try {
      const parsedLog = bonding.interface.parseLog(log);
      if (parsedLog.name === 'Launched') {
        artistTokenAddress = parsedLog.args.token;
        break;
      }
    } catch (error) {
      // ignore logs that do not belong to LimelightBonding
    }
  }
  if (!artistTokenAddress) {
    throw new Error("Launched event not found in transaction receipt.");
  }
  console.log("Artist token launched at:", artistTokenAddress, "\n");

  // ------------------------------------------------------------------------
  // 6. Simulate repeated buy operations until graduation occurs
  // ------------------------------------------------------------------------
  console.log('Simulating buy operations to trigger graduation...');
  const chunkSize = ethers.utils.parseEther("10000"); // adjust as needed
  let iteration = 0;
  const maxIterations = 5000;
  let graduated = false;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`Iteration #${iteration}: Attempting to buy ${ethers.utils.formatEther(chunkSize)} asset tokens...`);

    // Approve the router to spend asset tokens (if needed)
    await (await assetToken.approve(routerAddress, chunkSize)).wait();

    // First, use callStatic to simulate the buy.
    try {
      await bonding.callStatic.buy(chunkSize, artistTokenAddress);
    } catch (error) {
      console.log(`CallStatic.buy simulation failed at iteration ${iteration}: ${error}`);
      console.log("Token may have already graduated. Stopping further buy attempts.");
      break;
    }

    // Execute the buy.
    try {
      const txBuy = await bonding.buy(chunkSize, artistTokenAddress, { gasLimit: 500000 });
      await txBuy.wait();
      console.log(`Buy iteration ${iteration} completed.`);
    } catch (error) {
      console.log(`Buy transaction failed at iteration ${iteration}: ${error}`);
      break;
    }

    // Check token information to see if graduation (trading on Uniswap) has occurred.
    const tokenData = await bonding.tokenInfo(artistTokenAddress);
    console.log("Token Data after buy:", tokenData);
    if (tokenData.tradingOnUniswap) {
      console.log("Token has successfully graduated to Uniswap!");
      graduated = true;
      break;
    }
  }
  if (!graduated) {
    console.log("Token did not graduate after maximum buy iterations.");
  }
  console.log("");

  // ------------------------------------------------------------------------
  // 7. Simulate a sell operation on the launched token
  // ------------------------------------------------------------------------
  console.log("Simulating a sell operation...");
  const artistToken = await ethers.getContractAt("FERC20", artistTokenAddress);
  const sellAmount = ethers.utils.parseEther("10"); // Sell 10 tokens (adjust as needed)
  const deployerArtistTokenBalance = await artistToken.balanceOf(deployer.address);
  if (sellAmount.gt(deployerArtistTokenBalance)) {
    throw new Error("Insufficient artist token balance for sell operation.");
  }
  // Approve the router to spend the artist token if needed.
  const currentAllowance = await artistToken.allowance(deployer.address, routerAddress);
  if (currentAllowance.lt(sellAmount)) {
    console.log("Approving Router to spend artist tokens for sell...");
    await (await artistToken.approve(routerAddress, sellAmount)).wait();
  }
  try {
    const txSell = await bonding.sell(sellAmount, artistTokenAddress);
    const receiptSell = await txSell.wait();
    console.log("Sell transaction executed successfully. Tx Hash:", receiptSell.transactionHash);
  } catch (error) {
    console.error("Sell operation failed:", error);
  }
  console.log("-----------------------------------------------------");
  console.log("Deployment and test sequence complete. Deployed contract addresses:");
  console.log(JSON.stringify(deployed, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deployment Error:', error);
    process.exit(1);
  });
