// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Create2.sol";
import "../libs/IERC6551Registry.sol";
import "./ERC6551BytecodeLib.sol";

contract ERC6551Registry is IERC6551Registry {
    error InitializationFailed();

    /**
     * @notice Deploys a token-bound account using Create2.
     * @param implementation The address of the account implementation.
     * @param salt A salt to provide uniqueness.
     * @param chainId The current chain id.
     * @param tokenContract The NFT contract address.
     * @param tokenId The token id.
     * @return account The address of the deployed account.
     */
    function createAccount(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external override returns (address account) {
        bytes memory bytecode = ERC6551BytecodeLib.getCreationCode(
            implementation,
            chainId,
            tokenContract,
            tokenId,
            uint256(salt)
        );
        account = Create2.deploy(0, salt, bytecode);
        emit AccountCreated(account, implementation, chainId, tokenContract, tokenId, uint256(salt));
    }

    /**
     * @notice Computes the address of a token-bound account without deploying.
     * @param implementation The address of the account implementation.
     * @param chainId The current chain id.
     * @param tokenContract The NFT contract address.
     * @param tokenId The token id.
     * @param salt A salt used in the deployment.
     * @return The computed account address.
     */
    function account(
        address implementation,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 salt
    ) external view override returns (address) {
        bytes memory bytecode = ERC6551BytecodeLib.getCreationCode(
            implementation,
            chainId,
            tokenContract,
            tokenId,
            salt
        );
        return Create2.computeAddress(bytes32(salt), keccak256(bytecode), address(this));
    }
}
