import { NextResponse } from 'next/server';

const VENICE_API_KEY = process.env.VENICE_API_KEY;

/**
 * POST /api/agent-loop
 * 
 * The AUTONOMOUS negotiation engine. This is the core of Concordia.
 * 
 * How it works:
 * 1. Receives both parties' private constraints + public negotiation history
 * 2. Venice generates the next negotiation message for the current turn
 * 3. Venice also decides: should the loop CONTINUE, PAUSE (ask human), or AGREE?
 * 4. The frontend calls this in a loop until Venice says AGREE or PAUSE
 * 
 * Venice sees ONLY the current party's constraints (never the other's).
 * This is the "agents that keep secrets" architecture.
 */
export async function POST(req: Request) {
  try {
    const { 
      currentTurn,      // 'partyA' or 'partyB'
      partyAConstraints, // Party A's private instructions (only used when currentTurn = partyA)
      partyBConstraints, // Party B's private instructions (only used when currentTurn = partyB)
      negotiationHistory, // Array of { from, message, timestamp }
      contractSummary,   // The agreement being negotiated
      roundNumber,       // Current round (1, 2, 3...)
      maxRounds,        // Maximum rounds before forcing a decision
    } = await req.json();

    if (!VENICE_API_KEY) {
      return NextResponse.json({ error: "Venice API Key not configured" }, { status: 500 });
    }

    const isPartyA = currentTurn === 'partyA';
    const myConstraints = isPartyA ? partyAConstraints : partyBConstraints;
    const myRole = isPartyA ? 'Party A (the proposing party)' : 'Party B (the counterparty)';
    const otherRole = isPartyA ? 'Party B' : 'Party A';
    const roundsLeft = (maxRounds || 6) - (roundNumber || 1);

    // Build the negotiation history as a readable conversation
    const historyText = negotiationHistory?.length > 0
      ? negotiationHistory.map((m: any) => `[${m.from === 'partyA' ? 'Party A' : 'Party B'}]: ${m.message}`).join('\n\n')
      : 'No messages yet. You are starting the negotiation.';

    const systemPrompt = `You are an autonomous AI negotiation agent acting as ${myRole}.
You are negotiating a contract/agreement on behalf of your principal (the human who gave you instructions).

## THE AGREEMENT BEING NEGOTIATED
${contractSummary || 'No specific agreement provided.'}

## WHO YOU ARE AND WHO THEY ARE
Read the Agreement and your Private Instructions carefully. Use them to deduce EXPLICITLY:
1. Which defined party YOU represent (e.g., if your instructions say "I am Rahul", you represent Rahul / the Client).
2. Which defined party the OTHER PARTY is (e.g., Ananya / the Freelancer).
CRITICAL: When writing your PUBLIC_MESSAGE, you MUST address the OTHER PARTY by their correct name/title, and sign off as your principal. NEVER address the message to yourself!

## YOUR PRIVATE INSTRUCTIONS (ABSOLUTE PRIORITY)
These are your secret instructions from your principal. You MUST obey them strictly! 
If the other party offers terms that are worse than your minimum or maximum constraints, YOU MUST REJECT THEIR TERMS and counter-offer. 
DO NOT AGREE to anything that violates these constraints under any circumstances.
"""
${myConstraints || 'No specific constraints given. Negotiate fairly.'}
"""

## NEGOTIATION HISTORY
${historyText}

## ROUND: ${roundNumber || 1} of ${maxRounds || 6}
Rounds remaining: ${roundsLeft}

## YOUR MISSION
1. Generate a strategic negotiation message to ${otherRole}
2. Your message should:
   - Identify if the other party's last message violates your Private Instructions.
   - If it violates your instructions, explicitly and professionally reject their terms and restate your demands.
   - If this is an opening message, start with your most ambitious target (e.g., the exact maximum/minimum they told you to ask for). Do not start with a middle-ground compromise.
   - NEVER reveal your bottom line or tell them you are an AI.
3. Decide whether to CONTINUE negotiating, PAUSE, or AGREE

## CRITICAL RULES
- **RULE OF SILENCE**: NEVER reveal your absolute maximum, minimum, or "bottom line" to the counterparty. Do NOT say "my max is X" or "I can't go below Y".
- **RULE OF BIDDING**: NEVER offer a number that is worse for you / more favorable to the other party than their current demand. (e.g., if you are the client and they ask for 1550, never offer 1580! Match them or offer less.)
- **RULE OF ANCHORING**: If you are paying (Client/Buyer), start exceedingly LOW. If you are receiving (Freelancer/Seller), start exceedingly HIGH. Make very small, incremental concessions.
- **DEFEND YOUR CONSTRAINTS**: Never cave in on your principal's hard limits under any circumstances.
- **BE ASSERTIVE**: You are a fierce negotiator, not a generic helpful assistant. Do not agree just to please them.
- **AGREEMENT RULES**: 
  - ONLY output AGREE if the other party has EXPLICITLY offered or accepted terms that satisfy ALL your private instructions in their LATEST message.
  - If you are still holding at your price and they are holding at theirs, that is NOT an agreement. Output CONTINUE.
  - Do NOT declare agreement based on your own proposal — the OTHER party must have accepted it.
  - If the last round has been reached and terms still differ, output PAUSE so the human can decide.

## RESPONSE FORMAT
Respond with EXACTLY this format, no other text:

PUBLIC_MESSAGE:
[Your message to the other party - this is what they will see]

PRIVATE_REASONING:
[Your strategic reasoning - only your principal sees this]

DECISION: [CONTINUE or PAUSE or AGREE]
${roundsLeft <= 1 ? '\nWARNING: This is the last round. If terms have NOT converged, output PAUSE so your principal can decide. Only output AGREE if the other party explicitly accepted your terms.' : ''}
PROPOSED_TERMS:
[If DECISION is AGREE, you MUST list the exact agreed terms with specific numbers/dates/details. If CONTINUE or PAUSE, state your current position.]`;


    const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VENICE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate your negotiation response as ${myRole}. Round ${roundNumber || 1}.` }
        ],
        venice_parameters: {
          include_venice_system_prompt: false,
          enable_web_search: "off"
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Venice Error:", err);
      return NextResponse.json({ error: "Venice API error" }, { status: response.status });
    }

    const data = await response.json();
    const raw = data.choices[0].message.content;

    // Parse the structured response
    const result = parseAgentResponse(raw, currentTurn, roundNumber);
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Agent loop error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function parseAgentResponse(raw: string, turn: string, round: number) {
  let publicMessage = '';
  let privateReasoning = '';
  let decision = 'CONTINUE';
  let proposedTerms = '';

  // Remove markdown bolding completely to make regex matching trivial
  const cleanRaw = raw.replace(/\*\*/g, '');

  // Extract PUBLIC_MESSAGE
  const pubMatch = cleanRaw.match(/PUBLIC[\s_]MESSAGE:?\s*([\s\S]*?)(?=PRIVATE[\s_]REASONING:?|DECISION:?|$)/i);
  if (pubMatch) publicMessage = pubMatch[1].trim();

  // Extract PRIVATE_REASONING
  const privMatch = cleanRaw.match(/PRIVATE[\s_]REASONING:?\s*([\s\S]*?)(?=DECISION:?|PUBLIC[\s_]MESSAGE:?|$)/i);
  if (privMatch) privateReasoning = privMatch[1].trim();

  // Extract DECISION
  const decMatch = cleanRaw.match(/DECISION:?\s*(CONTINUE|PAUSE|AGREE)/i);
  if (decMatch) decision = decMatch[1].toUpperCase();

  // Extract PROPOSED_TERMS
  const termsMatch = cleanRaw.match(/PROPOSED[\s_]TERMS:?\s*([\s\S]*?)$/i);
  if (termsMatch) proposedTerms = termsMatch[1].trim();

  // Fallback if parsing failed
  if (!publicMessage) {
    if (!privateReasoning) {
      publicMessage = cleanRaw.substring(0, 1000).trim();
    } else {
      publicMessage = "I am carefully reviewing the proposed terms and will respond shortly.";
    }
    decision = 'CONTINUE';
  }

  // Validate: AGREE requires non-empty proposedTerms
  if (decision === 'AGREE' && !proposedTerms.trim()) {
    decision = 'PAUSE';
    privateReasoning += '\n\n[System: Downgraded from AGREE to PAUSE because no specific terms were provided. Please review and decide.]';
  }

  return {
    publicMessage,
    privateReasoning,
    decision,
    proposedTerms,
    from: turn,
    round,
    raw // For debugging
  };
}
