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
  
  // The deployer wallet is also the agent wallet for the hackathon demo.
  // In production, these would be separate keys.
  const agentAddress = wallet.address;
  
  console.log(`Deploying AgreementRoom with agent address: ${agentAddress}`);
  console.log(`Deploying from account: ${wallet.address}`);
  
  const contract = await factory.deploy(agentAddress);
  await contract.waitForDeployment();
  
  const deployedAddress = await contract.getAddress();
  console.log("✅ AgreementRoom deployed to:", deployedAddress);
  console.log("\n📋 Update these in your .env files:");
  console.log(`   NEXT_PUBLIC_AGREEMENT_ROOM_ADDRESS=${deployedAddress}`);
  console.log(`   AGREEMENT_ROOM_ADDRESS=${deployedAddress}`);

  // Also copy the ABI to the frontend for Wagmi
  const abiOnly = JSON.stringify(artifact.abi, null, 2);
  fs.writeFileSync("../concordia-frontend/src/contracts/AgreementRoomABI.json", abiOnly);
  console.log("\n✅ ABI copied to concordia-frontend/src/contracts/AgreementRoomABI.json");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
