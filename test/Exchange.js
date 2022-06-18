
require('@nomiclabs/hardhat-waffle');
const { expect } = require("chai");
const { BigNumber, utils ,provider} = require("ethers");
const {ethers} = require("hardhat");
const { experimentalAddHardhatNetworkMessageTraceHook } = require('hardhat/config');
const { getGasFeeFromTx } = require('../utils');
const toWei=(value)=>utils.parseEther(value.toString());
const fromWei=(value)=>utils.formatEther(typeof value==='string'?value:value.toString());
//const getBalance = provider.getBalance;
describe("Exchange",()=>{
    let owner;
    let alice;
    let bob;
    let token;
    let factory;
    let exchange;

    beforeEach(async()=>{
        [owner,alice,bob]=await ethers.getSigners();

        const Token = await ethers.getContractFactory("Token");
        token = await Token.deploy("Bitcoin","BTC",toWei(40000));
        await token.deployed();


        const Exchange = await ethers.getContractFactory("Exchange");
        exchange = await Exchange.deploy(token.address);
        await exchange.deployed();

    });
    it("is deployed",async()=>{
        expect(await exchange.deployed()).to.equal(exchange);
        expect(await exchange.name()).to.equal("Uniswap-V1-token");
        expect(await exchange.symbol()).to.equal("UNI-V1");
        expect(await exchange.totalSupply()).to.equal(toWei(0));
        expect(await exchange.factoryAddress()).to.equal(owner.address);
        expect(await exchange.tokenAddress()).to.equal(token.address);
    });
    
    describe("add liquidity",()=>{
        describe("Empty reserve",()=>{
            it("Add liquidity",async()=>{
                // const liquidity = await exchange.connect(alice).addLiquidity(100);
                // expect(liquidity).to.equal(100);
                // expect(address(exchange).balance()).to.equal(100);
                
                await token.approve(exchange.address,toWei(200));
                // add 200 BTC and 100 ETH into exchange
                await exchange.addLiquidity(toWei(200),{value:toWei(100)});
                //const balance= await provider.getBalance(exchange.address);
                //expect(await getBalance(exchange.address)).to.equal(toWei(100));
                expect(await exchange.getReserve()).to.equal(toWei(200));
            });
            it("mint LP tokens",async()=>{
                await token.approve(exchange.address,toWei(200));
                // owner send 200 ERC token and 100 ETH to exchange
                await exchange.addLiquidity(toWei(200),{value:toWei(100)});
                
                expect(await exchange.balanceOf(owner.address)).to.equal(toWei(100));
                expect(await exchange.totalSupply()).to.equal(toWei(100));
            });
            it("allows zero amounts",async()=>{
                await token.approve(exchange.address,0);
                await exchange.addLiquidity(0,{value:0});

                expect(await exchange.getReserve()).to.equal(0);
            });
        });
        describe("add to existing reserves",()=>{
            beforeEach(async()=>{
                await token.approve(exchange.address,toWei(300));
                await exchange.addLiquidity(toWei(200),{value:toWei(100)});
            });
            it("preserves exchange rate",async()=>{
                await exchange.addLiquidity(toWei(200),{value:toWei(50)});

                expect(await exchange.getReserve()).to.equal(toWei(300));

            });
            it("mint LP tokens",async()=>{
                await exchange.addLiquidity(toWei(200),{value:toWei(50)});
                //  total minted LP tokens for owner
                expect(await exchange.balanceOf(owner.address)).to.equal(toWei(150));
                // total minted LP tokens by ERC20 (exchange contract)
                expect(await exchange.totalSupply()).to.equal(toWei(150));
            });
            it("fails when not enough tokens",async()=>{
                await expect(exchange.addLiquidity(toWei(50),{value:toWei(50)})).to.be.revertedWith("insufficient token amount");
            });
            
        });
    });
    describe("remove liquidity",()=>{
        beforeEach(async()=>{
            await token.approve(exchange.address, toWei(300));
            await exchange.addLiquidity(toWei(200),{value:toWei(100)});
        });
        it("removes some liquidity",async()=>{
            const amount = toWei(25);
            // getBalance is undefined error not solve
            //const userEtherBalanceBefore = await provider.getBalance(owner.address);
            const userTokenBalanceBefore = await token.balanceOf(owner.address);

            const tx = await exchange.removeLiquidity(amount);
            const gasFee = await getGasFeeFromTx(tx);
            // token balance left 150
            expect(await exchange.getReserve()).to.equal(toWei(150));
            // ETH balance left 75
            //expect(await getBalance(exchange.address)).to.equal(toWei(75));

            //const userEtherBalanceAfter = await provider.getBalance(owner.address);
            const userTokenBalanceAfter = await token.balanceOf(owner.address);

            //expect(userEtherBalanceAfter.sub(userEtherBalanceAfter)).to.equal(amount.sub(gasFee));

            expect(userTokenBalanceAfter.sub(userTokenBalanceBefore)).to.equal(toWei(50));

        });
        it("removes all liquidity",async()=>{
            //const userEtherBalanceBefore = await getBalance(owner.address);
            const userTokenBalanceBefore= await token.balanceOf(owner.address);

            const tx = await exchange.removeLiquidity(toWei(100));
            const gasFee = await getGasFeeFromTx(tx);

            expect(await exchange.getReserve()).to.equal(toWei(0));
            //expect(await getBalance(exchange.address)).to.equal(toWei(0));

            //const userEtherBalanceAfter = await getBalance(owner.address);
            const userTokenBalanceAfter = await token.balanceOf(owner.address);

            //expect(await userEtherBalanceAfter.sub(userEtherBalanceBefore)).to.equal(toWei(100).sub(gasFee));
            expect(await userTokenBalanceAfter.sub(userTokenBalanceBefore)).to.equal(toWei(200));
        });
        // it("pays for provided liquidity",async()=>{
        //     // check the balance of owner after user use the pool to swap
        //     const amount = toWei(41);
        //     const userEtherBalanceBefore = await getBalance(owner.address);
        //     const userTokenBalanceBefore = await token.balanceOf(owner.address);
        //     // alice want to swap 13 ETH, expect to get at least 17 tokens
        //     await exchange.connect(alice).ethToTokenSwap(toWei(17),{value:toWei(13)});

        //     const tx = await exchange.removeLiquidity(amount);
        //     const gasFee = await getGasFeeFromTx(tx);

        //     const userEtherBalanceAfter = await getBalance(owner.address);
        //     const userTokenBalanceAfter = await token.balanceOf(owner.address);

        //     expect(userEtherBalanceAfter.sub(userEtherBalanceBefore)).to.equal(toWei(110).sub(gasFee));
        //     expect(fromWei(userTokenBalanceAfter.sub(userTokenBalanceBefore))).to.equal('')


        // });
        it("burns LP tokens",async()=>{
            await expect(()=>exchange.removeLiquidity(toWei(25))).to.changeTokenBalance(exchange,owner,toWei(-25));
            expect(await exchange.totalSupply()).to.equal(toWei(75));
        });
        it("doesn't allow invalid amount",async()=>{
            await expect(exchange.removeLiquidity(toWei(100.1))).to.be.revertedWith("burn amount exceeds balance")
        })
    })
})