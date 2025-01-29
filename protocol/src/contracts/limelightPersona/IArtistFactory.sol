// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IArtistFactory {
    enum ApplicationStatus {
        Active,
        Executed,
        Withdrawn
    }

    struct Application {
        string name;
        string symbol;
        string tokenURI;
        ApplicationStatus status;
        uint256 withdrawableAmount;
        address proposer;
        uint8[] cores;
        uint256 proposalEndBlock;
        uint256 limelightId;
        bytes32 tbaSalt;
        address tbaImplementation;
        uint32 daoVotingPeriod;
        uint256 daoThreshold;
    }

    /// @notice Propose a new Artist persona using the platform's native token mechanism
    /// @param name Name of the Artist token
    /// @param symbol Symbol of the Artist token
    /// @param tokenURI Metadata URI for the artist
    /// @param cores Array of core IDs or attributes
    /// @param tbaSalt Unique salt for TBA creation
    /// @param tbaImplementation Address of the TBA implementation contract
    /// @param daoVotingPeriod Voting period for the DAO
    /// @param daoThreshold Voting threshold for the DAO
    /// @return id The ID of the newly created application
    function proposeArtist(
        string memory name,
        string memory symbol,
        string memory tokenURI,
        uint8[] memory cores,
        bytes32 tbaSalt,
        address tbaImplementation,
        uint32 daoVotingPeriod,
        uint256 daoThreshold
    ) external returns (uint256 id);

    /// @notice Execute a previously proposed Artist application
    /// @param id The ID of the application to execute
    /// @param canStake Whether staking is allowed for veToken
    function executeApplication(uint256 id, bool canStake) external;

    /// @notice Initialize from a custom ERC20 token
    /// @param tokenAddr Address of the custom token
    /// @param cores Array of core IDs or attributes
    /// @param tbaSalt Unique salt for TBA creation
    /// @param tbaImplementation Address of the TBA implementation contract
    /// @param daoVotingPeriod Voting period for the DAO
    /// @param daoThreshold Voting threshold for the DAO
    /// @param initialLP Initial Liquidity in the token
    /// @return id The ID of the newly created application
    function initFromToken(
        address tokenAddr,
        uint8[] memory cores,
        bytes32 tbaSalt,
        address tbaImplementation,
        uint32 daoVotingPeriod,
        uint256 daoThreshold,
        uint256 initialLP
    ) external returns (uint256 id);

    /// @notice Execute an application that was initialized from a custom token
    /// @param id The ID of the application
    /// @param canStake Whether staking is allowed for veToken
    function executeTokenApplication(uint256 id, bool canStake) external;

    /// @notice Withdraw funds or tokens from an unexecuted/expired application
    /// @param id The ID of the application to withdraw from
    function withdraw(uint256 id) external;

    /// @notice Get details of an existing application by its ID
    /// @param proposalId The ID of the proposal/application
    /// @return The Application struct with all its details
    function getApplication(uint256 proposalId) external view returns (Application memory);

    /// @notice Checks if a given token address is compatible with this factory
    /// @param tokenAddr The address of the token
    /// @return bool True if the token is compatible, false otherwise
    function isCompatibleToken(address tokenAddr) external view returns (bool);

    /// @notice Returns total number of Artists created
    /// @return uint256 The total count of Artists created
    function totalArtists() external view returns (uint256);
}