pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IExchange{
    function ethToTokenSwap(uint256 _minToken)external payable;
    function ethToTokenTransfer(uint256 _minTokens,address _recipient)external payable;
}
interface IFactory{
    function getExchange(address _tokenAddress) external returns (address);
}
contract Exchange is ERC20 {
    address public tokenAddress;
    address public factoryAddress;

    // ERC20 token as LP token
    constructor(address _token) ERC20("Uniswap-V1-token", "UNI-V1") {
        require(_token != address(0), "invalid token address");

        tokenAddress = _token;
        factoryAddress = msg.sender;
    }

    function addLiquidity(uint256 _tokenAmount)
        public
        payable
        returns (uint256)
    {
        if (getReserve() == 0) {
            // add Reserve 
            IERC20 token = IERC20(tokenAddress);
            token.transferFrom(msg.sender, address(this), _tokenAmount);
            // added address(this).balance ETH
            uint256 liquidity = address(this).balance;
            // ERC20.totalSupply() += liquidity
            _mint(msg.sender, liquidity); //  ERC20._mint() 
            
            return liquidity;
        } else {

            uint256 ethReserve = address(this).balance - msg.value;
            uint256 tokenReserve = getReserve();
            uint256 tokenAmount = (msg.value * tokenReserve) / ethReserve;

            require(_tokenAmount >= tokenAmount, "insufficient token amount");

            IERC20 token = IERC20(tokenAddress);
            token.transferFrom(msg.sender, address(this), tokenAmount);

            uint256 liquidity = (msg.value * totalSupply()) / ethReserve;
            _mint(msg.sender, liquidity); //  ERC20._mint() 
            return liquidity;
        }
    }

    function removeLiquidity(uint256 _amount)public returns(uint256, uint256){
        require(_amount>0,"invalid burn amount");
        // ethAmount/address(this).balance = _amount/totalSupply  (actually totalSupply = address(this).balance, but just totalSupply is for LP tokens, address(this).balance is for ETH)
        // IERC20.totalSupply()    ----- the LP token total Supply
        uint256 ethAmount= (address(this).balance*_amount)/totalSupply();
        uint256 tokenAmount = (getReserve()*_amount)/totalSupply();
        //ERC20._burn LP token
        _burn(msg.sender,_amount);
        payable(msg.sender).transfer(ethAmount);
        IERC20(tokenAddress).transfer(msg.sender,tokenAmount);

        return(ethAmount,tokenAmount);
    }

    function getReserve()public view returns(uint256){
        return IERC20(tokenAddress).balanceOf(address(this));
    }
    //dy= (y*dx)/(x+dx)
    function getAmount(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve)private pure returns(uint256){
        require(inputReserve>0 && outputReserve>0,"invalid reserve");

        //user need to pay 1% fee
        //numerator and denominator multiply 100 at the same time
        uint256 inputAmountWithFee = inputAmount *99;
        uint256 numerator= inputAmountWithFee*outputReserve;
        uint256 denominator= (inputReserve*100)+inputAmountWithFee;
        return numerator/denominator;
    }
    //swap ETH for token
    function getTokenAmount(uint256 _ethSold)public view returns(uint256){
        require(_ethSold>0,"invalid eth amount");
        uint256 tokenReserve= getReserve();
        return getAmount(_ethSold,address(this).balance,tokenReserve);
    }
    function getEthAmount(uint256 _tokenSold)public view returns(uint256){
        require(_tokenSold>0,"invalid token amount");
        uint256 tokenReserve= getReserve();
        return getAmount(_tokenSold,tokenReserve,address(this).balance); 
    }
    // use ETH to swap other token
    // ETH: msg.value, Token = _minTokens
    function ethToToken(uint256 _minTokens,address recipient) private{
        uint256 tokenReserve = getReserve();
        uint256 tokensBought= getAmount(msg.value,address(this).balance-msg.value,tokenReserve);
        require(tokensBought>=_minTokens,"insufficient output token for swap");
        IERC20(tokenAddress).transfer(recipient,tokensBought);

    }
    function ethToTokenSwap(uint256 _minTokens)public payable{
        ethToToken(_minTokens,msg.sender);
    }
    function ethToTokenTransfer(uint256 _minTokens,address _recipient)public payable{
        ethToToken(_minTokens,_recipient);
    }

    function tokenToEthSwap(uint256 _tokenSold, uint256 _minEth)public{
        uint256 tokenReserve=getReserve();
        uint256 ethBought = getAmount(_tokenSold,tokenReserve,address(this).balance);
        require(ethBought>=_minEth,"Insufficient eth amount to swap");
        IERC20(tokenAddress).transferFrom(msg.sender,address(this),_tokenSold);
        payable(msg.sender).transfer(ethBought);
    }
    // this contract's address token swap to other Address token
    // @param: _tokenAddress: the token you want to swap to
    // @dev: swap from this exchange: tokenA -> eth, to the target exchange: eth -> tokenB
    function tokenToTokenSwap(uint256 _tokenSold,uint256 _minTokenBought, address _tokenAddress)public{
        address exchangeAddress = IFactory(factoryAddress).getExchange(_tokenAddress);
        // cannot swap with yourself
        require(exchangeAddress != address(this)&&exchangeAddress != address(0),"invalid exchange address");
        //token reserve in this exchange
        uint256 tokenReserve = getReserve();
        //eth that you can buy
        uint256 ethBought= getAmount(_tokenSold, tokenReserve, address(this).balance);
        IERC20(tokenAddress).transferFrom(msg.sender,address(this),_tokenSold);
        // first swap for eth in this exchange, then use eth to swap token in the other exchange
        IExchange(exchangeAddress).ethToTokenTransfer{value:ethBought}(
            _minTokenBought, msg.sender
        );
    }

}
