const {
  loadFixture,
  impersonateAccount,
  stopImpersonatingAccount,
} = require("@nomicfoundation/hardhat-network-helpers")
const { getNamedAccounts } = hre
const { ethers } = require("hardhat")
const { assert, expect } = require("chai")
const {
  NUMBER_OF_CONFIRMATIONS,
  FUNCTION_TO_CALL,
  TRANSACTION_VALUE,
} = require("../hardhat-helper-config")

describe("Test Multi-Sig Wallet", function () {
  async function deployMultiSigWalletFixture() {
    const { deployer, user, user2, user3 } = await getNamedAccounts()
    const MultiSigWalletContract = await ethers.getContractFactory(
      "MultiSigWallet",
      deployer
    )
    const owners = [deployer, user, user2]
    const MultiSigWallet = await MultiSigWalletContract.deploy(
      owners,
      NUMBER_OF_CONFIRMATIONS
    )

    const TestContract = await ethers.getContractFactory(
      "TestContract",
      deployer
    )
    const Test = await TestContract.deploy()

    return { deployer, user, user2, user3, owners, MultiSigWallet, Test }
  }

  async function deployMultiSigWalletFixtureAndSubmitTransaction() {
    const { deployer, user, user2, user3 } = await getNamedAccounts()

    const TestContract = await ethers.getContractFactory(
      "TestContract",
      deployer
    )
    const Test = await TestContract.deploy()

    const MultiSigWalletContract = await ethers.getContractFactory(
      "MultiSigWallet",
      deployer
    )

    const owners = [deployer, user, user2]
    const MultiSigWallet = await MultiSigWalletContract.deploy(
      owners,
      NUMBER_OF_CONFIRMATIONS
    )

    const encodeFunctionCall = Test.interface.encodeFunctionData(
      FUNCTION_TO_CALL,
      []
    )

    const submitTransaction = await MultiSigWallet.submitTransaction(
      Test.address,
      TRANSACTION_VALUE,
      encodeFunctionCall
    )

    const submitTransactionReciept = await submitTransaction.wait()

    const transactionIndex = submitTransactionReciept.events[0].args[0]

    return {
      deployer,
      user,
      user2,
      user3,
      MultiSigWallet,
      Test,
      transactionIndex,
    }
  }

  async function deployMutiSigWallentFixtureSubmitandApproveTransaction() {
    const { deployer, user, user2, user3 } = await getNamedAccounts()

    const TestContract = await ethers.getContractFactory(
      "TestContract",
      deployer
    )
    const Test = await TestContract.deploy()

    const owners = [deployer, user, user2]
    const MultiSigWalletContract = await ethers.getContractFactory(
      "MultiSigWallet",
      deployer
    )
    const MultiSigWallet = await MultiSigWalletContract.deploy(
      owners,
      NUMBER_OF_CONFIRMATIONS
    )

    const encodeFunctionCall = Test.interface.encodeFunctionData(
      FUNCTION_TO_CALL,
      []
    )
    const submitTransaction = await MultiSigWallet.submitTransaction(
      Test.address,
      TRANSACTION_VALUE,
      encodeFunctionCall
    )
    const submitTransactionReciept = await submitTransaction.wait()

    const transactionIndex = submitTransactionReciept.events[0].args[0]

    /* Approve Transaction as deployer */
    const approveTransaction = await MultiSigWallet.approveTransaction(
      transactionIndex
    )
    await approveTransaction.wait()

    /* Approve Transaction as user */

    /* Impersonate user - Begin */
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [user],
    })

    const signer = await ethers.getSigner(user)
    const approveTransactionUser = await MultiSigWallet.connect(
      signer
    ).approveTransaction(transactionIndex)
    await approveTransactionUser.wait()

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [user],
    })
    /* Impersonate user - End */

    return {
      deployer,
      user,
      user2,
      user3,
      MultiSigWallet,
      Test,
      transactionIndex,
    }
  }

  describe("Test Constructor", function () {
    it("Owners Are Correctly Set", async function () {
      const { deployer, user, user2, owners, MultiSigWallet } =
        await loadFixture(deployMultiSigWalletFixture)

      const owner0 = await MultiSigWallet.owners(0)
      const owner1 = await MultiSigWallet.owners(1)
      const owner2 = await MultiSigWallet.owners(2)
      assert.equal(owner0, deployer)
      assert.equal(owner1, user)
      assert.equal(owner2, user2)
    })

    it("Number of Confirmations Correctly Set", async function () {
      const { deployer, user, user2, owners, MultiSigWallet } =
        await loadFixture(deployMultiSigWalletFixture)

      const numberOfConfirmations =
        await MultiSigWallet.numberOfConfirmationsRequired()
      assert.equal(
        numberOfConfirmations.toString(),
        NUMBER_OF_CONFIRMATIONS.toString()
      )
    })

    it("Doesnt get deployed if number of confirmations greater than owners", async function () {
      const { deployer, user, user2 } = await getNamedAccounts()

      const MultiSigWalletContract = await ethers.getContractFactory(
        "MultiSigWallet",
        deployer
      )
      const owners = [deployer, user, user2]
      const numberOfConfirmations = owners.length + 1
      await expect(
        MultiSigWalletContract.deploy(owners, numberOfConfirmations)
      ).to.be.revertedWith("Invalid number of confirmations")
    })
  })

  describe("Submit Transaction", function () {
    it("Transaction cannot be submitted by non-owner", async function () {
      const { deployer, user, user2, user3, owners, MultiSigWallet, Test } =
        await loadFixture(deployMultiSigWalletFixture)
      /* Impersonate user3 who is not an owner - Begin */
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [user3],
      })

      let signer = await ethers.getSigner(user3)

      const encodeFunctionCall = Test.interface.encodeFunctionData(
        FUNCTION_TO_CALL,
        []
      )

      await expect(
        MultiSigWallet.connect(signer).submitTransaction(
          Test.address,
          TRANSACTION_VALUE,
          encodeFunctionCall
        )
      ).to.be.revertedWith("Not Authorized")

      await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [user3],
      })
      /* Impersonate user3 who is not an owner - End */
    })
    it("Transaction can be submitted by owner", async function () {
      const { deployer, user, user2, user3, owners, MultiSigWallet, Test } =
        await loadFixture(deployMultiSigWalletFixture)

      const encodeFunctionCall = Test.interface.encodeFunctionData(
        FUNCTION_TO_CALL,
        []
      )
      const transaction = await MultiSigWallet.submitTransaction(
        Test.address,
        TRANSACTION_VALUE,
        encodeFunctionCall
      )
      const tx = await transaction.wait()

      const transactionIndex = tx.events[0].args[0]

      const getTransactionFromContract = await MultiSigWallet.transactions(
        transactionIndex
      )

      assert.equal(getTransactionFromContract.to, Test.address)
      assert.equal(
        getTransactionFromContract.value.toString(),
        TRANSACTION_VALUE.toString()
      )
      assert.equal(getTransactionFromContract.executed, false)
      assert.equal(getTransactionFromContract.confirmations.toString(), "0")
    })
  })

  describe("Approve Transaction", function () {
    it("Transaction cannot be approved by non-owner", async function () {
      const {
        deployer,
        user,
        user2,
        user3,
        MultiSigWallet,
        Test,
        transactionIndex,
      } = await loadFixture(deployMultiSigWalletFixtureAndSubmitTransaction)

      /* Impersonate user3 - Begin */
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [user3],
      })

      const signer = await ethers.getSigner(user3)

      await expect(
        MultiSigWallet.connect(signer).approveTransaction(transactionIndex)
      ).to.be.revertedWith("Not Authorized")

      await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [user3],
      })
      /* Impersonate user3 - End */
    })
    it("Transaction can be approved by owner", async function () {
      const {
        deployer,
        user,
        user2,
        user3,
        MultiSigWallet,
        Test,
        transactionIndex,
      } = await loadFixture(deployMultiSigWalletFixtureAndSubmitTransaction)

      /* Impersonate user3 - Begin */
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [user2],
      })

      const signer = await ethers.getSigner(user2)

      const approvedTransaction = await MultiSigWallet.connect(
        signer
      ).approveTransaction(transactionIndex)

      const approvedTransactionTx = await approvedTransaction.wait()

      const numberOfConfirmations = await MultiSigWallet.transactions(
        transactionIndex
      )

      expect(parseInt(numberOfConfirmations.confirmations)).to.be.greaterThan(0)

      await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [user2],
      })
      /* Impersonate user3 - End */
    })
    it("Transaction cannot be approved if it is already approved by owner", async function () {
      const {
        deployer,
        user,
        user2,
        user3,
        MultiSigWallet,
        Test,
        transactionIndex,
      } = await loadFixture(
        deployMutiSigWallentFixtureSubmitandApproveTransaction
      )

      await expect(
        MultiSigWallet.approveTransaction(transactionIndex)
      ).to.be.revertedWith("Already approved by sender")
    })
  })

  describe("Execute Transaction", function () {
    it("Non-owner cannot execute transaction", async function () {
      const {
        deployer,
        user,
        user2,
        user3,
        MultiSigWallet,
        Test,
        transactionIndex,
      } = await loadFixture(
        deployMutiSigWallentFixtureSubmitandApproveTransaction
      )
      /* Impersonate user3 who is not owner - Begins */
      await impersonateAccount(user3)

      const signer = await ethers.getSigner(user3)
      await expect(
        MultiSigWallet.connect(signer).executeTransaction(transactionIndex)
      ).to.be.revertedWith("Not Authorized")
      await stopImpersonatingAccount(user3)
      /* Impersonate user3 who is not owner - Ends */
    })

    it("Owner cannot execute transaction if number of confirmations less than confirmations required to execute", async function () {
      const {
        deployer,
        user,
        user2,
        user3,
        MultiSigWallet,
        Test,
        transactionIndex,
      } = await loadFixture(deployMultiSigWalletFixtureAndSubmitTransaction)

      await expect(
        MultiSigWallet.executeTransaction(transactionIndex)
      ).to.be.revertedWith("Transaction not approved by all owners")
    })

    it("Owner can execute transaction if number of confirmations are equal confirmations required to execute", async function () {
      const {
        deployer,
        user,
        user2,
        user3,
        MultiSigWallet,
        Test,
        transactionIndex,
      } = await loadFixture(
        deployMutiSigWallentFixtureSubmitandApproveTransaction
      )

      const valueOfCounterInTestContractBefore = await Test.counter()

      const transactionDataBefore = await MultiSigWallet.transactions(
        transactionIndex
      )

      const execute = await MultiSigWallet.executeTransaction(transactionIndex)
      const executeReciept = await execute.wait()

      const transactionDataAfter = await MultiSigWallet.transactions(
        transactionIndex
      )

      const valueOfCounterInTestContractAfter = await Test.counter()

      assert.equal(
        transactionDataAfter.executed,
        !transactionDataBefore.executed
      )
      assert.equal(
        valueOfCounterInTestContractAfter
          .sub(valueOfCounterInTestContractBefore)
          .toString(),
        1
      )
    })
  })

  describe("Revoke Approval", function () {
    it("Owner cannot revoke approval if owner had not provided approval for transaction", async function () {
      const {
        deployer,
        user,
        user2,
        user3,
        MultiSigWallet,
        Test,
        transactionIndex,
      } = await loadFixture(
        deployMutiSigWallentFixtureSubmitandApproveTransaction
      )

      await impersonateAccount(user2)

      const signer = await ethers.getSigner(user2)
      await expect(
        MultiSigWallet.connect(signer).revokeApproval(transactionIndex)
      ).to.be.revertedWith("Not approved by sender")

      await stopImpersonatingAccount(user2)
    })
    it("Owner can revoke approval if owner had provided approval for transaction", async function () {
      const {
        deployer,
        user,
        user2,
        user3,
        MultiSigWallet,
        Test,
        transactionIndex,
      } = await loadFixture(
        deployMutiSigWallentFixtureSubmitandApproveTransaction
      )

      const confirmationsBefore = (
        await MultiSigWallet.transactions(transactionIndex)
      ).confirmations

      const revokeApproval = await MultiSigWallet.revokeApproval(
        transactionIndex
      )

      const confirmationsAfter = (
        await MultiSigWallet.transactions(transactionIndex)
      ).confirmations

      assert.equal(parseInt(confirmationsBefore.sub(confirmationsAfter)), 1)
    })
    it("Owner can revoke approval and then again approve", async function () {
      const {
        deployer,
        user,
        user2,
        user3,
        MultiSigWallet,
        Test,
        transactionIndex,
      } = await loadFixture(
        deployMutiSigWallentFixtureSubmitandApproveTransaction
      )

      const confirmationsBefore = (
        await MultiSigWallet.transactions(transactionIndex)
      ).confirmations

      const revokeApproval = await MultiSigWallet.revokeApproval(
        transactionIndex
      )

      const confirmationsAfter = (
        await MultiSigWallet.transactions(transactionIndex)
      ).confirmations

      assert.equal(parseInt(confirmationsBefore.sub(confirmationsAfter)), 1)

      const approvedTransaction = await MultiSigWallet.approveTransaction(
        transactionIndex
      )

      const confirmationsAfterFinalApproval = (
        await MultiSigWallet.transactions(transactionIndex)
      ).confirmations

      assert.equal(
        confirmationsAfterFinalApproval.toString(),
        confirmationsBefore.toString()
      )
    })
  })
})
