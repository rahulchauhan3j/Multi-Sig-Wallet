require("@nomicfoundation/hardhat-toolbox")
require("hardhat-deploy")

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  namedAccounts: {
    deployer: {
      default: 0,
    },
    user: {
      default: 1,
    },
    user2: {
      default: 2,
    },
    user3: {
      default: 3,
    },
  },
}
