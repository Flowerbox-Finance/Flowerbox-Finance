pragma solidity ^0.5.0;

import "./Flowerbox.sol";
import '@openzeppelin/upgrades/contracts/upgradeability/ProxyFactory.sol';



contract FlowerboxFactory is ProxyFactory {
  address public implementationContract;

  IGardener public gardener;

  constructor(
      address _gardenerAddress,
      address _implementationContract
  ) public {
     gardener = IGardener(_gardenerAddress);
     implementationContract = _implementationContract;
  }


  event NewFlowerbox(
      address _flowerboxAddress,
      address _creator
  );

  function createFlowerbox(bytes memory _data) public returns (address){

      address proxy = deployMinimal(implementationContract, _data);

      emit NewFlowerbox(proxy, msg.sender);

      //Allow flowerbox to request the minting of PETALS rewards
      gardener.whitelistFlowerbox(proxy);

      return proxy;
  }

}





