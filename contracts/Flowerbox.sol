pragma solidity ^0.6.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./GardenerV1.sol";

interface IVault {
    function deposit(uint256 amountWei) external;
    function withdrawAll() external;
    function withdraw(uint256 numberOfShares) external;
}

interface IRewardPool {
  function stake(uint256 amountWei) external;
  function withdraw(uint256 amountWei) external;
  function exit() external;
  function getReward() external;
}

// FlowerboxVault States
// 1 = Waiting for deposit of guarentee
// 2 = Ready for Match
// 3 = Canceled
// 4 = Locked
// 5 = Unlocked

contract Flowerbox {
    using SafeMath for uint256;

    Gardener public gardener;

    IERC20 public asset; //asset which will be used in vault --> ex yCRV
    IVault public harvestVault; //should match token  --> ex fyCRV
    IRewardPool public rewardsPool; //should match token
    IERC20 public FARM;

    address public creator;
    address public investor;

    bool creator_agrees_to_early_withdraw  = false;
    bool investor_agrees_to_early_withdraw = false;

    bool investNow = false;
    bool lastCall = false;

    uint256 public lockDuration; //amount of blocks funds are locked
    uint256 public startTime;

    uint256 lastPayoutBlock = 0;

    uint256 public creatorDeposit;
    uint256 public investorDeposit;
    uint256 public valueLocked;

    uint8 public state;


    //hardcode to test
    address owner = 0xdc126D3D91dF6A3390c9B41Ca5b6939EC6683Fd1;

    constructor
    (
        uint256 _creatorDeposit,
        uint256 _investorDeposit,
        uint256 _lockDuration,
        address _creator,
        address _asset,
        address _harvestVault,
        address _rewardsPool,
        address _gardenerAddress

    ) public {

        gardener = Gardener(_gardenerAddress);

        creatorDeposit = _creatorDeposit;
        investorDeposit  = _investorDeposit;
        lockDuration = _lockDuration;
        creator = _creator;

        asset = IERC20(_asset);
        harvestVault = IVault(_harvestVault);
        rewardsPool =  IRewardPool(_rewardsPool);

        FARM = IERC20(0xa0246c9032bC3A600820415aE600c6388619A14D);

        state  = 1;
    }


    //Creator Functions

    function deposit_creator(bool _investNow) public payable{
      require(msg.sender == creator);
      require(state == 1);

      asset.transferFrom(msg.sender, address(this), creatorDeposit);


      //Incentive for not sending funds immediately to Harvest is
      // that the other party can pay tx fee

      if(_investNow){
            investNow = true;
            lockup(creatorDeposit);
      }

      state = 2;

    }



    function withdrawNoMatch() public{
        require(msg.sender == creator);
        require(state == 2);

        if(investNow){
          withdrawFromHarvest();
        }

        uint256 remainingBalance = asset.balanceOf(address(this));
        asset.transfer(creator,remainingBalance);

        uint256 farmBalance = FARM.balanceOf(address(this));
        FARM.transfer(creator,farmBalance);

        state = 3;
    }


    //Can be called at any time by creator

    function harvest() public{
        require(msg.sender == creator);

        rewardsPool.getReward();
        uint256 farmBalance = FARM.balanceOf(address(this));

        FARM.transfer(creator,farmBalance);
    }


    //Investor Functions

    function deposit_investor() public{
        require(state == 2);

        investor = msg.sender;

        asset.transferFrom(investor, address(this), investorDeposit);

        //amountLocked will be different from investorDeposit if investNow = false
        if(investNow){
            lockup(investorDeposit);
        }
        else{
            lockup(investorDeposit.add(creatorDeposit));
        }

        startTime = block.number;
        lastPayoutBlock = block.number;

        updateTVL(creatorDeposit.add(investorDeposit), true);

        state = 4;          //Lock Vault

    }


    //Creator & Investor functions
    function withdrawAfterUnlock() public{

        require( block.number > startTime.add(lockDuration) );
        require( state == 4 ); // Currently Locked

        withdrawFromHarvest();
        withdrawFee();

        if(asset.balanceOf(address(this)) > creatorDeposit.add(investorDeposit) ){
        // Payout guarantee + initial deposit to Investor
            asset.transfer(investor, creatorDeposit.add(investorDeposit) );

            uint256 remainingBalance = asset.balanceOf(address(this));
            asset.transfer(creator,remainingBalance);
        }
        else{
            //this only happens in the rare case that fees > appreciation of fAsset in harvest
             asset.transfer(investor, asset.balanceOf(address(this)));
        }


        uint256 farmBalance = FARM.balanceOf(address(this));
        FARM.transfer(creator,farmBalance);

        updateTVL(creatorDeposit.add(investorDeposit), false);

        state = 5; //Unlock

    }

    function emergencyWithdraw() public{
        require( block.number < startTime.add(lockDuration) );
        require( state == 4 ); // Currently Locked


        if(msg.sender == investor){
            investor_agrees_to_early_withdraw = true;
        }

        if(msg.sender == creator){
            creator_agrees_to_early_withdraw = true;
        }

        if(investor_agrees_to_early_withdraw  && creator_agrees_to_early_withdraw){

            withdrawFromHarvest();
            withdrawFee();

            if(asset.balanceOf(address(this)) > creatorDeposit.add(investorDeposit)){
                //return initial locked funds of both parties
                asset.transfer(investor, investorDeposit);
                asset.transfer(creator, creatorDeposit);

                uint256 remainingBalance = asset.balanceOf(address(this));

                asset.transfer(investor,remainingBalance.div(2));
                asset.transfer(creator,remainingBalance.div(2));

                }
            else{
                //this only happens in the rare case that fees > appreciation of fAsset in harvest
                asset.transfer(creator, creatorDeposit);
                asset.transfer(investor, asset.balanceOf(address(this)));
            }

            //Split the FARM
            uint256 farmBalance = FARM.balanceOf(address(this));

            FARM.transfer(creator,farmBalance.div(2));
            FARM.transfer(investor,farmBalance.div(2));

            state = 3; //Canceled
        }

    }


    //Internal functions

    function lockup(uint256 _amount) private{

        //Deposit in vault
        asset.approve(address(harvestVault), _amount);
        harvestVault.deposit(_amount);

        //After deposit, fTokens are minted by harvest


        IERC20 fAsset = IERC20(address(harvestVault));

        //Approve Harvest's rewards pool to stake for farm in rewards pool
        fAsset.approve(address(rewardsPool), fAsset.balanceOf( address(this) ));

        //stake in rewards pool
        rewardsPool.stake( fAsset.balanceOf( address(this) ) );

    }

    function withdrawFromHarvest() private{

        //Unstake and get rewards
        rewardsPool.exit();

        IERC20 fAsset = IERC20(address(harvestVault));

        //Withdraw from vault
        harvestVault.withdraw( fAsset.balanceOf( address(this) ));

    }

    function withdrawFee() private{

        uint bal = asset.balanceOf(address(this));

        asset.transfer(owner, bal.div(400));

    }

    //Functions required for PETALS rewards
    //Lazily hardcoding values for stablecoin tokens
    function updateTVL(uint256 _value, bool _addingValue) private {

        if(address(asset)  == 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48){ //USDC
            gardener.updateTVL(_value.mul(1000000000000), _addingValue);
            valueLocked = _value.mul(1000000000000);
        }
        else if(address(asset)  == 0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8){ //yCRV
            gardener.updateTVL(_value.mul(107).div(100), _addingValue);
            valueLocked = _value.mul(107).div(100);
        }
        else if(address(asset)  == 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490){ //3CRV
            gardener.updateTVL(_value.mul(101).div(100), _addingValue);
            valueLocked = _value.mul(101).div(100);
        }
        else{ //DAI
            gardener.updateTVL(_value.mul(101).div(100), _addingValue);
            valueLocked = _value.mul(101).div(100);
        }

    }

    function getPetals() public {

        //if later than ending block
        if(block.number > startTime.add(lockDuration) ){

            require(lastCall == false, 'PETALS rewards have ended for this Flowerbox');
            lastCall = true;
            lastPayoutBlock = lastPayoutBlock.add(block.number.sub(startTime.add(lockDuration)));
            gardener.getPayout( lastPayoutBlock, valueLocked, creator, investor );

        }
        else{
            gardener.getPayout( lastPayoutBlock, valueLocked, creator, investor );
        }

    }

}


