const PetalsToken = artifacts.require("PetalsToken");

module.exports = function (deployer,network,accounts) {
  deployer.deploy(PetalsToken, accounts[0]);
};
