// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./FFactory.sol";
import "./IFPair.sol";
import "./FRouter.sol";
import "./FERC20.sol";
import "./limelightPersona/IArtistFactory.sol";
import "hardhat/console.sol";

contract Bonding is
    Initializable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable
{
    using SafeERC20 for IERC20;

    address private _feeTo;
    FFactory public factory;
    FRouter public router;
    uint256 public initialSupply;
    uint256 public fee;
    uint256 public constant K = 3_000_000_000_000;
    uint256 public assetRate;
    uint256 public gradThreshold;
    uint256 public maxTx;
    address public artistFactory;

    struct Profile {
        address user;
        address[] tokens;
    }

    struct Token {
        address creator;
        address token;
        address pair;
        address artistToken; // Not used after graduation since not returned from IArtistFactory
        Data data;
        string description;
        uint8[] cores;
        string image;
        string twitter;
        string telegram;
        string youtube;
        string website;
        bool trading;
        bool tradingOnUniswap;
    }

    struct Data {
        address token;
        string name;
        string _name;
        string ticker;
        uint256 supply;
        uint256 price;
        uint256 marketCap;
        uint256 liquidity;
        uint256 volume;
        uint256 volume24H;
        uint256 prevPrice;
        uint256 lastUpdated;
    }

    struct DeployParams {
        bytes32 tbaSalt;
        address tbaImplementation;
        uint32 daoVotingPeriod;
        uint256 daoThreshold;
    }

    DeployParams private _deployParams;
    mapping(address => Profile) public profile;
    address[] public profiles;
    mapping(address => Token) public tokenInfo;
    address[] public tokenInfos;

    event Launched(address indexed token, address indexed pair, uint);

    event Deployed(address indexed token, uint256 amount0, uint256 amount1);
    event Graduated(address indexed token, address artistToken);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address factory_,
        address router_,
        address feeTo_,
        uint256 fee_,
        uint256 initialSupply_,
        uint256 assetRate_,
        uint256 maxTx_,
        address artistFactory_,
        uint256 gradThreshold_
    ) external initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();

        factory = FFactory(factory_);
        router = FRouter(router_);

        _feeTo = feeTo_;
        fee = (fee_ * 1 ether) / 1000;

        initialSupply = initialSupply_;
        assetRate = assetRate_;
        maxTx = maxTx_;

        artistFactory = artistFactory_;
        gradThreshold = gradThreshold_;
    }

    function _createUserProfile(address _user) internal returns (bool) {
        address[] memory _tokens;

        Profile memory _profile = Profile({user: _user, tokens: _tokens});
        profile[_user] = _profile;
        profiles.push(_user);
        return true;
    }

    function _checkIfProfileExists(address _user) internal view returns (bool) {
        return profile[_user].user == _user;
    }

    function _approval(
        address _spender,
        address _token,
        uint256 amount
    ) internal returns (bool) {
        IERC20(_token).forceApprove(_spender, amount);
        return true;
    }

    function setInitialSupply(uint256 newSupply) public onlyOwner {
        initialSupply = newSupply;
    }

    function setGradThreshold(uint256 newThreshold) public onlyOwner {
        gradThreshold = newThreshold;
    }

    function setFee(uint256 newFee, address newFeeTo) public onlyOwner {
        fee = newFee;
        _feeTo = newFeeTo;
    }

    function setMaxTx(uint256 maxTx_) public onlyOwner {
        maxTx = maxTx_;
    }

    function setAssetRate(uint256 newRate) public onlyOwner {
        require(newRate > 0, "Rate error");
        assetRate = newRate;
    }

    function setDeployParams(DeployParams memory params) public onlyOwner {
        _deployParams = params;
    }

    function getUserTokens(
        address account
    ) public view returns (address[] memory) {
        require(_checkIfProfileExists(account), "User profile does not exist.");
        Profile memory _profile = profile[account];
        return _profile.tokens;
    }

    function launch(
        string memory _name,
        string memory _ticker,
        uint8[] memory cores,
        string memory desc,
        string memory img,
        string[4] memory urls,
        uint256 purchaseAmount
    ) public nonReentrant returns (address, address, uint) {
        require(purchaseAmount > fee, "Purchase amount must exceed fee");
        address assetToken = router.assetToken();
        require(
            IERC20(assetToken).balanceOf(msg.sender) >= purchaseAmount,
            "Insufficient balance"
        );

        uint256 initialPurchase = purchaseAmount - fee;
        IERC20(assetToken).safeTransferFrom(msg.sender, _feeTo, fee);
        IERC20(assetToken).safeTransferFrom(
            msg.sender,
            address(this),
            initialPurchase
        );

        FERC20 token = new FERC20(
            string.concat("Limelight ", _name),
            _ticker,
            initialSupply,
            maxTx
        );
        uint256 supply = token.totalSupply();
        address _pair = factory.createPair(address(token), assetToken);

        bool approved = _approval(address(router), address(token), supply);
        require(approved, "Token approval failed");

        uint256 k = ((K * 10000) / assetRate);
        uint256 liquidity = (((k * 10000 ether) / supply) * 1 ether) / 10000;
        if (liquidity == 0) {
            liquidity = 1e9; // or some minimal value
        }

        router.addInitialLiquidity(address(token), supply, liquidity);

        Data memory _data = Data({
            token: address(token),
            name: string.concat("Limelight ", _name),
            _name: _name,
            ticker: _ticker,
            supply: supply,
            price: supply / liquidity,
            marketCap: liquidity,
            liquidity: liquidity * 2,
            volume: 0,
            volume24H: 0,
            prevPrice: supply / liquidity,
            lastUpdated: block.timestamp
        });

        Token memory tmpToken = Token({
            creator: msg.sender,
            token: address(token),
            artistToken: address(0),
            pair: _pair,
            data: _data,
            description: desc,
            cores: cores,
            image: img,
            twitter: urls[0],
            telegram: urls[1],
            youtube: urls[2],
            website: urls[3],
            trading: true,
            tradingOnUniswap: false
        });

        tokenInfo[address(token)] = tmpToken;
        tokenInfos.push(address(token));

        bool exists = _checkIfProfileExists(msg.sender);
        if (exists) {
            Profile storage _profile = profile[msg.sender];
            _profile.tokens.push(address(token));
        } else {
            bool created = _createUserProfile(msg.sender);
            if (created) {
                Profile storage _profile = profile[msg.sender];
                _profile.tokens.push(address(token));
            }
        }

        uint256 n = tokenInfos.length;
        emit Launched(address(token), _pair, n);

        IERC20(assetToken).forceApprove(address(router), initialPurchase);
        router.buy(initialPurchase, address(token), address(this));
        token.transfer(msg.sender, token.balanceOf(address(this)));

        return (address(token), _pair, n);
    }

    function sell(
        uint256 amountIn,
        address tokenAddress
    ) public returns (bool) {
        require(tokenInfo[tokenAddress].trading, "Token not trading");
        address pairAddress = factory.getPair(
            tokenAddress,
            router.assetToken()
        );
        IFPair pair = IFPair(pairAddress);

        (uint256 reserveA, uint256 reserveB) = pair.getReserves();
        (uint256 amount0In, uint256 amount1Out) = router.sell(
            amountIn,
            tokenAddress,
            msg.sender
        );

        uint256 newReserveA = reserveA + amount0In;
        uint256 newReserveB = reserveB - amount1Out;
        uint256 duration = block.timestamp -
            tokenInfo[tokenAddress].data.lastUpdated;

        uint256 liquidity = newReserveB * 2;
        uint256 mCap = (tokenInfo[tokenAddress].data.supply * newReserveB) /
            newReserveA;
        uint256 price = newReserveA / newReserveB;
        uint256 volume = duration > 86400
            ? amount1Out
            : tokenInfo[tokenAddress].data.volume24H + amount1Out;
        uint256 prevPrice = duration > 86400
            ? tokenInfo[tokenAddress].data.price
            : tokenInfo[tokenAddress].data.prevPrice;

        tokenInfo[tokenAddress].data.price = price;
        tokenInfo[tokenAddress].data.marketCap = mCap;
        tokenInfo[tokenAddress].data.liquidity = liquidity;
        tokenInfo[tokenAddress].data.volume += amount1Out;
        tokenInfo[tokenAddress].data.volume24H = volume;
        tokenInfo[tokenAddress].data.prevPrice = prevPrice;

        if (duration > 86400) {
            tokenInfo[tokenAddress].data.lastUpdated = block.timestamp;
        }

        return true;
    }

    function buy(
        uint256 amountIn,
        address tokenAddress
    ) public payable returns (bool) {
        require(tokenInfo[tokenAddress].trading, "Token not trading");
        address pairAddress = factory.getPair(
            tokenAddress,
            router.assetToken()
        );
        IFPair pair = IFPair(pairAddress);

        (uint256 reserveA, uint256 reserveB) = pair.getReserves();
        (uint256 amount1In, uint256 amount0Out) = router.buy(
            amountIn,
            tokenAddress,
            msg.sender
        );

        uint256 newReserveA = reserveA - amount0Out;
        uint256 newReserveB = reserveB + amount1In;

        uint256 duration = block.timestamp -
            tokenInfo[tokenAddress].data.lastUpdated;

        uint256 liquidity = newReserveB * 2;
        uint256 mCap = (tokenInfo[tokenAddress].data.supply * newReserveB) /
            newReserveA;
        uint256 price = newReserveA / newReserveB;

        uint256 volume = duration > 86400
            ? amount1In
            : tokenInfo[tokenAddress].data.volume24H + amount1In;
        uint256 _price = duration > 86400
            ? tokenInfo[tokenAddress].data.price
            : tokenInfo[tokenAddress].data.prevPrice;

        tokenInfo[tokenAddress].data.price = price;
        tokenInfo[tokenAddress].data.marketCap = mCap;
        tokenInfo[tokenAddress].data.liquidity = liquidity;
        tokenInfo[tokenAddress].data.volume += amount1In;
        tokenInfo[tokenAddress].data.volume24H = volume;
        tokenInfo[tokenAddress].data.prevPrice = _price;

        if (duration > 86400) {
            tokenInfo[tokenAddress].data.lastUpdated = block.timestamp;
        }

        if (newReserveA <= gradThreshold && tokenInfo[tokenAddress].trading) {
            _openTradingOnUniswap(tokenAddress);
        }

        return true;
    }

    function _openTradingOnUniswap(address tokenAddress) private {
        FERC20 token_ = FERC20(tokenAddress);
        Token storage _token = tokenInfo[tokenAddress];

        require(
            _token.trading && !_token.tradingOnUniswap,
            "Trading is already open or on Uniswap"
        );

        _token.trading = false;
        _token.tradingOnUniswap = true;

        address pairAddress = factory.getPair(
            tokenAddress,
            router.assetToken()
        );
        IFPair pair = IFPair(pairAddress);

        uint256 assetBalance = pair.assetBalance();
        uint256 tokenBalance = pair.balance();

        router.graduate(tokenAddress);

        IERC20(router.assetToken()).forceApprove(artistFactory, assetBalance);

        // Use IArtistFactory:
        uint256 id = IArtistFactory(artistFactory).initFromToken(
            tokenAddress,
            _token.cores,
            _deployParams.tbaSalt,
            _deployParams.tbaImplementation,
            _deployParams.daoVotingPeriod,
            _deployParams.daoThreshold,
            assetBalance
        );

        IArtistFactory(artistFactory).executeTokenApplication(id, true);

        // No artistToken returned, set to address(0)
        _token.artistToken = address(0);

        router.approval(
            pairAddress,
            address(0), // no artist token known
            address(this),
            0
        );

        // Burn the original tokens from pair
        token_.burnFrom(pairAddress, tokenBalance);

        emit Graduated(tokenAddress, address(0));
    }

    function unwrapToken(
        address srcTokenAddress,
        address[] memory accounts
    ) public {
        Token memory info = tokenInfo[srcTokenAddress];
        require(info.tradingOnUniswap, "Token not graduated");

        // If we had a known artistToken, we could transfer. But now we don't have it.
        // This function may need to be rethought. For now, we assume no unwrap logic needed since no artistToken known.
        // If needed, just omit artistToken logic.

        FERC20 token = FERC20(srcTokenAddress);
        for (uint256 i = 0; i < accounts.length; i++) {
            address acc = accounts[i];
            uint256 balance = token.balanceOf(acc);
            if (balance > 0) {
                token.burnFrom(acc, balance);
                // artistToken unknown => skip transferFrom
            }
        }
    }
}
