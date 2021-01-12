pragma solidity 0.6.12;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/proxy/Initializable.sol";
import "./PetalsToken.sol";


contract Gardener is Initializable {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Dev address.
    address public admin;

    // The PETALS TOKEN!
    PetalsToken public petals;

    //Current Total Value Locked
    uint256 public TVL;

    //Weekly Historical TVL
    mapping (uint256 => uint256) public weekToTVL;

    uint256 public startBlock;
    uint256 public blocksPerWeek;
    uint256 public bonusWeeks;
    uint256 public baseReward;
    uint256 public multiplier;
    uint256 numberOfMintings;


    //Whitelisted FlowerboxFactory can add verified Flowerboxes
    mapping (address => bool) internal factoryWhitelist;

    //Whitelist Flowerbox to allow requests for PetalsToken
    mapping (address => bool) internal flowerboxWhitelist;

    function initialize(PetalsToken _petals, address _admin, uint256 _startBlock) public initializer {
        petals = _petals;
        admin = _admin;
        startBlock = _startBlock;
        blocksPerWeek = 40320;
        bonusWeeks = 4;
        baseReward = 100000000000000000000;
        multiplier= 5;
        numberOfMintings = 0;
    }


    function updateBaseReward(uint256 _newBaseReward) public {
        require(msg.sender == admin, "only admin can call");
        baseReward = _newBaseReward;
    }


    function whitelistFactory(address _factory, bool _listed) public {
        require(msg.sender == admin, "only admin can call");
        factoryWhitelist[_factory] = _listed;
    }


    function whitelistFlowerbox(address _flowerbox) external {
        require(factoryWhitelist[msg.sender]);
        flowerboxWhitelist[_flowerbox] = true;
    }

    function updateTVL(uint256 _value, bool _addingValue) public {
        require(flowerboxWhitelist[msg.sender], "Flowerbox not whitelisted");

        if(_addingValue){
            TVL = TVL.add(_value);
        }
        else{
            TVL = TVL.sub(_value);
        }

        //set weekly TVL stamp

        if(block.number >= startBlock.add(blocksPerWeek)){  //later than or equal to the beginning of week 1

            uint256 weekNumber = (block.number.sub(startBlock)).div(blocksPerWeek);
            if(weekToTVL[weekNumber] == 0 ){
                // TVL stamp has not been set for this week yet
                weekToTVL[weekNumber] = TVL;
            }

        }
        else{  //week 0 or earlier than startBlock
            //Continually sets weekToTVL[0] to updated TVL during the first week
            //Stamping with the earliest non 0 value makes weekToTVL[0] too small
            weekToTVL[0] = TVL;
        }

    }

    function getPayout
    (
        uint256 _lastPayoutBlock,
        uint256 _valueLocked,
        address _creator,
        address _investor

    ) public {
        require(block.number >= startBlock, "PETALS rewards have not started yet.");
        require(flowerboxWhitelist[msg.sender], "Flowerbox not whitelisted");

        uint256 weekNumber = (block.number.sub(startBlock)).div(blocksPerWeek);
        uint256 blocksThisWeek;
        uint256 blocksOtherWeeks;
        uint256 payout;

        //Payouts are calculated using the historical weekToTVL[i] values
        //and comparing to the value locked in the calling Flowerbox

        //If Flowerbox was created before startBlock, only pay from startBlock
        if(_lastPayoutBlock < startBlock){
            _lastPayoutBlock = startBlock;
        }

        if(weekNumber == 0){ //Easiest way to avoid looping into negative weeks

            if(_lastPayoutBlock > weekNumber.mul(blocksPerWeek).add(startBlock) ){
                //Claim already called this week
                blocksThisWeek = block.number.sub(_lastPayoutBlock);
            }else{

                blocksThisWeek = block.number.sub(startBlock) + 1;
            }

            payout = baseReward.mul(multiplier).mul(blocksThisWeek).mul(_valueLocked).div(weekToTVL[weekNumber]);

        }
        else{

            if(_lastPayoutBlock >= weekNumber.mul(blocksPerWeek).add(startBlock) ){
                //Claim already called this week

                blocksThisWeek = block.number.sub(_lastPayoutBlock);
                blocksOtherWeeks = 0;
            }else{

                blocksThisWeek = block.number.sub(weekNumber.mul(blocksPerWeek).add(startBlock)) + 1;
                blocksOtherWeeks = block.number.sub(_lastPayoutBlock).sub(blocksThisWeek);
            }

            uint256 fullWeeks = blocksOtherWeeks.div(blocksPerWeek);

            //Since weekToTVL[i] is only stamped when we call updateTVL() we fill in
            //0 values in weekToTVL[i] with closest, earlier non 0 values

            for(uint i = 0; i < ( fullWeeks + 2); i++ ){
                if(weekToTVL[weekNumber - i] == 0 ){

                    uint j = 1;
                    while(weekToTVL[weekNumber - i] == 0 && (   (weekNumber - i - j) >= 0   ) ){
                        weekToTVL[weekNumber - i] = weekToTVL[weekNumber - i - j];
                        j++;
                    }

                }
            }

            // Payout for this week
            if(weekNumber < bonusWeeks ){
                payout = baseReward.mul(multiplier).mul(blocksThisWeek).mul(_valueLocked).div(weekToTVL[weekNumber]);
            }
            else{
                payout = baseReward.mul(blocksThisWeek).mul(_valueLocked).div(weekToTVL[weekNumber]);
            }


            //Payout for full weeks
            for(uint i = 1; i < (fullWeeks+1) ; i++){

                if((weekNumber - i) < bonusWeeks){
                    payout += baseReward.mul(multiplier).mul(blocksPerWeek).mul(_valueLocked).div(weekToTVL[weekNumber - i]);


                }else{
                    payout += baseReward.mul(blocksPerWeek).mul(_valueLocked).div(weekToTVL[weekNumber - i]);

                }
            }

            //payout first week
            if((weekNumber - fullWeeks - 1) < bonusWeeks){
                payout += baseReward.mul(multiplier).mul(blocksOtherWeeks.sub(fullWeeks.mul(blocksPerWeek))).mul(_valueLocked).div(weekToTVL[weekNumber - fullWeeks - 1]);
            }else{

                payout += baseReward.mul(blocksOtherWeeks.sub(fullWeeks.mul(blocksPerWeek))).mul(_valueLocked).div(weekToTVL[weekNumber - fullWeeks - 1]);
            }

        }

        //Other 20% was already sent to the dev fund in calling mint4Weeks()
        safePetalsTransfer(_creator, payout.mul(7).div(10) );
        safePetalsTransfer(_investor, payout.div(10) );

    }


    function mint4Weeks() public{

        //must be within the last week of previous rewards period
        require(block.number > startBlock.add(blocksPerWeek.mul(4).mul(numberOfMintings)).sub(blocksPerWeek));

        uint256 petalsReward;

        if(numberOfMintings == 0){
            //Still within bonus period
            petalsReward = multiplier.mul(blocksPerWeek).mul(baseReward);
        }
        else{
            petalsReward = blocksPerWeek.mul(baseReward);
        }

        petals.mint(admin, petalsReward.div(5)); //20% dev fund
        petals.mint(address(this), petalsReward.mul(4).div(5)); //80% to pool for Flowerbox transfers

        numberOfMintings++;

    }

    // Safe transfer function, just in case rounding error causes pool to not have enough PETALS.
    function safePetalsTransfer(address _to, uint256 _amount) internal {
        uint256 petalsBal = petals.balanceOf(address(this));
        if (_amount > petalsBal) {
            petals.transfer(_to, petalsBal);
        } else {
            petals.transfer(_to, _amount);
        }
    }

    // Update dev address by the previous dev.
    function dev(address _admin) public {
        require(msg.sender == admin, "dev: wut?");
        admin = _admin;
    }
}

