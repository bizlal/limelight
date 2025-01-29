// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*******************************
 * Factory Contract
 *******************************/
contract Factory is ReentrancyGuard {
    address private owner_;
    address private _feeTo;
    mapping(address=>mapping(address=>address)) private pair;
    address[] private pairs;
    uint private constant fee=5;

    constructor(address fee_to) {
        owner_=msg.sender;
        require(fee_to!=address(0),"Zero addresses are not allowed.");
        _feeTo=fee_to;
    }

    modifier onlyOwner() {
        require(msg.sender==owner_,"Only owner can call.");
        _;
    }

    event PairCreated(address indexed tokenA,address indexed tokenB,address pair_,uint);

    function _createPair(address tokenA,address tokenB) private returns (address) {
        require(tokenA!=address(0),"Zero address not allowed");
        require(tokenB!=address(0),"Zero address not allowed");
        Pair _pair=new Pair(address(this),tokenA,tokenB);
        pair[tokenA][tokenB]=address(_pair);
        pair[tokenB][tokenA]=address(_pair);
        pairs.push(address(_pair));
        uint n=pairs.length;
        emit PairCreated(tokenA,tokenB,address(_pair),n);
        return address(_pair);
    }

    function createPair(address tokenA,address tokenB) external nonReentrant returns (address) {
        address _pair=_createPair(tokenA,tokenB);
        return _pair;
    }

    function getPair(address tokenA,address tokenB) public view returns (address) {
        return pair[tokenA][tokenB];
    }

    function allPairs(uint n) public view returns (address) {
        return pairs[n];
    }

    function allPairsLength() public view returns (uint) {
        return pairs.length;
    }

    function feeTo() public view returns (address) {
        return _feeTo;
    }

    function feeToSetter() public view returns (address) {
        return owner_;
    }

    function setFeeTo(address fee_to) public onlyOwner {
        require(fee_to!=address(0),"Zero address");
        _feeTo=fee_to;
    }

    function txFee() public pure returns (uint) {
        return fee;
    }
}

/*******************************
 * Pair Contract
 *******************************/
contract Pair is ReentrancyGuard {
    address private _factory;
    address private _tokenA;
    address private _tokenB;
    address private lp;

    struct Pool {
        uint256 reserve0;
        uint256 reserve1;
        uint256 _reserve1;
        uint256 k;
        uint256 lastUpdated;
    }

    Pool private pool;

    event Mint(uint256 reserve0,uint256 reserve1,address lp);
    event Burn(uint256 reserve0,uint256 reserve1,address lp);
    event Swap(uint256 amount0In,uint256 amount0Out,uint256 amount1In,uint256 amount1Out);

    constructor(address factory_, address token0, address token1) {
        require(factory_!=address(0),"Zero address not allowed.");
        require(token0!=address(0),"Zero address not allowed.");
        require(token1!=address(0),"Zero address not allowed.");
        _factory=factory_;
        _tokenA=token0;
        _tokenB=token1;
    }

    function mint(uint256 reserve0,uint256 reserve1,address _lp) public returns (bool) {
        lp=_lp;
        pool=Pool({
            reserve0:reserve0,
            reserve1:reserve1,
            _reserve1:MINIMUM_LIQUIDITY(),
            k:reserve0*MINIMUM_LIQUIDITY(),
            lastUpdated:block.timestamp
        });
        emit Mint(reserve0,reserve1,_lp);
        return true;
    }

    function swap(uint256 amount0In,uint256 amount0Out,uint256 amount1In,uint256 amount1Out) public returns (bool) {
        uint256 _reserve0=(pool.reserve0+amount0In)-amount0Out;
        uint256 _reserve1=(pool.reserve1+amount1In)-amount1Out;
        uint256 reserve1_=(pool._reserve1+amount1In)-amount1Out;
        pool=Pool({
            reserve0:_reserve0,
            reserve1:_reserve1,
            _reserve1:reserve1_,
            k:pool.k,
            lastUpdated:block.timestamp
        });
        emit Swap(amount0In,amount0Out,amount1In,amount1Out);
        return true;
    }

    function burn(uint256 reserve0,uint256 reserve1,address _lp) public returns (bool) {
        require(_lp!=address(0),"Zero address not allowed.");
        require(lp==_lp,"Only Lp holders can call.");
        uint256 _reserve0=pool.reserve0 - reserve0;
        uint256 _reserve1=pool.reserve1 - reserve1;
        uint256 reserve1_=pool._reserve1 - reserve1;
        pool=Pool({
            reserve0:_reserve0,
            reserve1:_reserve1,
            _reserve1:reserve1_,
            k:pool.k,
            lastUpdated:block.timestamp
        });
        emit Burn(reserve0,reserve1,_lp);
        return true;
    }

    function _approval(address _user,address _token,uint256 amount) private returns (bool) {
        require(_user!=address(0),"Zero address");
        require(_token!=address(0),"Zero address");
        ERC20 token_=ERC20(_token);
        token_.approve(_user,amount);
        return true;
    }

    function approval(address _user,address _token,uint256 amount) external nonReentrant returns (bool) {
        bool approved=_approval(_user,_token,amount);
        return approved;
    }

    function liquidityProvider() public view returns (address) {
        return lp;
    }

    function MINIMUM_LIQUIDITY() public pure returns (uint256) {
        return 1 ether;
    }

    function factory() public view returns (address) {
        return _factory;
    }

    function tokenA() public view returns (address) {
        return _tokenA;
    }

    function tokenB() public view returns (address) {
        return _tokenB;
    }

    function getReserves() public view returns (uint256,uint256,uint256) {
        return (pool.reserve0,pool.reserve1,pool._reserve1);
    }

    function kLast() public view returns (uint256) {
        return pool.k;
    }

    function priceALast() public view returns (uint256) {
        return pool.reserve1/pool.reserve0;
    }

    function priceBLast() public view returns (uint256) {
        return pool.reserve0/pool.reserve1;
    }
}

/*******************************
 * Router Contract
 *******************************/
contract Router is ReentrancyGuard {
    using SafeMath for uint256;
    address private _factory;
    address private _assetToken; // Replacing WETH with a generic asset token
    uint public referralFee;

    constructor(address factory_, address assetToken_, uint refFee) {
        require(factory_!=address(0),"Zero address not allowed.");
        require(assetToken_!=address(0),"Zero address not allowed.");
        _factory=factory_;
        _assetToken=assetToken_;
        require(refFee<=5,"Referral Fee cannot exceed 5%.");
        referralFee=refFee;
    }

    function factory() public view returns (address) {
        return _factory;
    }

    function assetToken() public view returns (address) {
        return _assetToken;
    }

    // Simple token-to-token getAmountsOut simulation
    function _getAmountsOut(address tokenIn,address tokenOut,uint256 amountIn) private view returns (uint256) {
        require(tokenIn!=address(0)&&tokenOut!=address(0),"Zero address not allowed");
        Factory factory_=Factory(_factory);
        address pair=factory_.getPair(tokenIn, tokenOut);
        require(pair!=address(0),"No pair exists");
        Pair _pair=Pair(payable(pair));
        (uint256 reserveA,,uint256 _reserveB)=_pair.getReserves();
        uint256 k=_pair.kLast();
        uint256 amountOut;
        // Simplified formula assuming tokenIn is always tokenA for demonstration
        uint256 newReserveA=reserveA.add(amountIn);
        uint256 newReserveB=k.div(newReserveA,"Division failed");
        amountOut=_reserveB.sub(newReserveB,"Subtraction failed.");
        return amountOut;
    }

    function getAmountsOut(address tokenIn, address tokenOut, uint256 amountIn) external nonReentrant returns (uint256) {
        uint256 amountOut=_getAmountsOut(tokenIn,tokenOut,amountIn);
        return amountOut;
    }

    // Example token-to-token swap
    function swapTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        address referree
    ) external nonReentrant returns (uint256 amountOut) {
        require(tokenIn!=address(0)&&tokenOut!=address(0)&&to!=address(0)&&referree!=address(0),"Invalid address");
        uint256 calculatedOut=_getAmountsOut(tokenIn,tokenOut,amountIn);
        require(calculatedOut>=amountOutMin,"Insufficient output");

        Factory factory_=Factory(_factory);
        address pair=factory_.getPair(tokenIn,tokenOut);
        ERC20(tokenIn).transferFrom(msg.sender,pair,amountIn);

        uint fee=factory_.txFee();
        uint256 txFee=(fee*calculatedOut)/100;
        uint256 refFeeAmt=(referralFee*calculatedOut)/100;
        amountOut=calculatedOut-(txFee+refFeeAmt);

        address feeTo=factory_.feeTo();
        Pair(pair).swap(amountIn,0,0,amountOut);

        // Transfer fees and referral:
        if(refFeeAmt>0) {
            // In a real scenario, you'd have tokenOut in pair
            // For simplicity, assume pair is holding tokenOut after swap:
            // Actually for a real scenario, we'd do actual token transfers from pair
            // We'll just assume some internal accounting or require modifications
            // For demonstration: we need tokenOut from pair to 'to' and 'referree'
            // NOTE: This code snippet is conceptual. Real implementation must handle final token distribution.
            // A full token-to-token swap logic must be implemented which updates reserves, etc.
            ERC20(tokenOut).transferFrom(pair, referree, refFeeAmt);
        }
        ERC20(tokenOut).transferFrom(pair, feeTo, txFee);
        ERC20(tokenOut).transferFrom(pair, to, amountOut);

        return amountOut;
    }
}