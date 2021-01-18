
const { time } = require('@openzeppelin/test-helpers');
const FlowerboxFactory = artifacts.require('FlowerboxFactory');
const Flowerbox = artifacts.require('Flowerbox');
const Gardener = artifacts.require('IGardener');
const IERC20 = artifacts.require('IERC20');
const encodeCall = require('@openzeppelin/upgrades/lib/helpers/encodeCall').default;


//Short Lock Duration
contract('FlowerboxFactory', function (accounts) {
    beforeEach(async function () {
        //implementation = await Flowerbox.new();
        //proxyFactory = await FlowerboxFactory.new('0x9aFD76F23f49260185D64f711f868FBf292EB100' ,implementation.address);

        console.log(Flowerbox.address);
        console.log(FlowerboxFactory.address);

        implementation = await Flowerbox.at(Flowerbox.address);
        proxyFactory = await FlowerboxFactory.at(FlowerboxFactory.address);

        //Make sure to have these accounts unlocked before running test
        const adminAccount = '0xc0a9D7f580b0d652abe8ec48F71f1b1EA93c5C31';
        big_yCRV_account_1 = '0x39415255619783a2e71fcf7d8f708a951d92e1b6';
        big_yCRV_account_2 = '0x47f0edb4ae92d137c8c39a4b4b063b8f719b943a';

        web3.eth.sendTransaction({to:adminAccount, from:accounts[2], value:"5000000000000000000"});

        const gardener = await Gardener.at('0x9aFD76F23f49260185D64f711f868FBf292EB100');
        gardener.whitelistFactory(proxyFactory.address,true, {from: adminAccount});

        //Creates a yCRV Flowerbox
        initializeData = encodeCall(
            'initialize',
            ['uint256','uint256','uint256','address','address','address','address','address'],
            ['100000000000000000000','20000000000000000000000', 3,  big_yCRV_account_1,'0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8','0x0FE4283e0216F94f5f9750a7a11AC54D3c9C38F3','0x6D1b6Ea108AA03c6993d8010690264BA96D349A8','0x9aFD76F23f49260185D64f711f868FBf292EB100']
        );

        const transactionReceipt = await
            proxyFactory.createFlowerbox
            (
                initializeData, {from : accounts[2]}
            );
        proxyAddress = transactionReceipt.logs[0].args.proxy;
        impl = await Flowerbox.at(proxyAddress);

        //Approve accounts to send yCRV to Flowerbox
        YCRV = await IERC20.at("0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8");
        let bal_1 = await YCRV.balanceOf(big_yCRV_account_1);
        let bal_2 = await YCRV.balanceOf(big_yCRV_account_2);
        await YCRV.approve(impl.address, bal_1, {from: big_yCRV_account_1});
        await YCRV.approve(impl.address, bal_2, {from: big_yCRV_account_2});


    });
    it('Creator deposits and then withdraws', async function () {
        const contractState = await impl.state.call();
        assert.equal(contractState, 1);

        //Creator deposits in Flowerbox
        await impl.deposit_creator(false, {from: big_yCRV_account_1});
        let bal_3 = await YCRV.balanceOf(impl.address);
        console.log('yCRV in contract: ', bal_3.toString());

        await impl.withdrawNoMatch({from: big_yCRV_account_1});
        let bal_4 = await YCRV.balanceOf(impl.address);
        console.log('yCRV in contract: ', bal_4.toString());

        const contractState2 = await impl.state.call();
        assert.equal(contractState2, 3);
    });

    it('Creator and Investor deposit, wait for Flowerbox to unlock, then withdraw', async function () {
        const contractState = await impl.state.call();
        assert.equal(contractState, 1);

        //Creator deposits in Flowerbox
        await impl.deposit_creator(false, {from: big_yCRV_account_1});
        const contractState2 = await impl.state.call();
        assert.equal(contractState2, 2);

        //Investor deposits in Flowerbox
        await impl.deposit_investor({from: big_yCRV_account_1});
        const contractState4 = await impl.state.call();
        assert.equal(contractState4, 4);

        await time.advanceBlock();
        await time.advanceBlock();
        await time.advanceBlock();

        await impl.withdrawAfterUnlock({from: big_yCRV_account_1});
        const contractState5 = await impl.state.call();
        assert.equal(contractState5, 5);

    });

    it('Claim FARM', async function () {
        const contractState = await impl.state.call();
        assert.equal(contractState, 1);

        //Creator deposits in Flowerbox
        await impl.deposit_creator(false, {from: big_yCRV_account_1});
        const contractState2 = await impl.state.call();
        assert.equal(contractState2, 2);

        //Investor deposits in Flowerbox
        await impl.deposit_investor({from: big_yCRV_account_1});
        const contractState4 = await impl.state.call();
        assert.equal(contractState4, 4);

        await time.advanceBlock();
        await time.advanceBlock();
        await time.advanceBlock();

        let FARM = await IERC20.at("0xa0246c9032bC3A600820415aE600c6388619A14D");
        let beforeBal = await FARM.balanceOf(big_yCRV_account_1);

        console.log('Creator FARM balance before call: ', beforeBal.toString());

        await impl.harvest({from: big_yCRV_account_1});

        let afterBal = await FARM.balanceOf(big_yCRV_account_1);

        console.log('Creator FARM balance after call: ', afterBal.toString());

        assert.isAbove(Number(afterBal.toString()), Number(beforeBal.toString()));


    });


});

//Long lock duration
contract('FlowerboxFactory', function (accounts) {
    beforeEach(async function () {
        implementation = await Flowerbox.new();
        proxyFactory = await FlowerboxFactory.new('0x9aFD76F23f49260185D64f711f868FBf292EB100' ,implementation.address);

        //Make sure to have these accounts unlocked before running test
        const adminAccount = '0xc0a9D7f580b0d652abe8ec48F71f1b1EA93c5C31';
        big_yCRV_account_1 = '0x39415255619783a2e71fcf7d8f708a951d92e1b6';
        big_yCRV_account_2 = '0x47f0edb4ae92d137c8c39a4b4b063b8f719b943a';

        web3.eth.sendTransaction({to:adminAccount, from:accounts[2], value:"5000000000000000000"});

        const gardener = await Gardener.at('0x9aFD76F23f49260185D64f711f868FBf292EB100');
        gardener.whitelistFactory(proxyFactory.address,true, {from: adminAccount});

        //Creates a yCRV Flowerbox
        initializeData = encodeCall(
            'initialize',
            ['uint256','uint256','uint256','address','address','address','address','address'],
            ['100000000000000000000','20000000000000000000000', 500000,  big_yCRV_account_1,'0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8','0x0FE4283e0216F94f5f9750a7a11AC54D3c9C38F3','0x6D1b6Ea108AA03c6993d8010690264BA96D349A8','0x9aFD76F23f49260185D64f711f868FBf292EB100']
        );
        const transactionReceipt = await
            proxyFactory.createFlowerbox
            (
                initializeData, {from : accounts[2]}
            );
        proxyAddress = transactionReceipt.logs[0].args.proxy;
        impl = await Flowerbox.at(proxyAddress);

        //Approve accounts to send yCRV to Flowerbox
        YCRV = await IERC20.at("0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8");
        let bal_1 = await YCRV.balanceOf(big_yCRV_account_1);
        let bal_2 = await YCRV.balanceOf(big_yCRV_account_2);
        await YCRV.approve(impl.address, bal_1, {from: big_yCRV_account_1});
        await YCRV.approve(impl.address, bal_2, {from: big_yCRV_account_2});


    });
    it('Creator and Investor deposit, unlock early', async function () {

        const contractState = await impl.state.call();
        assert.equal(contractState, 1);

        //Creator deposits in Flowerbox
        await impl.deposit_creator(false, {from: big_yCRV_account_1});
        const contractState2 = await impl.state.call();
        assert.equal(contractState2, 2);

        let bal_4 = await YCRV.balanceOf(impl.address);
        console.log('yCRV in contract: ', bal_4.toString());

        //Investor deposits in Flowerbox
        await impl.deposit_investor({from: big_yCRV_account_2});
        const contractState4 = await impl.state.call();
        assert.equal(contractState4, 4);

        //check that Flowerbox has received yCRV
        let bal_3 = await YCRV.balanceOf(impl.address);
        console.log('yCRV in contract: ', bal_3.toString());

        await time.advanceBlock();
        await time.advanceBlock();

        //Early withdraw
        await impl.emergencyWithdraw({from: big_yCRV_account_1});
        await impl.emergencyWithdraw({from: big_yCRV_account_2});

        const contractState3 = await impl.state.call();
        assert.equal(contractState3, 3);

    });

});
