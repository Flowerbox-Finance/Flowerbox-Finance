const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const PetalsToken = artifacts.require("PetalsToken");
const Gardener = artifacts.require("Gardener");


module.exports = async function (deployer,network,accounts) {

	const latestBlock = await web3.eth.getBlock("latest");

	const instance = await deployProxy(Gardener, [PetalsToken.address, accounts[0], latestBlock.number ], { deployer });
	console.log('Deployed', instance.address);
};

