/**
 * Global in-memory room store.
 * 
 * For the hackathon demo, this keeps room state in server memory.
 * Both parties poll the same room to get real-time message updates.
 * 
 * In production, this would be Redis/DB, but for a demo this is perfect
 * because it shows real-time agent-to-agent negotiation.
 */

export type RoomMessage = {
  id: string;
  from: 'partyA' | 'partyB' | 'system';
  message: string;
  timestamp: number;
  round?: number;
};

export type Room = {
  id: string;
  documentText: string;
  partyAAddress: string;
  partyBAddress: string;
  messages: RoomMessage[];
  partyAConstraints: string;
  partyBConstraints: string;
  partyAAutoMode: boolean;
  partyBAutoMode: boolean;
  status: 'waiting' | 'negotiating' | 'agreed' | 'disputed';
  agreedTerms: string;
  createdAt: number;
  roundNumber: number;
  partyAAgreed?: boolean;
  partyBAgreed?: boolean;
};

// Global store — persists as long as the Next.js dev server runs
const globalForRooms = globalThis as unknown as { rooms: Map<string, Room> };
if (!globalForRooms.rooms) {
  globalForRooms.rooms = new Map<string, Room>();
}

export const roomStore = globalForRooms.rooms;

export function createRoom(data: {
  documentText: string;
  partyAAddress: string;
  partyBAddress: string;
  partyAConstraints?: string;
}): Room {
  const id = generateRoomId();
  const room: Room = {
    id,
    documentText: data.documentText,
    partyAAddress: data.partyAAddress,
    partyBAddress: data.partyBAddress,
    messages: [],
    partyAConstraints: data.partyAConstraints || '',
    partyBConstraints: '',
    partyAAutoMode: false,
    partyBAutoMode: false,
    status: 'waiting',
    agreedTerms: '',
    createdAt: Date.now(),
    roundNumber: 0,
  };
  roomStore.set(id, room);
  return room;
}

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 10);
}
