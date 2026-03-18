import { NextResponse } from 'next/server';

// Force this route to run on Node.js, not edge
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // Use require to avoid build-time DOMMatrix error with dynamic imports
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdf = require('pdf-parse');
      const data = await pdf(buffer);
      return NextResponse.json({ text: data.text });
    } else {
      // For standard text-based files (txt, md, doc)
      const text = buffer.toString('utf-8');
      return NextResponse.json({ text });
    }
  } catch (error: any) {
    console.error("Extraction error:", error);
    return NextResponse.json({ error: "Failed to parse document" }, { status: 500 });
  }
}
