# Concordia — Complete Architecture & Workflow

> **Concordia** is a decentralized, privacy-first autonomous negotiation platform. Two parties upload an agreement, each privately instructs their AI agent, and the agents negotiate autonomously — all with end-to-end encryption and on-chain proof.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Technology Stack](#technology-stack)
4. [User Flow (Step-by-Step)](#user-flow-step-by-step)
5. [End-to-End Encryption (E2EE)](#end-to-end-encryption-e2ee)
6. [Smart Contract](#smart-contract)
7. [Autonomous Agent](#autonomous-agent)
8. [Frontend API Routes](#frontend-api-routes)
9. [On-Chain Proof System](#on-chain-proof-system)
10. [Environment Variables](#environment-variables)
11. [Running the Project](#running-the-project)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        PARTY A (Browser)                     │
│  Wallet → Setup → Encrypt → IPFS → On-Chain TX → Share Link │
│  Private Chat with Venice AI (Copilot)                       │
│  Sets constraints → Auto-Negotiate → Approve → Sign On-Chain │
└────────────────────────┬─────────────────────────────────────┘
                         │ Shareable E2E Link (#key=...)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                        PARTY B (Browser)                     │
│  Opens link → Decrypts agreement → Private Chat with Venice  │
│  Sets constraints → Auto-Negotiate → Approve → Sign On-Chain │
└────────────────────────┬─────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌────────────┐ ┌────────────┐ ┌────────────────┐
   │  Ethereum  │ │    IPFS    │ │  Venice AI     │
   │  Sepolia   │ │  (Pinata)  │ │  (Private LLM) │
   └──────┬─────┘ └──────┬─────┘ └────────┬───────┘
          │              │                 │
          ▼              ▼                 ▼
   ┌─────────────────────────────────────────────────┐
   │           CONCORDIA AUTONOMOUS AGENT            │
   │  Polls blockchain → Fetches IPFS → Decrypts     │
   │  Analyzes via Venice → Encrypts result → IPFS   │
   │  Submits analysis hash on-chain                  │
   └─────────────────────────────────────────────────┘
```

---

## Project Structure

```
concordia/
├── concordia-frontend/          # Next.js 14 web app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # Landing page
│   │   │   ├── workspace/page.tsx     # Main negotiation workspace (950 lines)
│   │   │   └── api/
│   │   │       ├── chat/route.ts      # Venice AI private copilot chat
│   │   │       ├── agent-loop/route.ts # Autonomous negotiation engine
│   │   │       ├── rooms/route.ts     # Create & list in-memory rooms
│   │   │       ├── rooms/[id]/route.ts # Room polling, messages, agreements
│   │   │       ├── upload/route.ts    # Upload to IPFS via Pinata
│   │   │       ├── read-ipfs/route.ts # Read from IPFS
│   │   │       ├── extract/route.ts   # PDF/TXT text extraction
│   │   │       └── negotiate/route.ts # Legacy negotiate endpoint
│   │   ├── lib/
│   │   │   └── crypto.ts             # Browser E2EE (Web Crypto API)
│   │   ├── contracts/
│   │   │   └── AgreementRoomABI.json  # Smart contract ABI
│   │   └── components/
│   │       ├── CreateRoom.tsx         # Room creation with E2EE
│   │       ├── ViewRoom.tsx           # Room viewer with decryption
│   │       └── ActiveRooms.tsx        # Dashboard of active rooms
│   └── .env                           # Environment variables
│
├── concordia-agent/             # Node.js autonomous agent
│   ├── src/
│   │   ├── index.ts                   # Main agent loop (polls blockchain)
│   │   ├── venice.ts                  # Venice AI private inference
│   │   ├── ipfs.ts                    # IPFS fetch/upload via Pinata
│   │   └── crypto.ts                  # Node.js E2EE (AES-256-GCM)
│   └── .env                           # Agent environment variables
│
├── concordia-contracts/         # Solidity smart contracts
│   ├── contracts/
│   │   └── AgreementRoom.sol          # Core negotiation contract
│   ├── scripts/
│   │   └── deploy.ts                  # Deployment script
│   └── artifacts/                     # Compiled ABI
│
├── .synthesis/                  # Hackathon registration
├── register.py                  # Registration script
├── Readme.md                    # Project overview
└── WORKFLOW.md                  # ← This file
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) | Web application with SSR |
| **Styling** | CSS Variables + dark mode | Premium UI aesthetic |
| **Wallet** | Wagmi + WalletConnect | Ethereum wallet connection |
| **Blockchain** | Ethereum Sepolia | On-chain proof & agreement storage |
| **Smart Contract** | Solidity (Hardhat) | `AgreementRoom.sol` — rooms, approvals, finalization |
| **Storage** | IPFS (Pinata) | Decentralized file storage for contracts & analysis |
| **AI (Private)** | Venice AI (llama-3.3-70b) | Zero-retention private inference |
| **Encryption** | AES-256-GCM | End-to-end encryption of all agreement data |
| **Agent Runtime** | Node.js + ethers.js | Autonomous agent polling blockchain events |

---

## User Flow (Step-by-Step)

### Phase 1: Room Creation (Party A)

```
1. Party A connects wallet (MetaMask/WalletConnect)
2. Party A enters Party B's wallet address + pastes agreement text
3. Party A clicks "Create Encrypted Room & Share"
   └─ Behind the scenes:
      a. Generate AES-256-GCM room key (client-side)
      b. Encrypt agreement text with room key
      c. Derive agent key from agent's ETH address (SHA-256)
      d. Encrypt room key with agent key → agentEncryptedKey
      e. Create JSON envelope: { v:1, ciphertext, agentEncryptedKey }
      f. Upload envelope to IPFS → get IPFS hash
      g. Read nextRoomId from smart contract
      h. Call createRoom(partyB, ipfsHash) on-chain → MetaMask TX
      i. Create in-memory room for real-time chat polling
      j. Generate shareable link: /workspace?room=XXX#key=ROOM_KEY
      k. Copy link to clipboard
4. Party A enters the workspace with the Concordia Copilot
```

### Phase 2: Private Constraint Setting

```
5. Party A tells the Copilot their private constraints via chat
   Example: "My minimum rate is ₹1,400/hr but try to get ₹1,600. Don't reveal I'd go below ₹1,500."
6. Copilot extracts constraints via <UPDATE_CONSTRAINTS> tag
7. Constraints stored in localStorage (never sent to server)
```

### Phase 3: Party B Joins

```
8. Party A shares the link with Party B
9. Party B opens link → room key extracted from URL #fragment
10. Room key saved to localStorage
11. Agreement decrypted client-side and displayed
12. Party B tells Copilot their private constraints
```

### Phase 4: Autonomous Negotiation

```
13. Either party says "go negotiate" or clicks "Auto-Negotiate"
14. The system creates a negotiation room and enters auto-mode
15. Each party's agent calls /api/agent-loop with:
    - Their private constraints (ONLY theirs — never the other's)
    - The full negotiation history
    - The contract summary
    - Round number
16. Venice AI generates:
    - PUBLIC_MESSAGE: What the other party sees
    - PRIVATE_REASONING: Strategy only the party sees
    - DECISION: CONTINUE | PAUSE | AGREE
17. Public messages are posted to the shared room via /api/rooms/[id]
18. Both parties poll the room every 2.5s for new messages
19. When either agent receives a message from the other, it auto-responds
20. Max 6 rounds before forcing a decision
```

### Phase 5: Approval & Finalization

```
21. When an agent outputs DECISION: AGREE, the party sees "Approve Terms"
22. Each party clicks "Approve Terms" → marks their agreement in the room
23. When BOTH approve, "Sign & Record On-Chain" button appears
24. Party clicks "Sign & Record On-Chain":
    a. Final agreed terms uploaded to IPFS
    b. Calls agree(roomId, ipfsHash) on smart contract
    c. Smart contract records: wallet signed, IPFS hash, timestamp
    d. When BOTH call agree(), contract emits AgreementFinalized event
25. Confirmation banner with Etherscan link appears
26. Party can click "Download" to get the final agreement as a text file
```

---

## End-to-End Encryption (E2EE)

### How Keys Work

```
                  Party A's Browser
                       │
           generateRoomKey() ──────── Random AES-256 key
                       │
         encryptData(contract, roomKey) ──── Encrypted contract
                       │
     deriveKeyFromAddress(agentAddress) ──── SHA-256(address + salt)
                       │
     encryptData(roomKey, agentKey) ──── Agent-encrypted room key
                       │
              Upload to IPFS: { v:1, ciphertext, agentEncryptedKey }
                       │
         ┌─────────────┼─────────────┐
         ▼                           ▼
    Party B                    Concordia Agent
    Gets key from              Derives same key from
    URL #fragment              own wallet address
         │                           │
    decryptData()              decryptData()
```

### File Locations
- **Browser crypto**: `concordia-frontend/src/lib/crypto.ts` (Web Crypto API)
- **Agent crypto**: `concordia-agent/src/crypto.ts` (Node.js `crypto` module)

### Key Storage
- Room keys stored in `localStorage` keyed by IPFS hash prefix
- Keys are NEVER sent to any server
- URL fragments (`#key=...`) are never included in HTTP requests

---

## Smart Contract

**File**: `concordia-contracts/contracts/AgreementRoom.sol`
**Deployed**: `0x763F5CC3efAE92289187018B05a278151ee3C189` (Sepolia)

### Room Lifecycle

```
Pending → Analyzing → Negotiating → Agreed → Finalized
                                       ↘ Disputed
```

### Key Functions

| Function | Who Calls | What it Does |
|---------|-----------|-------------|
| `createRoom(partyB, ipfsHash)` | Party A | Creates on-chain room, emits `RoomCreated` |
| `submitAnalysis(roomId, hash)` | Agent only | Stores Venice AI analysis hash, moves to `Negotiating` |
| `logNegotiationUpdate(roomId, hash)` | Any participant | Logs a negotiation state update |
| `agree(roomId, finalTermsHash)` | Party A or B | Records party's approval + final terms IPFS hash |
| `raiseDispute(roomId)` | Party A or B | Moves to `Disputed` status |
| `getRoom(roomId)` | Anyone (view) | Returns full room details |

### Auto-Finalization
When **both** `partyAAgreed` and `partyBAgreed` are true:
- Status changes to `Finalized`
- `finalizedAt` timestamp recorded
- `AgreementFinalized` event emitted

---

## Autonomous Agent

**File**: `concordia-agent/src/index.ts`

### Agent Loop (5-Step Pipeline)

```
Every 5 seconds:
│
├─ 1. DISCOVER: Poll blockchain for RoomCreated events
│
├─ 2. PLAN: Fetch encrypted contract from IPFS
│     └─ Parse JSON envelope → derive key → decrypt contract
│
├─ 3. EXECUTE: Send to Venice AI for private analysis
│     └─ Model: llama-3.3-70b (no data retention)
│
├─ 4. STORE: Encrypt analysis with room key → upload to IPFS
│
└─ 5. VERIFY: Call submitAnalysis(roomId, analysisCid) on-chain
       └─ Moves room status from Pending → Negotiating
```

### Compute Budget Tracking
The agent tracks all resource usage:
- Venice API calls, IPFS fetches/uploads, transactions submitted
- Total gas used, uptime duration
- All logged to `agent_log.json`

---

## Frontend API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | Private copilot chat via Venice AI. Handles document editing, risk analysis, constraint extraction. |
| `/api/agent-loop` | POST | Core autonomous negotiation engine. Takes private constraints + history, returns PUBLIC_MESSAGE + DECISION. |
| `/api/rooms` | POST/GET | Create in-memory rooms / list all rooms |
| `/api/rooms/[id]` | GET/POST | Poll room state, add messages, set constraints, mark agreed |
| `/api/upload` | POST | Upload content to IPFS via Pinata SDK |
| `/api/read-ipfs` | GET | Fetch content from IPFS gateway |
| `/api/extract` | POST | Extract text from uploaded PDF/TXT files |

### Negotiation Engine (`/api/agent-loop`)

Each Venice AI call receives:
- **Only the current party's constraints** (never the other party's)
- Full negotiation history (public messages)
- Contract summary
- Round number (max 6)

Venice responds with structured output:
```
PUBLIC_MESSAGE:  [What the other party sees]
PRIVATE_REASONING: [Strategy — only this party sees]
DECISION: CONTINUE | PAUSE | AGREE
PROPOSED_TERMS: [Current position summary]
```

---

## On-Chain Proof System

### TX #1: Create Room (`createRoom`)
**When**: Party A clicks "Create Encrypted Room & Share"
**What it proves**:
- Wallet A initiated a negotiation with Wallet B
- The encrypted contract exists on IPFS at hash X
- Timestamped on Ethereum — immutable record of when the negotiation started
- Neither party can deny the agreement existed

### TX #2: Submit Analysis (`submitAnalysis`)
**When**: Autonomous agent completes Venice AI analysis
**What it proves**:
- The registered Concordia agent (ERC-8004) processed this contract
- Analysis stored on IPFS — verifiable that AI reviewed the terms
- Moves the room to `Negotiating` status

### TX #3: Approve & Sign (`agree`)
**When**: Each party clicks "Sign & Record On-Chain"
**What it proves**:
- The specific wallet cryptographically signed agreement to these exact terms
- Final terms IPFS hash recorded — the exact document both agreed to
- Timestamp on Ethereum — cannot be altered or denied
- When both sign → `AgreementFinalized` event with timestamp
- **This is the legally verifiable proof** — both wallets approved the same document

---

## Environment Variables

### Frontend (`.env`)

```env
VENICE_API_KEY=...                          # Venice AI API key
NEXT_PUBLIC_RPC_URL=...                     # Ethereum Sepolia RPC
PRIVATE_KEY=...                             # Agent wallet private key (for deployment)
NEXT_PUBLIC_PINATA_JWT=...                  # Pinata IPFS JWT
NEXT_PUBLIC_PINATA_API_KEY=...              # Pinata API key
NEXT_PUBLIC_PINATA_SECRET_API_KEY=...       # Pinata secret
NEXT_PUBLIC_AGREEMENT_ROOM_ADDRESS=0x763... # Deployed contract address
AGREEMENT_ROOM_ADDRESS=0x763...             # Same (server-side)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...    # WalletConnect project ID
NEXT_PUBLIC_AGENT_ADDRESS=0x04F...          # Agent wallet (for E2EE key derivation)
```

### Agent (`.env`)
Same variables — the agent reads from its own `.env` file.

---

## Running the Project

### Prerequisites
- Node.js 18+
- MetaMask wallet with Sepolia ETH
- All `.env` files configured

### Start Frontend
```bash
cd concordia-frontend
npm install
npm run dev
# → http://localhost:3000
```

### Start Agent
```bash
cd concordia-agent
npm install
npm start
# → Polls blockchain every 5 seconds
```

### Deploy Contract (if needed)
```bash
cd concordia-contracts
npx hardhat compile
npx ts-node scripts/deploy.ts
# → Update contract addresses in both .env files
```

### Full Test Flow
1. Open `http://localhost:3000` in Browser A (Party A)
2. Connect MetaMask wallet
3. Go to workspace → enter Party B address + paste agreement
4. Click "Create Encrypted Room & Share" → approve MetaMask TX
5. Copy the shareable link
6. Open the link in Browser B (Party B) with a different wallet
7. Both parties tell their Copilot their private constraints
8. Both click "Auto-Negotiate"
9. Watch agents negotiate in the transcript
10. When agents agree → both click "Approve Terms"
11. Both click "Sign & Record On-Chain" → approve MetaMask TX
12. Click "Download" to save the final agreement

---

## Hackathon Tracks

| Track | How Concordia Fits |
|-------|-------------------|
| **Venice (Private Agents)** | All AI analysis uses Venice's zero-retention private inference |
| **Protocol Labs (ERC-8004)** | Agent has registered identity, structured logging, on-chain verification |
| **Synthesis Open Track** | Autonomous negotiation with privacy-first architecture |
