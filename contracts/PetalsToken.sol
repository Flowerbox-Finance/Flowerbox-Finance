pragma solidity 0.6.12;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract PetalsToken is ERC20("Petals Token", "PETALS") {

	address public admin;
	address public gardener;

	constructor( address _admin) public {
        admin = _admin;
    }

	function setAdmin(address _newAdmin) public {
		require(msg.sender == admin);
		admin = _newAdmin;
	}

	function setGardener(address _newGardener) public {
		require(msg.sender == admin);
		gardener = _newGardener;
	}

    function mint(address _mintTo, uint256 _amount) public {
    	require(msg.sender == gardener);
    	_mint(_mintTo, _amount);
    }

}




