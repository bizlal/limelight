// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./Factory.sol";
import "./Pair.sol";
import "./Router.sol";
import "./ERC20.sol";

interface IUniswapV2Factory {
    function createPair(
        address tokenA,
        address tokenB
    ) external returns (address pair);
}

interface IUniswapV2Router02 {
    // Updated methods to reflect token-based operations:
    function factory() external pure returns (address);
    function WETH() external pure returns (address);

    // For token-to-token adds
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    // Example token-for-token swap function
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract LimelightBonding is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    Factory private factory;
    Router private router;
    IUniswapV2Router02 private uniswapV2Router;

    address private _feeTo;
    address public assetToken; // The custom asset token used as base currency
    uint256 private fee;

    uint private constant lpFee = 5;
    uint256 private constant mcap = 100_000 ether;

    struct Profile {
        address user;
        Token[] tokens;
    }

    struct Token {
        address creator;
        address token;
        address pair;
        Data data;
        string description;
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
        string ticker;
        uint256 supply;
        uint256 price;
        uint256 marketCap;
        uint256 liquidity;
        uint256 _liquidity;
        uint256 volume;
        uint256 volume24H;
        uint256 prevPrice;
        uint256 lastUpdated;
    }

    mapping(address => Profile) public profile;
    Profile[] public profiles;

    mapping(address => Token) public tokenInfo;
    Token[] public tokens;

    event Launched(address indexed token, address indexed pair, uint index);
    event Deployed(address indexed token, uint256 amount0, uint256 amount1);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address factory_,
        address router_,
        address fee_to,
        uint256 _fee,
        address assetToken_,
        address uniswapRouter_
    ) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        require(factory_ != address(0), "Zero address not allowed");
        require(router_ != address(0), "Zero address not allowed");
        require(fee_to != address(0), "Zero address not allowed");
        require(assetToken_ != address(0), "Zero address not allowed");
        require(uniswapRouter_ != address(0), "Zero address not allowed");

        factory = Factory(factory_);
        router = Router(router_);
        _feeTo = fee_to;
        fee = (_fee * (10 ** 18)) / 1000; // fee in terms of assetToken decimals
        assetToken = assetToken_;
        uniswapV2Router = IUniswapV2Router02(uniswapRouter_);
    }

    modifier onlyOwnerOrCreator(address tokenAddr) {
        require(
            msg.sender == owner() || msg.sender == tokenInfo[tokenAddr].creator,
            "Not authorized"
        );
        _;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function createUserProfile(address _user) private returns (bool) {
        require(_user != address(0), "Zero address not allowed");
        Token[] memory _tokens;
        Profile memory _profile = Profile({user: _user, tokens: _tokens});
        profile[_user] = _profile;
        profiles.push(_profile);
        return true;
    }

    function checkIfProfileExists(address _user) private view returns (bool) {
        require(_user != address(0), "Zero address not allowed");
        for (uint i = 0; i < profiles.length; i++) {
            if (profiles[i].user == _user) {
                return true;
            }
        }
        return false;
    }

    function _approval(
        address spender,
        address _token,
        uint256 amount
    ) private returns (bool) {
        require(spender != address(0), "Zero address not allowed");
        require(_token != address(0), "Zero address not allowed");
        ERC20 t = ERC20(_token);
        t.approve(spender, amount);
        return true;
    }

    function approval(
        address _user,
        address _token,
        uint256 amount
    ) external nonReentrant returns (bool) {
        return _approval(_user, _token, amount);
    }

    function launchFee() public view returns (uint256) {
        return fee;
    }

    function updateLaunchFee(uint256 _fee) public onlyOwner returns (uint256) {
        fee = _fee;
        return fee;
    }

    function liquidityFee() public pure returns (uint256) {
        return lpFee;
    }

    function feeTo() public view returns (address) {
        return _feeTo;
    }

    function feeToSetter() public view returns (address) {
        return owner();
    }

    function setFeeTo(address fee_to) public onlyOwner {
        require(fee_to != address(0), "Zero address not allowed");
        _feeTo = fee_to;
    }

    function marketCapLimit() public pure returns (uint256) {
        return mcap;
    }

    function getUserTokens() public view returns (Token[] memory) {
        require(
            checkIfProfileExists(msg.sender),
            "User Profile does not exist."
        );
        return profile[msg.sender].tokens;
    }

    function getTokens() public view returns (Token[] memory) {
        return tokens;
    }

    function launch(
        string memory _name,
        string memory _ticker,
        string memory desc,
        string memory img,
        string[4] memory urls,
        uint256 _supply,
        uint maxTx,
        uint256 purchaseAmount
    ) public nonReentrant returns (address, address, uint) {
        ERC20 asset = ERC20(assetToken);
        require(
            asset.allowance(msg.sender, address(this)) >= purchaseAmount,
            "Not enough allowance"
        );
        require(
            asset.balanceOf(msg.sender) >= purchaseAmount,
            "Not enough asset token balance"
        );

        require(purchaseAmount >= fee, "Purchase amount < fee");
        uint256 initialPurchase = purchaseAmount - fee;

        asset.transferFrom(msg.sender, _feeTo, fee);
        asset.transferFrom(msg.sender, address(this), initialPurchase);

        ERC20 _token = new ERC20(_name, _ticker, _supply, maxTx);
        uint256 supply = _supply * 10 ** _token.decimals();

        address _pair = factory.createPair(address(_token), assetToken);
        Pair pair_ = Pair(payable(_pair));

        bool approved = _approval(address(router), address(_token), supply);
        require(approved, "Token approval failed");

        uint256 liquidityAmount = (lpFee * initialPurchase) / 100;
        uint256 leftover = initialPurchase - liquidityAmount;

        asset.approve(address(uniswapV2Router), liquidityAmount);
        _token.approve(address(uniswapV2Router), supply);

        uniswapV2Router.addLiquidity(
            address(_token),
            assetToken,
            supply,
            liquidityAmount,
            0,
            0,
            address(this),
            block.timestamp
        );

        Data memory _data = Data({
            token: address(_token),
            name: _name,
            ticker: _ticker,
            supply: supply,
            price: supply / pair_.MINIMUM_LIQUIDITY(),
            marketCap: pair_.MINIMUM_LIQUIDITY(),
            liquidity: liquidityAmount * 2,
            _liquidity: pair_.MINIMUM_LIQUIDITY() * 2,
            volume: 0,
            volume24H: 0,
            prevPrice: supply / pair_.MINIMUM_LIQUIDITY(),
            lastUpdated: block.timestamp
        });

        Token memory token_ = Token({
            creator: msg.sender,
            token: address(_token),
            pair: _pair,
            data: _data,
            description: desc,
            image: img,
            twitter: urls[0],
            telegram: urls[1],
            youtube: urls[2],
            website: urls[3],
            trading: true,
            tradingOnUniswap: false
        });

        tokenInfo[address(_token)] = token_;
        tokens.push(token_);

        bool exists = checkIfProfileExists(msg.sender);
        if (exists) {
            Profile storage _profile = profile[msg.sender];
            _profile.tokens.push(token_);
        } else {
            bool created = createUserProfile(msg.sender);
            if (created) {
                Profile storage _profile = profile[msg.sender];
                _profile.tokens.push(token_);
            }
        }

        if (leftover > 0) {
            asset.transfer(msg.sender, leftover);
        }

        uint n = tokens.length;
        emit Launched(address(_token), _pair, n);

        return (address(_token), _pair, n);
    }

    function swapTokensForBase(
        address tk,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        address referree
    ) public nonReentrant returns (bool) {
        require(
            tk != address(0) && to != address(0) && referree != address(0),
            "Invalid address"
        );

        ERC20(tk).transferFrom(msg.sender, address(this), amountIn);
        ERC20(tk).approve(address(uniswapV2Router), amountIn);

        address[] memory path = new address[](2);
        path[0] = tk;
        path[1] = assetToken;

        uniswapV2Router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            to,
            block.timestamp
        );

        return true;
    }

    function swapBaseForTokens(
        address tk,
        uint256 amountIn,
        uint256 amountOutMin,
        address to
    ) public nonReentrant returns (bool) {
        require(tk != address(0) && to != address(0), "Invalid address");

        ERC20(assetToken).transferFrom(msg.sender, address(this), amountIn);
        ERC20(assetToken).approve(address(uniswapV2Router), amountIn);

        address[] memory path = new address[](2);
        path[0] = assetToken;
        path[1] = tk;

        uniswapV2Router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            to,
            block.timestamp
        );

        return true;
    }

    function removeLiquidity(
        address tk,
        uint256 liquidityAmount
    ) public onlyOwnerOrCreator(tk) nonReentrant {
        // Implement logic to remove liquidity from the token-assetToken pair
        // This would involve calling uniswapV2Router.removeLiquidity
        // Make sure to handle approvals and token transfers as needed
    }

    function openTradingOnUniswap(
        address tk
    ) public onlyOwnerOrCreator(tk) nonReentrant {
        require(tk != address(0), "Zero address not allowed");

        Token storage _token = tokenInfo[tk];
        require(
            _token.trading && !_token.tradingOnUniswap,
            "Trading already open or on Uniswap"
        );

        ERC20 t = ERC20(tk);
        uint256 bal = t.balanceOf(address(this));
        require(bal > 0, "No tokens to provide");

        t.approve(address(uniswapV2Router), bal);

        // Additional logic if needed to finalize trading on Uniswap
        _token.tradingOnUniswap = true;
    }
}
