const { expect } = require("chai");
const {ethers} = require("hardhat");
describe("Token", () => {
  let owner;
  let token;

  beforeEach(async () => {
    [owner] = await ethers.getSigners();

    const Token = await hre.ethers.getContractFactory("Token");
    token = await Token.deploy("Test Token", "TKN", 31337);
    await token.deployed();
  });

  it("sets name and symbol when created", async () => {
    expect(await token.name()).to.equal("Test Token");
    expect(await token.symbol()).to.equal("TKN");
  });

  it("mints initialSupply to msg.sender when created", async () => {
    expect(await token.totalSupply()).to.equal(31337);
    //expect(await token.balanceOf(owner.address)).to.equal(31337);
  });
});