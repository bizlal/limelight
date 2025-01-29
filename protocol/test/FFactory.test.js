const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FFactory Contract", function () {
  let FFactory, ffactory, owner, addr1, addr2;
  const routerAddress = "0x0000000000000000000000000000000000000001"; // Mock Router Address

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    FFactory = await ethers.getContractFactory("FFactory");
    ffactory = await FFactory.deploy();
    await ffactory.deployed();
  });

  describe("Deployment", function () {
    it("Should set the correct deployer as ADMIN_ROLE and CREATOR_ROLE", async function () {
      const ADMIN_ROLE = await ffactory.ADMIN_ROLE();
      const CREATOR_ROLE = await ffactory.CREATOR_ROLE();

      expect(await ffactory.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await ffactory.hasRole(CREATOR_ROLE, owner.address)).to.be.false;
    });

    it("Should grant CREATOR_ROLE to specified account", async function () {
      const CREATOR_ROLE = await ffactory.CREATOR_ROLE();
      await ffactory.grantRole(CREATOR_ROLE, addr1.address);
      expect(await ffactory.hasRole(CREATOR_ROLE, addr1.address)).to.be.true;
    });
  });

  describe("Pair Creation", function () {
    it("Should create a new pair correctly", async function () {
      // Assume router is already set
      await ffactory.setRouter(routerAddress);
      const tokenA = "0x000000000000000000000000000000000000000A";
      const tokenB = "0x000000000000000000000000000000000000000B";

      // Grant CREATOR_ROLE to owner
      const CREATOR_ROLE = await ffactory.CREATOR_ROLE();
      await ffactory.grantRole(CREATOR_ROLE, owner.address);

      const tx = await ffactory.createPair(tokenA, tokenB);
      const receipt = await tx.wait();

      const pairAddress = await ffactory.getPair(tokenA, tokenB);
      expect(pairAddress).to.not.equal(ethers.constants.AddressZero);

      // Check PairCreated event
      const event = receipt.events.find(event => event.event === "PairCreated");
      expect(event.args.tokenA).to.equal(tokenA);
      expect(event.args.tokenB).to.equal(tokenB);
      expect(event.args.pair).to.equal(pairAddress);
      expect(event.args.index).to.equal(1);
    });

    it("Should prevent non-creator from creating a pair", async function () {
      const tokenA = "0x000000000000000000000000000000000000000A";
      const tokenB = "0x000000000000000000000000000000000000000B";

      await expect(
        ffactory.connect(addr1).createPair(tokenA, tokenB)
      ).to.be.revertedWith(
        `AccessControl: account ${addr1.address.toLowerCase()} is missing role ${await ffactory.CREATOR_ROLE()}`
      );
    });

    it("Should prevent creating a pair with zero address", async function () {
      await ffactory.setRouter(routerAddress);
      const tokenA = ethers.constants.AddressZero;
      const tokenB = "0x000000000000000000000000000000000000000B";

      // Grant CREATOR_ROLE to owner
      const CREATOR_ROLE = await ffactory.CREATOR_ROLE();
      await ffactory.grantRole(CREATOR_ROLE, owner.address);

      await expect(
        ffactory.createPair(tokenA, tokenB)
      ).to.be.revertedWith("Zero addresses are not allowed.");
    });
  });

  describe("Tax Parameters", function () {
    it("Should allow ADMIN_ROLE to set tax parameters", async function () {
      await ffactory.setTaxParams("0x0000000000000000000000000000000000000002", 3000, 3000);
      expect(await ffactory.taxVault()).to.equal("0x0000000000000000000000000000000000000002");
      expect(await ffactory.buyTax()).to.equal(3000);
      expect(await ffactory.sellTax()).to.equal(3000);
    });

    it("Should prevent non-admin from setting tax parameters", async function () {
      await expect(
        ffactory.connect(addr1).setTaxParams("0x0000000000000000000000000000000000000002", 3000, 3000)
      ).to.be.revertedWith(
        `AccessControl: account ${addr1.address.toLowerCase()} is missing role ${await ffactory.ADMIN_ROLE()}`
      );
    });

    it("Should allow ADMIN_ROLE to set router", async function () {
      await ffactory.setRouter("0x0000000000000000000000000000000000000003");
      expect(await ffactory.router()).to.equal("0x0000000000000000000000000000000000000003");
    });

    it("Should prevent non-admin from setting router", async function () {
      await expect(
        ffactory.connect(addr1).setRouter("0x0000000000000000000000000000000000000003")
      ).to.be.revertedWith(
        `AccessControl: account ${addr1.address.toLowerCase()} is missing role ${await ffactory.ADMIN_ROLE()}`
      );
    });
  });
});
