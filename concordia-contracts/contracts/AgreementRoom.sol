// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgreementRoom
 * @dev A decentralized room for two parties to negotiate, agree on AI-analyzed contracts 
 * stored on IPFS, and finalize agreements on-chain.
 * 
 * The autonomous Concordia Agent (registered via ERC-8004) listens to RoomCreated events,
 * fetches encrypted contracts from IPFS, privately analyzes them via Venice AI,
 * and submits analysis hashes back on-chain.
 *
 * Tracks: Protocol Labs (ERC-8004), Venice (Private Agents), Synthesis Open Track
 */
contract AgreementRoom {
    
    enum RoomStatus { 
        Pending,      // Room created, waiting for agent analysis
        Analyzing,    // Agent is processing the contract
        Negotiating,  // Venice AI is mediating negotiation between parties
        Agreed,       // Both parties have accepted the terms
        Finalized,    // Deal is finalized on-chain
        Disputed      // One party has raised a dispute
    }

    struct Room {
        uint256 id;
        address partyA;
        address partyB;
        string contractIPFSHash;     // Original contract text (encrypted) on IPFS
        string analysisHash;         // Venice AI analysis on IPFS
        string finalTermsHash;       // Final negotiated terms on IPFS (set at agreement)
        uint256 createdAt;
        uint256 finalizedAt;
        RoomStatus status;
        bool partyAAgreed;
        bool partyBAgreed;
    }

    uint256 public nextRoomId;
    address public owner;
    address public agentAddress;     // The autonomous Concordia agent's wallet

    mapping(uint256 => Room) public rooms;

    // Events for the Autonomous Agent and frontend to listen to
    event RoomCreated(uint256 indexed roomId, address partyA, address partyB, string contractIPFSHash);
    event AgentRegistered(address indexed agent);
    event AnalysisSubmitted(uint256 indexed roomId, string analysisHash);
    event NegotiationUpdate(uint256 indexed roomId, string updateHash);
    event PartyAgreed(uint256 indexed roomId, address party);
    event AgreementFinalized(uint256 indexed roomId, string finalTermsHash, uint256 timestamp);
    event DisputeRaised(uint256 indexed roomId, address raisedBy);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == agentAddress, "Only the registered Concordia agent can call this");
        _;
    }

    modifier onlyParticipant(uint256 _roomId) {
        Room storage room = rooms[_roomId];
        require(msg.sender == room.partyA || msg.sender == room.partyB || msg.sender == agentAddress, "Not an authorized participant");
        _;
    }

    modifier onlyParty(uint256 _roomId) {
        Room storage room = rooms[_roomId];
        require(msg.sender == room.partyA || msg.sender == room.partyB, "Not a party to this room");
        _;
    }

    constructor(address _agentAddress) {
        owner = msg.sender;
        agentAddress = _agentAddress;
        emit AgentRegistered(_agentAddress);
    }

    /**
     * @dev Register or update the autonomous agent address.
     * This is the ERC-8004 identified agent that processes contracts.
     */
    function setAgentAddress(address _newAgent) external onlyOwner {
        agentAddress = _newAgent;
        emit AgentRegistered(_newAgent);
    }

    /**
     * @dev Step 1: User creates a room and invites a second party.
     * The contract is uploaded to IPFS (encrypted with agent's public key).
     */
    function createRoom(address _partyB, string memory _contractIPFSHash) external returns (uint256) {
        require(_partyB != address(0), "Invalid party B address");
        // Removed self-check to allow hackathon testing with a single wallet account
        
        uint256 roomId = nextRoomId++;
        
        rooms[roomId] = Room({
            id: roomId,
            partyA: msg.sender,
            partyB: _partyB,
            contractIPFSHash: _contractIPFSHash,
            analysisHash: "",
            finalTermsHash: "",
            createdAt: block.timestamp,
            finalizedAt: 0,
            status: RoomStatus.Pending,
            partyAAgreed: false,
            partyBAgreed: false
        });

        emit RoomCreated(roomId, msg.sender, _partyB, _contractIPFSHash);
        return roomId;
    }

    /**
     * @dev Step 2: The autonomous agent submits its private Venice AI analysis.
     * Only the registered agent can call this (ERC-8004 identity enforcement).
     */
    function submitAnalysis(uint256 _roomId, string memory _analysisHash) external onlyAgent {
        Room storage room = rooms[_roomId];
        require(room.status == RoomStatus.Pending || room.status == RoomStatus.Analyzing, "Room not awaiting analysis");
        
        room.analysisHash = _analysisHash;
        room.status = RoomStatus.Negotiating;

        emit AnalysisSubmitted(_roomId, _analysisHash);
    }

    /**
     * @dev Step 3: Log a negotiation update hash (encrypted IPFS payload hash).
     * Called by the agent or the parties to maintain decentralized state.
     */
    function logNegotiationUpdate(uint256 _roomId, string memory _updateHash) external onlyParticipant(_roomId) {
        Room storage room = rooms[_roomId];
        require(room.status == RoomStatus.Negotiating || room.status == RoomStatus.Pending, "Room not in negotiation");

        emit NegotiationUpdate(_roomId, _updateHash);
    }

    /**
     * @dev Step 4: Parties read the analysis and negotiation results, then agree.
     */
    function agree(uint256 _roomId, string memory _finalTermsHash) external onlyParty(_roomId) {
        Room storage room = rooms[_roomId];
        require(
            room.status == RoomStatus.Negotiating || room.status == RoomStatus.Agreed, 
            "Not ready for agreement"
        );

        // Store or update the final terms hash
        if (bytes(_finalTermsHash).length > 0) {
            room.finalTermsHash = _finalTermsHash;
        }

        if (msg.sender == room.partyA) {
            room.partyAAgreed = true;
        } else {
            room.partyBAgreed = true;
        }

        emit PartyAgreed(_roomId, msg.sender);

        // If first party agrees, move to Agreed status
        if (!room.partyAAgreed || !room.partyBAgreed) {
            room.status = RoomStatus.Agreed;
        }

        // If both agreed, finalize
        if (room.partyAAgreed && room.partyBAgreed) {
            room.status = RoomStatus.Finalized;
            room.finalizedAt = block.timestamp;
            emit AgreementFinalized(_roomId, room.finalTermsHash, block.timestamp);
        }
    }

    /**
     * @dev Either party can raise a dispute before finalization.
     */
    function raiseDispute(uint256 _roomId) external onlyParty(_roomId) {
        Room storage room = rooms[_roomId];
        require(room.status != RoomStatus.Finalized, "Cannot dispute a finalized agreement");
        require(room.status != RoomStatus.Pending, "Nothing to dispute yet");

        room.status = RoomStatus.Disputed;
        emit DisputeRaised(_roomId, msg.sender);
    }

    /**
     * @dev View function to get full room details (for frontend).
     */
    function getRoom(uint256 _roomId) external view returns (
        uint256 id,
        address partyA,
        address partyB,
        string memory contractIPFSHash,
        string memory analysisHash,
        string memory finalTermsHash,
        uint256 createdAt,
        uint256 finalizedAt,
        RoomStatus status,
        bool partyAAgreed,
        bool partyBAgreed
    ) {
        Room storage room = rooms[_roomId];
        return (
            room.id,
            room.partyA,
            room.partyB,
            room.contractIPFSHash,
            room.analysisHash,
            room.finalTermsHash,
            room.createdAt,
            room.finalizedAt,
            room.status,
            room.partyAAgreed,
            room.partyBAgreed
        );
    }
}
