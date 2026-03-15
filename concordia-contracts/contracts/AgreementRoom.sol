// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgreementRoom
 * @dev A truly decentralized room for parties to agree on AI-analyzed contracts 
 * stored on IPFS, hitting the Protocol Labs & Venice themes.
 */
contract AgreementRoom {
    
    enum RoomStatus { Pending, Analyzed, Active, Completed, Disputed }

    struct Room {
        uint256 id;
        address partyA;
        address partyB;
        string contractIPFSHash;
        string analysisHash;
        uint256 createdAt;
        RoomStatus status;
        bool partyAAgreed;
        bool partyBAgreed;
    }

    uint256 public nextRoomId;
    mapping(uint256 => Room) public rooms;

    // Events for our Autonomous Agent to listen to!
    event RoomCreated(uint256 indexed roomId, address partyA, address partyB, string contractIPFSHash);
    event AnalysisSubmitted(uint256 indexed roomId, string analysisHash);
    event PartyAgreed(uint256 indexed roomId, address party);
    event AgreementFinalized(uint256 indexed roomId);

    /**
     * @dev Step 1: User creates a room and invites a second party.
     * The contract is encrypted and stored on IPFS.
     */
    function createRoom(address _partyB, string memory _contractIPFSHash) external returns (uint256) {
        uint256 roomId = nextRoomId++;
        
        rooms[roomId] = Room({
            id: roomId,
            partyA: msg.sender,
            partyB: _partyB,
            contractIPFSHash: _contractIPFSHash,
            analysisHash: "",
            createdAt: block.timestamp,
            status: RoomStatus.Pending,
            partyAAgreed: false,
            partyBAgreed: false
        });

        emit RoomCreated(roomId, msg.sender, _partyB, _contractIPFSHash);
        return roomId;
    }

    /**
     * @dev Step 2: The background Autonomous Agent (powered by Venice) listens to `RoomCreated`, 
     * reads the IPFS file, runs the AI analysis, and posts the risk hash here.
     */
    function submitAnalysis(uint256 _roomId, string memory _analysisHash) external {
        Room storage room = rooms[_roomId];
        require(room.status == RoomStatus.Pending, "Room is not pending");
        
        // Note: For a strictly controlled environment, we can restrict this to the Agent's ERC-8004 identity address.
        // For the hackathon demo, we leave it open or hardcode the agent address.
        
        room.analysisHash = _analysisHash;
        room.status = RoomStatus.Analyzed;

        emit AnalysisSubmitted(_roomId, _analysisHash);
    }

    /**
     * @dev Step 3: Parties read the on-chain IPFS analysis and agree.
     */
    function agree(uint256 _roomId) external {
        Room storage room = rooms[_roomId];
        require(room.status == RoomStatus.Analyzed, "Analysis not submitted yet");
        require(msg.sender == room.partyA || msg.sender == room.partyB, "Not a party to this room");

        if (msg.sender == room.partyA) {
            room.partyAAgreed = true;
        } else {
            room.partyBAgreed = true;
        }

        emit PartyAgreed(_roomId, msg.sender);

        if (room.partyAAgreed && room.partyBAgreed) {
            room.status = RoomStatus.Active;
            emit AgreementFinalized(_roomId);
        }
    }
}
