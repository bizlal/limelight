const { expect } = require('chai');
const { ethers, deployments } = require('hardhat'); // Import ethers and deployments from hardhat

describe('Bonding Contract', function () {
  let Bonding, bonding, FFactory, ffactory, FRouter, frouter, FERC20, ferc20;
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
    const FFactoryFactory = await ethers.getContractFactory('FFactory');
    ffactory = await FFactoryFactory.deploy();
    await ffactory.deployed();

    // Deploy FERC20 (Asset Token)
    const FERC20Factory = await ethers.getContractFactory('FERC20');
    ferc20 = await FERC20Factory.deploy(
      'Asset Token',
      'ASTK',
      ethers.utils.parseEther('1000000'),
      1
    ); // 1% maxTx
    await ferc20.deployed();

    // Deploy FRouter
    const FRouterFactory = await ethers.getContractFactory('FRouter');
    frouter = await FRouterFactory.deploy(ffactory.address, ferc20.address);
    await frouter.deployed();

    // Initialize FFactory with FRouter
    const CREATOR_ROLE = await ffactory.CREATOR_ROLE();
    await ffactory.grantRole(CREATOR_ROLE, owner.address);
    await ffactory.setRouter(frouter.address);

    // Deploy Bonding
    const BondingFactory = await ethers.getContractFactory('Bonding');
    bonding = await BondingFactory.deploy();
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
      '0x0000000000000000000000000000000000000003', // artistFactory address (mock)
      gradThreshold
    );
  });

  describe('Initialization', function () {
    it('Should initialize with correct parameters', async function () {
      expect(await bonding.factory()).to.equal(ffactory.address);
      expect(await bonding.router()).to.equal(frouter.address);
      expect(await bonding.fee()).to.equal(
        (buyTax * ethers.constants.WeiPerEther) / 1000
      );
      expect(await bonding.initialSupply()).to.equal(initialSupply);
      expect(await bonding.assetRate()).to.equal(5000);
      expect(await bonding.maxTx()).to.equal(1);
      expect(await bonding.artistFactory()).to.equal(
        '0x0000000000000000000000000000000000000003'
      );
      expect(await bonding.gradThreshold()).to.equal(gradThreshold);
    });
  });

  describe('Launching Tokens', function () {
    it('Should launch a new token successfully', async function () {
      // Approve Bonding to spend asset tokens
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

      // Verify events
      const launchedEvent = receipt.events.find(
        (event) => event.event === 'Launched'
      );
      expect(launchedEvent).to.exist;
      expect(launchedEvent.args.token).to.not.equal(
        ethers.constants.AddressZero
      );
      expect(launchedEvent.args.pair).to.not.equal(
        ethers.constants.AddressZero
      );
      expect(launchedEvent.args.tokenIndex).to.equal(1);
      expect(launchedEvent.args.hometown).to.equal(hometown);
      expect(launchedEvent.args.primaryGenre).to.equal(primaryGenre);
      expect(launchedEvent.args.secondaryGenre).to.equal(secondaryGenre);
      expect(launchedEvent.args.spotify).to.equal(urls[4]);
      expect(launchedEvent.args.appleMusic).to.equal(urls[5]);
      expect(launchedEvent.args.instagram).to.equal(urls[6]);
      expect(launchedEvent.args.tiktok).to.equal(urls[7]);

      // Check that the token was created
      const tokenAddress = launchedEvent.args.token;
      const Token = await ethers.getContractFactory('FERC20');
      const token = await Token.attach(tokenAddress);

      expect(await token.name()).to.equal(`Limelight ${tokenName}`);
      expect(await token.symbol()).to.equal(tokenTicker);
      expect(await token.totalSupply()).to.equal(initialSupply);
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
    });

    it('Should fail to launch if purchase amount is less than fee', async function () {
      // Assuming fee is 20% of purchaseAmount, so purchaseAmount must be > fee

      // For simplicity, let's assume fee is 20% (based on buyTax)
      // So, purchaseAmount must be > 20% of purchaseAmount => always true?
      // The condition in Bonding.sol is:
      // require(purchaseAmount > fee, "Purchase amount must be greater than fee");
      // fee = (fee_ * 1 ether) / 1000 = (2000 * 1 ether) / 1000 = 2 ether
      // So purchaseAmount > 2 ether

      // Approve Bonding to spend asset tokens
      await ferc20.approve(bonding.address, ethers.utils.parseEther('1'));

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
      const purchaseAmount = ethers.utils.parseEther('1'); // 1 asset token < fee (2 ether)

      // Attempt to launch the token
      await expect(
        bonding.launch(
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
        )
      ).to.be.revertedWith('Purchase amount must be greater than fee');
    });
  });

  // Additional tests for trading, graduation, etc., can be added here
});
