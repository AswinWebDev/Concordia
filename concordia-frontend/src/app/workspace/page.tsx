'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Send, Upload, FileText, Bot, User, CheckCircle2,
  Loader2, Share2, ArrowLeft, Lock, Sparkles, ArrowRight,
  PenLine, Shield, ChevronRight, MessageSquare, Handshake,
  UserPlus, Zap, Copy, Play, Pause, AlertTriangle, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import ReactMarkdown from 'react-markdown';
import abiData from '../../contracts/AgreementRoomABI.json';

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <Workspace />
    </Suspense>
  );
}

// ====== TYPES ======
type NegotiationMessage = { id: string; from: 'partyA' | 'partyB' | 'system'; message: string; timestamp: number; round?: number };
type ChatMessage = { id: string; role: 'user' | 'assistant' | 'system'; content: string; suggestions?: Array<{ label: string; action: string }>; pendingEdit?: string };

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_AGREEMENT_ROOM_ADDRESS || "0xafF5030fA5Ed5120E29C75b9F4779647e71ddc55") as `0x${string}`;
const MAX_ROUNDS = 6;
const POLL_INTERVAL = 2500; // Poll every 2.5s

function Workspace() {
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const joinRoomId = searchParams?.get('room');

  // ====== PHASE STATE ======
  const [phase, setPhase] = useState<'setup' | 'workspace'>('setup');
  const [otherParty, setOtherParty] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [currentRole, setCurrentRole] = useState<'partyA' | 'partyB'>('partyA');

  // ====== ROOM STATE (shared via server) ======
  const [roomId, setRoomId] = useState<string | null>(null);
  const [negotiationHistory, setNegotiationHistory] = useState<NegotiationMessage[]>([]);
  const [roomStatus, setRoomStatus] = useState<string>('waiting');
  const [agreedTerms, setAgreedTerms] = useState('');
  const [partyAAgreed, setPartyAAgreed] = useState(false);
  const [partyBAgreed, setPartyBAgreed] = useState(false);

  // ====== LOCAL STATE ======
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [myConstraints, setMyConstraints] = useState('');
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isWaitingForAgent, setIsWaitingForAgent] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const lastPollTimestamp = useRef(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRespondingRef = useRef(false); // Prevent double-responding

  // On-chain
  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const negEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  useEffect(() => { negEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [negotiationHistory]);

  // ====== PARTY B: JOIN EXISTING ROOM ======
  useEffect(() => {
    if (!joinRoomId) return;
    const savedRole = localStorage.getItem(`role_${joinRoomId}`) as 'partyA' | 'partyB' | null;
    const roleToUse = savedRole || 'partyB';
    setCurrentRole(roleToUse);

    (async () => {
      try {
        const res = await fetch(`/api/rooms/${joinRoomId}`);
        if (!res.ok) throw new Error('Room not found');
        const room = await res.json();
        setRoomId(joinRoomId);
        setDocumentText(room.documentText || '');
        setOtherParty(room.partyAAddress || '');
        setNegotiationHistory(room.messages || []);
        setRoomStatus(room.status);
        if (room.partyAAgreed) setPartyAAgreed(room.partyAAgreed);
        if (room.partyBAgreed) setPartyBAgreed(room.partyBAgreed);
        setPhase('workspace');
        lastPollTimestamp.current = room.messages?.length > 0
          ? room.messages[room.messages.length - 1].timestamp : 0;

        const savedConstraints = localStorage.getItem(`constraints_${joinRoomId}`);
        if (savedConstraints) {
           setMyConstraints(savedConstraints);
        }

        const isA = roleToUse === 'partyA';
        setChatMessages([{
          id: '1', role: 'assistant',
          content: isA 
            ? `📄 **You've reconnected to the negotiation room.**\n\nYour agreement is loaded. I am ready to continue whenever you say "go negotiate".`
            : `📄 **You've been invited to negotiate.**\n\nThe agreement is loaded on the left. Before I negotiate on your behalf, I need to know:\n\n1. **What are your terms?** (minimum rate, timeline, etc.)\n2. **What should I NOT reveal?**\n3. **What's negotiable?**\n\nTell me your constraints, then say **"go negotiate"** and I'll handle the rest.`,
          suggestions: isA ? [{ label: '⚡ Start Negotiating', action: 'start_negotiate' }] : [{ label: '🔍 Analyze Agreement First', action: 'analyze_risks' }]
        }]);
      } catch (e) {
        console.error("Failed to join room:", e);
        alert("Room not found. The link may be invalid.");
      }
    })();
  }, [joinRoomId]);

  // ====== POLLING: watch for new messages from the other party ======
  useEffect(() => {
    if (!roomId || phase !== 'workspace') return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}?since=${lastPollTimestamp.current}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.newMessages && data.newMessages.length > 0) {
          setNegotiationHistory(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const truly_new = data.newMessages.filter((m: NegotiationMessage) => !existingIds.has(m.id));
            if (truly_new.length === 0) return prev;
            return [...prev, ...truly_new];
          });

          const latest = data.newMessages[data.newMessages.length - 1];
          lastPollTimestamp.current = latest.timestamp;

          // If the latest message is from the OTHER party and I'm in auto-mode, respond
          const otherPartyRole = currentRole === 'partyA' ? 'partyB' : 'partyA';
          if (latest.from === otherPartyRole && isAutoMode && !isRespondingRef.current) {
            autoRespond(data.newMessages);
          }
        }

        // Update room status
        if (data.status) setRoomStatus(data.status);
        if (data.agreedTerms) setAgreedTerms(data.agreedTerms);
        if (data.partyAAgreed !== undefined) setPartyAAgreed(data.partyAAgreed);
        if (data.partyBAgreed !== undefined) setPartyBAgreed(data.partyBAgreed);
      } catch (e) {
        console.error("Poll error:", e);
      }
    };

    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [roomId, phase, isAutoMode, currentRole, myConstraints, documentText, negotiationHistory]);

  // ====== AUTO-RESPOND when other party sends a message ======
  const autoRespond = async (newMessages: NegotiationMessage[]) => {
    if (isRespondingRef.current) return;
    isRespondingRef.current = true;
    setIsWaitingForAgent(true);

    try {
      // Get full history including new messages
      const fullHistory = [...negotiationHistory, ...newMessages.filter(m => !negotiationHistory.find(h => h.id === m.id))];

      addSystemChat(`🤖 **Responding to ${currentRole === 'partyA' ? "Party B's" : "Party A's"} message...**`);

      const res = await fetch('/api/agent-loop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentTurn: currentRole,
          partyAConstraints: currentRole === 'partyA' ? myConstraints : '',
          partyBConstraints: currentRole === 'partyB' ? myConstraints : '',
          negotiationHistory: fullHistory,
          contractSummary: documentText.substring(0, 3000),
          roundNumber: Math.ceil(fullHistory.length / 2) + 1,
          maxRounds: MAX_ROUNDS,
        })
      });

      if (!res.ok) throw new Error("Agent API error");
      const data = await res.json();

      // Post the public message to the shared room
      const msgRes = await fetch(`/api/rooms/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_message',
          from: currentRole,
          message: data.publicMessage,
          round: Math.ceil(fullHistory.length / 2) + 1,
        })
      });

      if (!msgRes.ok) {
         addSystemChat('❌ Error: Failed to post response to the shared room.');
         setIsAutoMode(false);
      }

      // Show private reasoning
      if (data.privateReasoning) {
        addSystemChat(`🧠 **My Strategy:**\n${data.privateReasoning}`);
      }

      // Handle decision
      if (data.decision === 'AGREE') {
        addSystemChat(`✅ **I believe we've reached an agreement!**\n\n**Terms:** ${data.proposedTerms || 'See the negotiation thread.'}`, [
          { label: '✅ Accept & Finalize', action: 'finalize' },
          { label: '🔄 Keep Negotiating', action: 'continue_negotiate' }
        ]);
        setIsAutoMode(false);
      } else if (data.decision === 'PAUSE') {
        addSystemChat(`⏸️ **I need your guidance.**\n\n${data.privateReasoning || 'Should I accept these terms or push further?'}`, [
          { label: '▶️ Continue', action: 'continue_negotiate' },
          { label: '✅ Accept Terms', action: 'accept_terms' }
        ]);
        setIsAutoMode(false);
      }
    } catch (e) {
      console.error("Auto-respond error:", e);
      addSystemChat('❌ Agent response failed. Click to retry.', [
        { label: '🔄 Retry', action: 'continue_negotiate' }
      ]);
    } finally {
      setIsWaitingForAgent(false);
      isRespondingRef.current = false;
    }
  };

  // ====== INITIATE NEGOTIATION (send first message) ======
  const initiateNegotiation = async (latestConstraints?: string) => {
    const activeConstraints = latestConstraints || myConstraints;
    if (!activeConstraints.trim()) {
      addSystemChat(
        `⚠️ **I need your constraints first!** Tell me:\n- What's your minimum/maximum rate/price?\n- What terms are non-negotiable?\n- What can you compromise on?\n- What should I NOT reveal to the other party?\n\nExample: *"My minimum rate is $40/hr but try to get $50. Don't tell them I'd go below $45."*`
      );
      return;
    }
    if (!roomId) {
      addSystemChat('⚠️ Share the agreement first to create a room.');
      return;
    }

    setIsWaitingForAgent(true);
    setIsAutoMode(true);

    // Tell the server we're in auto mode
    await fetch(`/api/rooms/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_auto_mode', party: currentRole, enabled: true })
    });

    // Store constraints
    await fetch(`/api/rooms/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_constraints', party: currentRole, constraints: activeConstraints })
    });

    addSystemChat(`⚡ **Autonomous negotiation activated.**\n\n🔒 Your constraints are stored privately.\n📡 I'll respond to the other party's messages automatically.\n👁️ You'll see my strategy reasoning here.\n\n_Waiting for the other party or sending opening message..._`);

    // Filter out system messages
    const realHistory = negotiationHistory.filter(m => m.from !== 'system');

    // If no messages yet, send opening message (Only Party A does this)
    if (realHistory.length === 0) {
      if (currentRole === 'partyA') {
        try {
          const res = await fetch('/api/agent-loop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentTurn: currentRole,
              partyAConstraints: myConstraints,
              partyBConstraints: '',
              negotiationHistory: [],
              contractSummary: documentText.substring(0, 3000),
              roundNumber: 1,
              maxRounds: MAX_ROUNDS,
            })
          });

          if (!res.ok) throw new Error("Agent API error");
          const data = await res.json();

          // Post to shared room
          const msgRes = await fetch(`/api/rooms/${roomId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_message',
              from: currentRole,
              message: data.publicMessage,
              round: 1,
            })
          });

          if (!msgRes.ok) {
             addSystemChat('❌ Error: Failed to post opening message to the shared room.');
             setIsAutoMode(false);
          }

          if (data.privateReasoning) {
            addSystemChat(`🧠 **Opening Strategy:**\n${data.privateReasoning}`);
          }
        } catch (e) {
          addSystemChat('❌ Failed to send opening message.', [
            { label: '🔄 Retry', action: 'continue_negotiate' }
          ]);
        }
      }
      setIsWaitingForAgent(false);
    } else {
      // There are existing messages! Check if we need to reply immediately
      const lastMsg = realHistory[realHistory.length - 1];
      const otherRole = currentRole === 'partyA' ? 'partyB' : 'partyA';
      setIsWaitingForAgent(false); // autoRespond manages this
      
      if (lastMsg.from === otherRole) {
        // The last message is from the other party. We must respond!
        isRespondingRef.current = false;
        autoRespond([]);
      }
    }
  };

  // ====== FILE DROP ======
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/extract', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.text) setDocumentText(prev => prev ? prev + '\n\n' + data.text : data.text);
    } catch { alert("Failed to extract."); }
    finally { setIsExtracting(false); }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt', '.md'] }, noClick: true, noKeyboard: true });

  // ====== HELPERS ======
  function addSystemChat(content: string, suggestions?: Array<{ label: string; action: string }>) {
    setChatMessages(prev => [...prev, { id: `${Date.now()}-${Math.random().toString(36).substring(7)}`, role: 'system' as const, content, suggestions }]);
  }

  // ====== CHAT with Venice (private) ======
  const handleChat = async (overrideMessage?: string) => {
    const msg = overrideMessage || chatInput.trim();
    if (!msg) return;

    setChatMessages(prev => [...prev, { id: `${Date.now()}-${Math.random().toString(36).substring(7)}`, role: 'user', content: msg }]);
    if (!overrideMessage) setChatInput('');

    // Normal Venice chat
    setIsTyping(true);
    try {
      const allMessages = [...chatMessages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: msg }];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, documentText, currentStep: roomStatus })
      });
      const data = await res.json();
      
      let replyContent = data.reply || 'Something went wrong.';

      // Check for autonomous constraint extraction
      const constraintMatch = replyContent.match(/<UPDATE_CONSTRAINTS>([\s\S]*?)<\/UPDATE_CONSTRAINTS>/i);
      let latestConstraints = myConstraints;
      if (constraintMatch) {
         latestConstraints = constraintMatch[1].trim();
         setMyConstraints(latestConstraints);
         if (roomId) localStorage.setItem(`constraints_${roomId}`, latestConstraints);
         replyContent = replyContent.replace(constraintMatch[0], '').trim();
      }
      
      // Check for manual Start action from LLM
      const shouldStartNegotiation = replyContent.includes('<ACTION:START_NEGOTIATION>');
      if (shouldStartNegotiation) {
        replyContent = replyContent.replace('<ACTION:START_NEGOTIATION>', '').trim();
      }

      setChatMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`, role: 'assistant', content: replyContent,
        suggestions: data.actions || [],
        pendingEdit: data.editDocument || undefined
      }]);

      if (shouldStartNegotiation) {
        if (!documentText.trim()) {
          addSystemChat('⚠️ I need an agreement first. Paste one on the left or let me draft one.');
          return;
        }
        if (!roomId) {
           addSystemChat('📤 Let me share the agreement first to create a room for negotiation...');
           await handleShare();
           await new Promise(r => setTimeout(r, 500));
        }
        initiateNegotiation(latestConstraints);
      }
      
    } catch {
      addSystemChat('❌ Failed to reach Venice AI.');
    } finally {
      setIsTyping(false);
    }
  };

  // ====== ACCEPT EDIT ======
  const handleAcceptEdit = (msgId: string, newText: string) => {
    setDocumentText(newText);
    setChatMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, pendingEdit: undefined, content: m.content + '\n\n✅ *Edit applied.*' } : m
    ));
  };

  // ====== SHARE (create room) ======
  const handleShare = async () => {
    if (!documentText.trim()) { alert('Write or upload an agreement first.'); return; }
    setIsSaving(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          partyAAddress: address || otherParty,
          partyBAddress: otherParty,
          partyAConstraints: myConstraints,
        })
      });
      const data = await res.json();
      if (data.roomId) {
        setRoomId(data.roomId);
        const url = `${window.location.origin}/workspace?room=${data.roomId}`;
        setShareUrl(url);
        window.history.replaceState(null, '', `?room=${data.roomId}`);
        localStorage.setItem(`role_${data.roomId}`, 'partyA');
        if (myConstraints) localStorage.setItem(`constraints_${data.roomId}`, myConstraints);
        navigator.clipboard.writeText(url);
        addSystemChat(
          `📤 **Room created! Link copied.**\n\n\`${url}\`\n\nSend this to the other party. When they open it, they'll see the agreement and can give their agent instructions.\n\nOnce both agents have constraints, the negotiation runs automatically.`,
          [
            { label: '⚡ Start Negotiating', action: 'start_negotiate' },
            { label: '🔒 Set My Constraints First', action: 'set_constraints' }
          ]
        );
      }
    } catch { alert('Failed to create room.'); }
    finally { setIsSaving(false); }
  };

  // ====== FINALIZE ON-CHAIN ======
  const handleFinalize = async () => {
    if (!otherParty?.startsWith('0x') || otherParty.length !== 42) {
      addSystemChat('⚠️ Enter a valid other party address.'); return;
    }
    try {
      const finalDoc = agreedTerms || documentText;
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: finalDoc })
      });
      const data = await res.json();
      if (!data.ipfsHash) throw new Error("IPFS failed");
      writeContract({
        address: CONTRACT_ADDRESS, abi: abiData,
        functionName: 'createRoom',
        args: [otherParty as `0x${string}`, data.ipfsHash],
      });
    } catch (e: any) { alert("Error: " + e.message); }
  };

  // ====== SUGGESTION HANDLER ======
  const handleSuggestion = (action: string) => {
    const MESSAGES: Record<string, string> = {
      'draft_freelance': 'Draft a professional freelance service agreement with scope, payment terms, rate, timeline, IP rights, confidentiality, termination, and dispute resolution.',
      'draft_rental': 'Draft a professional residential lease agreement with property description, lease term, rent, security deposit, maintenance, utilities, and termination.',
      'analyze_risks': 'Analyze this agreement for risks, red flags, unfavorable terms, and missing clauses.',
      'improve_language': 'Improve and professionalize the language. Edit the document directly.',
      'summarize': 'Create a concise executive summary for sharing with the counterparty.',
      'set_constraints': 'I want to set my private negotiation constraints. Ask me about my priorities, limits, and what I can compromise on.',
      'review_final': 'Review the final state of this agreement before on-chain finalization.',
    };
    if (action === 'finalize') { handleFinalize(); return; }
    if (action === 'share') { handleShare(); return; }
    if (action === 'start_negotiate' || action === 'continue_negotiate') { initiateNegotiation(); return; }
    if (action === 'accept_terms') {
      const last = negotiationHistory.filter(m => m.from !== 'system').pop();
      if (last) setAgreedTerms(last.message);
      setIsAutoMode(false);
      
      if (roomId) {
        fetch(`/api/rooms/${roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_agreed', party: currentRole })
        }).then(res => res.json()).then(data => {
          if (data.partyAAgreed) setPartyAAgreed(true);
          if (data.partyBAgreed) setPartyBAgreed(true);
          
          const otherAgreed = currentRole === 'partyA' ? data.partyBAgreed : data.partyAAgreed;
          if (otherAgreed) {
            addSystemChat('✅ **Both parties have approved!**\n\nYou can now execute the final transaction to lock this agreement on-chain.', [{ label: '⚡ Execute On-Chain', action: 'finalize' }]);
          } else {
            addSystemChat('✅ **You approved the terms.**\n\nWaiting for the other party to approve... Once they do, either of you can finalize this firmly on-chain.');
          }
        });
      }
      return;
    }
    const message = MESSAGES[action];
    if (message) handleChat(message);
    else handleChat(action);
  };

  // ====== SETUP COMPLETE ======
  const handleSetupComplete = () => {
    if (!otherParty.trim() || !otherParty.startsWith('0x') || otherParty.length !== 42) {
      alert('Enter a valid Ethereum address.'); return;
    }
    setPhase('workspace');
    const hasdoc = documentText.trim().length > 0;
    setChatMessages([{
      id: '1', role: 'assistant',
      content: hasdoc
        ? `📄 **Agreement loaded.**\n\nI can **edit**, **analyze risks**, or **summarize** it. When ready:\n\n1. Tell me your private constraints\n2. Say **"go negotiate"**\n3. I'll handle everything autonomously\n\n_The other party will never see this channel._`
        : `👋 **Let's create your agreement.**\n\nTell me what kind of deal, or pick a template below. Once ready, I'll negotiate it for you.`,
      suggestions: hasdoc
        ? [{ label: '🔍 Analyze Risks', action: 'analyze_risks' }, { label: '📤 Share & Negotiate', action: 'share' }]
        : [{ label: '📝 Freelance Contract', action: 'draft_freelance' }, { label: '📝 Rental Agreement', action: 'draft_rental' }]
    }]);
  };

  // ==================== RENDER ====================

  // ---- SETUP ----
  if (phase === 'setup') {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-background items-center justify-center text-foreground p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4"><Handshake className="w-8 h-8 text-primary" /></div>
            <h1 className="text-3xl font-extrabold">Start a Negotiation</h1>
            <p className="text-muted-foreground text-sm">Venice AI will negotiate autonomously on your behalf — your secrets stay private.</p>
          </div>
          <div className="space-y-4 p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center"><UserPlus className="w-4 h-4 mr-2 text-primary" />Other Party's Ethereum Address</label>
              <input type="text" value={otherParty} onChange={(e) => setOtherParty(e.target.value)} placeholder="0x..." className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center"><FileText className="w-4 h-4 mr-2 text-primary" />Agreement <span className="text-muted-foreground/50 ml-1 font-normal">(optional)</span></label>
              <textarea value={documentText} onChange={(e) => setDocumentText(e.target.value)} placeholder="Paste contract or let Venice draft one..." className="w-full h-24 px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div {...getRootProps()} className={`p-2.5 rounded-xl border-2 border-dashed text-center cursor-pointer ${isDragActive ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30'}`}>
              <input {...getInputProps()} />
              <Upload className="w-4 h-4 mx-auto text-muted-foreground/40" />
              <p className="text-[10px] text-muted-foreground/50">{isDragActive ? 'Drop' : 'Drop PDF/TXT'}</p>
            </div>
          </div>
          <button onClick={handleSetupComplete} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center group">
            Continue <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    );
  }

  // ---- MAIN WORKSPACE ----
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background overflow-hidden text-foreground">
      {/* Top Bar */}
      <div className="h-9 border-b border-border/50 bg-background/80 backdrop-blur-md flex items-center px-3 z-20 shrink-0 justify-between">
        <div className="flex items-center space-x-1.5">
          <Link href="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-3.5 h-3.5" /></Link>
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${currentRole === 'partyA' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
            {currentRole === 'partyA' ? 'Party A' : 'Party B'}
          </span>
          {roomId && <span className="text-[8px] text-muted-foreground/30 font-mono">Room: {roomId}</span>}

          {/* Auto-mode indicator */}
          {isAutoMode && (
            <div className="flex items-center ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-1" />
              <span className="text-[7px] font-bold text-amber-400 uppercase">Agent Active</span>
              <button onClick={() => { setIsAutoMode(false); isRespondingRef.current = false; }} className="ml-1 text-amber-400 hover:text-amber-300"><Pause className="w-2.5 h-2.5" /></button>
            </div>
          )}
          {isWaitingForAgent && (
            <span className="text-[8px] text-amber-400 flex items-center"><Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />Thinking...</span>
          )}
        </div>
        <div className="flex items-center space-x-1.5">
          {negotiationHistory.length > 0 && (
            <button 
              onClick={() => setIsTranscriptOpen(true)} 
              className="flex items-center h-6 px-2 text-[9px] font-medium rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors mr-2">
               <MessageSquare className="w-2.5 h-2.5 mr-1" /> View Transcript
            </button>
          )}
          <button onClick={handleShare} disabled={isSaving || !documentText.trim()} className="flex items-center h-6 px-2 text-[9px] font-medium rounded border border-border hover:bg-accent disabled:opacity-40">
            {isSaving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Share2 className="w-2.5 h-2.5 mr-0.5" />} Share
          </button>
          {(!partyAAgreed || !partyBAgreed) ? (
            <button 
              onClick={() => handleSuggestion('accept_terms')} 
              disabled={!roomId || (currentRole === 'partyA' ? partyAAgreed : partyBAgreed)} 
              className="flex items-center h-6 px-2 text-[9px] font-bold rounded bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-40">
              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
              {(currentRole === 'partyA' ? partyAAgreed : partyBAgreed) ? "Approved" : "Approve Terms"}
            </button>
          ) : (
            <button onClick={handleFinalize} disabled={isPending || isConfirming || !documentText.trim() || isConfirmed} className="flex items-center h-6 px-2 text-[9px] font-bold rounded bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40">
              {isPending || isConfirming ? <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" /> : <Zap className="w-2.5 h-2.5 mr-0.5" />}
              {isConfirmed ? "Executed On-Chain!" : "Execute Final TX"}
            </button>
          )}
        </div>
      </div>

      {/* Banners */}
      {isConfirmed && <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-1 text-[10px] text-emerald-400 text-center font-medium"><CheckCircle2 className="w-3 h-3 inline mr-1" />On-chain!</div>}
      {shareUrl && (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-1 text-[10px] text-blue-400 text-center">
          <Copy className="w-3 h-3 inline mr-1" />Link copied!
          <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="ml-1 underline">Copy</button>
        </div>
      )}

      {/* 2-Column Layout with Slide-over Transcript */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* LEFT: Document */}
        <section className="flex-1 border-r border-border/50 flex flex-col relative bg-muted/5" {...getRootProps()}>
          <input {...getInputProps()} />
          <div className="h-10 border-b border-border/20 flex items-center px-4 bg-muted/20 shrink-0 justify-between">
            <div className="flex items-center"><FileText className="w-4 h-4 text-muted-foreground mr-2" /><span className="text-[11px] font-bold text-muted-foreground">Agreement Document</span></div>
            <span className="text-[9px] text-muted-foreground/40 font-mono tracking-wide">{documentText.length} chars</span>
          </div>
          <textarea value={documentText} onChange={(e) => setDocumentText(e.target.value)} placeholder="Paste agreement or ask Concordia to draft one →"
            className="flex-1 p-6 bg-transparent resize-none outline-none text-[14px] font-mono leading-relaxed placeholder:text-muted-foreground/25 border-none" />
          {isDragActive && (
            <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary/50 flex items-center justify-center m-2 rounded-lg">
              <Upload className="w-8 h-8 text-primary animate-bounce" />
            </div>
          )}
        </section>

        {/* RIGHT DRAWER: Public Negotiation Transcript */}
        <AnimatePresence>
          {isTranscriptOpen && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="absolute right-0 top-0 bottom-0 w-[400px] xl:w-[480px] shadow-2xl border-l border-border bg-background/95 backdrop-blur-xl z-50 flex flex-col"
            >
              <div className="h-12 border-b border-border/20 flex items-center px-4 justify-between shrink-0 bg-emerald-500/5">
                <div className="flex items-center"><MessageSquare className="w-4 h-4 text-emerald-400 mr-2" />
                  <span className="text-[12px] font-bold">Raw Transcript</span>
                  <span className="ml-2 text-[8px] px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 uppercase tracking-widest font-bold">Both See</span>
                </div>
                <button onClick={() => setIsTranscriptOpen(false)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {negotiationHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <Handshake className="w-8 h-8 text-muted-foreground/10 mb-2" />
                    <p className="text-[10px] text-muted-foreground/30 leading-relaxed">
                      {roomId
                        ? 'Waiting for agents to start negotiating...\nTell Venice your constraints, then say "go negotiate".'
                        : 'Share the agreement first to create a room.\nThen both parties\' agents can negotiate.'
                      }
                    </p>
                  </div>
                ) : negotiationHistory.map((msg) => (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} key={msg.id}>
                    {msg.from === 'system' ? (
                      <div className="text-center text-[9px] text-muted-foreground/40 py-2">{msg.message}</div>
                    ) : (
                      <div className={`flex ${msg.from === 'partyA' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-relaxed shadow-sm ${
                          msg.from === 'partyA' ? 'bg-blue-500/10 rounded-tl-none border border-blue-500/15' : 'bg-purple-500/10 rounded-tr-none border border-purple-500/15'
                        }`}>
                          <div className="flex items-center mb-1 border-b border-border/30 pb-1">
                            <Bot className="w-3 h-3 mr-1" />
                            <span className={`text-[8px] font-bold uppercase ${msg.from === 'partyA' ? 'text-blue-400' : 'text-purple-400'}`}>
                              {msg.from === 'partyA' ? "A's Agent" : "B's Agent"}
                            </span>
                            {msg.round && <span className="text-[7px] font-mono font-medium text-muted-foreground/50 ml-auto bg-background/50 px-1 rounded">R{msg.round}</span>}
                          </div>
                          <div className="prose prose-invert prose-sm max-w-none [&_p]:mb-1 [&_strong]:text-foreground opacity-90">
                            <ReactMarkdown>{msg.message}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
                <div ref={negEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RIGHT: Private Agent Channel */}
        <section className="w-[360px] lg:w-[420px] xl:w-[480px] shrink-0 flex flex-col bg-background/50 border-l border-border/50 shadow-[-4px_0_24px_-10px_rgba(0,0,0,0.5)] z-10">
          <div className="h-10 border-b border-border/20 flex items-center px-4 bg-amber-500/5 justify-between shrink-0">
            <div className="flex items-center"><Sparkles className="w-4 h-4 text-amber-400 mr-2" /><span className="text-[11px] font-bold text-amber-300 tracking-wide">Concordia Copilot</span></div>
            <span className="flex items-center text-[8px] text-amber-500/60 font-black uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"><Lock className="w-2.5 h-2.5 mr-1" />Private</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <AnimatePresence>
              {chatMessages.map((msg) => (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} key={msg.id}>
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[92%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === 'user' ? 'bg-amber-500/20 text-amber-400 ml-1' : 'bg-primary text-primary-foreground mr-1'
                      }`}>
                        {msg.role === 'user' ? <User className="w-2 h-2" /> : <Bot className="w-2 h-2" />}
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-xl text-[11px] leading-relaxed ${
                        msg.role === 'user' ? 'bg-amber-500/10 rounded-tr-none border border-amber-500/20'
                        : 'bg-muted/50 border border-border/30 rounded-tl-none'
                      }`}>
                        <div className="prose prose-invert prose-xs max-w-none [&_p]:mb-0.5 [&_strong]:text-foreground [&_em]:text-amber-300/70 [&_code]:text-[9px] [&_code]:bg-muted/50 [&_code]:px-1 [&_code]:rounded">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>

                  {msg.pendingEdit && (
                    <div className="ml-5 mt-1.5 p-2 rounded-lg border-2 border-amber-500/30 bg-amber-500/5">
                      <div className="flex items-center mb-1"><PenLine className="w-2.5 h-2.5 text-amber-400 mr-1" /><span className="text-[8px] font-bold text-amber-400 uppercase">Edit Ready</span></div>
                      <div className="text-[9px] text-muted-foreground/50 mb-1.5 max-h-10 overflow-y-auto bg-background/60 p-1 rounded font-mono">{msg.pendingEdit.substring(0, 100)}...</div>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleAcceptEdit(msg.id, msg.pendingEdit!)} className="flex-1 py-1 rounded bg-amber-500 text-white text-[9px] font-bold hover:bg-amber-600 flex items-center justify-center"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Apply</button>
                        <button onClick={() => setChatMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pendingEdit: undefined } : m))} className="py-1 px-2 rounded border border-border text-[9px] hover:bg-accent text-muted-foreground">Skip</button>
                      </div>
                    </div>
                  )}

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="ml-5 mt-1 flex flex-wrap gap-1">
                      {msg.suggestions.map((s, i) => (
                        <button key={i} onClick={() => handleSuggestion(s.action)} className="px-2 py-0.5 rounded text-[9px] font-medium bg-primary/5 border border-primary/15 text-primary/80 hover:bg-primary/10 hover:text-primary transition-all">
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex">
                  <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-1"><Bot className="w-2 h-2" /></div>
                  <div className="px-2.5 py-1.5 rounded-xl bg-muted/50 border border-border/30 rounded-tl-none flex items-center space-x-0.5">
                    <span className="w-1 h-1 bg-foreground/40 rounded-full animate-bounce" />
                    <span className="w-1 h-1 bg-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1 h-1 bg-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Input area with Auto button */}
          <div className="p-2 bg-background/80 border-t border-amber-500/10 shrink-0">
            {!isAutoMode && documentText.trim() && (
              <div className="flex gap-1 mb-1">
                <button onClick={() => {
                  if (!myConstraints.trim()) {
                    addSystemChat('⚠️ **Tell me your constraints first!**\n\nWhat are your terms? What should I NOT reveal? Then say "go negotiate".');
                  } else {
                    if (!roomId) { handleShare().then(() => setTimeout(initiateNegotiation, 1000)); }
                    else initiateNegotiation();
                  }
                }} className="flex-1 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-400 hover:bg-amber-500/20 flex items-center justify-center">
                  <Zap className="w-3 h-3 mr-1" /> Auto-Negotiate
                </button>
                {!roomId && (
                  <button onClick={handleShare} disabled={isSaving} className="py-1.5 px-2 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold text-blue-400 hover:bg-blue-500/20 flex items-center">
                    <Share2 className="w-3 h-3 mr-0.5" />Share
                  </button>
                )}
              </div>
            )}
            <div className="relative flex">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleChat(); }}
                placeholder={myConstraints ? 'Give more instructions, or say "go negotiate"...' : 'Tell me your terms first (rate, limits, secrets)...'}
                className="w-full bg-muted/50 border border-amber-500/15 rounded-lg pl-3 pr-8 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-500/30 placeholder:text-muted-foreground/30" />
              <button onClick={() => handleChat()} disabled={!chatInput.trim() || isTyping} className="absolute right-1 top-0.5 p-1.5 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40">
                <Send className="w-2.5 h-2.5" />
              </button>
            </div>
            {myConstraints && <p className="text-[7px] text-emerald-400/30 mt-0.5 text-center">🔒 Constraints stored · Say "go negotiate" to start</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
