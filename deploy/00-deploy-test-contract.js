module.exports.default = async (hre) => {
  const { deployments, getNamedAccounts } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  const args = []
  const testContract = await deploy("TestContract", {
    from: deployer,
    args: args,
    logs: true,
  })
  log("Test Contract Deployed")
  log("---------------------")
}
