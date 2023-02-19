// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

/// @title Test Contract
/// @author Rahul Chauhan
/// @notice This is a test contract created for Multi-Sig Wallet to call its function incrementCounter as a transaction
contract TestContract {
  uint256 public counter;

  function incrementCounter() public {
    counter++;
  }
}
