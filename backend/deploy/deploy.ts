import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedScoreNFT = await deploy("ScoreNFT", {
    from: deployer,
    log: true,
    args: [],
  });

  console.log(`ScoreNFT contract deployed at: ${deployedScoreNFT.address}`);
};
export default func;
func.id = "deploy_scoreNFT"; // id required to prevent reexecution
func.tags = ["ScoreNFT"];

