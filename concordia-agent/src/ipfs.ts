import axios from 'axios';
import { PinataSDK } from "pinata-web3";
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// We will use the public gateway to fetch, and the secret keys to upload the analysis back
const pinata = new PinataSDK({
  pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT,
  pinataGateway: "gateway.pinata.cloud",
});

export async function fetchFromIPFS(cid: string): Promise<string> {
    try {
        console.log(`[IPFS] Fetching CID ${cid}...`);
        // For public gateways, we can just use HTTP. 
        // In a strict prod environment we'd use a dedicated gateway.
        const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
        console.log(`[IPFS] Successfully fetched underlying document.`);
        return response.data;
    } catch (error) {
        console.error(`[IPFS] Error fetching ${cid}:`, error);
        throw error;
    }
}

export async function uploadToIPFS(content: string, filename: string): Promise<string> {
    try {
        console.log(`[IPFS] Uploading ${filename} to IPFS...`);
        // Use Pinata SDK to upload the analysis string as a file
        const blob = new Blob([content], { type: "text/plain" });
        const file = new File([blob], filename, { type: "text/plain" });
        const upload = await pinata.upload.file(file);
        
        console.log(`[IPFS] Uploaded successfully. CID: ${upload.IpfsHash}`);
        return upload.IpfsHash;
    } catch (error) {
        console.error(`[IPFS] Error uploading ${filename}:`, error);
        throw error;
    }
}
