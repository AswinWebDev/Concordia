import { NextResponse } from 'next/server';

const VENICE_API_KEY = process.env.VENICE_API_KEY;

/**
 * POST /api/chat  
 * Venice AI as an autonomous TOOL-USING agent.
 * Returns: { reply, actions, editDocument? }
 */
export async function POST(req: Request) {
  try {
    const { messages, documentText, currentStep } = await req.json();

    if (!VENICE_API_KEY) {
      return NextResponse.json({ reply: "Error: Venice API Key is not configured.", actions: [] }, { status: 500 });
    }

    // Detect if the user is asking for an edit-type action
    const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const isEditRequest = /\b(edit|rewrite|improve|draft|fix|change|update|modify|restructure|refine|redo|revise|make it|add clause|remove clause|professional|summarize for sharing)\b/i.test(lastMsg);
    const isAnalysisRequest = /\b(analyze|risk|red flag|review|check|evaluate|assess|dangerous|unfair|problem|issue)\b/i.test(lastMsg);

    const systemPrompt = `You are Concordia, an autonomous AI legal mediator and contract copilot.
You are in the user's PRIVATE channel — the other party CANNOT see this conversation.

## YOUR CURRENT DOCUMENT
${documentText ? `"""
${documentText.substring(0, 4000)}
"""` : "No document uploaded yet."}

## CURRENT STEP: ${currentStep || "drafting"}

## YOUR ROLE
You are NOT a generic chatbot. You are an autonomous agent that TAKES ACTIONS on the user's agreement.
${isEditRequest ? `
## CRITICAL: THE USER IS REQUESTING AN EDIT
You MUST include the FULL rewritten document text in your response under a section starting with "---DOCUMENT_EDIT---".
Do NOT just describe what to change. Actually write the COMPLETE updated document.
Put the full new document text after the marker. The system will use this to update the document.
` : ''}
${isAnalysisRequest ? `
## THE USER WANTS ANALYSIS
Provide a thorough analysis with specific clause references. Use bullet points. 
Flag red flags with ⚠️, good clauses with ✅, and suggestions with 💡.
After your analysis, suggest specific improvements the user can apply.
` : ''}

## RESPONSE GUIDELINES
- Use markdown formatting (bold, bullets, headers)
- Be specific and actionable, not vague
- Reference specific parts of the document when applicable
- If the document is empty and the user wants to draft something, write the ENTIRE document
- If the user asks you to edit: rewrite it and include the full text after ---DOCUMENT_EDIT---
- Always end with 2-3 specific next steps the user should take`;

    const veniceMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content }))
    ];

    const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VENICE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b',
        messages: veniceMessages,
        venice_parameters: {
          include_venice_system_prompt: false,
          enable_web_search: "off"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Venice API Error:", errorData);
      return NextResponse.json({ reply: "Venice AI encountered an error. Please try again.", actions: [] }, { status: response.status });
    }

    const data = await response.json();
    const rawReply = data.choices[0].message.content;

    // Extract document edit if Venice included one
    let reply = rawReply;
    let editDocument: string | null = null;
    
    const editMarker = '---DOCUMENT_EDIT---';
    if (rawReply.includes(editMarker)) {
      const parts = rawReply.split(editMarker);
      reply = parts[0].trim();
      editDocument = parts[1].trim();
      // Clean up any markdown code fences around the document
      if (editDocument) {
        editDocument = editDocument.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
      }
    }

    // Generate contextual suggestions
    const suggestions = getContextualSuggestions(documentText, currentStep, editDocument !== null);

    return NextResponse.json({
      reply,
      editDocument,
      actions: suggestions
    });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ reply: "Internal server error.", actions: [] }, { status: 500 });
  }
}

/** Generate suggestions based on state */
function getContextualSuggestions(doc: string, step: string, justEdited: boolean) {
  if (justEdited) {
    return [
      { label: '🔍 Analyze for Risks', action: 'analyze_risks' },
      { label: '📤 Share with Other Party', action: 'share' },
      { label: '✏️ Make More Changes', action: 'improve_language' }
    ];
  }
  if (!doc || doc.trim().length === 0) {
    return [
      { label: '📝 Draft a Freelance Contract', action: 'draft_freelance' },
      { label: '📝 Draft a Rental Agreement', action: 'draft_rental' },
      { label: '📝 Draft a Service Agreement', action: 'draft_service' }
    ];
  }
  if (step === 'draft' || !step) {
    return [
      { label: '🔍 Analyze for Risks', action: 'analyze_risks' },
      { label: '✏️ Improve Language', action: 'improve_language' },
      { label: '📋 Summarize for Sharing', action: 'summarize' },
      { label: '📤 Share with Other Party', action: 'share' }
    ];
  }
  if (step === 'negotiate') {
    return [
      { label: '🔒 Set My Bottom Line', action: 'set_constraints' },
      { label: '⚡ Let Venice Negotiate', action: 'autonomous_negotiate' }
    ];
  }
  return [
    { label: '✅ Finalize On-Chain', action: 'finalize' },
    { label: '📋 Review Final Terms', action: 'review_final' }
  ];
}
