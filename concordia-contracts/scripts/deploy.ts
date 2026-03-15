import { ethers } from "ethers";
import * as dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: '../concordia-frontend/.env' });

async function main() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  if (!rpcUrl || !privateKey) throw new Error("Missing env vars in ../concordia-frontend/.env");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const artifactPath = "./artifacts/contracts/AgreementRoom.sol/AgreementRoom.json";
  if (!fs.existsSync(artifactPath)) {
      throw new Error("Artifact not found! Please run 'npx hardhat compile' first.");
  }
  
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  console.log(`Deploying AgreementRoom directly via Ethers v6 from account: ${wallet.address}`);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  console.log("✅ AgreementRoom deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
