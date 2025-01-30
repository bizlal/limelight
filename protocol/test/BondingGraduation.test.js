const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Bonding Graduation Mechanism', function () {
  let Bonding,
    bonding,
    FFactory,
    ffactory,
    FRouter,
    frouter,
    FERC20,
    ferc20,
    IArtistFactoryV3,
    artistFactory;
  let owner, addr1, addr2;
  const initialSupply = ethers.utils.parseEther('1000'); // 1000 tokens
  const buyTax = 2000; // 20%
  const sellTax = 2000; // 20%
  const feeTo = '0x0000000000000000000000000000000000000001'; // Mock fee recipient
  const tbaImplementation = '0x0000000000000000000000000000000000000002'; // Mock implementation address
  const gradThreshold = 3000000; // Example threshold

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy FFactory
    FFactory = await ethers.getContractFactory('FFactory');
    ffactory = await FFactory.deploy();
    await ffactory.deployed();

    // Deploy mock Asset Token
    FERC20 = await ethers.getContractFactory('FERC20');
    ferc20 = await FERC20.deploy(
      'Asset Token',
      'ASTK',
      ethers.utils.parseEther('1000000'),
      1
    ); // 1% maxTx
    await ferc20.deployed();

    // Deploy FRouter
    FRouter = await ethers.getContractFactory('FRouter');
    frouter = await FRouter.deploy(ffactory.address, ferc20.address);
    await frouter.deployed();

    // Initialize FFactory with FRouter
    const CREATOR_ROLE = await ffactory.CREATOR_ROLE();
    await ffactory.grantRole(CREATOR_ROLE, owner.address);
    await ffactory.setRouter(frouter.address);

    // Deploy mock ArtistFactoryV3
    IArtistFactoryV3 = await ethers.getContractFactory('IArtistFactoryV3');
    artistFactory = await IArtistFactoryV3.deploy();
    await artistFactory.deployed();

    // Deploy Bonding
    Bonding = await ethers.getContractFactory('Bonding');
    bonding = await Bonding.deploy();
    await bonding.deployed();

    // Initialize Bonding
    await bonding.initialize(
      ffactory.address,
      frouter.address,
      feeTo,
      buyTax,
      initialSupply,
      5000, // assetRate (example)
      1, // maxTx
      artistFactory.address, // artistFactory_
      gradThreshold
    );

    // Launch a new token to set up for graduation
    await ferc20.approve(bonding.address, ethers.utils.parseEther('100'));

    // Define token details
    const tokenName = 'Test Artist';
    const tokenTicker = 'TATK';
    const cores = [1, 2, 3];
    const description = 'A test artist token.';
    const image = 'https://example.com/image.png';
    const urls = [
      'https://twitter.com/testartist',
      'https://t.me/testartist',
      'https://youtube.com/testartist',
      'https://testartist.com',
      'https://spotify.com/testartist',
      'https://applemusic.com/testartist',
      'https://instagram.com/testartist',
      'https://tiktok.com/@testartist',
    ];
    const hometown = 'Test City';
    const primaryGenre = 'Pop';
    const secondaryGenre = 'Electronic';
    const purchaseAmount = ethers.utils.parseEther('100'); // 100 asset tokens

    // Launch the token
    const tx = await bonding.launch(
      tokenName,
      tokenTicker,
      cores,
      description,
      image,
      urls,
      hometown,
      primaryGenre,
      secondaryGenre,
      purchaseAmount
    );
    const receipt = await tx.wait();

    // Retrieve token address from event
    const launchedEvent = receipt.events.find(
      (event) => event.event === 'Launched'
    );
    this.tokenAddress = launchedEvent.args.token;
    this.pairAddress = launchedEvent.args.pair;

    // Assume the token has been purchased and liquidity is added
  });

  it('Should graduate the token when reserveA <= gradThreshold', async function () {
    // Simulate sell transactions to reduce reserveA below gradThreshold

    // Assuming reserveA is related to the asset token
    // For testing, directly manipulate reserves (if possible) or simulate sufficient sells

    // Mock the getReserves function to return reserveA <= gradThreshold
    // This requires the IFPair interface to be mockable, which isn't shown here
    // Alternatively, perform sells until the condition is met

    // Approve Bonding to spend tokens
    const token = await ethers.getContractAt('FERC20', this.tokenAddress);
    await token.transfer(addr1.address, ethers.utils.parseEther('100'));
    await token
      .connect(addr1)
      .approve(bonding.address, ethers.utils.parseEther('100'));

    // Perform sell transactions
    for (let i = 0; i < 10; i++) {
      await bonding
        .connect(addr1)
        .sell(ethers.utils.parseEther('10'), this.tokenAddress);
    }

    // After sufficient sells, the reserves should be <= gradThreshold
    // Check if graduation has occurred
    // This depends on the implementation details of the graduation mechanism

    // For demonstration, we'll assume that the graduation function is called internally
    // and check if artistToken is set

    const tokenInfo = await bonding.tokenInfo(this.tokenAddress);
    expect(tokenInfo.tradingOnUniswap).to.be.true;
    expect(tokenInfo.artistToken).to.not.equal(ethers.constants.AddressZero);
  });

  // Additional tests for unwrapToken, trading updates, etc., can be added here
});
