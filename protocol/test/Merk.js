const { expect } = require('chai');
const { ethers } = require('hardhat');
const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');

const { getAddress } = ethers.utils;

// We'll use 5 minutes or so for the vesting schedule in the test
const VESTING_DURATION = 5 * 60; // 5 minutes
const SLICE_PERIOD = 60; // 1 minute slices
const CLIFF = 0; // no cliff in this example

describe('Merkle + TokenVesting Integration', function () {
  let owner;
  let token, merkleBeneficiary, tokenVesting;

  // distributionData, but normalized addresses:
  const rawDistribution = [
    {
      address: '0x945757b48f05f9e4e2bd54e25ce801179d79508a',
      allocation: '1040000',
    },
    {
      address: '0x40e15e6c22a94a0df43f1649f60329b6a9125eb6',
      allocation: '346666',
    },
    {
      address: '0xbb80d82d3ce2e7d3d8c0e2969c1b1353946c7ea9',
      allocation: '333333',
    },
    {
      address: '0xadf356802a5a548d0c2ada29f68726b709ed05c7',
      allocation: '284333',
    },
    {
      address: '0x8058f11c5f3f8f330d90c65fdee9c39d40d6ee2d',
      allocation: '200000',
    },
    {
      address: '0x1b82602271df9e355edc5d54476a18b3b1a544fb',
      allocation: '133333',
    },
    {
      address: '0x62032c9edc927a3d8994716a6e2fc433bf74775a',
      allocation: '100000',
    },
    {
      address: '0x01c952174c24e1210d26961d456a77a39e1f0bb0',
      allocation: '67633',
    },
    {
      address: '0xddadff7e0c08332c982d26738979fd619caea6b6',
      allocation: '66666',
    },
    {
      address: '0xae8a89c737e7423def56f6e39bf4052b112d6078',
      allocation: '66666',
    },
    {
      address: '0x5961eb542c0f165cdae601b9cde84ec67d82e6a0',
      allocation: '66000',
    },
    {
      address: '0x70cbfbbff66b4ee208b2975b21b12cca968e1b2b',
      allocation: '61297',
    },
    {
      address: '0xb6b09092a8ffc99aef4c34478ab6847c0f6ebb89',
      allocation: '60000',
    },
    {
      address: '0x5bf9d7cd81b80868201d458702e393341629d723',
      allocation: '36232',
    },
    {
      address: '0x36b31fe2b9d74f2ca067eadc64465f8a692a3d66',
      allocation: '33333',
    },
    {
      address: '0x9515d5b1961b33877388cb1054246523b459432c',
      allocation: '33333',
    },
    {
      address: '0x7caddbd0900cf7cf13cd41ec8a9e36659195f5a4',
      allocation: '33333',
    },
    {
      address: '0x9d8f4a11bb460f2faa0a67eade55ae7a43b94753',
      allocation: '20626',
    },
    {
      address: '0x01afece8c979669248b31de0fdf5479c93fdb903',
      allocation: '20000',
    },
    {
      address: '0x23d4b7547bfbffcfa9908c9203eb34a91051c36a',
      allocation: '18000',
    },
    {
      address: '0xfb4b62cd980a7415c39df889aa1e0016d352aacc',
      allocation: '16345',
    },
    {
      address: '0xd369ec3f2838b23fac1793f848440a56b25ea278',
      allocation: '13333',
    },
    {
      address: '0xe63f0d0888c8269a3193a70d5e0f11b3545b892c',
      allocation: '10666',
    },
    {
      address: '0x458f29275dcc0867f0c106c1049d3e480cc58c04',
      allocation: '10000',
    },
    {
      address: '0x59d09779ee8fa5b20e85858977a0ad3a6500516d',
      allocation: '7333',
    },
    {
      address: '0x80a8241d7421c217be4bcdcc5cc3399aebef96f5',
      allocation: '6666',
    },
    {
      address: '0x66235644e6ca122c4436566656893c8acf024f2a',
      allocation: '6666',
    },
    {
      address: '0x355d3d1db49513b9e05607ae5320b8ef1b4cd232',
      allocation: '6666',
    },
    {
      address: '0xc4138b7158302990f74878c176766031b8a88461',
      allocation: '6666',
    },
    {
      address: '0xa7ad4ca78c3e1e6e45906ba09d8e05e9840d4dee',
      allocation: '3333',
    },
    {
      address: '0x5afaf656937de882c44131245f12baf706a778ec',
      allocation: '1500',
    },
    {
      address: '0x288d2d9b356dfce17db9513204f18e1c3f22b882',
      allocation: '1333',
    },
  ];
  let distributionData = [];

  // We'll rebuild distributionData with checksummed addresses:
  function normalizeData(raw) {
    return raw.map((item) => ({
      address: getAddress(item.address),
      allocation: item.allocation,
    }));
  }

  function sumAllocations(data) {
    let sum = ethers.BigNumber.from('0');
    for (const item of data) {
      sum = sum.add(ethers.BigNumber.from(item.allocation));
    }
    return sum;
  }

  function buildTree(data) {
    const values = data.map((d) => [d.address, d.allocation]);
    return StandardMerkleTree.of(values, ['address', 'uint256']);
  }

  function getProof(address_, rawAlloc) {
    for (const [i, v] of tree.entries()) {
      if (v[0] === address_ && v[1] === rawAlloc) {
        return tree.getProof(i);
      }
    }
    throw new Error('Entry not found in the Merkle tree!');
  }

  let tree;
  let merkleRoot;

  before(async function () {
    [owner] = await ethers.getSigners();
    // Normalize the distribution data
    distributionData = normalizeData(rawDistribution);
  });

  beforeEach(async function () {
    // 1. Deploy a test token with 10M supply
    const TestToken = await ethers.getContractFactory('Token');
    token = await TestToken.deploy('Test Token', 'TT', '10000000');
    await token.deployed();

    // 2. Build the Merkle tree
    tree = buildTree(distributionData);
    merkleRoot = tree.root;

    // 3. Deploy MerkleBeneficiary (claimPeriodEnds in 1 day)
    const MerkleBeneficiary = await ethers.getContractFactory(
      'MerkleBeneficiary'
    );
    const oneDayFromNow =
      (await ethers.provider.getBlock('latest')).timestamp + 86400;
    merkleBeneficiary = await MerkleBeneficiary.deploy(
      token.address,
      merkleRoot,
      oneDayFromNow
    );
    await merkleBeneficiary.deployed();

    // 4. Deploy TokenVesting
    const TokenVesting = await ethers.getContractFactory('TokenVesting');
    tokenVesting = await TokenVesting.deploy(token.address);
    await tokenVesting.deployed();

    // 5. Transfer total needed tokens from owner -> TokenVesting
    const totalNeeded = sumAllocations(distributionData);
    await token.transfer(tokenVesting.address, totalNeeded);

    // 6. Create vesting schedule, beneficiary = merkleBeneficiary
    const now = (await ethers.provider.getBlock('latest')).timestamp;
    const tx = await tokenVesting.createVestingSchedule(
      merkleBeneficiary.address,
      now,
      CLIFF,
      VESTING_DURATION,
      SLICE_PERIOD,
      false,
      totalNeeded
    );
    await tx.wait();
  });

  it('Should allow addresses to claim from MerkleBeneficiary only after vesting is released', async function () {
    // STEP A: Attempt immediate claim, expecting revert since MerkleBeneficiary has 0 tokens
    const firstEntry = distributionData[0];
    const firstAddress = firstEntry.address;
    const firstAlloc = firstEntry.allocation;
    const firstProof = getProof(firstAddress, firstAlloc);

    // Give the impersonated address some ETH so it can send a tx
    await ethers.provider.send('hardhat_setBalance', [
      firstAddress,
      '0x1000000000000000000', // 1 ETH
    ]);
    await ethers.provider.send('hardhat_impersonateAccount', [firstAddress]);
    const firstSigner = await ethers.getSigner(firstAddress);

    // We just expect it to revert (for some reason) because contract balance = 0
    await expect(
      merkleBeneficiary
        .connect(firstSigner)
        .claim(firstAlloc, firstAlloc, firstProof)
    ).to.be.reverted;

    // stop impersonation
    await ethers.provider.send('hardhat_stopImpersonatingAccount', [
      firstAddress,
    ]);

    // STEP B: fast-forward 5 minutes so schedule is fully vested
    await ethers.provider.send('evm_increaseTime', [VESTING_DURATION + 1]);
    await ethers.provider.send('evm_mine');

    // STEP C: release all vested tokens from TokenVesting -> MerkleBeneficiary
    const scheduleId =
      await tokenVesting.computeVestingScheduleIdForAddressAndIndex(
        merkleBeneficiary.address,
        0
      );
    const vested = await tokenVesting.computeReleasableAmount(scheduleId);
    await tokenVesting.release(scheduleId, vested);

    const beneficiaryBalance = await token.balanceOf(merkleBeneficiary.address);
    console.log(
      'MerkleBeneficiary balance after release:',
      beneficiaryBalance.toString()
    );

    // STEP D: Now each address can claim from MerkleBeneficiary
    for (const entry of distributionData) {
      const beneficiaryAddress = entry.address;
      const rawAlloc = entry.allocation;
      const proof = getProof(beneficiaryAddress, rawAlloc);

      // fund the address so it can pay gas
      await ethers.provider.send('hardhat_setBalance', [
        beneficiaryAddress,
        '0x1000000000000000000',
      ]);
      await ethers.provider.send('hardhat_impersonateAccount', [
        beneficiaryAddress,
      ]);
      const benSigner = await ethers.getSigner(beneficiaryAddress);

      // claim full allocation
      await merkleBeneficiary
        .connect(benSigner)
        .claim(rawAlloc, rawAlloc, proof);

      // verify final balance
      const userBalance = await token.balanceOf(beneficiaryAddress);
      expect(userBalance).to.equal(ethers.BigNumber.from(rawAlloc));

      // done
      await ethers.provider.send('hardhat_stopImpersonatingAccount', [
        beneficiaryAddress,
      ]);
    }
  });
});
