// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/governance/IGovernor.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol"; // Use upgradeable version
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

import "./IArtistFactory.sol";
import "./IArtistToken.sol";
import "./IArtistVeToken.sol";
import "./IArtistDAO.sol";
import "./IArtistNft.sol";
import "../libs/IERC6551Registry.sol";
import "../pool/IUniswapV2Factory.sol";
import "../pool/IUniswapV2Router02.sol";

contract ArtistFactory is
    IArtistFactory,
    Initializable,
    AccessControlUpgradeable, // Use AccessControlUpgradeable
    PausableUpgradeable
{
    using SafeERC20 for IERC20;

    uint256 private _nextId;
    address public tokenImplementation;
    address public daoImplementation;
    address public nft;
    address public tbaRegistry; // Token bound account
    uint256 public applicationThreshold;

    address[] public allTokens;
    address[] public allDAOs;

    address public assetToken; // Base currency
    uint256 public maturityDuration; // Staking duration in seconds for initial LP. e.g.: 10 years

    bytes32 public constant WITHDRAW_ROLE = keccak256("WITHDRAW_ROLE");

    event NewArtistPersona(
        uint256 limelightId,
        address token,
        address dao,
        address tba,
        address veToken,
        address lp
    );
    event NewApplication(uint256 id);

    bool internal locked;

    modifier noReentrant() {
        require(!locked, "cannot reenter");
        locked = true;
        _;
        locked = false;
    }

    address[] public allTradingTokens;
    address private _uniswapRouter;
    address public veTokenImplementation;
    address private _tokenAdmin;
    address public defaultDelegatee;
    bytes private _tokenSupplyParams;
    bytes private _tokenTaxParams;

    mapping(address => uint256) private _tokenApplication;
    mapping(uint256 => address) private _applicationToken;

    mapping(uint256 => Application) private _applications;

    event ApplicationThresholdUpdated(uint256 newThreshold);
    event ImplContractsUpdated(address token, address dao);

    address private _vault; // Vault to hold all Artist NFTs

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address tokenImplementation_,
        address veTokenImplementation_,
        address daoImplementation_,
        address tbaRegistry_,
        address assetToken_,
        address nft_,
        uint256 applicationThreshold_,
        address vault_,
        uint256 nextId_
    ) public initializer {
        __Pausable_init();
        __AccessControl_init(); // Initialize AccessControlUpgradeable

        tokenImplementation = tokenImplementation_;
        veTokenImplementation = veTokenImplementation_;
        daoImplementation = daoImplementation_;
        assetToken = assetToken_;
        tbaRegistry = tbaRegistry_;
        nft = nft_;
        applicationThreshold = applicationThreshold_;
        _nextId = nextId_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _vault = vault_;
    }

    function getApplication(
        uint256 proposalId
    ) public view returns (Application memory) {
        return _applications[proposalId];
    }

    function proposeArtist(
        string memory name,
        string memory symbol,
        string memory tokenURI,
        uint8[] memory cores,
        bytes32 tbaSalt,
        address tbaImplementation,
        uint32 daoVotingPeriod,
        uint256 daoThreshold
    ) public whenNotPaused returns (uint256) {
        address sender = _msgSender();
        require(
            IERC20(assetToken).balanceOf(sender) >= applicationThreshold,
            "Insufficient asset token"
        );
        require(
            IERC20(assetToken).allowance(sender, address(this)) >=
                applicationThreshold,
            "Insufficient asset token allowance"
        );
        require(cores.length > 0, "Cores must be provided");

        IERC20(assetToken).safeTransferFrom(
            sender,
            address(this),
            applicationThreshold
        );

        uint256 id = _nextId++;
        uint256 proposalEndBlock = block.number;
        Application memory application = Application(
            name,
            symbol,
            tokenURI,
            ApplicationStatus.Active,
            applicationThreshold,
            sender,
            cores,
            proposalEndBlock,
            0,
            tbaSalt,
            tbaImplementation,
            daoVotingPeriod,
            daoThreshold
        );
        _applications[id] = application;
        emit NewApplication(id);

        return id;
    }

    function withdraw(uint256 id) public noReentrant {
        Application storage application = _applications[id];

        require(
            msg.sender == application.proposer ||
                hasRole(WITHDRAW_ROLE, msg.sender),
            "Not proposer"
        );

        require(
            application.status == ApplicationStatus.Active,
            "Application not active"
        );

        require(
            block.number > application.proposalEndBlock,
            "Application not matured"
        );

        uint256 withdrawableAmount = application.withdrawableAmount;

        application.withdrawableAmount = 0;
        application.status = ApplicationStatus.Withdrawn;

        IERC20(assetToken).safeTransfer(
            application.proposer,
            withdrawableAmount
        );

        address customToken = _applicationToken[id];
        if (customToken != address(0)) {
            IERC20(customToken).safeTransfer(
                application.proposer,
                IERC20(customToken).balanceOf(address(this))
            );

            _tokenApplication[customToken] = 0;
            _applicationToken[id] = address(0);
        }
    }

    function _executeApplication(
        uint256 id,
        bool canStake,
        bytes memory tokenSupplyParams_
    ) internal {
        require(
            _applications[id].status == ApplicationStatus.Active,
            "Not active"
        );

        require(_tokenAdmin != address(0), "Token admin not set");

        Application storage application = _applications[id];

        uint256 initialAmount = application.withdrawableAmount;
        application.withdrawableAmount = 0;
        application.status = ApplicationStatus.Executed;

        address token = _applicationToken[id];
        address lp = address(0);
        if (token == address(0)) {
            token = _createNewArtistToken(
                application.name,
                application.symbol,
                tokenSupplyParams_
            );
            lp = IArtistToken(token).liquidityPools()[0];
            IERC20(assetToken).safeTransfer(token, initialAmount);
            IArtistToken(token).addInitialLiquidity(address(this));
        } else {
            // Custom token
            lp = _createPair(token);
            IERC20(token).forceApprove(_uniswapRouter, type(uint256).max);
            IERC20(assetToken).forceApprove(_uniswapRouter, initialAmount);
            IUniswapV2Router02(_uniswapRouter).addLiquidity(
                token,
                assetToken,
                IERC20(token).balanceOf(address(this)),
                initialAmount,
                0,
                0,
                address(this),
                block.timestamp
            );
        }

        address veToken = _createNewArtistVeToken(
            string.concat("Staked ", application.name),
            string.concat("s", application.symbol),
            lp,
            application.proposer,
            canStake
        );

        string memory daoName = string.concat(application.name, " DAO");
        address payable dao = payable(
            _createNewArtistDAO(
                daoName,
                IVotes(veToken),
                application.daoVotingPeriod,
                application.daoThreshold
            )
        );

        uint256 limelightId = IArtistNft(nft).nextLimelightId();
        IArtistNft(nft).mint(
            limelightId,
            _vault,
            application.tokenURI,
            dao,
            application.proposer,
            application.cores,
            lp,
            token
        );
        application.limelightId = limelightId;

        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        address tbaAddress = IERC6551Registry(tbaRegistry).createAccount(
            application.tbaImplementation,
            application.tbaSalt,
            chainId,
            nft,
            limelightId
        );
        IArtistNft(nft).setTBA(limelightId, tbaAddress);

        IERC20(lp).approve(veToken, type(uint256).max);
        IArtistVeToken(veToken).stake(
            IERC20(lp).balanceOf(address(this)),
            application.proposer,
            defaultDelegatee
        );

        emit NewArtistPersona(limelightId, token, dao, tbaAddress, veToken, lp);
    }

    function executeApplication(uint256 id, bool canStake) public noReentrant {
        Application storage application = _applications[id];

        require(
            msg.sender == application.proposer ||
                hasRole(WITHDRAW_ROLE, msg.sender),
            "Not proposer"
        );

        _executeApplication(id, canStake, _tokenSupplyParams);
    }

    function _createNewArtistDAO(
        string memory name,
        IVotes token,
        uint32 daoVotingPeriod,
        uint256 daoThreshold
    ) internal returns (address instance) {
        instance = Clones.clone(daoImplementation);
        IArtistDAO(instance).initialize(
            name,
            token,
            nft,
            daoThreshold,
            daoVotingPeriod
        );

        allDAOs.push(instance);
        return instance;
    }

    function _createNewArtistToken(
        string memory name,
        string memory symbol,
        bytes memory tokenSupplyParams_
    ) internal returns (address instance) {
        instance = Clones.clone(tokenImplementation);
        IArtistToken(instance).initialize(
            [_tokenAdmin, _uniswapRouter, assetToken],
            abi.encode(name, symbol),
            tokenSupplyParams_,
            _tokenTaxParams
        );

        allTradingTokens.push(instance);
        return instance;
    }

    function _createNewArtistVeToken(
        string memory name,
        string memory symbol,
        address stakingAsset,
        address founder,
        bool canStake
    ) internal returns (address instance) {
        instance = Clones.clone(veTokenImplementation);
        IArtistVeToken(instance).initialize(
            name,
            symbol,
            founder,
            stakingAsset,
            block.timestamp + maturityDuration,
            address(nft),
            canStake
        );

        allTokens.push(instance);
        return instance;
    }

    function totalArtists() public view returns (uint256) {
        return allTokens.length;
    }

    function setApplicationThreshold(
        uint256 newThreshold
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        applicationThreshold = newThreshold;
        emit ApplicationThresholdUpdated(newThreshold);
    }

    function setVault(address newVault) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _vault = newVault;
    }

    function setImplementations(
        address token,
        address veToken,
        address dao
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenImplementation = token;
        daoImplementation = dao;
        veTokenImplementation = veToken;
    }

    function setMaturityDuration(
        uint256 newDuration
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        maturityDuration = newDuration;
    }

    function setUniswapRouter(
        address router
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _uniswapRouter = router;
    }

    function setTokenAdmin(
        address newTokenAdmin
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _tokenAdmin = newTokenAdmin;
    }

    function setTokenSupplyParams(
        uint256 maxSupply,
        uint256 lpSupply,
        uint256 vaultSupply,
        uint256 maxTokensPerWallet,
        uint256 maxTokensPerTxn,
        uint256 botProtectionDurationInSeconds,
        address vault
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _tokenSupplyParams = abi.encode(
            maxSupply,
            lpSupply,
            vaultSupply,
            maxTokensPerWallet,
            maxTokensPerTxn,
            botProtectionDurationInSeconds,
            vault
        );
    }

    function setTokenTaxParams(
        uint256 projectBuyTaxBasisPoints,
        uint256 projectSellTaxBasisPoints,
        uint256 taxSwapThresholdBasisPoints,
        address projectTaxRecipient
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _tokenTaxParams = abi.encode(
            projectBuyTaxBasisPoints,
            projectSellTaxBasisPoints,
            taxSwapThresholdBasisPoints,
            projectTaxRecipient
        );
    }

    function setAssetToken(
        address newToken
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        assetToken = newToken;
    }

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _msgSender()
        internal
        view
        override(ContextUpgradeable)
        returns (address sender)
    {
        sender = ContextUpgradeable._msgSender();
    }

    function _msgData()
        internal
        view
        override(ContextUpgradeable)
        returns (bytes calldata)
    {
        return ContextUpgradeable._msgData();
    }

    function setDefaultDelegatee(
        address newDelegatee
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        defaultDelegatee = newDelegatee;
    }

    function initFromToken(
        address tokenAddr,
        uint8[] memory cores,
        bytes32 tbaSalt,
        address tbaImplementation,
        uint32 daoVotingPeriod,
        uint256 daoThreshold,
        uint256 initialLP
    ) public whenNotPaused returns (uint256) {
        address sender = _msgSender();
        require(_tokenApplication[tokenAddr] == 0, "Token exists");
        require(isCompatibleToken(tokenAddr), "Unsupported token");

        require(
            IERC20(assetToken).balanceOf(sender) >= applicationThreshold,
            "Insufficient asset token"
        );

        require(
            IERC20(assetToken).allowance(sender, address(this)) >=
                applicationThreshold,
            "Insufficient asset token allowance"
        );

        require(cores.length > 0, "Cores must be provided");
        require(initialLP > 0, "InitialLP must be > 0");

        IERC20(tokenAddr).safeTransferFrom(sender, address(this), initialLP);
        IERC20(assetToken).safeTransferFrom(
            sender,
            address(this),
            applicationThreshold
        );

        uint256 id = _nextId++;
        _tokenApplication[tokenAddr] = id;
        _applicationToken[id] = tokenAddr;

        Application memory application = Application(
            IArtistToken(tokenAddr).name(),
            IArtistToken(tokenAddr).symbol(),
            "",
            ApplicationStatus.Active,
            applicationThreshold,
            sender,
            cores,
            block.number,
            0,
            tbaSalt,
            tbaImplementation,
            daoVotingPeriod,
            daoThreshold
        );
        _applications[id] = application;
        emit NewApplication(id);

        return id;
    }

    function executeTokenApplication(
        uint256 id,
        bool canStake
    ) public noReentrant {
        Application storage application = _applications[id];

        require(
            msg.sender == application.proposer ||
                hasRole(WITHDRAW_ROLE, msg.sender),
            "Not proposer"
        );

        require(
            _applicationToken[id] != address(0),
            "Not custom token application"
        );

        _executeApplication(id, canStake, _tokenSupplyParams);
    }

    function isCompatibleToken(address tokenAddr) public view returns (bool) {
        try IArtistToken(tokenAddr).name() returns (string memory) {
            try IArtistToken(tokenAddr).symbol() returns (string memory) {
                try IArtistToken(tokenAddr).totalSupply() returns (uint256) {
                    try
                        IArtistToken(tokenAddr).balanceOf(address(this))
                    returns (uint256) {
                        return true;
                    } catch {
                        return false;
                    }
                } catch {
                    return false;
                }
            } catch {
                return false;
            }
        } catch {
            return false;
        }
    }

    function _createPair(
        address tokenAddr
    ) internal returns (address uniswapV2Pair_) {
        IUniswapV2Factory factory = IUniswapV2Factory(
            IUniswapV2Router02(_uniswapRouter).factory()
        );

        require(
            factory.getPair(tokenAddr, assetToken) == address(0),
            "pool exists"
        );

        uniswapV2Pair_ = factory.createPair(tokenAddr, assetToken);

        return (uniswapV2Pair_);
    }
}
