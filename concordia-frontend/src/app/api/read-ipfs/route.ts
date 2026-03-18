import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cid = searchParams.get('cid');

  if (!cid) {
    return NextResponse.json({ error: "No CID provided" }, { status: 400 });
  }

  try {
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const res = await fetch(gatewayUrl);
    
    if (!res.ok) {
      // Fallback to public gateways if Pinata rate limits
      const fallbackUrl = `https://ipfs.io/ipfs/${cid}`;
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) throw new Error("Failed to fetch from IPFS gateways");
      const data = await fallbackRes.json();
      return NextResponse.json(data);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("IPFS read error:", error);
    return NextResponse.json({ error: "Failed to read from IPFS" }, { status: 500 });
  }
}
