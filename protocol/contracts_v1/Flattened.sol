// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*  
    --------------------------------------------------------------------------------------------
    PART 1: Standard Uniswap V2 Clone (Factory, Pair, Router, WETH Interface, etc.)
             => All in 0.8.x syntax
    --------------------------------------------------------------------------------------------
*/

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// SafeMath (0.8+ no longer strictly needed,
// but we'll keep it to mirror Uniswap's logic)
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
library UniSafeMath {
    function add(uint x, uint y) internal pure returns (uint z) {
        z = x + y;
        require(z >= x, 'ds-math-add-overflow');
    }
    function sub(uint x, uint y) internal pure returns (uint z) {
        require(y <= x, 'ds-math-sub-underflow');
        z = x - y;
    }
    function mul(uint x, uint y) internal pure returns (uint z) {
        if (y == 0) return 0;
        z = x * y;
        require(z / y == x, 'ds-math-mul-overflow');
    }
}

interface IUniswapV2Factory {
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    function feeTo() external view returns (address);
    function feeToSetter() external view returns (address);

    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function allPairs(uint) external view returns (address pair);
    function allPairsLength() external view returns (uint);

    function createPair(address tokenA, address tokenB) external returns (address pair);

    function setFeeTo(address) external;
    function setFeeToSetter(address) external;
}

interface IUniswapV2Pair {
    function factory() external view returns (address);
    function token0() external view returns (address);
    function token1() external view returns (address);

    function getReserves() external view
        returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function mint(address to) external returns (uint liquidity);
    function burn(address to) external returns (uint amount0, uint amount1);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;

    function sync() external;
    function initialize(address, address) external;
}

interface IERC20Uni {
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view  returns (uint);
    function allowance(address owner, address spender) external view  returns (uint);

    function approve(address spender, uint value) external  returns (bool);
    function transfer(address to, uint value) external  returns (bool);
    function transferFrom(address from, address to, uint value) external  returns (bool);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint) external;
    function transfer(address to, uint value) external returns (bool);
}

library TransferHelper {
    function safeTransferFrom(
        address token,
        address from,
        address to,
        uint value
    ) internal {
        (bool success, bytes memory data) =
            token.call(abi.encodeWithSelector(IERC20Uni.transferFrom.selector, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))),
                'TF: transferFrom failed');
    }

    function safeTransfer(address token, address to, uint value) internal {
        (bool success, bytes memory data) =
            token.call(abi.encodeWithSelector(IERC20Uni.transfer.selector, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))),
                'TF: transfer failed');
    }

    function safeTransferETH(address to, uint value) internal {
        (bool success, ) = to.call{value:value}(new bytes(0));
        require(success, 'TF: ETH transfer failed');
    }
}

library UniswapV2Library {
    using UniSafeMath for uint;

    // returns sorted token addresses (token0 < token1)
    function sortTokens(address tokenA, address tokenB)
        internal
        pure
        returns (address token0, address token1)
    {
        require(tokenA != tokenB, 'UniLib: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'UniLib: ZERO_ADDRESS');
    }

    // calculates pair address via CREATE2
    function pairFor(address factory_, address tokenA, address tokenB)
        internal
        pure
        returns (address pair)
    {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        // Must match the init code hash of the deployed Pair
        bytes32 INIT_CODE_HASH =
            0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f;

        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        pair = address(uint160(uint(
            keccak256(abi.encodePacked(
                hex'ff',
                factory_,
                salt,
                INIT_CODE_HASH
            ))
        )));
    }

    // fetch and sort the reserves for a pair
    function getReserves(
        address factory_,
        address tokenA,
        address tokenB
    ) internal view returns (uint reserveA, uint reserveB)
    {
        (address token0, ) = sortTokens(tokenA, tokenB);
        address pair = pairFor(factory_, tokenA, tokenB);
        (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(pair).getReserves();
        (reserveA, reserveB) = (tokenA == token0)
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Minimal UniswapV2ERC20 logic for the LP pair
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
contract UniswapV2ERC20 {
    using UniSafeMath for uint;

    string public constant name     = 'Uniswap V2';
    string public constant symbol   = 'UNI-V2';
    uint8 public constant decimals  = 18;
    uint  public totalSupply;
    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;

    bytes32 public DOMAIN_SEPARATOR;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH =
        0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint) public nonces;

    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    constructor() {
        uint chainId = block.chainid;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                keccak256(bytes(name)),
                keccak256(bytes('1')),
                chainId,
                address(this)
            )
        );
    }

    function _mint(address to, uint value) internal {
        totalSupply = totalSupply.add(value);
        balanceOf[to] = balanceOf[to].add(value);
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint value) internal {
        balanceOf[from] = balanceOf[from].sub(value);
        totalSupply = totalSupply.sub(value);
        emit Transfer(from, address(0), value);
    }

    function _approve(address owner, address spender, uint value) private {
        allowance[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    function _transfer(address from, address to, uint value) private {
        balanceOf[from] = balanceOf[from].sub(value);
        balanceOf[to]   = balanceOf[to].add(value);
        emit Transfer(from, to, value);
    }

    function approve(address spender, uint value) external returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint value) external returns (bool) {
        uint currentAllowance = allowance[from][msg.sender];
        if (currentAllowance != type(uint).max) {
            allowance[from][msg.sender] = currentAllowance.sub(value);
        }
        _transfer(from, to, value);
        return true;
    }

    function permit(
        address owner, address spender, uint value,
        uint deadline, uint8 v, bytes32 r, bytes32 s
    ) external {
        require(deadline >= block.timestamp, 'UniV2: EXPIRED');
        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(
                    PERMIT_TYPEHASH,
                    owner,
                    spender,
                    value,
                    nonces[owner]++,
                    deadline
                ))
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress == owner, 'UniV2: INVALID_SIGNATURE');
        _approve(owner, spender, value);
    }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// UniswapV2Pair (the core LP pair contract)
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
contract UniswapV2Pair is UniswapV2ERC20, IUniswapV2Pair {
    using UniSafeMath for uint;

    // constants
    uint public constant MINIMUM_LIQUIDITY = 10**3;

    address public factory;
    address public token0;
    address public token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32  private blockTimestampLast;

    uint public price0CumulativeLast;
    uint public price1CumulativeLast;
    uint public kLast; // reserve0 * reserve1

    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, 'UniV2: LOCKED');
        unlocked = 0;
        _;
        unlocked = 1;
    }

    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    constructor() {
        factory = msg.sender;
    }

    function initialize(address _token0, address _token1) external {
        require(msg.sender == factory, 'UniV2: FORBIDDEN');
        token0 = _token0;
        token1 = _token1;
    }

    function getReserves()
        public
        view
        override
        returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)
    {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    // force balances to match reserves
    function sync() external override lock {
        _update(
            IERC20Uni(token0).balanceOf(address(this)),
            IERC20Uni(token1).balanceOf(address(this)),
            reserve0,
            reserve1
        );
    }

    // internal: update the reserves
    function _update(
        uint balance0,
        uint balance1,
        uint112 _reserve0,
        uint112 _reserve1
    ) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max,
                'UniV2: OVERFLOW');
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        // update price accumulators
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            price0CumulativeLast += uint((uint(_reserve1) << 112) / _reserve0) * timeElapsed;
            price1CumulativeLast += uint((uint(_reserve0) << 112) / _reserve1) * timeElapsed;
        }
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }

    // a small liquidity fee is minted to the `feeTo` address if set
    function _mintFee(uint112 _reserve0, uint112 _reserve1)
        private
        returns (bool feeOn)
    {
        address feeTo = IUniswapV2Factory(factory).feeTo();
        feeOn = (feeTo != address(0));
        uint _kLast = kLast;
        if (feeOn) {
            if (_kLast != 0) {
                uint rootK = _sqrt(uint(_reserve0) * uint(_reserve1));
                uint rootKLast = _sqrt(_kLast);
                if (rootK > rootKLast) {
                    uint numerator = totalSupply * (rootK - rootKLast);
                    uint denominator = (rootK * 5) + rootKLast;
                    if (denominator > 0) {
                        uint liquidity = numerator / denominator;
                        if (liquidity > 0) {
                            _mint(feeTo, liquidity);
                        }
                    }
                }
            }
        } else if (_kLast != 0) {
            kLast = 0;
        }
    }

    function _sqrt(uint y) private pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        }
        else if (y != 0) {
            z = 1;
        }
    }

    // mint LP tokens to the `to` address
    function mint(address to) external override lock returns (uint liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        uint balance0 = IERC20Uni(token0).balanceOf(address(this));
        uint balance1 = IERC20Uni(token1).balanceOf(address(this));
        uint amount0 = balance0 - _reserve0;
        uint amount1 = balance1 - _reserve1;

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply;
        if (_totalSupply == 0) {
            // first time liquidity
            liquidity = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY); // lock the first liquidity
        } else {
            uint liquidity0 = (amount0 * _totalSupply) / _reserve0;
            uint liquidity1 = (amount1 * _totalSupply) / _reserve1;
            liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
        }
        require(liquidity > 0, 'UniV2: INSUFFICIENT_LIQUIDITY_MINTED');
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0) * uint(reserve1);
        emit Mint(msg.sender, amount0, amount1);
    }

    // burn LP tokens
    function burn(address to)
        external
        override
        lock
        returns (uint amount0, uint amount1)
    {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        address _token0 = token0;
        address _token1 = token1;
        uint balance0 = IERC20Uni(_token0).balanceOf(address(this));
        uint balance1 = IERC20Uni(_token1).balanceOf(address(this));
        uint liquidity = balanceOf[address(this)];

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply;
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;
        require(amount0 > 0 && amount1 > 0, 'UniV2: INSUFFICIENT_LIQ_BURNED');
        _burn(address(this), liquidity);
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);
        balance0 = IERC20Uni(_token0).balanceOf(address(this));
        balance1 = IERC20Uni(_token1).balanceOf(address(this));

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0) * uint(reserve1);
        emit Burn(msg.sender, amount0, amount1, to);
    }

    // do a swap from token0->token1 or token1->token0
    function swap(
        uint amount0Out,
        uint amount1Out,
        address to,
        bytes calldata data
    ) external override lock {
        require(amount0Out > 0 || amount1Out > 0,
                'UniV2: INSUFFICIENT_OUTPUT_AMOUNT');
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1,
                'UniV2: INSUFFICIENT_LIQUIDITY');

        uint balance0;
        uint balance1;
        {
            address _token0 = token0;
            address _token1 = token1;
            require(to != _token0 && to != _token1,
                    'UniV2: INVALID_TO');
            if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out);
            if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out);
            if (data.length > 0) {
                // flash swap logic here if needed
            }
            balance0 = IERC20Uni(_token0).balanceOf(address(this));
            balance1 = IERC20Uni(_token1).balanceOf(address(this));
        }
        uint amount0In = (balance0 > (_reserve0 - amount0Out))
            ? balance0 - (_reserve0 - amount0Out)
            : 0;
        uint amount1In = (balance1 > (_reserve1 - amount1Out))
            ? balance1 - (_reserve1 - amount1Out)
            : 0;
        require(amount0In > 0 || amount1In > 0,
                'UniV2: INSUFFICIENT_INPUT_AMOUNT');

        // check the constant product
        {
            uint balance0Adj = (balance0 * 1000) - (amount0In * 3);
            uint balance1Adj = (balance1 * 1000) - (amount1In * 3);
            require(
                balance0Adj * balance1Adj >=
                    uint(_reserve0) * uint(_reserve1) * (1000**2),
                'UniV2: K'
            );
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(
            msg.sender, amount0In, amount1In, amount0Out, amount1Out, to
        );
    }

    // helper to safeTransfer from this pair
    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) =
            token.call(abi.encodeWithSelector(IERC20Uni.transfer.selector, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))),
                'UniV2: TRANSFER_FAILED');
    }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Standard Uniswap V2 Factory
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
contract UniswapV2Factory is IUniswapV2Factory {
    address public override feeTo;
    address public override feeToSetter;

    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view override returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB)
        external
        override
        returns (address pair)
    {
        require(tokenA != tokenB, 'UniFac: IDENTICAL_ADDRESSES');
        (address token0, address token1) = UniswapV2Library.sortTokens(tokenA, tokenB);
        require(token0 != address(0), 'UniFac: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'UniFac: PAIR_EXISTS');

        bytes memory bytecode = type(UniswapV2Pair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(
                0,
                add(bytecode, 32),
                mload(bytecode),
                salt
            )
        }
        UniswapV2Pair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external override {
        require(msg.sender == feeToSetter, 'UniFac: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external override {
        require(msg.sender == feeToSetter, 'UniFac: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Uniswap V2 Router02
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
interface IUniswapV2Router01 {
    function factory() external view returns (address);
    function WETH() external view returns (address);
}

interface IUniswapV2Router02 is IUniswapV2Router01 {
    // e.g. addLiquidity, removeLiquidity...
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

contract UniswapV2Router02 is IUniswapV2Router02 {
    using UniSafeMath for uint;

    address public immutable override factory;
    address public immutable override WETH;

    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, 'UniRouter: EXPIRED');
        _;
    }

    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH    = _WETH;
    }

    receive() external payable {
        // only accept ETH from WETH contract
        require(msg.sender == WETH, 'UniRouter: NOT_WETH');
    }

function addLiquidityETH(
    address token,
    uint amountTokenDesired,
    uint /*amountTokenMin*/,
    uint /*amountETHMin*/,
    address to,
    uint deadline
)
    external
    payable
    override
    ensure(deadline)
    returns (uint amountToken, uint amountETH, uint liquidity)
{
    // create pair if needed
    if(IUniswapV2Factory(factory).getPair(token, WETH) == address(0)) {
        IUniswapV2Factory(factory).createPair(token, WETH);
    }
    // Declare reserveA and reserveB as local variables
    (uint reserveA, uint reserveB) = UniswapV2Library.getReserves(factory, token, WETH);
    
    // For simplicity, deposit exactly amountTokenDesired + all msg.value
    amountToken = amountTokenDesired;
    amountETH   = msg.value;

    address pair = UniswapV2Library.pairFor(factory, token, WETH);

    // Transfer tokens in
    TransferHelper.safeTransferFrom(token, msg.sender, pair, amountToken);
    // Wrap the ETH -> WETH, then transfer to pair
    IWETH(WETH).deposit{value: amountETH}();
    IWETH(WETH).transfer(pair, amountETH);

    // Mint LP tokens to `to`
    liquidity = IUniswapV2Pair(pair).mint(to);
    // any leftover dust is ignored for brevity.
}
}


/*  
    --------------------------------------------------------------------------------------------
    PART 2: Minimal “Factory” & “Router” for the “bonding curve” phase
    --------------------------------------------------------------------------------------------
*/
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;
    uint256 private _status;
    constructor() {
        _status = _NOT_ENTERED;
    }
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

library SafeMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: add overflow");
        return c;
    }
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: sub overflow");
    }
    function sub(uint256 a, uint256 b, string memory err) internal pure returns (uint256) {
        require(b <= a, err);
        uint256 c = a - b;
        return c;
    }
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if(a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "SafeMath: mul overflow");
        return c;
    }
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: div by zero");
    }
    function div(uint256 a, uint256 b, string memory err) internal pure returns (uint256) {
        require(b > 0, err);
        uint256 c = a / b;
        return c;
    }
}

// Minimal token interface
interface IERC20Lite {
    function totalSupply() external view returns (uint256);
    function balanceOf(address acct) external view returns (uint256);
    function transfer(address recip, uint256 am) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 am) external returns (bool);
    function transferFrom(
        address sender,
        address recipient,
        uint256 am
    ) external returns (bool);
}

abstract contract ContextLite {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

contract OwnableLite is ContextLite {
    address private _owner;
    event OwnershipTransferred(address indexed prev, address indexed new_);

    constructor() {
        _owner = _msgSender();
        emit OwnershipTransferred(address(0), _owner);
    }
    function owner() public view returns (address) {
        return _owner;
    }
    modifier onlyOwner() {
        require(_msgSender() == _owner, "Not owner");
        _;
    }
}

// Our simple token
contract FERC20 is ContextLite, IERC20Lite, OwnableLite {
    using SafeMath for uint256;

    string  private _name;
    string  private _symbol;
    uint8   private constant _decimals = 18;
    uint256 private _tTotal;
    uint256 public maxTx; // up to 5% of total supply

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => bool) private isExcludedFromMaxTx;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MaxTxUpdated(uint newMax);

    constructor(
        string memory n,
        string memory s,
        uint256 supply_,
        uint mx
    ) {
        _name = n;
        _symbol = s;
        _tTotal = supply_ * 10**_decimals;
        require(mx <= 5, "maxTx>5");
        maxTx = mx;
        _balances[_msgSender()] = _tTotal;
        isExcludedFromMaxTx[_msgSender()] = true;
        isExcludedFromMaxTx[address(this)] = true;
        emit Transfer(address(0), _msgSender(), _tTotal);
    }

    function name() public view returns (string memory) { 
        return _name; 
    }
    function symbol() public view returns (string memory) {
        return _symbol; 
    }
    function decimals() public pure returns (uint8) {
        return _decimals; 
    }
    function totalSupply() public view override returns (uint256) { 
        return _tTotal; 
    }
    function balanceOf(address a) public view override returns (uint256) {
        return _balances[a];
    }
    function allowance(address o, address s)
        public
        view
        override
        returns (uint256)
    {
        return _allowances[o][s];
    }

    function transfer(address recip, uint256 am)
        public
        override
        returns (bool)
    {
        _transfer(_msgSender(), recip, am);
        return true;
    }

    function transferFrom(
        address s,
        address r,
        uint256 am
    ) public override returns (bool) {
        _transfer(s, r, am);
        _approve(
            s,
            _msgSender(),
            _allowances[s][_msgSender()].sub(
                am,
                "ERC20: > allowance"
            )
        );
        return true;
    }

    function approve(address sp, uint256 am)
        public
        override
        returns (bool)
    {
        _approve(_msgSender(), sp, am);
        return true;
    }

    function _approve(
        address o,
        address s,
        uint256 am
    ) private {
        require(o != address(0), "approve from zero");
        require(s != address(0), "approve to zero");
        _allowances[o][s] = am;
        emit Approval(o, s, am);
    }

    function _transfer(
        address f,
        address t,
        uint256 am
    ) private {
        require(f != address(0), "transfer from zero");
        require(t != address(0), "transfer to zero");
        require(am > 0, "transfer=0");
        if (!isExcludedFromMaxTx[f]) {
            uint256 maxTxAmount = (_tTotal * maxTx) / 100; // up to 5%
            require(am <= maxTxAmount, "exceed maxTx");
        }
        _balances[f] = _balances[f].sub(am, "balance?");
        _balances[t] = _balances[t].add(am);
        emit Transfer(f, t, am);
    }

    function updateMaxTx(uint256 newM) external onlyOwner {
        require(newM <= 5, "max>5");
        maxTx = newM;
        emit MaxTxUpdated(newM);
    }

    function excludeFromMaxTx(address usr) external onlyOwner {
        isExcludedFromMaxTx[usr] = true;
    }
}

// Minimal Pair (for the bonding curve)
contract Pair is ReentrancyGuard {
    using SafeMath for uint256;
    receive() external payable {}

    address public factory;
    address public tokenA;
    address public tokenB;
    address public lp;
    address public approvedRouter;

    struct Pool {
        uint256 reserveA;
        uint256 reserveB;
        uint256 k;
    }
    Pool public pool;

    event Mint(address indexed sender, uint rA, uint rB, address lp);
    event Burn(address indexed sender, uint rA, uint rB, address lp);
    event Swap(uint aIn, uint aOut, uint bIn, uint bOut);

    constructor(address fact, address tA, address tB, address router_) {
        factory = fact;
        tokenA  = tA;
        tokenB  = tB;
        approvedRouter = router_;
    }

    function mint(uint aAmt, uint bAmt, address _lp) external returns (bool) {
        pool.reserveA = aAmt;
        pool.reserveB = bAmt;
        pool.k = aAmt.mul(bAmt);
        lp = _lp;
        emit Mint(msg.sender, aAmt, bAmt, _lp);
        return true;
    }

    function burn(uint aAmt, uint bAmt, address _lp) external returns (bool) {
        require(_lp == lp, "not correct LP");
        pool.reserveA = pool.reserveA.sub(aAmt);
        pool.reserveB = pool.reserveB.sub(bAmt);
        pool.k = pool.reserveA.mul(pool.reserveB);
        emit Burn(msg.sender, aAmt, bAmt, _lp);
        return true;
    }

    function swap(uint aIn, uint aOut, uint bIn, uint bOut) external returns (bool) {
        uint newA = (pool.reserveA + aIn).sub(aOut);
        uint newB = (pool.reserveB + bIn).sub(bOut);
        pool.reserveA = newA;
        pool.reserveB = newB;
        pool.k = newA.mul(newB);
        emit Swap(aIn, aOut, bIn, bOut);
        return true;
    }

    function getReserves() external view returns (uint rA, uint rB) {
        return (pool.reserveA, pool.reserveB);
    }

    function kLast() external view returns (uint) {
        return pool.k;
    }

    function transferETH(address to, uint amt) external returns (bool) {
        (bool ok, ) = payable(to).call{value: amt}("");
        return ok;
    }

    // For demonstration, no “approvedRouter” check here
    function sendTokens(address tkn, address to, uint amt) external returns (bool) {
        return FERC20(tkn).transfer(to, amt);
    }
}

// Minimal Factory
contract Factory is ReentrancyGuard {
    address public owner;
    address public feeTo;
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairsArr;
    uint constant public SWAP_FEE = 5; // 5%
    event PairCreated(address tA, address tB, address pair, uint idx);

    constructor(address feeTo_) {
        owner = msg.sender;
        feeTo = feeTo_;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "not owner");
        _;
    }

    function createPair(address tA, address tB, address router) external returns (address p) {
        require(getPair[tA][tB] == address(0), "pair exists");
        Pair pair = new Pair(address(this), tA, tB, router);
        getPair[tA][tB] = address(pair);
        getPair[tB][tA] = address(pair);
        allPairsArr.push(address(pair));
        emit PairCreated(tA, tB, address(pair), allPairsArr.length);
        return address(pair);
    }

    function txFee() external pure returns (uint) {
        return SWAP_FEE;
    }

    function allPairs(uint i) external view returns (address) {
        return allPairsArr[i];
    }

    function allPairsLength() external view returns (uint) {
        return allPairsArr.length;
    }

    function setFeeTo(address f) external onlyOwner {
        feeTo = f;
    }
}

// Minimal Router
contract Router is ReentrancyGuard {
    using SafeMath for uint256;

    address public factory;
    address public WETH;
    uint public referralFee; // up to 5

    constructor(address fac, address w, uint refF) {
        require(fac != address(0), "Router: factory=0");
        require(w != address(0), "Router: WETH=0");
        require(refF <= 5, "Router: refFee>5");
        factory = fac;
        WETH = w;
        referralFee = refF;
    }

    function transferETH(address to, uint amt) private returns (bool) {
        (bool ok, ) = payable(to).call{value: amt}("");
        return ok;
    }

    function _getAmountsOut(
        address token,
        bool tokenToEth,
        uint256 inAmt
    ) private view returns (uint256 outAmt) {
        address p = Factory(factory).getPair(token, WETH);
        Pair pair = Pair(payable(p));
        (uint rA, uint rB) = pair.getReserves();
        uint k = rA.mul(rB);
        if(k == 0) return 0;

        // simple XY = K curve
        if (tokenToEth) {
            uint newRA = rA.add(inAmt);
            uint newRB = k.div(newRA, "div fail");
            outAmt = rB.sub(newRB, "sub fail");
        } else {
            uint newRB = rB.add(inAmt);
            uint newRA = k.div(newRB, "div fail");
            outAmt = rA.sub(newRA, "sub fail");
        }
        return outAmt;
    }

    // addLiquidityETH
    function addLiquidityETH(address token, uint256 tokenAmt)
        external
        payable
        nonReentrant
        returns (uint256, uint256)
    {
        address p = Factory(factory).getPair(token, WETH);
        Pair pair = Pair(payable(p));

        bool success = FERC20(token).transfer(p, tokenAmt);
        require(success, "Router: token transfer failed");
        require(transferETH(p, msg.value), "Router: transfer ETH failed");

        pair.mint(tokenAmt, msg.value, msg.sender);
        return (tokenAmt, msg.value);
    }

    // removeLiquidityETH
    function removeLiquidityETH(address token, uint pct, address to)
        external
        returns (uint, uint)
    {
        address p = Factory(factory).getPair(token, WETH);
        Pair pair = Pair(payable(p));
        (uint rA, uint rB) = pair.getReserves();
        uint amtA = rA.mul(pct).div(100);
        uint amtB = rB.mul(pct).div(100);

        pair.burn(amtA, amtB, msg.sender);
        pair.sendTokens(token, to, amtA);
        pair.transferETH(to, amtB);
        return (amtA, amtB);
    }

    // swapTokensForETH
    function swapTokensForETH(
        uint amtIn,
        address token,
        address to,
        address ref
    ) external returns (uint, uint) {
        address p = Factory(factory).getPair(token, WETH);
        Pair pair = Pair(payable(p));

        FERC20(token).transferFrom(to, p, amtIn);
        uint outAmt = _getAmountsOut(token, true, amtIn);

        // fees
        uint fFee = (Factory(factory).SWAP_FEE() * outAmt) / 100;
        uint rFee = 0;
        if (ref != address(0)) {
            rFee = (referralFee * outAmt) / 100;
        }
        uint finalOut = outAmt.sub(fFee).sub(rFee);

        address feeTo = Factory(factory).feeTo();
        pair.transferETH(feeTo, fFee);
        if (rFee > 0) pair.transferETH(ref, rFee);
        pair.transferETH(to, finalOut);

        pair.swap(amtIn, 0, 0, outAmt);
        return (amtIn, finalOut);
    }

    // swapETHForTokens
    function swapETHForTokens(
        address token,
        address to,
        address ref
    ) external payable returns (uint, uint) {
        address p = Factory(factory).getPair(token, WETH);
        Pair pair = Pair(payable(p));

        uint amtIn = msg.value;
        uint fFee = (Factory(factory).SWAP_FEE() * amtIn) / 100;
        uint rFee = 0;
        if (ref != address(0)) {
            rFee = (referralFee * amtIn) / 100;
        }
        uint finalIn = amtIn.sub(fFee).sub(rFee);

        require(transferETH(p, finalIn), "Router: deposit ETH failed");

        address feeTo = Factory(factory).feeTo();
        require(transferETH(feeTo, fFee), "Router: fee transfer failed");

        if (rFee > 0) {
            require(transferETH(ref, rFee), "Router: referral fee failed");
        }

        uint outAmt = _getAmountsOut(token, false, finalIn);

        pair.sendTokens(token, to, outAmt);
        pair.swap(0, outAmt, finalIn, 0);
        return (finalIn, outAmt);
    }
}

/*  
    --------------------------------------------------------------------------------------------
    PART 3: The “LimelightAscensionNoParams” main contract
    --------------------------------------------------------------------------------------------
*/
interface IUniswapV2Router02Full is IUniswapV2Router02 {
     function removeLiquidityETHSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountETH);
    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountETH);

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable;
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
}


// ============================================================
// Minimal WETH Contract Implementation
contract WETH is IWETH {
    string public name = "Wrapped Ether";
    string public symbol = "WETH";
    uint8  public decimals = 18;
    
    uint public totalSupply;
    mapping(address => uint) public balanceOf;
    
    event Deposit(address indexed dst, uint wad);
    event Withdrawal(address indexed src, uint wad);
    event Transfer(address indexed from, address indexed to, uint value);

    // Allow the contract to receive ETH directly.
    receive() external payable {
        deposit();
    }

    function deposit() public payable override {
        balanceOf[msg.sender] += msg.value;
        totalSupply += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    function withdraw(uint wad) public override {
        require(balanceOf[msg.sender] >= wad, "WETH: insufficient balance");
        balanceOf[msg.sender] -= wad;
        totalSupply -= wad;
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }
    
    function transfer(address to, uint value) public override returns (bool) {
        require(balanceOf[msg.sender] >= value, "WETH: insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
}
contract LimelightAscensionNoParams is ReentrancyGuard {
    using SafeMath for uint256;

    // ~~~~~~ Standard Uniswap V2 references ~~~~~~
    UniswapV2Factory public uniswapFactory;
    UniswapV2Router02 public uniswapRouter;

    // ~~~~~~ Your minimal “Factory” & “Router” ~~~~~~
    Factory public miniFactory;
    Router  public miniRouter;

    // For demonstration, we point to this example WETH address
    address public WETH_ADDRESS;

    address public owner;
    address public feeTo;

    uint256 public launchFee;         // 0.1 ETH initially
    uint256 public constant LP_FEE = 5;  // 5% for initial liquidity
    uint256 public MCAP_THRESHOLD = 100000 ether;

    FERC20  public lmltToken;
    address public lmltPair;
    uint256 public currentPrice;
    uint256 public currentMcap;
    uint256 public currentLiquidity;
    uint256 public volume24H;
    uint256 public lastUpdateTime;
    uint256 public prevPrice;

    bool    public tradingOpen      = true;
    bool    public graduated        = false;
    bool    public tradingOnUniswap = false;

    event Launched(address token, address pair);
    event Graduated(uint256 finalMcap);
    event TradingOpenedOnUniswap(uint256 removedTokens, uint256 removedETH);

    modifier onlyOwner_() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        // Set up ownership & fees
       // ====================================================
        // 1. Deploy a new WETH contract and set its address
        // ====================================================
        WETH_ADDRESS = address(new WETH());

        // ====================================================
        // 2. Set up ownership & fees
        // ====================================================
        owner = msg.sender;
        feeTo = msg.sender;
        launchFee = 0.1 ether;

        // ====================================================
        // 3. Deploy the standard Uniswap V2 clone
        // ====================================================
        uniswapFactory = new UniswapV2Factory(address(this));
        uniswapRouter  = new UniswapV2Router02(address(uniswapFactory), WETH_ADDRESS);

        // ====================================================
        // 4. Deploy your minimal bonding curve Factory & Router
        // ====================================================
        miniFactory = new Factory(feeTo);
        miniRouter  = new Router(address(miniFactory), WETH_ADDRESS, 0);
    }

    // ~~~~~~~~~~~~ Admin ~~~~~~~~~~~~
    function setGraduationThreshold(uint256 newThreshold) external onlyOwner_ {
        MCAP_THRESHOLD = newThreshold;
    }

    function setGraduationThresholdToTest() public onlyOwner_ {
        // drastically lower for local testing
        MCAP_THRESHOLD = 0.00001 ether;
    }

    function setLaunchFee(uint256 newFee) external onlyOwner_ {
        launchFee = newFee;
    }

    function _setLaunchFeeInternal(uint256 newFee) internal {
    launchFee = newFee;
}


    function setFeeTo(address f) external onlyOwner_ {
        require(f != address(0), "f=0");
        feeTo = f;
        miniFactory.setFeeTo(f);
    }

    function excludeAddressFromMaxTx(address usr) external onlyOwner_ {
        require(address(lmltToken) != address(0), "Token not launched");
        lmltToken.excludeFromMaxTx(usr);
    }

    // ~~~~~~~~~~~~ Launch & Swaps on the mini-router ~~~~~~~~~~~~
    function launchLMLT() external payable nonReentrant {
        require(address(lmltToken) == address(0), "launched");
        require(msg.value >= launchFee, "need >launchFee");

        uint256 ethLiq   = (LP_FEE * msg.value) / 100;
        uint256 leftover = msg.value - ethLiq;

        // Deploy your token
        lmltToken = new FERC20("Limelight", "LMLT", 1_000_000_000, 5);

        // Create the mini-bonding curve pair
        lmltPair = miniFactory.createPair(
            address(lmltToken),
            WETH_ADDRESS,
            address(miniRouter)
        );

        // Approve the mini-router
        lmltToken.approve(address(miniRouter), type(uint256).max);
        lmltToken.excludeFromMaxTx(address(miniRouter));
        lmltToken.excludeFromMaxTx(lmltPair);

        // Transfer all tokens to the mini-router
        bool tokenTransferOk = lmltToken.transfer(address(miniRouter), lmltToken.totalSupply());
        require(tokenTransferOk, "Token->router fail");

        // Add liquidity on the mini-router
        miniRouter.addLiquidityETH{value: ethLiq}(address(lmltToken), lmltToken.totalSupply());

        // leftover -> feeTo
        (bool ok, ) = payable(feeTo).call{value: leftover}("");
        require(ok, "leftover fail");

        tradingOpen = true;
        lastUpdateTime = block.timestamp;

        emit Launched(address(lmltToken), lmltPair);
    }

    function swapTokensForETH(uint amtIn) external returns (bool) {
        require(tradingOpen, "closed");
        (uint inT, uint outE) =
            miniRouter.swapTokensForETH(amtIn, address(lmltToken), msg.sender, address(0));
        _updateMetrics(inT, 0, 0, outE);
        _checkGraduation();
        return true;
    }

    function swapETHForTokens() public payable returns (bool) {
        require(tradingOpen, "closed");
        (uint inE, uint outT) =
            miniRouter.swapETHForTokens{value: msg.value}(
                address(lmltToken),
                msg.sender,
                address(0)
            );
        _updateMetrics(0, outT, inE, 0);
        _checkGraduation();
        return true;
    }

    

    // ~~~~~~~~~~~~ Internal “Metrics” ~~~~~~~~~~~~
    function _updateMetrics(uint tIn, uint tOut, uint eIn, uint eOut) internal {
        Pair p = Pair(payable(lmltPair));
        (uint rA, uint rB) = p.getReserves();  // token A, token B
        uint totSupply = lmltToken.totalSupply();

        // Suppose rA is tokens in pair, rB is ETH in pair
        if (rB > 0) {
            // simplistic "price" = ratio
            currentPrice = rA.div(rB, "div fail");
        } else {
            currentPrice = 0;
        }
        if (rA > 0) {
            // Market cap = ratio of totalSupply to reserve, times actual ETH in reserve
            currentMcap = (totSupply * rB).div(rA, "div fail");
        } else {
            currentMcap = 0;
        }
        // simplistic "liquidity" notion
        currentLiquidity = rB * 2;

        uint now_ = block.timestamp;
        // reset volume every 24h
        if ((now_ - lastUpdateTime) > 86400) {
            volume24H = eIn + eOut;
            prevPrice = currentPrice;
            lastUpdateTime = now_;
        } else {
            volume24H += (eIn + eOut);
        }
    }

    function _checkGraduation() internal {
        if (graduated) return;
        if (currentMcap >= MCAP_THRESHOLD) {
            _graduate();
        }
    }

    function _graduate() private {
        graduated = true;
        tradingOpen = false;
        emit Graduated(currentMcap);
        openTradingOnUniswap();
    }

    function maxPurchaseAmount() external view returns (uint maxETH) {
    // We'll do a binary search in [0..someLargeNumber] to find 
    // the largest eIn that does NOT revert in the mini-pair's math.

    // 1) get the pair & reserves from the mini-factory
   address p = miniFactory.getPair(address(lmltToken), WETH_ADDRESS);
Pair pair = Pair(payable(p));
(uint rA, uint rB) = pair.getReserves();

    if (rA == 0 || rB == 0) {
        // no liquidity => no purchases
        return 0;
    }

    // We'll pick an upper bound of e.g. 1e30
    uint left = 0;
    uint right = 1e30; 
    uint best = 0;

    while (left <= right) {
        uint mid = (left + right) / 2;

        // The router subtracts 5% from mid
        // finalIn = mid - 5% => mid * 95/100
        uint fFee = (Factory(miniFactory).SWAP_FEE() * mid) / 100; 
        uint finalIn = mid - fFee;

        if (_simulateFeasibility(rA, rB, finalIn)) {
            best = mid;
            left = mid + 1;
        } else {
            if (mid == 0) break;
            right = mid - 1;
        }
    }
    return best;
}

function _simulateFeasibility(uint rA, uint rB, uint eIn) internal pure returns (bool) {
    // replicate your XY=K formula to see if a swap of eIn ETH is feasible
    // 1) how many tokens out if we deposit eIn? => out = rA - (k/(rB+ eIn))
    // But you can also replicate the `_getAmountsOut` you used in the Router.

    // We'll do the same logic as the miniRouter's _getAmountsOut(...) for ETH->Token
    // ignoring referralFee for brevity.
    if (rA == 0 || rB == 0) return false;
    uint k = rA * rB;
    // newRB = rB + eIn
    // newRA = k / newRB
    // out = rA - newRA
    uint newRB = rB + eIn;
    if (newRB == 0) return false; 
    uint newRA = k / newRB;
    if (newRA >= rA) {
        // means out=0 or negative => no tokens
        return true; // or false, depending on your logic
    }
    uint out = rA - newRA;
    
    // check that out <= rA
    if (out > rA) return false;

    // Next, check if the final product is still >= original product. 
    // newA = rA - out, newB= rB + eIn
    // newA* newB =?
    // or if your pair checks a different formula in pair.swap(...).

    // For your minimal Pair, the final step is:
    uint newA = rA - out;
    uint newB = rB + eIn;
    // check newA*newB >= rA*rB
    if (newA * newB < rA * rB) {
       return false;
    }

    return true;
}


    // ~~~~~~~~~~~~ “Open on Uniswap” ~~~~~~~~~~~~
    function openTradingOnUniswap() private {
        // For test, remove 50% from the mini-router, then deposit into real Uniswap
        (uint256 removedTokens, uint256 removedETH) =
            miniRouter.removeLiquidityETH(address(lmltToken), 50, address(this));
        require(removedTokens > 0 && removedETH > 0, "Liquidity removal failed");

        // Exclude the new router from maxTx, and approve
        lmltToken.excludeFromMaxTx(address(uniswapRouter));
        lmltToken.approve(address(uniswapRouter), removedTokens);
    

        // Add to real Uniswap
        uniswapRouter.addLiquidityETH{value: removedETH}(
            address(lmltToken),
            removedTokens,
            0,
            0,
            address(this),
            block.timestamp
        );

        tradingOnUniswap = true;
        emit TradingOpenedOnUniswap(removedTokens, removedETH);
    }
    

    // ~~~~~~~~~~~~ Helper: Ascension Progress ~~~~~~~~~~~~
    function ascensionProgress() external view returns (uint256 pct) {
        if (graduated) return 100;
        uint c = currentMcap;
        if (c >= MCAP_THRESHOLD) return 100;
        uint dif = MCAP_THRESHOLD.sub(c);
        uint portion = MCAP_THRESHOLD.sub(dif);
        pct = portion.mul(100).div(MCAP_THRESHOLD, "div fail");
    }

    // ~~~~~~~~~~~~ For Quick Local Testing ~~~~~~~~~~~~
    function testGraduation() external payable onlyOwner_ {
        // Drastically lower thresholds, lower launch fee, etc.
        setGraduationThresholdToTest();
    launchFee      = 0.0001 ether; // directly set it

        if (address(lmltToken) == address(0)) {
            // fresh launch
            require(msg.value >= 0.001 ether, "not enough ETH for test");
            uint256 half = msg.value / 2;
            this.launchLMLT{value: half}();
            this.swapETHForTokens{value: (msg.value - half)}();
        } else {
            // already launched, just do a swap
            this.swapETHForTokens{value: msg.value}();
        }
        // automatically triggers _checkGraduation()
    }
}
