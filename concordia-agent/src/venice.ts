import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const VENICE_API_KEY = process.env.VENICE_API_KEY;
const VENICE_API_URL = 'https://api.venice.ai/api/v1/chat/completions';

export async function analyzeContractPrivate(contractText: string): Promise<string> {
    if (!VENICE_API_KEY) {
        throw new Error("Missing VENICE_API_KEY in environment variables");
    }

    try {
        console.log(`[Venice AI] Starting private inference on contract...`);
        const response = await axios.post(
            VENICE_API_URL,
            {
                // We use their most capable model for complex contract reasoning
                model: 'llama-3.3-70b', 
                messages: [
                    {
                        role: "system",
                        content: `You are a legal AI Copilot focused on extreme privacy and consumer protection. 
Your goal is to analyze the provided contract and return a bulleted risk summary. 
You must flag any 'red flags', strange clauses, payment terms, and obligations.
Format exactly as Markdown and keep it concise.`
                    },
                    {
                        role: "user",
                        content: `Please analyze this contract:\n\n${contractText}`
                    }
                ],
                // CRITICAL FOR HACKATHON: explicitly demonstrating the Venice features
                venice_parameters: {
                    include_venice_system_prompt: false,
                    enable_web_search: false // fully self-contained private inference
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${VENICE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`[Venice AI] Inference completed successfully.`);
        return response.data.choices[0].message.content;

    } catch (error: any) {
        console.error("[Venice AI Error]", error.response?.data || error.message);
        throw error;
    }
}
