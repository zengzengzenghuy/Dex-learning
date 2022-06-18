require("@nomiclabs/hardhat-waffle");
const { getContractFactory } = require("@nomiclabs/hardhat-ethers/types");
const {expect} = require("chai");
const { ethers } = require("hardhat");


const toWei = (value_in_eth)=> ethers.utils.parseEther(value_in_eth.toString());

describe("Factory",()=>{
    let owner;
    let factory;
    let token;

    beforeEach(async()=>{
        [owner]=await ethers.getSigners();

        const Token = await ethers.getContractFactory("Token");
        token= await Token.deploy("Test Token","TXT",toWei(10000));
        await token.deployed()

        const Factory = await ethers.getContractFactory("Factory");
        factory = await Factory.deploy();
        await factory.deployed();
    });
    it("is deployed",async()=>{
        expect(await factory.deployed()).to.equal(factory);
    });

    describe("create Exchange",()=>{
        it("deploy an exchange",async()=>{
            // use factory contract to create exchange pair 
            // and create exchagne instance that attach exchange address
            // thus msg.sender is factory contract
            const exchangeAddress = await factory.callStatic.createExchangePair(token.address);
            factory.createExchangePair(token.address);
            console.log(exchangeAddress);
            const Exchange = await ethers.getContractFactory("Exchange");
            const exchange = await Exchange.attach(exchangeAddress);
            expect(await exchange.name()).to.equal("Uniswap-V1-token");
            expect(await exchange.symbol()).to.equal("UNI-V1");
            expect(await exchange.factoryAddress()).to.equal(factory.address);
        });
        it("zero address not allowed",async()=>{
            await expect(factory.createExchangePair("0x0000000000000000000000000000000000000000")).to.be.revertedWith("Invalid token address");
        });
        it("fails when exchange exists",async()=>{
            await factory.createExchangePair(token.address);
            await expect(factory.createExchangePair(token.address)).to.be.revertedWith("Exchange pair already exist");
        });
    });
    
    describe("get Exchange address",()=>{
        it("return exchange address by token address",async()=>{
            // why need the following two step to call the function and return successfully??
            const exchangeAddress = await factory.callStatic.createExchangePair(token.address);
            await factory.createExchangePair(token.address);
            console.log(exchangeAddress)
            //console.log(exchangeAddress2)
            expect(await factory.getExchangePair(token.address)).to.equal(exchangeAddress);
        });
    });
})

// static call explained: https://betterprogramming.pub/sending-static-calls-to-a-smart-contract-with-ethers-js-e2b4ceccc9ab
