import { NextResponse } from 'next/server';
import { roomStore } from '../store';

/**
 * GET  /api/rooms/[id] — Get room state (both parties poll this)
 * POST /api/rooms/[id] — Add message or update room settings
 * 
 * Query params:
 *   ?since=<timestamp> — Only return messages after this timestamp (for efficient polling)
 *   ?chat_history=partyA|partyB — Return private chat history for the specified party
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = roomStore.get(id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const since = parseInt(url.searchParams.get('since') || '0');
  const chatHistoryParty = url.searchParams.get('chat_history');

  // Return private chat history for a specific party
  if (chatHistoryParty) {
    const history = chatHistoryParty === 'partyA' ? room.partyAChatHistory : room.partyBChatHistory;
    return NextResponse.json({ chatHistory: history });
  }

  // If polling with ?since, return the polling payload format
  if (url.searchParams.has('since')) {
    const newMessages = room.messages.filter(m => m.timestamp > since);
    return NextResponse.json({
      roomId: room.id,
      status: room.status,
      newMessages,
      messageCount: room.messages.length,
      roundNumber: room.roundNumber,
      agreedTerms: room.agreedTerms,
      partyAAutoMode: room.partyAAutoMode,
      partyBAutoMode: room.partyBAutoMode,
      partyAAgreed: room.partyAAgreed,
      partyBAgreed: room.partyBAgreed,
      onChainRoomId: room.onChainRoomId,
    });
  }

  // Full room state
  return NextResponse.json({
    roomId: room.id,
    documentText: room.documentText,
    partyAAddress: room.partyAAddress,
    partyBAddress: room.partyBAddress,
    messages: room.messages,
    status: room.status,
    roundNumber: room.roundNumber,
    agreedTerms: room.agreedTerms,
    partyAAutoMode: room.partyAAutoMode,
    partyBAutoMode: room.partyBAutoMode,
    partyAAgreed: room.partyAAgreed,
    partyBAgreed: room.partyBAgreed,
    onChainRoomId: room.onChainRoomId,
    createdAt: room.createdAt,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = roomStore.get(id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const body = await req.json();
  const { action } = body;

  switch (action) {
    case 'add_message': {
      const { from, message, round } = body;
      if (!from || !message) {
        return NextResponse.json({ error: "from and message required" }, { status: 400 });
      }
      const msg = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        from: from as 'partyA' | 'partyB' | 'system',
        message,
        timestamp: Date.now(),
        round: round || room.roundNumber,
      };
      room.messages.push(msg);
      room.roundNumber = round || room.roundNumber;
      if (room.status === 'waiting') room.status = 'negotiating';
      return NextResponse.json({ ok: true, message: msg, messageCount: room.messages.length });
    }

    case 'set_constraints': {
      const { party, constraints } = body;
      if (party === 'partyA') {
        room.partyAConstraints = constraints;
      } else {
        room.partyBConstraints = constraints;
      }
      return NextResponse.json({ ok: true });
    }

    case 'set_auto_mode': {
      const { party, enabled } = body;
      if (party === 'partyA') {
        room.partyAAutoMode = enabled;
      } else {
        room.partyBAutoMode = enabled;
      }
      return NextResponse.json({ ok: true });
    }

    case 'mark_agreed': {
      const { party } = body;
      if (party === 'partyA') room.partyAAgreed = true;
      if (party === 'partyB') room.partyBAgreed = true;
      return NextResponse.json({ ok: true, partyAAgreed: room.partyAAgreed, partyBAgreed: room.partyBAgreed });
    }

    case 'agree': {
      room.status = 'agreed';
      room.agreedTerms = body.terms || '';
      room.messages.push({
        id: `agree-${Date.now()}`,
        from: 'system',
        message: `🤝 Agreement reached! Both parties have accepted the terms.`,
        timestamp: Date.now(),
      });
      return NextResponse.json({ ok: true, status: room.status });
    }

    case 'set_on_chain_room_id': {
      const { onChainRoomId } = body;
      if (onChainRoomId === undefined || onChainRoomId === null) {
        return NextResponse.json({ error: "onChainRoomId required" }, { status: 400 });
      }
      room.onChainRoomId = Number(onChainRoomId);
      return NextResponse.json({ ok: true, onChainRoomId: room.onChainRoomId });
    }

    case 'save_chat_history': {
      const { party, messages: chatMessages } = body;
      if (!party || !chatMessages) {
        return NextResponse.json({ error: "party and messages required" }, { status: 400 });
      }
      if (party === 'partyA') {
        room.partyAChatHistory = chatMessages;
      } else {
        room.partyBChatHistory = chatMessages;
      }
      return NextResponse.json({ ok: true });
    }

    case 'set_agreed_terms': {
      const { terms } = body;
      if (!terms) {
        return NextResponse.json({ error: "terms required" }, { status: 400 });
      }
      room.agreedTerms = terms;
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
