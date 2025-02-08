// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IValidatorRegistry.sol";

interface IArtistNft is IValidatorRegistry {
    struct LimelightInfo {
        address dao; // Artist DAO can update the agent metadata
        address token;
        address founder;
        address tba; // Token Bound Address
        uint8[] coreTypes;
    }

    event CoresUpdated(uint256 limelightId, uint8[] coreTypes);

    struct LimelightLP {
        address pool; // Liquidity pool for the artist
        address veToken; // Voting escrow token
    }

    function mint(
        uint256 id,
        address to,
        string memory newTokenURI,
        address payable theDAO,
        address founder,
        uint8[] memory coreTypes,
        address pool,
        address token
    ) external returns (uint256);

    function stakingTokenToLimelightId(
        address daoToken
    ) external view returns (uint256);

    function setTBA(uint256 limelightId, address tba) external;

    function limelightInfo(
        uint256 limelightInfo
    ) external view returns (LimelightInfo memory);

    function limelightLP(
        uint256 limelightId
    ) external view returns (LimelightLP memory);

    function totalSupply() external view returns (uint256);

    function totalStaked(uint256 limelightId) external view returns (uint256);

    function getVotes(
        uint256 limelightId,
        address validator
    ) external view returns (uint256);

    function totalProposals(uint256 limelightId) external view returns (uint256);

    function getContributionNft() external view returns (address);

    function getServiceNft() external view returns (address);

    function getAllServices(
        uint256 limelightId
    ) external view returns (uint256[] memory);

    function nextLimelightId() external view returns (uint256);

    function isBlacklisted(uint256 limelightId) external view returns (bool);

    function getEloCalculator() external view returns (address);
}