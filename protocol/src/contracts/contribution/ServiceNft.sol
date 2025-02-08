// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/IGovernor.sol";
import "@openzeppelin/contracts/token/FERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC5805.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../limelightPersona/IArtistNft.sol";
import "../limelightPersona/IArtistDAO.sol";
import "./IContributionNft.sol";
import "./IServiceNft.sol";

/**
 * @title ServiceNft
 * @notice Represents recognized milestones or outcomes achieved through community contributions.
 * When fans contribute (via ContributionNft) by sharing and promoting the artist's music,
 * ServiceNfts acknowledge and reward these achievements.
 *
 * The `impact` measured here represents how much the artist's presence/growth improved as
 * a result of these contributions. For example, more streams, larger audience, hitting certain milestones.
 */
contract ServiceNft is
    IServiceNft,
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable
{
    uint256 private _nextTokenId;

    address public personaNft;
    address public contributionNft;

    uint16 public datasetImpactWeight;

    // Mapping from tokenId to coreId: each Service NFT is associated with a core type of milestone
    mapping(uint256 => uint8) private _cores;

    // Maturity measures how advanced or developed the artist is at this milestone
    mapping(uint256 => uint256) private _maturities;

    // Impact represents how much the artist grew as a result of the community's promotional contributions
    mapping(uint256 => uint256) private _impacts;

    // Core services represent the main recognized milestone for a given core type at the persona level
    mapping(uint256 => mapping(uint8 => uint256)) private _coreServices;
    // Datasets represent a collection of data-driven contributions that support the main milestone
    mapping(uint256 => mapping(uint8 => uint256[])) private _coreDatasets;

  
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialArtistNft,
        address initialContributionNft,
        uint16 initialDatasetImpactWeight
    ) public initializer {
        __ERC721_init("Service", "VS");
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __Ownable_init(_msgSender());
        personaNft = initialArtistNft;
        contributionNft = initialContributionNft;
        datasetImpactWeight = initialDatasetImpactWeight;
    }

    /**
     * @notice Mints a Service NFT signifying that a certain milestone or target (associated with a proposal) has been achieved.
     * @param limelightId The limelight persona/artist for which the milestone applies.
     * @param descHash A hash of a description that can identify the service proposal.
     * @return proposalId The ID used as the tokenId.
     *
     * The Service NFT is a reflection of a concluded promotional campaign or growth milestone.
     */
    function mint(
        uint256 limelightId,
        bytes32 descHash
    ) public returns (uint256) {
        IArtistNft.LimelightInfo memory info = IArtistNft(personaNft).limelightInfo(
            limelightId
        );
        require(_msgSender() == info.dao, "Caller is not LIMELIGHT DAO");

        IGovernor personaDAO = IGovernor(info.dao);
        bytes memory mintCalldata = abi.encodeWithSignature(
            "mint(uint256,bytes32)",
            limelightId,
            descHash
        );
        address[] memory targets = new address[](1);
        targets[0] = address(this);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = mintCalldata;

        // The proposalId doubles as our tokenId for the service NFT
        uint256 proposalId = personaDAO.hashProposal(targets, values, calldatas, descHash);

        // Minting the service NFT to the persona's TBA or a designated address
        // This line simulates that we are using the persona's TBA as recipient:
        // In practice, you might choose the persona’s TBA or another address controlled by the DAO.
        _mint(info.tba, proposalId);

        // Determine the core from the related contribution
        _cores[proposalId] = IContributionNft(contributionNft).getCore(proposalId);

        // Maturity: how advanced the artist is at this milestone (obtained from DAO logic)
        _maturities[proposalId] = IArtistDAO(info.dao).getMaturity(proposalId);

        bool isModel = IContributionNft(contributionNft).isModel(proposalId);
        if (isModel) {
            emit CoreServiceUpdated(limelightId, _cores[proposalId], proposalId);
            // Update impact based on growth measured relative to previous service
            updateImpact(limelightId, proposalId);
            _coreServices[limelightId][_cores[proposalId]] = proposalId;
        } else {
            // If not a model service, it's treated as a dataset that supports the main service milestone
            _coreDatasets[limelightId][_cores[proposalId]].push(proposalId);
        }

        emit NewService(
            proposalId,
            _cores[proposalId],
            _maturities[proposalId],
            _impacts[proposalId],
            isModel
        );

        return proposalId;
    }

    /**
     * @notice Update impact when a new service milestone is recognized.
     * Impact measures how much the artist grew as a result of the promotional contributions made.
     *
     * @param limelightId The artist persona
     * @param proposalId The service ID (tokenId for Service NFT)
     */
    function updateImpact(uint256 limelightId, uint256 proposalId) public {
        uint256 prevServiceId = _coreServices[limelightId][_cores[proposalId]];
        uint256 rawImpact = (_maturities[proposalId] > _maturities[prevServiceId])
            ? _maturities[proposalId] - _maturities[prevServiceId]
            : 0;

        uint256 datasetId = IContributionNft(contributionNft).getDatasetId(
            proposalId
        );

        // Direct impact of this new milestone
        _impacts[proposalId] = rawImpact;

        // If there's a dataset associated, allocate some of the impact to it
        if (datasetId > 0) {
            uint256 datasetImpact = (rawImpact * datasetImpactWeight) / 10000;
            _impacts[datasetId] = datasetImpact;
            _impacts[proposalId] = rawImpact - datasetImpact;

            // Update the maturity of the dataset as well, reflecting improved data quality or coverage
            _maturities[datasetId] = _maturities[proposalId];

            emit SetServiceScore(
                datasetId,
                _maturities[proposalId],
                _impacts[datasetId]
            );
        }

        emit SetServiceScore(
            proposalId,
            _maturities[proposalId],
            _impacts[proposalId]
        );
    }

    function getCore(uint256 tokenId) public view returns (uint8) {
        _requireOwned(tokenId);
        return _cores[tokenId];
    }

    function getMaturity(uint256 tokenId) public view returns (uint256) {
        _requireOwned(tokenId);
        return _maturities[tokenId];
    }

    function getImpact(uint256 tokenId) public view returns (uint256) {
        _requireOwned(tokenId);
        return _impacts[tokenId];
    }

    function getCoreService(
        uint256 limelightId,
        uint8 coreType
    ) public view returns (uint256) {
        return _coreServices[limelightId][coreType];
    }

    function getCoreDatasetAt(
        uint256 limelightId,
        uint8 coreType,
        uint256 index
    ) public view returns (uint256) {
        return _coreDatasets[limelightId][coreType][index];
    }

    function totalCoreDatasets(
        uint256 limelightId,
        uint8 coreType
    ) public view returns (uint256) {
        return _coreDatasets[limelightId][coreType].length;
    }

    function getCoreDatasets(
        uint256 limelightId,
        uint8 coreType
    ) public view returns (uint256[] memory) {
        return _coreDatasets[limelightId][coreType];
    }

    function setDatasetImpactWeight(uint16 weight) public onlyOwner {
        datasetImpactWeight = weight;
        emit DatasetImpactUpdated(weight);
    }

    // The following functions are overrides required by Solidity.

    function tokenURI(
        uint256 tokenId
    )
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        // Service NFT mirrors the corresponding ContributionNFT's URI,
        // acknowledging that each recognized milestone is derived from accumulated contributions.
        return IContributionNft(contributionNft).tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(
            ERC721Upgradeable,
            ERC721URIStorageUpgradeable,
            ERC721EnumerableUpgradeable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _increaseBalance(
        address account,
        uint128 amount
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        return super._increaseBalance(account, amount);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
}