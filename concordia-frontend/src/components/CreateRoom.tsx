'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Loader2 } from 'lucide-react';
import abiData from '../contracts/AgreementRoomABI.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AGREEMENT_ROOM_ADDRESS as `0x${string}`;

export default function CreateRoom() {
  const [otherParty, setOtherParty] = useState('');
  const [contractText, setContractText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { data: hash, error, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const handleCreate = async () => {
    if (!otherParty || !contractText) return alert("Please fill down all fields");
    
    setIsUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contractText })
      });
      const data = await res.json();
      
      if (!data.ipfsHash) throw new Error("Upload failed");
      
      writeContract({
        address: CONTRACT_ADDRESS || "0xF4665e83cAF0993b636D055c7E65f614cafd2AAC",
        abi: abiData,
        functionName: 'createRoom',
        args: [otherParty as `0x${string}`, data.ipfsHash],
      });
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsUploading(false);
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
           <label className="block text-sm font-medium text-muted-foreground mb-2">Sensitive Agreement Terms</label>
           <textarea 
             className="w-full h-48 bg-background border border-input rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
             placeholder="Enter the sensitive terms of the agreement here. This will be encrypted and stored on IPFS..."
             value={contractText}
             onChange={(e) => setContractText(e.target.value)}
           />
        </div>

        <button 
          onClick={handleCreate}
          disabled={isPending || isUploading || isConfirming || !otherParty || !contractText}
          className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex justify-center items-center shadow-lg shadow-primary/20"
        >
          {isUploading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Uploading to IPFS...</> :
           isPending ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Confirming in Wallet...</> :
           isConfirming ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Waiting for block...</> :
           "Create Agreement Room"}
        </button>

        {isConfirmed && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-sm mt-4 text-center font-medium">
            Room created successfully! The Autonomous Agent is now reading the contract.
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
