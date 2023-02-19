const { NUMBER_OF_CONFIRMATIONS } = require("../hardhat-helper-config")

module.exports.default = async (hre) => {
  const { deployments, getNamedAccounts } = hre
  const { deploy, log } = deployments
  const { deployer, user, user2 } = await getNamedAccounts()

  const args = [[deployer, user, user2], NUMBER_OF_CONFIRMATIONS]
  const MultiSigWallet = await deploy("MultiSigWallet", {
    from: deployer,
    args: args,
    logs: true,
  })

  log("Multi-Sig Wallet Deployed")
  log("-------------------------")
}
