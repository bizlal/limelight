// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC5805} from "@openzeppelin/contracts/interfaces/IERC5805.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC5805.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IArtistNft.sol";
import "./CoreRegistry.sol";
import "./ValidatorRegistry.sol";
import "./IArtistDAO.sol";

contract ArtistNft is
    IArtistNft,
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    AccessControlUpgradeable,
    CoreRegistry,
    ValidatorRegistry
{
    uint256 private _nextLimelightId;
    mapping(address => uint256) private _stakingTokenToLimelightId;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant VALIDATOR_ADMIN_ROLE =
        keccak256("VALIDATOR_ADMIN_ROLE"); // Validator admin can manage validators for all personas

    modifier onlyLimelightDAO(uint256 limelightId) {
        require(
            _msgSender() == limelightInfos[limelightId].dao,
            "Caller is not LIMELIGHT DAO"
        );
        _;
    }

    modifier onlyService() {
        require(_msgSender() == _serviceNft, "Caller is not Service NFT");
        _;
    }

    mapping(uint256 => LimelightInfo) public limelightInfos;

    address private _contributionNft;
    address private _serviceNft;

    // V2 Storage
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    mapping(uint256 => bool) private _blacklists;
    mapping(uint256 => LimelightLP) public limelightLPs;
    address private _eloCalculator;

    event ArtistBlacklisted(uint256 indexed limelightId, bool value);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address defaultAdmin) public initializer {
        __ERC721_init("Artist", "ARTIST");
        __ERC721URIStorage_init();
        __CoreRegistry_init();
        __ValidatorRegistry_init(
            _validatorScoreOf,
            totalProposals,
            _getPastValidatorScore
        );
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(VALIDATOR_ADMIN_ROLE, defaultAdmin);
        _grantRole(ADMIN_ROLE, defaultAdmin);
        _nextLimelightId = 1;
    }

    function setContributionService(
        address contributionNft_,
        address serviceNft_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _contributionNft = contributionNft_;
        _serviceNft = serviceNft_;
    }

    function nextLimelightId() public view returns (uint256) {
        return _nextLimelightId;
    }

    function mint(
        uint256 limelightId,
        address to,
        string memory newTokenURI,
        address payable theDAO,
        address founder,
        uint8[] memory coreTypes,
        address pool,
        address token
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(limelightId == _nextLimelightId, "Invalid limelightId");
        _nextLimelightId++;
        _mint(to, limelightId);
        _setTokenURI(limelightId, newTokenURI);
        LimelightInfo storage info = limelightInfos[limelightId];
        info.dao = theDAO;
        info.coreTypes = coreTypes;
        info.founder = founder;
        IERC5805 daoToken = GovernorVotes(theDAO).token();
        info.token = token;

        LimelightLP storage lp = limelightLPs[limelightId];
        lp.pool = pool;
        lp.veToken = address(daoToken);

        _stakingTokenToLimelightId[address(daoToken)] = limelightId;
        _addValidator(limelightId, founder);
        _initValidatorScore(limelightId, founder);
        return limelightId;
    }

    function addCoreType(
        string memory label
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        super._addCoreType(label);
    }

    function limelightInfo(
        uint256 limelightId
    ) public view returns (LimelightInfo memory) {
        return limelightInfos[limelightId];
    }

    function limelightLP(
        uint256 limelightId
    ) public view returns (LimelightLP memory) {
        return limelightLPs[limelightId];
    }

    // Get LIMELIGHT ID of a staking token
    function stakingTokenToLimelightId(
        address stakingToken
    ) external view returns (uint256) {
        return _stakingTokenToLimelightId[stakingToken];
    }

    function addValidator(uint256 limelightId, address validator) public {
        if (isValidator(limelightId, validator)) {
            return;
        }
        _addValidator(limelightId, validator);
        _initValidatorScore(limelightId, validator);
    }

    function _validatorScoreOf(
        uint256 limelightId,
        address account
    ) internal view returns (uint256) {
        LimelightInfo memory info = limelightInfos[limelightId];
        IArtistDAO dao = IArtistDAO(info.dao);
        return dao.scoreOf(account);
    }

    function _getPastValidatorScore(
        uint256 limelightId,
        address account,
        uint256 timepoint
    ) internal view returns (uint256) {
        LimelightInfo memory info = limelightInfos[limelightId];
        IArtistDAO dao = IArtistDAO(info.dao);
        return dao.getPastScore(account, timepoint);
    }

    function totalProposals(uint256 limelightId) public view returns (uint256) {
        LimelightInfo memory info = limelightInfos[limelightId];
        IArtistDAO dao = IArtistDAO(info.dao);
        return dao.proposalCount();
    }

    function setCoreTypes(
        uint256 limelightId,
        uint8[] memory coreTypes
    ) external onlyLimelightDAO(limelightId) {
        LimelightInfo storage info = limelightInfos[limelightId];
        info.coreTypes = coreTypes;
        emit CoresUpdated(limelightId, coreTypes);
    }

    function setTokenURI(
        uint256 limelightId,
        string memory newTokenURI
    ) public onlyLimelightDAO(limelightId) {
        return _setTokenURI(limelightId, newTokenURI);
    }

    function setTBA(
        uint256 limelightId,
        address tba
    ) external onlyRole(MINTER_ROLE) {
        LimelightInfo storage info = limelightInfos[limelightId];
        require(info.tba == address(0), "TBA already set");
        info.tba = tba;
    }

    function setDAO(uint256 limelightId, address newDAO) public {
        require(
            _msgSender() == limelightInfos[limelightId].dao,
            "Caller is not LIMELIGHT DAO"
        );
        LimelightInfo storage info = limelightInfos[limelightId];
        info.dao = newDAO;
    }

    function totalStaked(uint256 limelightId) public view returns (uint256) {
        return IERC20(limelightLPs[limelightId].veToken).totalSupply();
    }

    function getVotes(
        uint256 limelightId,
        address validator
    ) public view returns (uint256) {
        return IERC5805(limelightLPs[limelightId].veToken).getVotes(validator);
    }

    function getContributionNft() public view returns (address) {
        return _contributionNft;
    }

    function getServiceNft() public view returns (address) {
        return _serviceNft;
    }

    function getAllServices(
        uint256 limelightId
    ) public view returns (uint256[] memory) {
        LimelightInfo memory info = limelightInfos[limelightId];
        IERC721Enumerable serviceNft = IERC721Enumerable(_serviceNft);
        uint256 total = serviceNft.balanceOf(info.tba);
        uint256[] memory services = new uint256[](total);
        for (uint256 i = 0; i < total; i++) {
            services[i] = serviceNft.tokenOfOwnerByIndex(info.tba, i);
        }
        return services;
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
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(
            ERC721Upgradeable,
            ERC721URIStorageUpgradeable,
            AccessControlUpgradeable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function totalSupply() public view returns (uint256) {
        return _nextLimelightId - 1;
    }

    function isBlacklisted(uint256 limelightId) public view returns (bool) {
        return _blacklists[limelightId];
    }

    function setBlacklist(
        uint256 limelightId,
        bool value
    ) public onlyRole(ADMIN_ROLE) {
        _blacklists[limelightId] = value;
        emit ArtistBlacklisted(limelightId, value);
    }

    function migrateScoreFunctions() public onlyRole(ADMIN_ROLE) {
        _migrateScoreFunctions(
            _validatorScoreOf,
            totalProposals,
            _getPastValidatorScore
        );
    }

    function setEloCalculator(
        address eloCalculator
    ) public onlyRole(ADMIN_ROLE) {
        _eloCalculator = eloCalculator;
    }

    function getEloCalculator() public view returns (address) {
        return _eloCalculator;
    }

    function migrateLimelight(
        uint256 limelightId,
        address dao,
        address token,
        address pool,
        address veToken
    ) public onlyRole(ADMIN_ROLE) {
        LimelightInfo storage info = limelightInfos[limelightId];
        info.dao = dao;
        info.token = token;

        LimelightLP storage lp = limelightLPs[limelightId];
        lp.pool = pool;
        lp.veToken = veToken;

        _stakingTokenToLimelightId[address(veToken)] = limelightId;
    }
}