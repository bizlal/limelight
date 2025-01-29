// scripts/deploy.js

require("dotenv").config();
const hre = require("hardhat");
const { ethers, upgrades } = hre;

async function main() {
  // 1. Compile Contracts
  console.log("Compiling contracts...");
  await hre.run("compile");
  console.log("Compilation finished.\n");

  // 2. Get the Deployer Signer
  const [deployer] = await ethers.getSigners();
  console.log("-----------------------------------------------------");
  console.log("Deploying contracts with the account:", deployer.address);

  // 3. Display Deployer's Balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");
  console.log("-----------------------------------------------------\n");

  // 4. Determine Network and Chain ID
  const network = hre.network.name;
  const chainId = hre.network.config.chainId || ((await hre.ethers.provider.getNetwork()).chainId);
  console.log(`Network: ${network}`);
  console.log(`Chain ID: ${chainId}\n`);

  // 5. Deploy or Use Existing Asset Token
  let assetTokenAddress = process.env.ASSET_TOKEN_ADDRESS;
  if (!assetTokenAddress || assetTokenAddress === "0x0000000000000000000000000000000000000000") {
    const supportedChainIds = ["84532", "5", "1", "80001", "137", "31337"];
    if (supportedChainIds.includes(chainId.toString())) {
      console.log("No existing Asset Token address provided. Deploying AssetToken...");
      const FERC20 = await ethers.getContractFactory("FERC20");
      const initialSupply = process.env.INITIAL_SUPPLY; // 1,000 AST = 1e3 * 1e18 = 1e21
      const maxTx = process.env.MAX_TX ; // Default maxTx to 1000 if not set
      const assetToken = await FERC20.deploy("Limelight", "LMLT", initialSupply, maxTx);
      assetTokenAddress = await assetToken.address;
      console.log("AssetToken deployed to:", assetTokenAddress, "\n");
    } else {
      throw new Error(`Unsupported network chainId: ${chainId}`);
    }
  } else {
    console.log("Using existing Asset Token address:", assetTokenAddress, "\n");
  }

  // 6. Deploy FFactory Contract (Upgradeable)
  console.log("Deploying FFactory...");
  const FFactory = await ethers.getContractFactory("FFactory");
  const fFactory = await upgrades.deployProxy(
    FFactory,
    [
      process.env.TAX_VAULT,
      process.env.BUY_TAX,
      process.env.SELL_TAX
    ],
    { initializer: "initialize" }
  );

  const fFactoryAddress = await fFactory.address;
  console.log("FFactory deployed to:", fFactoryAddress, "\n");

  // 7. Deploy FRouter Contract (Upgradeable)
  console.log("Deploying FRouter...");
  const FRouter = await ethers.getContractFactory("FRouter");
  const fRouter = await upgrades.deployProxy(
    FRouter,
    [fFactoryAddress, assetTokenAddress],
    { initializer: "initialize" }
  );

  const fRouterAddress = await fRouter.address;
  console.log("FRouter deployed to:", fRouterAddress, "\n");

  // 8. Grant Roles and Set Router
  console.log("Granting roles and setting router...");

  // Accurate role hash calculation using ethers.js v6
  const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN_ROLE"));
  const CREATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CREATOR_ROLE"));
  const EXECUTOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EXECUTOR_ROLE"));

  // Grant ADMIN_ROLE to deployer in FFactory
  console.log("Granting ADMIN_ROLE to deployer in FFactory...");
  const grantAdminRoleTx = await fFactory.grantRole(
    ADMIN_ROLE,
    deployer.address
  );
  await grantAdminRoleTx.wait();
  console.log("Granted ADMIN_ROLE to deployer in FFactory.\n");

  // Grant CREATOR_ROLE to deployer in FFactory
  console.log("Granting CREATOR_ROLE to deployer in FFactory...");
  const grantCreatorRoleTx = await fFactory.grantRole(
    CREATOR_ROLE,
    deployer.address
  );
  await grantCreatorRoleTx.wait();
  console.log("Granted CREATOR_ROLE to deployer in FFactory.\n");

  // Set Router in FFactory
  console.log("Setting FRouter in FFactory...");
  const txSetRouter = await fFactory.setRouter(fRouterAddress);
  await txSetRouter.wait();
  console.log("Router set in FFactory.\n");

  // Grant EXECUTOR_ROLE to deployer in FRouter
  console.log("Granting EXECUTOR_ROLE to deployer in FRouter...");
  const grantExecutorRoleTx = await fRouter.grantRole(
    EXECUTOR_ROLE,
    deployer.address
  );
  await grantExecutorRoleTx.wait();
  console.log("Granted EXECUTOR_ROLE to deployer in FRouter.\n");

  // Verify EXECUTOR_ROLE assignment
  const hasExecutorRole = await fRouter.hasRole(EXECUTOR_ROLE, deployer.address);
  console.log("Deployer has EXECUTOR_ROLE in FRouter:", hasExecutorRole);
  if (!hasExecutorRole) {
    throw new Error("Failed to grant EXECUTOR_ROLE to deployer in FRouter.");
  }
  console.log("");

  console.log("Roles granted and router set.\n");

  // 9. Deploy Bonding Contract (Upgradeable)
  console.log("Deploying Bonding Contract...");
  const Bonding = await ethers.getContractFactory("Bonding");
  const bonding = await upgrades.deployProxy(
    Bonding,
    [],
    { initializer: false } // Initialize manually after role assignment
  );
 
  const bondingAddress = await bonding.address;
  console.log("Bonding deployed at:", bondingAddress, "\n");

  // 10. Grant CREATOR_ROLE to Bonding on FFactory
  console.log("Granting CREATOR_ROLE to Bonding on FFactory...");
  const grantCreatorRoleToBondingTx = await fFactory.grantRole(
    CREATOR_ROLE,
    bondingAddress
  );
  await grantCreatorRoleToBondingTx.wait();
  console.log("Bonding granted CREATOR_ROLE on FFactory.\n");

  // 11. Verify Bonding has CREATOR_ROLE on FFactory
  console.log("Verifying Bonding has CREATOR_ROLE on FFactory...");
  const hasCreatorRole = await fFactory.hasRole(CREATOR_ROLE, bondingAddress);
  console.log("Bonding has CREATOR_ROLE on FFactory:", hasCreatorRole);
  if (!hasCreatorRole) {
    throw new Error("Failed to grant CREATOR_ROLE to Bonding on FFactory.");
  }
  console.log("");

  // 12. Grant EXECUTOR_ROLE to Bonding on FRouter
  console.log("Granting EXECUTOR_ROLE to Bonding on FRouter...");
  const grantExecutorRoleToBondingTx = await fRouter.grantRole(
    EXECUTOR_ROLE,
    bondingAddress
  );
  await grantExecutorRoleToBondingTx.wait();
  console.log("Bonding granted EXECUTOR_ROLE on FRouter.\n");

  // 13. Initialize Bonding Contract
  console.log("Initializing Bonding Contract...");
  // Log Initialization Parameters
  console.log("Initialization Parameters:");
  console.log("FFactory Address:", fFactoryAddress);
  console.log("FRouter Address:", fRouterAddress);
  console.log("FEE_TO:", process.env.FEE_TO);
  console.log("FEE_RATE:", process.env.FEE_RATE || "0.01");
  console.log("INITIAL_SUPPLY:", process.env.INITIAL_SUPPLY || "1000");
  console.log("ASSET_RATE:", process.env.ASSET_RATE || "1");
  console.log("MAX_TX:", process.env.MAX_TX || "100");
  console.log("ARTIST_FACTORY:", process.env.ARTIST_FACTORY);
  console.log("GRAD_THRESHOLD:", process.env.GRAD_THRESHOLD || "3000000\n");

  // Initialize the Bonding Contract
  await bonding.initialize(
    fFactoryAddress,
    fRouterAddress,
    process.env.FEE_TO,
    process.env.FEE_RATE ,
    process.env.INITIAL_SUPPLY, // 1,000 AST
    process.env.ASSET_RATE,
    process.env.MAX_TX,
    process.env.ARTIST_FACTORY,
    process.env.GRAD_THRESHOLD
  );
  console.log("Bonding initialized successfully.\n");

  // 14. Verify Fee and Asset Rate
  const bondingFee = await bonding.fee();
  console.log("Bonding Fee (from contract):", ethers.utils.formatEther(bondingFee), "AST");

  const bondingAssetRate = await bonding.assetRate();
  console.log("Bonding Asset Rate (from contract):", bondingAssetRate.toString(), "\n");

  // Check if assetRate is non-zero
  if (bondingAssetRate === 0) {
    throw new Error("Bonding Asset Rate is zero, which will cause division by zero.");
  }

  // 15. Example Artist Launch
  console.log("Launching an example artist...");

  // Retrieve the FERC20 contract instance
  const assetTokenContract = await ethers.getContractAt("FERC20", assetTokenAddress);
  
  // Define purchaseAmount and fee using ethers.js v6 syntax
  const purchaseAmount = ethers.utils.parseEther(process.env.PURCHASE_AMOUNT || "200");

  const feeAmount =ethers.utils.parseEther(process.env.FEE_RATE || "0.01");

  console.log("Purchase Amount:", ethers.utils.formatEther(purchaseAmount), "AST");
  console.log("Bonding Fee:", ethers.utils.formatEther(feeAmount), "AST\n");

  // Check if the purchaseAmount is less than or equal to the fee
  if (purchaseAmount <= feeAmount) {
    throw new Error(
      `Purchase amount (${ethers.utils.formatEther(purchaseAmount)} AST) must exceed the fee (${ethers.utils.formatEther(feeAmount)} AST).`
    );
  }

  // Check Bonding Contract Allowance
  const allowance = await assetTokenContract.allowance(deployer.address, bondingAddress);
  console.log("Bonding Contract Allowance:", ethers.utils.formatEther(allowance), "AST");

// Show the deployer’s token balance:
const deployerBalance = await assetTokenContract.balanceOf(deployer.address);
console.log("Deployer Token Balance:", 
            ethers.utils.formatEther(deployerBalance), 
            "AST\n");

  // Now the comparison is BigNumber to BigNumber:
  if (purchaseAmount.lte(feeAmount)) {
    throw new Error(
      `Purchase amount (${ethers.utils.formatEther(purchaseAmount)} AST) ` +
      `must exceed the fee (${ethers.utils.formatEther(feeRate)} AST).`
    );
  }

  // Also BigNumber to BigNumber here:
  if (purchaseAmount.gt(deployerBalance)) {
    throw new Error("Insufficient balance for purchase.");
  }

  // Approve Bonding contract to spend Asset Tokens
  console.log("Approving Bonding contract to spend Asset Tokens...");
  const approveTx = await assetTokenContract.approve(bondingAddress, purchaseAmount);
  await approveTx.wait();
  console.log("Approved Bonding contract to spend Asset Tokens.\n");

  const allowanceAfterApproval = await assetTokenContract.allowance(deployer.address, bondingAddress);
  console.log("Bonding Contract Allowance after approval:", ethers.utils.formatEther(allowanceAfterApproval), "AST\n");

  bonding.on("Launched", (token, pair, tokenIndex) => {
    console.log(`Launched Event: Token Address=${token}, Pair Address=${pair}, Token Index=${tokenIndex}`);
  });

  // Launch the artist and capture the Artist Token Address from the event
  let artistTokenAddress;
  try {
    console.log("Calling Bonding.launch()...");
    const txLaunch = await bonding.launch(
      "HASSAN SHAH",                // _name
      "HASSANSHAH",                 // _ticker
      [1, 2, 3],                    // cores
      "Pakistani musician creating waves globally.", // desc
      "https://asset.dr.dk/imagescaler/?protocol=https&server=www.dr.dk&file=%2Fimages%2Fother%2F2021%2F02%2F12%2F20160807-105814-pf-1920x1279we.jpg&scaleAfter=crop&quality=70&w=720&h=479", // img
      [                              // urls
        "https://twitter.com/hassanshah",
        "https://t.me/hassanshah",
        "https://youtube.com/hassanshah",
        "https://hassanshah.com"
      ],
      purchaseAmount                // purchaseAmount
    );
    const receiptLaunch = await txLaunch.wait();

    // Parse the logs manually to find the Launched event
    for (const log of receiptLaunch.logs) {
      try {
        const parsedLog = bonding.interface.parseLog(log);
        if (parsedLog.name === "Launched") {
          artistTokenAddress = parsedLog.args.token;
          console.log("Artist Token Address:", artistTokenAddress, "\n");
          break;
        }
      } catch (error) {
        // Ignore logs that don't belong to this contract
      }
    }

    if (!artistTokenAddress) {
      throw new Error("Launched event not found in transaction receipt.");
    }
  } catch (launchError) {
    console.error("Artist Launch Error:", launchError);
    throw launchError; // Re-throw to be caught by main's catch
  }

  // Remove event listeners to prevent memory leaks

  bonding.removeAllListeners("Launched");

  const artistTokenContract = await ethers.getContractAt("FERC20", artistTokenAddress);

  // Helper function to retrieve token data from Bonding contract
  async function getTokenData(bondingContract, tokenAddress) {
    const tokenInfo = await bondingContract.tokenInfo(tokenAddress);
    return tokenInfo;
  }

  // 16. Retrieve Artist Token Data Before Buy
  console.log("Retrieving Artist Token Data Before Buy...");
  const tokenDataBeforeBuy = await getTokenData(bonding, artistTokenAddress);
  console.log("Artist Token Data Before Buy:", tokenDataBeforeBuy, "\n");

  // 17. Perform Buy Operation
  console.log("Performing Buy Operation...");
  const buyAmountIn = ethers.utils.parseEther("100"); // Buy 100 AST worth of artist tokens

  // Check if deployer has enough AST
  const updatedDeployerASTBalance = await assetTokenContract.balanceOf(deployer.address);
  if (buyAmountIn > updatedDeployerASTBalance) {
    throw new Error("Insufficient AST balance for buy operation.");
  }

  // Approve Bonding contract to spend AST if not already approved
const currentAllowance = await assetTokenContract.allowance(deployer.address, fRouterAddress);

if (currentAllowance < buyAmountIn) {
  console.log("Approving FRouter contract to spend additional AST for buy...");
  const approveBuyTx = await assetTokenContract.approve(fRouterAddress, buyAmountIn);
  await approveBuyTx.wait();
  console.log("Approved additional AST for buy.\n");
}

  try {
    const txBuy = await bonding.buy(
      buyAmountIn,
      artistTokenAddress,
    );
    const receiptBuy = await txBuy.wait();
    console.log("Buy executed successfully:", receiptBuy.transactionHash, "\n");
  } catch (buyError) {
    console.error("Buy Execution Error:", buyError);
    throw buyError;
  }

  // Step 1: Check initial token data (just for clarity)
console.log("Retrieving Artist Token Data Before Forced Graduation...");
let tokenData = await bonding.tokenInfo(artistTokenAddress);
console.log("Initial Token Data:", tokenData);

// Step 2: Decide how much to buy to trigger graduation
// You may need to guess or incrementally buy until `newReserveA <= gradThreshold`
// For example, buy 100 AST worth of tokens at a time in a loop until graduation triggers

const largeBuyAmount = ethers.parseEther("100"); // Adjust this to a large enough value
await assetTokenContract.approve(bondingAddress, largeBuyAmount);

// Perform the buy
console.log("Performing large buy to trigger graduation...");
const txBuyToGraduate = await bonding.buy(largeBuyAmount, artistTokenAddress);
await txBuyToGraduate.wait();

// Step 3: Check if graduation happened
tokenData = await bonding.tokenInfo(artistTokenAddress);
console.log("Post-Buy Token Data:", tokenData);

if (tokenData.tradingOnUniswap) {
  console.log("Token successfully graduated to Uniswap!");
} else {
  console.log("Token not yet graduated. You may need to buy more.");
}


  // 18. Retrieve Artist Token Data After Buy
  console.log("Retrieving Artist Token Data After Buy...");
  const tokenDataAfterBuy = await getTokenData(bonding, artistTokenAddress);
  console.log("Artist Token Data After Buy:", tokenDataAfterBuy, "\n");

//   // 19. Perform Sell Operation
  console.log("Performing Sell Operation...");
  const sellAmountIn = ethers.parseEther("10"); // Sell 10 artist tokens

  // Check if deployer has enough AST
  const deployerASTBalanceForSell = await artistTokenContract.balanceOf(deployer.address);
  if (sellAmountIn > deployerASTBalanceForSell) {
    throw new Error("Insufficient AST balance for sell operation.");
  }

  // Approve Bonding contract to spend AST if not already approved
  const currentSellAllowance = await artistTokenContract.allowance(deployer.address, fRouterAddress);
  if (currentSellAllowance < sellAmountIn) {
    console.log("Approving Bonding contract to spend additional AST for sell...");
    const approveSellTx = await artistTokenContract.approve(fRouterAddress, sellAmountIn);
    await approveSellTx.wait();
    console.log("Approved additional AST for sell.\n");
  }

  try {
    const txSell = await bonding.sell(
      sellAmountIn,
      artistTokenAddress,
    );
    const receiptSell = await txSell.wait();
    console.log("Sell executed successfully:", receiptSell.transactionHash, "\n");
  } catch (sellError) {
    console.error("Sell Execution Error:", sellError);
    throw sellError;
  }

  // 20. Retrieve Artist Token Data After Sell
  console.log("Retrieving Artist Token Data After Sell...");
  const tokenDataAfterSell = await getTokenData(bonding, artistTokenAddress);
  console.log("Artist Token Data After Sell:", tokenDataAfterSell, "\n");

  // 21. Contract Verification
  if (network !== "local" && network !== "hardhat") {
    console.log("Starting contract verification on Etherscan...");
    // Wait for a few seconds to ensure contracts are propagated
    console.log("Waiting for contracts to be indexed on Etherscan...");
    await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait for 60 seconds

    // Helper function to verify contracts
    async function verifyContract(address, contractName, constructorArgs = []) {
      console.log(`Verifying ${contractName} at address ${address}...`);
      try {
        await hre.run("verify:verify", {
          address: address,
          constructorArguments: constructorArgs,
        });
        console.log(`${contractName} verified successfully.\n`);
      } catch (verifyError) {
        console.error(`${contractName} Verification Error:`, verifyError);
      }
    }

    // Verify AssetToken
    await verifyContract(
      assetTokenAddress,
      "FERC20",
      ["Test Token", "AST", ethers.parseEther(process.env.INITIAL_SUPPLY || "1000"), parseInt(process.env.MAX_TX || "1000", 10)]
    );

    // Verify FFactory
    await verifyContract(
      fFactoryAddress,
      "FFactory",
      [] // Upgradeable proxies have no constructor args
    );

    // Verify FRouter
    await verifyContract(
      fRouterAddress,
      "FRouter",
      [] // Upgradeable proxies have no constructor args
    );

    // Verify Bonding
    await verifyContract(
      bondingAddress,
      "Bonding",
      [] // Upgradeable proxies have no constructor args
    );
  } else {
    console.log("Local network detected. Skipping contract verification.\n");
  }

  console.log("Deployment script completed successfully.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment Error:", error);
    process.exit(1);
  });
