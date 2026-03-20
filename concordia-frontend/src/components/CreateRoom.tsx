'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Loader2, Lock, Copy, CheckCircle2 } from 'lucide-react';
import abiData from '../contracts/AgreementRoomABI.json';
import { generateRoomKey, encryptData, saveRoomKey, deriveKeyFromAddress } from '../lib/crypto';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AGREEMENT_ROOM_ADDRESS as `0x${string}`;
const AGENT_ADDRESS = process.env.NEXT_PUBLIC_AGENT_ADDRESS || '';

export default function CreateRoom() {
  const [otherParty, setOtherParty] = useState('');
  const [contractText, setContractText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: hash, error, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const handleCreate = async () => {
    if (!otherParty || !contractText) return alert("Please fill in all fields");
    
    setIsUploading(true);
    try {
      // 1. Generate a symmetric E2EE key for this room
      const roomKey = await generateRoomKey();

      // 2. Encrypt the contract text locally in the browser
      const encryptedContent = await encryptData(contractText, roomKey);

      // 3. Encrypt the room key for the agent using a key derived from
      //    the agent's public Ethereum address (both sides know this address)
      const agentDerivedKey = await deriveKeyFromAddress(AGENT_ADDRESS);
      const agentEncryptedKey = await encryptData(roomKey, agentDerivedKey);

      // 4. Create a JSON envelope that bundles everything
      const envelope = JSON.stringify({
        v: 1,
        ciphertext: encryptedContent,
        agentEncryptedKey: agentEncryptedKey,
      });

      // 5. Upload the encrypted envelope to IPFS (server never sees plaintext)
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: envelope, name: `encrypted_contract_${Date.now()}.enc.json` })
      });
      const data = await res.json();
      
      if (!data.ipfsHash) throw new Error("Upload failed");

      // 4. Create the on-chain room
      writeContract({
        address: CONTRACT_ADDRESS || "0xF4665e83cAF0993b636D055c7E65f614cafd2AAC",
        abi: abiData,
        functionName: 'createRoom',
        args: [otherParty as `0x${string}`, data.ipfsHash],
      });

      // 5. Save the key locally and generate the shareable link
      // We use a temporary roomId based on the IPFS hash until the on-chain tx confirms
      const tempRoomRef = data.ipfsHash.substring(0, 12);
      saveRoomKey(tempRoomRef, roomKey);
      
      const link = `${window.location.origin}/workspace?room=${tempRoomRef}#key=${roomKey}`;
      setShareLink(link);

    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm shadow-2xl relative z-10">
      <h2 className="text-2xl font-bold mb-6">Create New Agreement Room</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Other Party Address</label>
          <input 
            type="text"
            className="w-full bg-background border border-input rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            placeholder="0x..."
            value={otherParty}
            onChange={(e) => setOtherParty(e.target.value)}
          />
        </div>

        <div>
           <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center">
             <Lock className="w-4 h-4 mr-1.5 text-amber-400" />
             Sensitive Agreement Terms
             <span className="text-[10px] ml-2 text-amber-400/60">(E2E Encrypted before upload)</span>
           </label>
           <textarea 
             className="w-full h-48 bg-background border border-input rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
             placeholder="Enter the sensitive terms of the agreement here. This will be encrypted locally in your browser and stored on IPFS..."
             value={contractText}
             onChange={(e) => setContractText(e.target.value)}
           />
        </div>

        <button 
          onClick={handleCreate}
          disabled={isPending || isUploading || isConfirming || !otherParty || !contractText}
          className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex justify-center items-center shadow-lg shadow-primary/20"
        >
          {isUploading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Encrypting & Uploading to IPFS...</> :
           isPending ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Confirming in Wallet...</> :
           isConfirming ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Waiting for block...</> :
           <><Lock className="w-5 h-5 mr-2" /> Create Encrypted Agreement Room</>}
        </button>

        {isConfirmed && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-sm mt-4 text-center font-medium">
            <CheckCircle2 className="w-5 h-5 inline mr-2" />
            Room created! The Autonomous Agent is now decrypting & analyzing the contract.
          </div>
        )}

        {shareLink && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mt-4">
            <p className="text-amber-400 text-xs font-bold mb-2 flex items-center">
              <Lock className="w-3.5 h-3.5 mr-1.5" /> Share this E2E Encrypted Link with Party B
            </p>
            <div className="flex items-center gap-2">
              <input 
                readOnly 
                value={shareLink} 
                className="flex-1 bg-background border border-amber-500/20 rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground truncate"
              />
              <button 
                onClick={copyLink}
                className="px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 flex items-center shrink-0"
              >
                {linkCopied ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
              </button>
            </div>
            <p className="text-[10px] text-amber-400/50 mt-2">
              ⚠️ The decryption key is in the #fragment — your server never sees it. Only someone with this exact link can read the contract.
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm mt-4 overflow-hidden text-ellipsis">
            Error: {(error as any).shortMessage || error.message}
          </div>
        )}
      </div>
    </div>
  );
}
