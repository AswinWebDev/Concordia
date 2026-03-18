import { NextResponse } from 'next/server';
import { createRoom, roomStore } from './store';

/**
 * POST /api/rooms — Create a new negotiation room
 * GET  /api/rooms — List all rooms (for debugging)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { documentText, partyAAddress, partyBAddress, partyAConstraints } = body;

    if (!documentText || !partyAAddress || !partyBAddress) {
      return NextResponse.json({ error: "documentText, partyAAddress, and partyBAddress are required" }, { status: 400 });
    }

    const room = createRoom({ documentText, partyAAddress, partyBAddress, partyAConstraints });
    return NextResponse.json({ roomId: room.id, room });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const rooms = Array.from(roomStore.values()).map(r => ({
    id: r.id,
    status: r.status,
    messageCount: r.messages.length,
    createdAt: r.createdAt,
  }));
  return NextResponse.json({ rooms });
}
