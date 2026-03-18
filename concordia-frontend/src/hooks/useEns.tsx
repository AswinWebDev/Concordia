'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

/**
 * ENS Name Resolution Hook
 * 
 * Resolves Ethereum addresses to ENS names (and vice versa) using the 
 * Ethereum mainnet ENS registry. For the ENS hackathon track ($600 prize).
 * 
 * Uses viem's built-in ENS support which queries the ENS registry 
 * contracts on mainnet automatically.
 */

// Mainnet client for ENS resolution (ENS only works on mainnet)
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth-mainnet.g.alchemy.com/v2/demo'),
});

// In-memory cache to avoid repeated lookups
const ensCache = new Map<string, string | null>();

/**
 * Hook to resolve an Ethereum address to its ENS name
 * Returns the ENS name (e.g., "vitalik.eth") or null if not found
 */
export function useEnsName(address: string | undefined) {
  const [ensName, setEnsName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      setEnsName(null);
      return;
    }

    const lowerAddr = address.toLowerCase();
    
    // Check cache first
    if (ensCache.has(lowerAddr)) {
      setEnsName(ensCache.get(lowerAddr) || null);
      return;
    }

    setIsLoading(true);
    (async () => {
      try {
        const name = await mainnetClient.getEnsName({
          address: address as `0x${string}`,
        });
        ensCache.set(lowerAddr, name);
        setEnsName(name);
      } catch {
        ensCache.set(lowerAddr, null);
        setEnsName(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [address]);

  return { ensName, isLoading };
}

/**
 * Hook to resolve an ENS name to an Ethereum address
 * Returns the address or null if the name doesn't resolve
 */
export function useEnsAddress(name: string | undefined) {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!name || !name.includes('.')) {
      setAddress(null);
      return;
    }

    setIsLoading(true);
    (async () => {
      try {
        const normalized = normalize(name);
        const addr = await mainnetClient.getEnsAddress({ name: normalized });
        setAddress(addr);
      } catch {
        setAddress(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [name]);

  return { address, isLoading };
}

/**
 * Utility to format an address with ENS name
 * Returns "name.eth (0x1234...5678)" or "0x1234...5678" if no ENS
 */
export function formatAddressWithEns(address: string, ensName: string | null): string {
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
  return ensName ? `${ensName} (${short})` : short;
}

/**
 * Utility component to display an address with ENS resolution
 */
export function EnsAddress({ address, className = '' }: { address: string; className?: string }) {
  const { ensName, isLoading } = useEnsName(address);

  if (isLoading) {
    return <span className={`font-mono text-muted-foreground ${className}`}>{address.slice(0, 6)}...{address.slice(-4)}</span>;
  }

  if (ensName) {
    return (
      <span className={`${className}`} title={address}>
        <span className="font-semibold text-foreground">{ensName}</span>
        <span className="text-muted-foreground/50 ml-1 text-[10px] font-mono">({address.slice(0, 6)}...{address.slice(-4)})</span>
      </span>
    );
  }

  return <span className={`font-mono text-muted-foreground ${className}`}>{address.slice(0, 6)}...{address.slice(-4)}</span>;
}
