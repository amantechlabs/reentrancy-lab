import { network } from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Initialize Hardhat 3 network connection & extract ethers
  const connection = await network.create();
  const ethers = connection.ethers;

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy VulnerableVault
  const VulnerableVault = await ethers.getContractFactory("VulnerableVault");
  const vulnerableVault = await VulnerableVault.deploy();
  await vulnerableVault.waitForDeployment();
  const vulnerableAddress = await vulnerableVault.getAddress();
  console.log("VulnerableVault deployed to:", vulnerableAddress);

  // Deploy SecureVault
  const SecureVault = await ethers.getContractFactory("SecureVault");
  const secureVault = await SecureVault.deploy();
  await secureVault.waitForDeployment();
  const secureAddress = await secureVault.getAddress();
  console.log("SecureVault deployed to:", secureAddress);

  // Deploy Attacker
  const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
  const attacker = await Attacker.deploy();
  await attacker.waitForDeployment();
  const attackerAddress = await attacker.getAddress();
  console.log("ReentrancyAttacker deployed to:", attackerAddress);

  // Save deployed addresses to frontend/src/contracts/deployed.json
  const deployedData = {
    network: "localhost",
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    vulnerableVault: vulnerableAddress,
    secureVault: secureAddress,
    attacker: attackerAddress,
  };

  const dirPath = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(dirPath, "deployed.json"),
    JSON.stringify(deployedData, null, 2)
  );
  console.log("✅ Deployment addresses successfully saved to frontend/src/contracts/deployed.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});