const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('FERC20 Contract', function () {
  let FERC20, ferc20, owner, addr1, addr2;
  const initialSupply = ethers.utils.parseEther('1000'); // 1000 tokens

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    FERC20 = await ethers.getContractFactory('FERC20');
    ferc20 = await FERC20.deploy('Test Token', 'TTK', initialSupply, 1); // 1% maxTx
    await ferc20.deployed();
  });

  describe('Deployment', function () {
    it('Should set the right name and symbol', async function () {
      expect(await ferc20.name()).to.equal('Test Token');
      expect(await ferc20.symbol()).to.equal('TTK');
    });

    it('Should assign the total supply to the owner', async function () {
      const ownerBalance = await ferc20.balanceOf(owner.address);
      expect(await ferc20.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe('Transactions', function () {
    it('Should transfer tokens between accounts', async function () {
      // Transfer 50 tokens from owner to addr1
      await ferc20.transfer(addr1.address, ethers.utils.parseEther('50'));
      const addr1Balance = await ferc20.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(ethers.utils.parseEther('50'));

      // Transfer 50 tokens from addr1 to addr2
      await ferc20
        .connect(addr1)
        .transfer(addr2.address, ethers.utils.parseEther('50'));
      const addr2Balance = await ferc20.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(ethers.utils.parseEther('50'));
    });

    it('Should fail if sender doesn’t have enough tokens', async function () {
      const initialOwnerBalance = await ferc20.balanceOf(owner.address);
      // Try to send 1 token from addr1 (0 tokens) to owner
      await expect(
        ferc20
          .connect(addr1)
          .transfer(owner.address, ethers.utils.parseEther('1'))
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');

      // Owner balance shouldn't have changed.
      expect(await ferc20.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });

    it('Should update balances after transfers', async function () {
      const initialOwnerBalance = await ferc20.balanceOf(owner.address);
      await ferc20.transfer(addr1.address, ethers.utils.parseEther('100'));
      await ferc20.transfer(addr2.address, ethers.utils.parseEther('50'));

      const finalOwnerBalance = await ferc20.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(
        initialOwnerBalance.sub(ethers.utils.parseEther('150'))
      );

      const addr1Balance = await ferc20.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(ethers.utils.parseEther('100'));

      const addr2Balance = await ferc20.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(ethers.utils.parseEther('50'));
    });

    it('Should enforce maxTx limit', async function () {
      // maxTx is 1%, so for 1000 tokens, max transfer is 10 tokens
      await expect(
        ferc20.transfer(addr1.address, ethers.utils.parseEther('11'))
      ).to.be.revertedWith('Exceeds MaxTx');

      // Transfer exactly 10 tokens should succeed
      await ferc20.transfer(addr1.address, ethers.utils.parseEther('10'));
      const addr1Balance = await ferc20.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(ethers.utils.parseEther('10'));
    });

    it('Should allow owner to update maxTx', async function () {
      // Owner updates maxTx to 2%
      await ferc20.updateMaxTx(2);
      // Now maxTxAmount should be (2 * 1000) / 100 = 20 tokens

      // Transfer 20 tokens should succeed
      await ferc20.transfer(addr1.address, ethers.utils.parseEther('20'));

      // Transfer 21 tokens should fail
      await expect(
        ferc20.transfer(addr2.address, ethers.utils.parseEther('21'))
      ).to.be.revertedWith('Exceeds MaxTx');
    });

    it('Should allow owner to exclude from maxTx', async function () {
      // addr1 is not excluded initially
      await expect(
        ferc20
          .connect(addr1)
          .transfer(addr2.address, ethers.utils.parseEther('50'))
      ).to.be.revertedWith('Exceeds MaxTx');

      // Owner excludes addr1 from maxTx
      await ferc20.excludeFromMaxTx(addr1.address);

      // Now addr1 can transfer any amount
      await ferc20
        .connect(addr1)
        .transfer(addr2.address, ethers.utils.parseEther('50'));
      const addr2Balance = await ferc20.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(ethers.utils.parseEther('50'));
    });
  });

  describe('Burning', function () {
    it('Should allow owner to burn tokens from an account', async function () {
      const initialOwnerBalance = await ferc20.balanceOf(owner.address);
      // Owner burns 100 tokens from their account
      await ferc20.burnFrom(owner.address, ethers.utils.parseEther('100'));
      const finalOwnerBalance = await ferc20.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(
        initialOwnerBalance.sub(ethers.utils.parseEther('100'))
      );
      expect(await ferc20.totalSupply()).to.equal(
        initialSupply.sub(ethers.utils.parseEther('100'))
      );
    });

    it('Should not allow non-owner to burn tokens', async function () {
      await expect(
        ferc20
          .connect(addr1)
          .burnFrom(owner.address, ethers.utils.parseEther('100'))
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
