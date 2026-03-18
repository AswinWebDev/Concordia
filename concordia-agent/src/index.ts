import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { analyzeContractPrivate } from "./venice";
import { fetchFromIPFS, uploadToIPFS } from "./ipfs";
import fs from "fs";

dotenv.config();

// --- Configuration ---
const AGREEMENT_ROOM_ADDRESS = process.env.AGREEMENT_ROOM_ADDRESS || "0x0000000000000000000000000000000000000000"; 
const POLL_INTERVAL_MS = 5000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// --- ABI: Updated for the hardened contract ---
const ABI = [
    "event RoomCreated(uint256 indexed roomId, address partyA, address partyB, string contractIPFSHash)",
    "function submitAnalysis(uint256 _roomId, string memory _analysisHash) external",
    "function logNegotiationUpdate(uint256 _roomId, string memory _updateHash) external"
];

const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
const contract = new ethers.Contract(AGREEMENT_ROOM_ADDRESS, ABI, wallet);

// --- Compute Budget Tracking ---
let computeBudget = {
    veniceApiCalls: 0,
    ipfsFetches: 0,
    ipfsUploads: 0,
    txSubmitted: 0,
    totalGasUsed: BigInt(0),
    startTime: Date.now()
};

// --- Structured Logging (Protocol Labs / DevSpot requirement) ---
interface AgentLogEntry {
    timestamp: string;
    agentId: string;
    type: "decision" | "tool_call" | "retry" | "failure" | "output" | "system";
    action: string;
    toolName?: string;
    input?: any;
    output?: any;
    retryCount?: number;
    durationMs?: number;
    metadata?: any;
}

function logAgent(entry: Omit<AgentLogEntry, "timestamp" | "agentId">) {
    const logEntry: AgentLogEntry = {
        timestamp: new Date().toISOString(),
        agentId: process.env.SYNTHESIS_PARTICIPANT_ID || "concordia-agent",
        ...entry
    };
    
    const icon = {
        decision: "🧠",
        tool_call: "🔧",
        retry: "🔄",
        failure: "❌",
        output: "✅",
        system: "⚙️"
    }[logEntry.type];
    
    console.log(`${icon} [${logEntry.type.toUpperCase()}] ${logEntry.action}`);
    if (logEntry.metadata) {
        console.log(`   └─ ${JSON.stringify(logEntry.metadata)}`);
    }
    
    // Persist to agent_log.json
    const logFile = "agent_log.json";
    let logs: AgentLogEntry[] = [];
    try {
        if (fs.existsSync(logFile)) {
            logs = JSON.parse(fs.readFileSync(logFile, "utf-8"));
        }
    } catch { logs = []; }
    logs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
}

// --- Retry wrapper ---
async function withRetry<T>(fn: () => Promise<T>, actionName: string, maxRetries = MAX_RETRIES): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            if (attempt < maxRetries) {
                logAgent({
                    type: "retry",
                    action: `Retrying: ${actionName}`,
                    retryCount: attempt,
                    metadata: { error: error.message, nextRetryInMs: RETRY_DELAY_MS * attempt }
                });
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
            } else {
                logAgent({
                    type: "failure",
                    action: `Failed after ${maxRetries} retries: ${actionName}`,
                    retryCount: maxRetries,
                    metadata: { error: error.message }
                });
                throw error;
            }
        }
    }
    throw new Error("Unreachable");
}

// --- Main Agent Loop ---
async function startAgent() {
    console.log("\n╔═══════════════════════════════════════════╗");
    console.log("║  🤖 Concordia Autonomous Agent v2.0      ║");
    console.log("║  Private Contract Analysis & Mediation    ║");
    console.log("╚═══════════════════════════════════════════╝\n");

    logAgent({
        type: "system",
        action: "Agent Started",
        metadata: {
            rpc: process.env.NEXT_PUBLIC_RPC_URL,
            contract: AGREEMENT_ROOM_ADDRESS,
            wallet: wallet.address,
            pollInterval: POLL_INTERVAL_MS
        }
    });

    let lastBlock = (await provider.getBlockNumber()) - 100;
    console.log(`📡 Polling from block ${lastBlock}...\n`);

    setInterval(async () => {
        try {
            const currentBlock = await provider.getBlockNumber();
            if (currentBlock <= lastBlock) return;

            const logs = await provider.getLogs({
                address: AGREEMENT_ROOM_ADDRESS,
                fromBlock: lastBlock + 1,
                toBlock: currentBlock,
                topics: [contract.interface.getEvent("RoomCreated")!.topicHash]
            });

            for (const log of logs) {
                const parsed = contract.interface.parseLog(log as any);
                if (parsed && parsed.name === "RoomCreated") {
                    const { roomId, partyA, partyB, contractIPFSHash } = parsed.args;
                    await handleRoomCreated(roomId, partyA, partyB, contractIPFSHash);
                }
            }
            lastBlock = currentBlock;
        } catch (error: any) {
            logAgent({
                type: "failure",
                action: "RPC Polling Error",
                metadata: { error: error.message }
            });
        }
    }, POLL_INTERVAL_MS);
}

// --- Handle a new Room ---
async function handleRoomCreated(roomId: any, partyA: string, partyB: string, contractIPFSHash: string) {
    const id = roomId.toString();
    const startTime = Date.now();
    
    console.log(`\n${"─".repeat(50)}`);
    console.log(`🔔 NEW ROOM DETECTED: Room #${id}`);
    console.log(`${"─".repeat(50)}`);

    // 1. DISCOVER
    logAgent({
        type: "decision",
        action: "Discovered new agreement room",
        metadata: { roomId: id, partyA: partyA.substring(0,10), partyB: partyB.substring(0,10), ipfsHash: contractIPFSHash }
    });

    try {
        // 2. PLAN: Fetch the contract from IPFS
        const fetchStart = Date.now();
        const rawContractText = await withRetry(
            () => fetchFromIPFS(contractIPFSHash),
            "IPFS Fetch"
        );
        computeBudget.ipfsFetches++;
        logAgent({
            type: "tool_call",
            action: "Fetched contract from IPFS",
            toolName: "ipfs_fetch",
            input: { cid: contractIPFSHash },
            output: { length: rawContractText?.length || 0 },
            durationMs: Date.now() - fetchStart
        });

        // 3. EXECUTE: Analyze privately via Venice AI
        logAgent({
            type: "decision",
            action: "Sending contract to Venice AI for private analysis",
            metadata: { model: "llama-3.3-70b", privacyMode: "no-retention" }
        });

        const veniceStart = Date.now();
        const analysisMarkdown = await withRetry(
            () => analyzeContractPrivate(rawContractText),
            "Venice AI Analysis"
        );
        computeBudget.veniceApiCalls++;
        logAgent({
            type: "tool_call",
            action: "Venice AI analysis completed",
            toolName: "venice_ai_private_inference",
            input: { contractLength: rawContractText?.length, model: "llama-3.3-70b" },
            output: { analysisLength: analysisMarkdown?.length },
            durationMs: Date.now() - veniceStart
        });

        // 4. STORE: Upload analysis to IPFS
        const uploadStart = Date.now();
        const analysisCid = await withRetry(
            () => uploadToIPFS(analysisMarkdown, `analysis_room_${id}.md`),
            "IPFS Upload"
        );
        computeBudget.ipfsUploads++;
        logAgent({
            type: "tool_call",
            action: "Uploaded analysis to IPFS",
            toolName: "ipfs_upload",
            input: { filename: `analysis_room_${id}.md` },
            output: { cid: analysisCid },
            durationMs: Date.now() - uploadStart
        });

        // 5. VERIFY: Submit on-chain transaction
        logAgent({
            type: "decision",
            action: "Submitting analysis hash to smart contract",
            metadata: { roomId: id, analysisCid, function: "submitAnalysis" }
        });

        const txStart = Date.now();
        const tx = await (contract as any).submitAnalysis(roomId, analysisCid);
        console.log(`   ⏳ Tx sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        computeBudget.txSubmitted++;
        computeBudget.totalGasUsed += BigInt(receipt.gasUsed);

        logAgent({
            type: "output",
            action: "Analysis submitted and confirmed on-chain",
            toolName: "ethereum_transaction",
            input: { function: "submitAnalysis", roomId: id },
            output: { 
                txHash: tx.hash, 
                gasUsed: receipt.gasUsed.toString(),
                blockNumber: receipt.blockNumber
            },
            durationMs: Date.now() - txStart
        });

        // Log total compute budget
        logAgent({
            type: "system",
            action: "Compute Budget Update",
            metadata: {
                totalDurationMs: Date.now() - startTime,
                ...computeBudget,
                totalGasUsed: computeBudget.totalGasUsed.toString(),
                uptimeMs: Date.now() - computeBudget.startTime
            }
        });

        console.log(`\n✅ Room #${id} fully processed in ${Date.now() - startTime}ms\n`);

    } catch (error: any) {
        logAgent({
            type: "failure",
            action: `Fatal: Failed processing Room #${id}`,
            metadata: { 
                error: error.message,
                durationMs: Date.now() - startTime,
                computeBudget: {
                    ...computeBudget,
                    totalGasUsed: computeBudget.totalGasUsed.toString()
                }
            }
        });
    }
}

// --- Entry Point ---
provider.getNetwork().then((net) => {
    console.log(`🌐 Connected to ${net.name} (Chain ID: ${net.chainId})`);
    startAgent();
}).catch((error) => {
    logAgent({
        type: "failure",
        action: "Failed to connect to blockchain",
        metadata: { error: error.message }
    });
});
