import { NextResponse } from 'next/server';
import { PinataSDK } from "pinata-web3";

const pinata = new PinataSDK({
  pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT || "",
  pinataGateway: "gateway.pinata.cloud"
});

export async function POST(request: Request) {
  try {
    const { content, name } = await request.json();
    if (!content) return NextResponse.json({ error: "No content provided" }, { status: 400 });

    const blob = new Blob([content], { type: "text/plain" });
    const file = new File([blob], name || `contract_${Date.now()}.txt`, { type: "text/plain" });
    
    const upload = await pinata.upload.file(file);
    
    return NextResponse.json({ ipfsHash: upload.IpfsHash });
  } catch (error) {
    console.error("Pinata upload error:", error);
    return NextResponse.json({ error: "Failed to upload to IPFS" }, { status: 500 });
  }
}
