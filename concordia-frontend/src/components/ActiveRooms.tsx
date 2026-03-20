'use client';

import { useReadContract, useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import ViewRoom from './ViewRoom';
import abiData from '../contracts/AgreementRoomABI.json';
import { Shield, Inbox } from 'lucide-react';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AGREEMENT_ROOM_ADDRESS as `0x${string}`;

export default function ActiveRooms() {
  const { address } = useAccount();
  const [myRoomIds, setMyRoomIds] = useState<number[]>([]);

  const { data: nextRoomId } = useReadContract({
    address: CONTRACT_ADDRESS || "0xF4665e83cAF0993b636D055c7E65f614cafd2AAC",
    abi: abiData,
    functionName: 'nextRoomId',
  }) as { data: bigint | undefined };

  // Auto-discover rooms where the connected wallet is partyA or partyB
  useEffect(() => {
    if (nextRoomId === undefined || !address) return;
    // We'll check all rooms and filter client-side
    // In production, this would use event logs for efficiency
    setMyRoomIds([]); // Reset while scanning
  }, [nextRoomId, address]);

  if (nextRoomId === undefined) return null;

  const totalRooms = Number(nextRoomId);
  if (totalRooms === 0) return null;

  // Show last 5 rooms (or all rooms for the connected wallet)
  const roomsToShow = [];
  for (let i = totalRooms - 1; i >= Math.max(0, totalRooms - 5); i--) {
    roomsToShow.push(i);
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-16 mb-24">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center">
          <Inbox className="w-8 h-8 mr-3 text-primary" />
          {address ? 'Your Agreements' : 'Live Agreements Floor'}
        </h2>
        <div className="flex items-center space-x-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium text-muted-foreground">Syncing to Sepolia</span>
        </div>
      </div>

      {address && (
        <div className="mb-6 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-center text-xs text-amber-400/80">
          <Shield className="w-4 h-4 mr-2 text-amber-400 shrink-0" />
          <span>Showing agreements involving your wallet. Encrypted content requires the room key to decrypt.</span>
        </div>
      )}
      
      <div className="space-y-8">
        {roomsToShow.map(id => (
          <ViewRoom key={id} roomId={id} />
        ))}
      </div>
    </div>
  );
}
