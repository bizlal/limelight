// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library ERC6551BytecodeLib {
    /**
     * @notice Returns the creation code for a token-bound account proxy.
     * The creation code uses the standard EIP-1167 minimal proxy pattern and appends custom parameters.
     * @param implementation_ The implementation contract address.
     * @param chainId_ The chain id.
     * @param tokenContract_ The NFT contract address.
     * @param tokenId_ The NFT token id.
     * @param salt_ A salt value for uniqueness.
     * @return The creation code that can be used with Create2.
     */
    function getCreationCode(
        address implementation_,
        uint256 chainId_,
        address tokenContract_,
        uint256 tokenId_,
        uint256 salt_
    ) internal pure returns (bytes memory) {
        return abi.encodePacked(
            // Standard minimal proxy creation code (EIP-1167)
            hex"3d602d80600a3d3981f3",
            // Proxy runtime code prefix
            hex"363d3d373d3d3d363d73",
            implementation_,
            // Proxy runtime code suffix
            hex"5af43d82803e903d91602b57fd5bf3",
            // Append custom parameters (for initialization purposes)
            abi.encode(salt_, chainId_, tokenContract_, tokenId_)
        );
    }
}
