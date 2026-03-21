import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { originalText, agreedTerms } = await req.json();

    if (!originalText || !agreedTerms) {
      return NextResponse.json({ error: 'Missing originalText or agreedTerms' }, { status: 400 });
    }

    const apiKey = process.env.VENICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Venice API key not configured' }, { status: 500 });
    }

    const systemPrompt = `You are an expert Legal Document Drafter and Contract Analyst.
Your task is to rewrite the original contract document strictly to incorporate the new "Agreed Terms" that were finalized during a negotiation.

RULES:
1. ONLY modify the clauses related to the Agreed Terms (e.g. rate, duration, scope).
2. PRESERVE the exact wording and structure of the original document for all other unrelated clauses (e.g., governing law, confidentiality).
3. DO NOT add any conversational filler, introductory remarks, or explanations. 
4. OUTPUT ONLY the final, rewritten legal document text, ready to be signed.`;

    const userPrompt = `ORIGINAL DOCUMENT:\n${originalText}\n\nAGREED TERMS (incorporate these into the document):\n${agreedTerms}`;

    const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // low temp for factual legal rewriting
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
        throw new Error(`Venice API error: ${response.statusText}`);
    }

    const data = await response.json();
    const rewrittenText = data.choices[0]?.message?.content?.trim();

    return NextResponse.json({ rewrittenText });
  } catch (error: any) {
    console.error('Rewrite API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
