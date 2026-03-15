import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { analyzeContractPrivate } from "./venice";
import { fetchFromIPFS, uploadToIPFS } from "./ipfs";
import fs from "fs";

dotenv.config();

// The smart contract address will be populated after we deploy the Hardhat project
const AGREEMENT_ROOM_ADDRESS = process.env.AGREEMENT_ROOM_ADDRESS || "0x0000000000000000000000000000000000000000"; 

// Minimal ABI to listen for events and submit the analysis
const ABI = [
    "event RoomCreated(uint256 indexed roomId, address partyA, address partyB, string contractIPFSHash)",
    "function submitAnalysis(uint256 _roomId, string memory _analysisHash) external"
];

const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
const contract = new ethers.Contract(AGREEMENT_ROOM_ADDRESS, ABI, wallet);

async function logAgentAction(action: string, metadata: any) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        agentId: process.env.SYNTHESIS_PARTICIPANT_ID,
        action,
        metadata
    };
    
    console.log(`[Agent Log] ${action}`);
    
    // Save to agent_log.json for Protocol Labs requirements
    const logFile = "agent_log.json";
    let logs = [];
    if (fs.existsSync(logFile)) {
        logs = JSON.parse(fs.readFileSync(logFile, "utf-8"));
    }
    logs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
}

async function startAgent() {
    console.log("=========================================");
    console.log("🤖 Concordia Autonomous Agent Started");
    console.log(`📡 Listening to RPC: ${process.env.NEXT_PUBLIC_RPC_URL}`);
    console.log(`🏠 Contract Address: ${AGREEMENT_ROOM_ADDRESS}`);
    console.log("=========================================\n");

    // Listen for the RoomCreated event from the blockchain
    contract.on("RoomCreated", async (roomId, partyA, partyB, contractIPFSHash) => {
        const id = roomId.toString();
        console.log(`\n🔔 [Event Detected] New Agreement Room Created!`);
        console.log(`   Room ID: ${id} | Parties: ${partyA.substring(0,8)}... and ${partyB.substring(0,8)}...`);
        console.log(`   IPFS Hash: ${contractIPFSHash}`);

        try {
            await logAgentAction("Discovered Contract", { roomId: id, ipfsHash: contractIPFSHash });

            // 1. Discover: Fetch the raw document from IPFS
            const rawContractText = await fetchFromIPFS(contractIPFSHash);
            await logAgentAction("Fetched Document", { length: rawContractText.length });

            // 2. Plan/Execute: Analyze the text privately via Venice
            const analysisMarkdown = await analyzeContractPrivate(rawContractText);
            await logAgentAction("Analyzed via Venice", { model: "llama-3.3-70b" });

            // 3. Store: Upload the analysis to IPFS 
            const analysisCid = await uploadToIPFS(analysisMarkdown, `analysis_${id}.md`);
            await logAgentAction("Uploaded Analysis", { analysisCid });

            // 4. Verify: Submit the blockchain transaction back to the room
            console.log(`[Blockchain] Submitting transaction to submitAnalysis()...`);
            const tx = await contract.submitAnalysis(roomId, analysisCid);
            console.log(`[Blockchain] Tx sent! Waiting for confirmation... Hash: ${tx.hash}`);
            
            await tx.wait();
            console.log(`[Blockchain] ✅ Transaction confirmed! Room ${id} accurately analyzed.`);
            await logAgentAction("Transaction Confirmed", { txHash: tx.hash, function: "submitAnalysis" });

        } catch (error) {
            console.error(`[Fatal Error] Agent failed processing Room ${id}:`, error);
            await logAgentAction("Error", { error: String(error) });
        }
    });
}

// Ensure the process doesn't exit immediately before connecting
provider.getNetwork().then((net) => {
    console.log(`Connected to Network: ${net.name} (Chain ID: ${net.chainId})`);
    startAgent();
}).catch(console.error);
