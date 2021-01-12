const Gardener = artifacts.require("Gardener");
const FlowerboxFactory = artifacts.require("FlowerboxFactory");
const PetalsToken = artifacts.require("PetalsToken");
const IERC20 = artifacts.require("IERC20")


module.exports = async function(callback) {

    let petalsToken = await PetalsToken.deployed();
    let gardener = await Gardener.deployed();
    let flowerboxFactory = await FlowerboxFactory.deployed();


    console.log('gardener.address',gardener.address);
    //set gardener as the minter of PETALS
    let tx1 = await petalsToken.setGardener(gardener.address);
    console.log(tx1);

    //whitelist factory with the gardener
    let tx2 = await gardener.whitelistFactory(flowerboxFactory.address, true);

    let tx3 = await gardener.mint4Weeks();
    return
}
