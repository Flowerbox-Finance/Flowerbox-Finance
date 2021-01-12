
//fork mainnet and prepare accounts ahead of time with enough yCRV by running prepare.js ../scripts

const { time } = require('@openzeppelin/test-helpers');
const IERC20 = artifacts.require("IERC20")
const PetalsToken = artifacts.require("PetalsToken");
const Gardener = artifacts.require("Gardener");
const FlowerboxFactory = artifacts.require("FlowerboxFactory");
const Flowerbox = artifacts.require("Flowerbox");

contract("Flowerbox Tests", async accounts => {
  it("Creator deposits", async () => {

    let petalsToken = await PetalsToken.deployed();
    let gardener = await Gardener.deployed();
    let flowerboxFactory = await FlowerboxFactory.deployed();

    //set gardener as the minter of PETALS
    let tx1 = await petalsToken.setGardener(gardener.address);

    //whitelist factory with the gardener
    let tx2 = await gardener.whitelistFactory(flowerboxFactory.address, true);

    //create a new yCRV vault
    let tx3 = await flowerboxFactory.newFlowerbox(
        '500000000000000000000', //creatorDeposit
        '2000000000000000000000', //investorDeposit
        100, //blocks locked
        '0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8', //token
        '0x0FE4283e0216F94f5f9750a7a11AC54D3c9C38F3', //fToken
        '0x6D1b6Ea108AA03c6993d8010690264BA96D349A8', //rewards pool
      );

    let address1 = await flowerboxFactory.lastFlowerboxCreated();

    let flowerbox = await Flowerbox.at(address1);

    //Approve account to send yCRV to flowerbox
    let YCRV = await IERC20.at("0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8");
    let bal_0 = await YCRV.balanceOf(accounts[0]);
    let tx4  = await YCRV.approve(flowerbox.address, bal_0, {from: accounts[0]});

    console.log("Creator yCRV balance before deposit: ", bal_0.toString());

    //Creator deposits in flowerbox
    let tx5 = await flowerbox.deposit_creator(false, {from: accounts[0]});

    bal_0 = await YCRV.balanceOf(accounts[0]);
    console.log("Creator yCRV balance after deposit: ", bal_0.toString());


    let state = await flowerbox.state();


    assert(state.words[0] == 2); //state 2 is "waiting for match"

  });


it("Creator withdraws after not finding a match.", async () => {

    let petalsToken = await PetalsToken.deployed();
    let gardener = await Gardener.deployed();
    let flowerboxFactory = await FlowerboxFactory.deployed();

    //set gardener as the minter of PETALS
    let tx1 = await petalsToken.setGardener(gardener.address);

    //whitelist factory with the gardener
    let tx2 = await gardener.whitelistFactory(flowerboxFactory.address, true);

    //create a new yCRV vault
    let tx3 = await flowerboxFactory.newFlowerbox(
        '500000000000000000000', //creatorDeposit
        '2000000000000000000000', //investorDeposit
        100, //blocks locked
        '0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8', //token
        '0x0FE4283e0216F94f5f9750a7a11AC54D3c9C38F3', //fToken
        '0x6D1b6Ea108AA03c6993d8010690264BA96D349A8', //rewards pool
      );

    let address1 = await flowerboxFactory.lastFlowerboxCreated();

    let flowerbox = await Flowerbox.at(address1);

    //Approve account to send yCRV to flowerbox
    let YCRV = await IERC20.at("0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8");
    let bal_0 = await YCRV.balanceOf(accounts[0]);
    let tx4  = await YCRV.approve(flowerbox.address, bal_0, {from: accounts[0]});

    console.log("Creator yCRV balance before deposit: ", bal_0.toString());

    //Creator deposits in flowerbox
    let tx5 = await flowerbox.deposit_creator(false, {from: accounts[0]});

    bal_0 = await YCRV.balanceOf(accounts[0]);
    console.log("Creator yCRV balance after deposit: ", bal_0.toString());

    let tx6 = await flowerbox.withdrawNoMatch({from: accounts[0]});

    bal_0 = await YCRV.balanceOf(accounts[0]);
    console.log("Creator yCRV balance after cancel and withdrawal: ", bal_0.toString());

    let state = await flowerbox.state();

    assert(state.words[0] == 3);
  });






});
