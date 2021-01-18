const FlowerboxFactory = artifacts.require('FlowerboxFactory');
const Flowerbox = artifacts.require('Flowerbox');
const Gardener = artifacts.require('IGardener');
const encodeCall = require('@openzeppelin/upgrades/lib/helpers/encodeCall').default;


contract('FlowerboxFactory', function (accounts) {
  beforeEach(async function () {
    implementation = await Flowerbox.new();
    proxyFactory = await FlowerboxFactory.new('0x9aFD76F23f49260185D64f711f868FBf292EB100' ,implementation.address);

    //make sure to have admin unlocked and funded
    const adminAccount = '0xc0a9D7f580b0d652abe8ec48F71f1b1EA93c5C31';
    web3.eth.sendTransaction({to:adminAccount, from:accounts[0], value:"5000000000000000000"});

    const gardener = await Gardener.at('0x9aFD76F23f49260185D64f711f868FBf292EB100');
    gardener.whitelistFactory(proxyFactory.address,true, {from: adminAccount});

  });
  it('it should return logicContract', async function () {
   const address = await proxyFactory.implementationContract.call();
   assert.equal(address, implementation.address);
  });
  it('it should createFlowerbox ', async function () {
    initializeData = encodeCall(
            'initialize',
            ['uint256','uint256','uint256','address','address','address','address','address'],
            [100,20000, 300,  accounts[2],'0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8','0x0FE4283e0216F94f5f9750a7a11AC54D3c9C38F3','0x6D1b6Ea108AA03c6993d8010690264BA96D349A8','0x9aFD76F23f49260185D64f711f868FBf292EB100']
        );
    const transactionReceipt = await
    proxyFactory.createFlowerbox
    (
      initializeData, {from : accounts[2]}
    );
    proxyAddress = transactionReceipt.logs[0].args.proxy;
    const impl = await Flowerbox.at(proxyAddress);
    const contractState = await impl.state.call();
    const assetAddress = await impl.asset.call();
    assert.equal(contractState, 1);
    assert.equal(assetAddress, '0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8');
  });
});
