# Concordia — Private Contract Copilot

## One‑line summary

Concordia is a **privacy‑first AI contract copilot** that helps two parties understand, negotiate, and finalize agreements in a private “contract room”, then records the final agreement and optional escrow on Ethereum for a neutral, tamper‑proof record.

## Problem

Most people sign contracts they barely understand, and they often paste entire contracts into public AI tools to get help.

- Uploading contracts to generic LLMs can leak confidential or legally sensitive information (clients, pricing, IP, personal data).  
- E‑sign tools record signatures, but they don’t tell you if either side actually understood the terms.  
- When disputes happen later, it’s hard to prove which version of the contract both parties actually agreed to, and when.

There is no simple, privacy‑first way for two normal people (or small teams) to:

1. Safely ask AI to explain contracts *without* leaking the full text to a centralized provider.  
2. Get a neutral, onchain record of *exactly* what they both agreed to and when.  
3. Optionally lock funds in escrow so payments follow simple, transparent rules.

## Solution

Concordia combines **Venice** (private AI inference) with **Ethereum** (public, verifiable agreements and escrow):

1. **Private contract understanding (Venice)**  
   - Users upload contracts (PDF/text) into a contract room.  
   - Concordia uses Venice’s no‑retention, privacy‑focused API to:
     - Summarize the contract in plain language.  
     - Highlight risky or unusual clauses.  
     - Classify the contract type (rent, freelance, employment, loan, SaaS, etc.).  
     - Optionally compare multiple offers side‑by‑side.

2. **Shared contract room for both parties**  
   - Each agreement has a room that both parties can join by connecting a wallet (and optionally ENS name).  
   - Contract text is encrypted in the browser (using the Agent's public key) and uploaded to IPFS.

3. **Onchain agreement + optional escrow (Ethereum)**  
   - When both parties are satisfied, they press “Agree”.  
   - A smart contract (`AgreementRoom`) records:
     - `partyA`, `partyB`,  
     - `contractIPFSHash`,  
     - `analysisHash`,
     - `timestamp`,  
     - current `status` (e.g., Pending, Analyzed, Active, Completed, Disputed).  
   - The contract creation emits a `RoomCreated` event.
   - For deals involving money (rent, freelance, loans), Concordia can create a flow using the Alkahest Escrow protocol.

4. **Truly Autonomous Agent (Protocol Labs Track)**
   - The Concordia AI Copilot is an independent worker script with its own ERC-8004 identity.
   - It runs an autonomous loop: it listens to the Ethereum blockchain for `RoomCreated` events.
   - When an event is detected, it fetches the contract from IPFS, decrypts it, privately analyzes it via Venice AI, encrypts the risks/summary for the parties, and submits a blockchain transaction back to the agreement room containing the final `analysisHash`.
   - This hits the strict Protocol Labs requirement: discover -> plan -> execute -> verify.
   - The Venice‑powered contract copilot is registered as an **ERC‑8004 agent identity** so others can see its profile + basic reputation.  
   - Parties can use **ENS names** instead of hex addresses when joining rooms and viewing agreements.  
   - **Self Agent ID** can be used to give the copilot a human‑backed, ZK‑verified identity before it’s allowed to auto‑propose or auto‑release any escrow.

## Who it’s for

Concordia is for anyone who regularly signs or issues contracts without a legal team, for example:

- Freelancers and clients  
- Tenants and landlords  
- Small startups and service providers (SaaS, agencies)  
- Creators and brands (sponsorships, licensing)  
- Friends/family doing personal loans

They get:

- A clear, plain‑language understanding of what they’re about to sign.  
- A simple neutral record onchain that both sides can verify later.  
- Optional escrow so funds only move according to transparent rules.

## What the v1 demo will show

The v1 hackathon demo focuses on an automated, entirely decentralized flow:

1. **Upload and Encrypt**  
   - User uploads a simple freelance contract or rental agreement.  
   - Frontend encrypts the document with the Copilot Agent's public key and uploads it directly to IPFS.

2. **Blockchain Room Creation**  
   - User creates an `AgreementRoom` on testnet, storing the `contractIPFSHash`. This emits a `RoomCreated` event.
   - The other party can join via a shareable link and wallet connect.

3. **Autonomous Agent Execution**  
   - The background Concordia Agent hears the `RoomCreated` event.
   - It fetches the IPFS file, decrypts it, reads it privately using Venice AI, and returns the risk summary.
   - It submits an on-chain transaction to the `AgreementRoom` updating the `analysisHash` and `status` to Analyzed.

4. **Two‑party Agreement + Escrow**  
   - Both users read the AI summary from the blockchain (via IPFS).
   - Both click “Agree”.  
   - Escrow funds are routed securely over the Alkahest escrow integration.

5. **Explorer and UI transparency**  
   - The UI provides an audit log showing exactly when the room was made, when the autonomous agent joined to analyze it, and when users agreed.

## How this fits Synthesis + Venice

- **Venice track — Private Agents, Trusted Actions**  
  - “Private cognition”: contract text and sensitive details stay in Venice’s private inference layer.  
  - “Trusted actions”: final agreements and escrow logic are enforced on Ethereum, visible to both parties.

- **Synthesis Open Track**  
  - Shows an end‑to‑end agent use case that keeps humans in control, uses Ethereum for trust, and solves a broad real‑world problem.

- **Optional partner integrations**  
  - **Protocol Labs / ERC‑8004**: give the Concordia contract‑copilot agent an onchain identity and basic reputation.  
  - **ENS**: show ENS names in rooms instead of raw hex addresses.  
  - **Self**: add ZK‑backed agent identity before allowing any automated escrow actions.

## Non‑goals for v1

To stay focused for the hackathon, v1 will **not** include:

- Full legal drafting or clause editing (it’s an explainer + helper, not a full lawyer).  
- Complex multi‑milestone escrow logic beyond a simple “fund → release/timeout” flow.  
- Deep DeFi integrations (Lido, Uniswap, etc.) beyond basic ETH/USDC handling where needed.

The goal is one clean, believable workflow that feels like a real product, not a giant unfinished platform.
