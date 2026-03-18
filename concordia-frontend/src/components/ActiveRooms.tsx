'use client';

import { useReadContract } from 'wagmi';
import ViewRoom from './ViewRoom';
import abiData from '../contracts/AgreementRoomABI.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AGREEMENT_ROOM_ADDRESS as `0x${string}`;

export default function ActiveRooms() {
  const { data: nextRoomId } = useReadContract({
    address: CONTRACT_ADDRESS || "0xF4665e83cAF0993b636D055c7E65f614cafd2AAC",
    abi: abiData,
    functionName: 'nextRoomId',
  }) as { data: bigint | undefined };

  if (nextRoomId === undefined) return null;

  const totalRooms = Number(nextRoomId);
  if (totalRooms === 0) return null;

  // Show last 3 rooms starting from the most recent
  const roomsToShow = [];
  for (let i = totalRooms - 1; i >= Math.max(0, totalRooms - 3); i--) {
    roomsToShow.push(i);
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-16 mb-24">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          Live Agreements Floor
        </h2>
        <div className="flex items-center space-x-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium text-muted-foreground">Syncing to Sepolia</span>
        </div>
      </div>
      
      <div className="space-y-8">
        {roomsToShow.map(id => (
          <ViewRoom key={id} roomId={id} />
        ))}
      </div>
    </div>
  );
}
