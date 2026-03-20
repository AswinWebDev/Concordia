'use client';
import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { Loader2, FileText, CheckCircle2, ShieldAlert, ExternalLink, Clock, AlertTriangle, Lock, Unlock } from 'lucide-react';
import abiData from '../contracts/AgreementRoomABI.json';
import { EnsAddress } from '../hooks/useEns';
import { decryptData, getRoomKey, extractKeyFromHash, saveRoomKey } from '../lib/crypto';

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_AGREEMENT_ROOM_ADDRESS || "0xF4665e83cAF0993b636D055c7E65f614cafd2AAC") as `0x${string}`;

const STATUS_CONFIG = [
  { label: "Pending AI Agent", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20" },
  { label: "Analyzing", color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
  { label: "Negotiating", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
  { label: "Agreed", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { label: "Finalized ✓", color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
  { label: "Disputed", color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
];

export default function ViewRoom({ roomId }: { roomId: number }) {
  const [analysis, setAnalysis] = useState('');
  const [contractText, setContractText] = useState('');
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingContract, setIsLoadingContract] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [decryptionFailed, setDecryptionFailed] = useState(false);
  const { address } = useAccount();

  const { data: room, isLoading: isLoadingRoom } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData,
    functionName: 'getRoom',
    args: [BigInt(roomId)],
  }) as { data: any, isLoading: boolean };

  const { writeContract, isPending } = useWriteContract();

  // Check for room key on mount — from URL hash or localStorage
  useEffect(() => {
    if (!room) return;
    const ipfsHash = room[3] as string;
    if (!ipfsHash) return;

    const hashRef = ipfsHash.substring(0, 12);
    
    // Try URL hash first
    const urlKey = extractKeyFromHash();
    if (urlKey) {
      saveRoomKey(hashRef, urlKey);
      setHasKey(true);
      // Clean the hash from the URL for security
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      return;
    }

    // Try localStorage
    const storedKey = getRoomKey(hashRef);
    if (storedKey) {
      setHasKey(true);
    }
  }, [room]);

  // Fetch and decrypt contract text
  useEffect(() => {
    if (room && room[3] && hasKey && !contractText) {
      fetchAndDecrypt(room[3], 'contract');
    }
  }, [room, hasKey, contractText]);

  // Fetch and decrypt analysis
  useEffect(() => {
    if (room && room[4] && hasKey && !analysis) {
      const statusNum = Number(room[8]);
      if (statusNum >= 2) {
        fetchAndDecrypt(room[4], 'analysis');
      }
    }
  }, [room, hasKey, analysis]);

  const fetchAndDecrypt = async (cid: string, type: 'contract' | 'analysis') => {
    if (!cid) return;
    
    if (type === 'contract') setIsLoadingContract(true);
    else setIsLoadingAnalysis(true);

    try {
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      const encryptedText = await res.text();

      // Get the room key
      const ipfsHash = room[3] as string;
      const hashRef = ipfsHash.substring(0, 12);
      const key = getRoomKey(hashRef);

      if (!key) {
        if (type === 'contract') setContractText('[Encrypted - requires room key]');
        else setAnalysis('[Encrypted - requires room key]');
        return;
      }

      try {
        const decrypted = await decryptData(encryptedText, key);
        if (type === 'contract') setContractText(decrypted);
        else setAnalysis(decrypted);
      } catch {
        // If decryption fails, the content might be unencrypted (legacy rooms)
        if (type === 'contract') setContractText(encryptedText);
        else setAnalysis(encryptedText);
      }
    } catch {
      if (type === 'contract') setContractText('Failed to load from IPFS.');
      else setAnalysis('Failed to load analysis from IPFS.');
    } finally {
      if (type === 'contract') setIsLoadingContract(false);
      else setIsLoadingAnalysis(false);
    }
  };

  const handleAgree = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: abiData,
      functionName: 'agree',
      args: [BigInt(roomId), ""],
    });
  };

  if (isLoadingRoom) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  if (!room || room[1] === "0x0000000000000000000000000000000000000000") return null;

  const status = Number(room[8]);
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG[0];
  const createdAt = Number(room[6]) * 1000;
  const finalizedAt = Number(room[7]) * 1000;
  const isParty = address && (address.toLowerCase() === room[1].toLowerCase() || address.toLowerCase() === room[2].toLowerCase());

  return (
    <div className="w-full p-6 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all shadow-xl hover:shadow-2xl hover:border-primary/30">
      <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
        <h3 className="text-xl font-bold flex items-center">
          <FileText className="mr-3 text-primary" /> Agreement Room #{roomId}
        </h3>
        <div className="flex items-center gap-2">
          {hasKey ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 flex items-center">
              <Unlock className="w-3 h-3 mr-1" /> Decrypted
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-amber-500/10 border-amber-500/20 text-amber-400 flex items-center">
              <Lock className="w-3 h-3 mr-1" /> Encrypted
            </span>
          )}
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${statusInfo.bg} ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6 p-4 bg-background/40 rounded-xl">
        <div className="flex flex-col space-y-2">
          <strong className="text-foreground">Party A (Creator)</strong>
          <EnsAddress address={room[1]} className="text-xs" />
          <span>{room[9] ? "✅ Agreed" : "⏳ Waiting"}</span>
        </div>
        <div className="flex flex-col space-y-2">
          <strong className="text-foreground">Party B (Counterparty)</strong>
          <EnsAddress address={room[2]} className="text-xs" />
          <span>{room[10] ? "✅ Agreed" : "⏳ Waiting"}</span>
        </div>
      </div>

      {/* Timestamps */}
      <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-4">
        <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> Created: {new Date(createdAt).toLocaleString()}</span>
        {finalizedAt > 0 && <span className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> Finalized: {new Date(finalizedAt).toLocaleString()}</span>}
      </div>

      {/* E2EE Contract Preview */}
      {contractText && (
        <div className="mt-4 p-4 rounded-xl border border-border/30 bg-muted/20">
          <h4 className="font-bold flex items-center text-sm mb-3 text-foreground/80">
            <FileText className="mr-2 w-4 h-4 text-primary" /> Contract Content
            {hasKey && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">E2E Decrypted</span>}
          </h4>
          <div className="prose prose-invert max-w-none text-sm p-4 bg-background/80 rounded-lg max-h-48 overflow-y-auto whitespace-pre-wrap font-mono border border-border/50 leading-relaxed">
            {contractText}
          </div>
        </div>
      )}

      {/* IPFS Links */}
      <div className="flex flex-wrap gap-2 mb-4 mt-4">
        {room[3] && (
          <a href={`https://gateway.pinata.cloud/ipfs/${room[3]}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center bg-primary/5 px-2 py-1 rounded-md border border-primary/20">
            <Lock className="w-3 h-3 mr-1" /> Encrypted Contract (IPFS) <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        )}
        {room[4] && (
          <a href={`https://gateway.pinata.cloud/ipfs/${room[4]}`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline flex items-center bg-emerald-500/5 px-2 py-1 rounded-md border border-emerald-500/20">
            <ShieldAlert className="w-3 h-3 mr-1" /> Analysis (IPFS) <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        )}
      </div>

      {/* Venice AI Analysis */}
      {status >= 2 && (
        <div className="mt-4 p-5 rounded-xl border border-primary/30 bg-primary/5">
          <h4 className="font-bold flex items-center text-primary mb-4">
            <ShieldAlert className="mr-2 w-5 h-5" /> Venice AI Private Risk Analysis
            {hasKey && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">E2E Decrypted</span>}
          </h4>
          {isLoadingAnalysis ? (
            <div className="flex items-center text-muted-foreground p-4"><Loader2 className="mr-3 animate-spin w-5 h-5"/> Fetching & Decrypting from IPFS...</div>
          ) : (
            <div className="prose prose-invert max-w-none text-sm p-5 bg-background/80 rounded-lg max-h-96 overflow-y-auto whitespace-pre-wrap font-mono border border-border/50 leading-relaxed">
              {analysis || "No analysis content found."}
            </div>
          )}
        </div>
      )}

      {/* Waiting for Agent */}
      {status <= 1 && (
        <div className="p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-500/90 mt-4 flex items-center font-medium">
          <Loader2 className="animate-spin w-6 h-6 mr-4" />
          The Concordia Autonomous Agent is decrypting & analyzing this contract via Venice AI...
        </div>
      )}

      {/* Agree Button */}
      {status >= 2 && status <= 3 && isParty && (!room[9] || !room[10]) && (
        <button 
          onClick={handleAgree}
          disabled={isPending}
          className="mt-6 w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all flex justify-center items-center shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 text-lg group"
        >
          {isPending ? <Loader2 className="animate-spin mr-3"/> : <CheckCircle2 className="mr-3 group-hover:scale-110 transition-transform"/>} 
          {isPending ? "Confirming On-Chain..." : "I Accept the Negotiated Terms"}
        </button>
      )}

      {/* Finalized */}
      {status === 4 && (
        <div className="mt-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-center font-medium flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 mr-2" /> Agreement finalized on Ethereum
        </div>
      )}

      {/* Disputed */}
      {status === 5 && (
        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center font-medium flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 mr-2" /> A dispute has been raised for this agreement
        </div>
      )}
    </div>
  );
}
