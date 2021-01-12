const Gardener = artifacts.require("Gardener");
const FlowerboxFactory = artifacts.require("FlowerboxFactory");

module.exports = function (deployer) {
  deployer.deploy(FlowerboxFactory, Gardener.address);
};
