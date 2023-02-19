// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract MultiSigWallet {
  address[] public owners;
  mapping(address => bool) ownerExists;
  uint256 public numberOfConfirmationsRequired;

  struct transaction {
    address to;
    uint256 value;
    bytes data;
    bool executed;
    uint256 confirmations;
  }

  transaction[] public transactions;

  mapping(uint256 => mapping(address => bool)) public isConfirmed;

  event transactionSubmitted(
    uint256 _transactionIndex,
    address _address,
    uint256 _value,
    bytes _data
  );

  event transactionApproved(uint256 _transactionIndex, address _address);

  event approvalWithdrawn(uint256 _transactionIndex, address _address);

  event transactionExecuted(uint256 _transactionIndex);

  modifier numberOfConfirmationsValid(
    address[] memory _owners,
    uint256 _confirmation
  ) {
    require(_owners.length >= _confirmation, "Invalid number of confirmations");
    _;
  }

  modifier isOwner() {
    require(ownerExists[msg.sender] == true, "Not Authorized");
    _;
  }

  modifier transactionPresent(uint256 _transactionIndex) {
    require(_transactionIndex <= transactions.length, "Transaction not found");
    _;
  }

  modifier transactionConfirmed(uint256 _transactionIndex) {
    require(
      transactions[_transactionIndex].confirmations >=
        numberOfConfirmationsRequired,
      "Transaction not approved by all owners"
    );
    _;
  }

  modifier transactionNotExecuted(uint256 _transactionIndex) {
    require(
      transactions[_transactionIndex].executed == false,
      "Transaction already executed"
    );
    _;
  }

  modifier transactionNotAlreadyApprovedByAddress(
    uint256 _transactionIndex,
    address _from
  ) {
    require(
      isConfirmed[_transactionIndex][_from] != true,
      "Already approved by sender"
    );
    _;
  }

  modifier transactionAlreadyApprovedByAddress(
    uint256 _transactionIndex,
    address _from
  ) {
    require(
      isConfirmed[_transactionIndex][_from] == true,
      "Not approved by sender"
    );
    _;
  }

  constructor(
    address[] memory _owners,
    uint256 _numberOfConfirmationsRequired
  ) numberOfConfirmationsValid(_owners, _numberOfConfirmationsRequired) {
    owners = _owners;
    for (uint256 i = 0; i < owners.length; i++) {
      ownerExists[owners[i]] = true;
    }

    numberOfConfirmationsRequired = _numberOfConfirmationsRequired;
  }

  function submitTransaction(
    address _to,
    uint256 _value,
    bytes memory _data
  ) external payable isOwner {
    uint256 transactionIndex = transactions.length;
    transactions.push(transaction(_to, _value, _data, false, 0));
    emit transactionSubmitted(transactionIndex, _to, _value, _data);
  }

  function approveTransaction(
    uint256 _transactionIndex
  )
    external
    isOwner
    transactionPresent(_transactionIndex)
    transactionNotExecuted(_transactionIndex)
    transactionNotAlreadyApprovedByAddress(_transactionIndex, msg.sender)
  {
    transactions[_transactionIndex].confirmations += 1;
    isConfirmed[_transactionIndex][msg.sender] = true;
    emit transactionApproved(_transactionIndex, msg.sender);
  }

  function withdrawApproval(
    uint256 _transactionIndex
  )
    external
    isOwner
    transactionPresent(_transactionIndex)
    transactionNotExecuted(_transactionIndex)
  {
    transactions[_transactionIndex].confirmations -= 1;
    emit approvalWithdrawn(_transactionIndex, msg.sender);
  }

  function executeTransaction(
    uint256 _transactionIndex
  )
    external
    isOwner
    transactionPresent(_transactionIndex)
    transactionConfirmed(_transactionIndex)
    transactionNotExecuted(_transactionIndex)
  {
    transaction memory txn = transactions[_transactionIndex];
    transactions[_transactionIndex].executed = true;
    (bool success, ) = txn.to.call{value: txn.value}(txn.data);
    if (!success) {
      transactions[_transactionIndex].executed = false;
    }
    emit transactionExecuted(_transactionIndex);
  }

  function revokeApproval(
    uint256 _transactionIndex
  )
    external
    isOwner
    transactionPresent(_transactionIndex)
    transactionNotExecuted(_transactionIndex)
    transactionAlreadyApprovedByAddress(_transactionIndex, msg.sender)
  {
    transactions[_transactionIndex].confirmations -= 1;
    isConfirmed[_transactionIndex][msg.sender] = false;
  }
}
