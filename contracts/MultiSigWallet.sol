// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

/// @title Multi-Signature Wallet
/// @author Rahul Chauhan
/// @notice This contract implements a multi-signatue wallet.
contract MultiSigWallet {
  /// @notice variable declarations to store owner addresses
  address[] public owners;
  mapping(address => bool) ownerExists;

  /// @notice variable declarations to store number of confirmations required to transact
  uint256 public numberOfConfirmationsRequired;

  /// @notice Transaction Structure
  struct transaction {
    address to;
    uint256 value;
    bytes data;
    bool executed;
    uint256 confirmations;
  }

  /// @notice Array of transactions and a mapping to check if transaction is confirmed.
  transaction[] public transactions;
  mapping(uint256 => mapping(address => bool)) public isConfirmed;

  /// Event emitted when transaction is submitted.
  /// @param _transactionIndex (transaction index)
  /// @param _address  (address submitting the transaction)
  /// @param _value (value associated with transaction)
  /// @param _data (data associated with transaction)
  event transactionSubmitted(
    uint256 _transactionIndex,
    address _address,
    uint256 _value,
    bytes _data
  );

  /// Event emitted when transaction is approved.
  /// @param _transactionIndex (transaction index)
  /// @param _address (address submitting the transaction)
  event transactionApproved(uint256 _transactionIndex, address _address);

  /// Event emitted when transaction is withdrawn
  /// @param _transactionIndex (transaction index)
  /// @param _address (address submitting the transaction)
  event approvalWithdrawn(uint256 _transactionIndex, address _address);

  /// Event emitted when transaction is executed
  /// @param _transactionIndex (transaction index)
  event transactionExecuted(uint256 _transactionIndex);

  /// Modifier to check if number of confirmations set at the time of deployment are valid
  /// @param _owners (array of owners)
  /// @param _confirmation (number of confirmations)
  modifier numberOfConfirmationsValid(
    address[] memory _owners,
    uint256 _confirmation
  ) {
    require(_owners.length >= _confirmation, "Invalid number of confirmations");
    _;
  }

  /// Modifier to check if message sender is among owners
  modifier isOwner() {
    require(ownerExists[msg.sender] == true, "Not Authorized");
    _;
  }

  /// Modifier to check if transaction is present
  /// @param _transactionIndex (transaction index)
  modifier transactionPresent(uint256 _transactionIndex) {
    require(_transactionIndex <= transactions.length, "Transaction not found");
    _;
  }

  /// Modifier to check if transaction is confirmed (approved by all owners)
  /// @param _transactionIndex (transaction index)
  modifier transactionConfirmed(uint256 _transactionIndex) {
    require(
      transactions[_transactionIndex].confirmations >=
        numberOfConfirmationsRequired,
      "Transaction not approved by all owners"
    );
    _;
  }

  /// Modifier to check that transaction is not executed.
  /// @param  _transactionIndex (transaction index)
  modifier transactionNotExecuted(uint256 _transactionIndex) {
    require(
      transactions[_transactionIndex].executed == false,
      "Transaction already executed"
    );
    _;
  }

  /// Modifier to check that transaction is not already approved by the message sender.
  /// @param  _transactionIndex (transaction index)
  /// @param  _from (message sender)
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

  /// Modifier to check that transaction is already approved by the message sender.
  /// @param  _transactionIndex (transaction index)
  /// @param  _from (message sender)
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

  /// Constructor
  /// @param _owners  (array of owners of multi-sig wallet)
  /// @param _numberOfConfirmationsRequired (number of confirmations required for transaction to be executed)
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

  /// Function to submit a transaction
  /// @param _to (address of contract)
  /// @param _value (value associated with transaction)
  /// @param _data (data associated with transaction)
  function submitTransaction(
    address _to,
    uint256 _value,
    bytes memory _data
  ) external payable isOwner {
    uint256 transactionIndex = transactions.length;
    transactions.push(transaction(_to, _value, _data, false, 0));
    emit transactionSubmitted(transactionIndex, _to, _value, _data);
  }

  /// Function to approve transaction
  /// @param _transactionIndex (transactionIndex)
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

  /// Function to withdraw transaction approval
  /// @param _transactionIndex (transactionIndex)
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

  /// Function to execute transaction approval
  /// @param _transactionIndex (transactionIndex)
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

  /// Function to revoke approval
  /// @param _transactionIndex (transactionIndex)
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
