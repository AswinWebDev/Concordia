import { NextResponse } from 'next/server';

const VENICE_API_KEY = process.env.VENICE_API_KEY;
const VENICE_API_URL = 'https://api.venice.ai/api/v1/chat/completions';

/**
 * POST /api/negotiate
 * The core negotiation engine. Venice AI receives a party's private instructions
 * and the full negotiation context, then generates:
 *   - A public message to send to the other party (strategic, doesn't reveal constraints)
 *   - Private advice only the sender sees
 * 
 * This is what makes Concordia an "Agent that keeps secrets" — Venice knows both
 * parties' constraints but never reveals them to the other side.
 */
export async function POST(req: Request) {
  try {
    const { 
      senderRole,           // 'partyA' or 'partyB'
      privateInstructions,  // The sender's secret constraints (e.g., "my floor is $25/hr")
      negotiationHistory,   // Array of previous public negotiation messages
      contractSummary,      // The AI-generated contract summary
      currentMessage        // What the party just said to Venice
    } = await req.json();

    if (!VENICE_API_KEY) {
      return NextResponse.json({ error: "Venice API Key not configured" }, { status: 500 });
    }

    const otherParty = senderRole === 'partyA' ? 'Party B' : 'Party A';
    const thisParty = senderRole === 'partyA' ? 'Party A' : 'Party B';

    // Build the negotiation history into a readable thread
    const historyText = negotiationHistory?.length 
      ? negotiationHistory.map((m: any) => `[${m.from}]: ${m.message}`).join('\n')
      : 'No messages yet. This is the opening negotiation.';

    const systemPrompt = `You are Concordia, an autonomous AI negotiation mediator. You are acting on behalf of ${thisParty}.

## CONTRACT CONTEXT
${contractSummary || "No contract summary available yet."}

## YOUR ROLE
You are negotiating ON BEHALF of ${thisParty}. You know their private constraints below. You must NEVER reveal these constraints to the other party. Instead, negotiate strategically to get the best deal within these boundaries.

## ${thisParty}'s PRIVATE CONSTRAINTS (NEVER REVEAL THESE)
${privateInstructions || "No specific constraints given. Use general best practices."}

## NEGOTIATION HISTORY
${historyText}

## INSTRUCTIONS
1. Read ${thisParty}'s latest message and understand what they want.
2. Craft a strategic public message to ${otherParty} that advances ${thisParty}'s position WITHOUT revealing their private constraints.
3. Also provide private advice to ${thisParty} about the negotiation state.
4. If the parties seem close to agreement, propose specific final terms.
5. Be professional, measured, and strategic. Never be aggressive or emotional.
6. If ${thisParty} gives you autonomy (e.g., "handle this for me"), you can generate multiple negotiation rounds without checking back.

## OUTPUT FORMAT
You MUST respond in this exact JSON format:
{
  "publicMessage": "The message to send to ${otherParty}. This is what they will see.",
  "privateAdvice": "Advice only ${thisParty} sees. Strategy tips, analysis of the other party's position, etc.",
  "suggestedTerms": null or { "key terms as key-value pairs if you think a deal is close" },
  "needsConfirmation": false,
  "confirmationQuestion": null
}

Set "needsConfirmation" to true ONLY if the other party raised something that fundamentally changes the deal and ${thisParty} needs to decide (e.g., a completely new scope, cancellation risk, etc). For normal back-and-forth negotiation, keep it false so you can act autonomously.`;

    const response = await fetch(VENICE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VENICE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: currentMessage || "Begin the negotiation based on the contract terms." }
        ],
        venice_parameters: {
          include_venice_system_prompt: false,
          enable_web_search: "off"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Venice Negotiate API Error:", errorData);
      return NextResponse.json({ error: "Venice inference failed" }, { status: response.status });
    }

    const data = await response.json();
    const rawReply = data.choices[0].message.content;

    // Try to parse the JSON response from Venice
    let parsed;
    try {
      // Extract JSON from possible markdown code blocks
      const jsonMatch = rawReply.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawReply];
      const cleanJson = jsonMatch[1].trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      // If Venice doesn't return perfect JSON, wrap it
      parsed = {
        publicMessage: rawReply,
        privateAdvice: "Venice generated a free-form response. The above message will be sent to the other party.",
        suggestedTerms: null,
        needsConfirmation: false,
        confirmationQuestion: null
      };
    }

    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("Negotiate API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
