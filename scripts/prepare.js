
const IERC20 = artifacts.require("IERC20")


module.exports = async function(callback) {
  try {

    //fork mainnet and unlock the following acconts

    let unlockedAccount = "0x2bf792ffe8803585f74e06907900c2dc2c29adcb"; //USDC
    let unlockedAccount2 = "0x39415255619783a2e71fcf7d8f708a951d92e1b6"; //YCRV
    let unlockedAccount3 = "0xe8b4ec3cd3d21b35b4fe55ad987e50d3b72ef11b"; //DAI
    let unlockedAccount4 = "0x317ae07510d655e3bd355d8612e8dc7c1538dcef"; //3CRV

    let USDC = await IERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    let YCRV = await IERC20.at("0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8");
    let DAI = await IERC20.at("0x6b175474e89094c44da98b954eedeac495271d0f");
    let threeCRV = await IERC20.at("0x6c3f90f043a72fa612cbac8115ee7e52bde6e490");

    let accounts = await web3.eth.getAccounts();

    //transfer usdc
    await  USDC.transfer(accounts[0], 2000000000000, {from: unlockedAccount} );
    await  USDC.transfer(accounts[1], 2000000000000, {from: unlockedAccount} );
    console.log("finished USDC transfers");

    await  YCRV.transfer(accounts[0], '60000000000000000000000', {from: unlockedAccount2} );
    await  YCRV.transfer(accounts[1], '60000000000000000000000', {from: unlockedAccount2} );
    await  YCRV.transfer(accounts[3], '60000000000000000000000', {from: unlockedAccount2} );
    await  YCRV.transfer(accounts[4], '60000000000000000000000', {from: unlockedAccount2} );
    console.log("finished YCRV transfers");

    await  DAI.transfer(accounts[0], '60000000000000000000000', {from: unlockedAccount3} );
    await  DAI.transfer(accounts[1], '60000000000000000000000', {from: unlockedAccount3} );
    console.log("finished DAI transfers");


  }
  catch(error) {
    console.log(error)
  }

  return
}
