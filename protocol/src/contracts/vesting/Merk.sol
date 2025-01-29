// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// ============ Imports ============
// If you already use OpenZeppelin's Ownable, you can import it instead of this simple Owned.
import {Owned} from "solmate/auth/Owned.sol";  // or import "openzeppelin/contracts/access/Ownable.sol";
import {SafeTransferLib} from "solmate/utils/SafeTransferLib.sol"; 
import {ERC20} from "solmate/tokens/ERC20.sol";
// If you are using OpenZeppelin: import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title MerkleBeneficiary
 * @notice A refactored contract that:
 *         - Distributes ERC20 tokens using Merkle-based claims (per-address allocations).
 *         - Allows partial claiming (multiple claims up to the allocated amount).
 *         - Imposes a claim deadline, after which remaining tokens can be swept.
 */
contract MerkleBeneficiary is Owned {
    using SafeTransferLib for ERC20;

    // ============ State ============

    /// @notice The ERC20 token being distributed
    ERC20 public immutable token;

    /// @notice Merkle root of the distribution. 
    /// The leaf is typically keccak256(abi.encodePacked(beneficiary, allocatedAmount)).
    bytes32 public merkleRoot;

    /// @notice The timestamp after which claims are no longer allowed
    uint256 public claimPeriodEnds;

    /// @notice Records how much each address has cumulatively claimed so far
    mapping(address => uint256) public totalClaimed;

    // ============ Events ============

    event MerkleRootChanged(bytes32 newMerkleRoot);
    event Claimed(address indexed account, uint256 amountClaimed);
    event Swept(address indexed sweeper, address indexed recipient, uint256 amount);

    // ============ Constructor ============

    /**
     * @param _token          ERC20 token address
     * @param _merkleRoot     The Merkle root representing (address -> total allocation)
     * @param _claimPeriodEnds The cutoff time (timestamp) after which claims are disabled
     */
    constructor(
        address _token,
        bytes32 _merkleRoot,
        uint256 _claimPeriodEnds
    )
        Owned(msg.sender) 
    {
        require(_token != address(0), "Token is zero address");
        require(_claimPeriodEnds > block.timestamp, "Claim period must end in the future");

        token = ERC20(_token);
        merkleRoot = _merkleRoot;
        claimPeriodEnds = _claimPeriodEnds;
    }

    // ============ External/Public Functions ============

    /**
     * @notice Claim some or all tokens from your allocation.
     * @dev    Claims are only allowed before `claimPeriodEnds`.
     * @param allocated    The total allocated to `msg.sender` (according to the Merkle root).
     * @param claimAmount  The amount of tokens to claim in this call.
     * @param merkleProof  A valid Merkle proof demonstrating (msg.sender, allocated) is in the tree.
     */
    function claim(
        uint256 allocated,
        uint256 claimAmount,
        bytes32[] calldata merkleProof
    )
        external
    {
        // 1. Ensure we are before the claim cutoff
        require(block.timestamp <= claimPeriodEnds, "Claim period ended");

        // 2. Verify that (msg.sender, allocated) is in the Merkle tree
        require(_verify(msg.sender, allocated, merkleProof), "Invalid proof or not in Merkle");

        // 3. Check how much is still claimable for this user
        uint256 alreadyClaimed = totalClaimed[msg.sender];
        require(alreadyClaimed < allocated, "Nothing left to claim");

        // 4. User cannot claim more than allocated - alreadyClaimed
        require(claimAmount <= (allocated - alreadyClaimed), "Claim exceeds allocation");

        // 5. Update the claimed balance
        totalClaimed[msg.sender] = alreadyClaimed + claimAmount;

        // 6. Transfer tokens to the claimant
        token.safeTransfer(msg.sender, claimAmount);

        emit Claimed(msg.sender, claimAmount);
    }

    /**
     * @notice View how many tokens are still claimable by a given account.
     *         Returns 0 if the proof is invalid or if fully claimed.
     * @param account       The address for which to check claimable tokens
     * @param allocated     The total allocated to `account` in the Merkle tree
     * @param merkleProof   A valid Merkle proof demonstrating (account, allocated) is in the tree.
     * @return The number of tokens `account` can still claim
     */
    function claimable(
        address account,
        uint256 allocated,
        bytes32[] calldata merkleProof
    )
        external
        view
        returns (uint256)
    {
        if (!_verify(account, allocated, merkleProof)) {
            // If invalid proof or not in the Merkle tree, 0
            return 0;
        }
        uint256 alreadyClaimed = totalClaimed[account];
        if (alreadyClaimed >= allocated) {
            return 0;
        }
        return allocated - alreadyClaimed;
    }

    /**
     * @notice Lets the owner sweep out any unclaimed tokens after `claimPeriodEnds`.
     * @param recipient The address that will receive the leftover tokens.
     */
    function sweep(address recipient) external onlyOwner {
        require(block.timestamp > claimPeriodEnds, "Claim period not yet ended");
        uint256 remaining = token.balanceOf(address(this));
        token.safeTransfer(recipient, remaining);

        emit Swept(msg.sender, recipient, remaining);
    }

    /**
     * @notice Allows the owner to set the Merkle root if desired. 
     *         If you want it locked after the first set, uncomment the `require(merkleRoot == bytes32(0))`.
     * @param newMerkleRoot The new Merkle root
     */
    function setMerkleRoot(bytes32 newMerkleRoot) external onlyOwner {
        // If you only want to set it once, uncomment next line:
        // require(merkleRoot == bytes32(0), "Merkle root already set");
        merkleRoot = newMerkleRoot;
        emit MerkleRootChanged(newMerkleRoot);
    }

    // ============ Internal Helpers ============

    /**
     * @dev Verifies that `account` with a given `allocated` amount is in the Merkle tree,
     *      using the provided Merkle proof.
     */
    function _verify(
        address account,
        uint256 allocated,
        bytes32[] calldata merkleProof
    )
        internal
        view
        returns (bool)
    {
        // Leaf = keccak256(abi.encodePacked(account, allocated))
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(account, allocated))));
        return MerkleProof.verify(merkleProof, merkleRoot, leaf);
    }
}
