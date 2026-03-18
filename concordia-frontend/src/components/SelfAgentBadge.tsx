'use client';

import { Shield, ExternalLink, CheckCircle2 } from 'lucide-react';

/**
 * Self Agent ID Verification Badge
 * 
 * Displays the agent's verified identity via Self Protocol.
 * For the Self Agent ID hackathon track ($1,000 prize).
 * 
 * Self Protocol provides ZK-proof based identity verification
 * for AI agents, ensuring the agent's identity is cryptographically
 * verifiable without revealing private information.
 */

const SELF_AGENT_CONFIG = {
  participantId: "3aa68a98b4994c4bb088d8044ec1ea0c",
  teamId: "3f782982b43f43d48f72bd36bb23baeb",
  registrationTxn: "https://basescan.org/tx/0xd15420ae373f1fdeca4a8100867cbc40ce83ca7d9005c763002f7181eab6d0ed",
  agentName: "Concordia Autonomous Negotiator",
  agentWallet: "0x04F9EE7A6F2dBB9Deffa0cbbF7E1b9badBb108e4",
};

export function SelfAgentBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <a
        href={SELF_AGENT_CONFIG.registrationTxn}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all group"
        title="Self Protocol Verified Agent"
      >
        <Shield className="w-3 h-3" />
        <span>Self Verified</span>
        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
      <div className="flex items-center space-x-2 mb-3">
        <div className="p-1.5 rounded-lg bg-emerald-500/10">
          <Shield className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-emerald-400 flex items-center">
            Self Agent ID
            <CheckCircle2 className="w-3.5 h-3.5 ml-1.5" />
          </h4>
          <p className="text-[10px] text-muted-foreground">ZK-Verified Autonomous Agent Identity</p>
        </div>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Agent</span>
          <span className="font-mono text-foreground">{SELF_AGENT_CONFIG.agentName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Participant ID</span>
          <span className="font-mono text-emerald-400">{SELF_AGENT_CONFIG.participantId.slice(0, 12)}...</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Team ID</span>
          <span className="font-mono text-foreground">{SELF_AGENT_CONFIG.teamId.slice(0, 12)}...</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Wallet</span>
          <span className="font-mono text-foreground">{SELF_AGENT_CONFIG.agentWallet.slice(0, 6)}...{SELF_AGENT_CONFIG.agentWallet.slice(-4)}</span>
        </div>
      </div>

      <a
        href={SELF_AGENT_CONFIG.registrationTxn}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
      >
        Verify on Base <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

export { SELF_AGENT_CONFIG };
