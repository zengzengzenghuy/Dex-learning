//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Exchange.sol";

contract Factory{
    //each token/ETH pair correspond to an exchange pair(address)
    mapping(address=>address)tokenToExchange;

    function createExchangePair(address _tokenAddress)public returns(address){

        //token Address should not be 0
        require(_tokenAddress!=address(0),"Invalid token address");
        //check if exchange pair already exist
        require(tokenToExchange[_tokenAddress]==address(0),"Exchange pair already exist");

        Exchange exchangePair= new Exchange(_tokenAddress);
        tokenToExchange[_tokenAddress]=address(exchangePair);
        return address(exchangePair);

    }
    function getExchangePair(address _tokenAddress)public view returns(address){
        return tokenToExchange[_tokenAddress];
    }
}