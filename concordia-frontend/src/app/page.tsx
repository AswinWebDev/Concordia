import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Lock, Handshake, Eye, Bot, FileText } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center pt-24 pb-16 min-h-screen relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] rounded-full bg-emerald-500/10 blur-[100px]" />
      <div className="absolute bottom-[10%] left-[20%] w-[25%] h-[25%] rounded-full bg-amber-500/10 blur-[100px]" />
      
      <div className="container px-4 md:px-6 max-w-6xl z-10">
        <div className="flex flex-col items-center space-y-8 text-center">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-background/50 px-3 py-1 text-sm font-medium backdrop-blur-md shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2 shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span>
            Autonomous AI Negotiation · Private by Default
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Your AI Negotiates. <br className="hidden md:block" />
            Your Secrets Stay.
          </h1>
          
          <p className="mx-auto max-w-[750px] text-lg text-muted-foreground md:text-xl leading-relaxed">
            Concordia uses <strong className="text-foreground font-semibold">Venice AI</strong> to privately negotiate contracts on your behalf — keeping your bottom line secret from the other party — and <strong className="text-foreground font-semibold">Ethereum</strong> to seal the final deal on-chain.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center pt-4">
            <Link href="/workspace" className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg h-12 px-8 font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 group">
              Start a Negotiation
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="#how-it-works" className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-accent hover:text-accent-foreground h-12 px-8 font-medium transition-colors">
              See How It Works
            </Link>
          </div>
        </div>

        {/* Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
          <div className="flex flex-col items-start p-6 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:bg-background/80 hover:border-primary/30 hover:shadow-lg group">
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 mb-4 group-hover:shadow-lg group-hover:shadow-amber-500/10 transition-all">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Keeps Your Secrets</h3>
            <p className="text-muted-foreground leading-relaxed">
              Tell Venice your bottom line. It negotiates on your behalf <em>without ever revealing</em> your constraints to the other party. Zero-retention inference.
            </p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:bg-background/80 hover:border-emerald-500/30 hover:shadow-lg group">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 mb-4 group-hover:shadow-lg group-hover:shadow-emerald-500/10 transition-all">
              <Handshake className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Negotiates Autonomously</h3>
            <p className="text-muted-foreground leading-relaxed">
              Venice acts as a neutral mediator — going back and forth between parties, finding middle ground, and proposing fair terms without human intervention.
            </p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:bg-background/80 hover:border-blue-500/30 hover:shadow-lg group">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 mb-4 group-hover:shadow-lg group-hover:shadow-blue-500/10 transition-all">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Sealed on Ethereum</h3>
            <p className="text-muted-foreground leading-relaxed">
              Only the final agreed terms go on-chain. Tamper-proof, timestamped, verifiable by both parties forever. No middleman can rewrite the deal.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="mt-32 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            How Concordia Works
          </h2>
          <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
            From contract upload to on-chain agreement in 4 steps — with privacy at every layer.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: "01", icon: FileText, title: "Upload Agreement", desc: "Party A uploads or pastes the contract. Concordia stores it on IPFS.", color: "text-blue-400", bg: "bg-blue-500/10" },
              { step: "02", icon: Bot, title: "AI Analyzes Privately", desc: "Venice AI reads the contract with zero-retention. Flags risks, summarizes terms.", color: "text-primary", bg: "bg-primary/10" },
              { step: "03", icon: Handshake, title: "Venice Negotiates", desc: "Each party whispers their constraints. Venice negotiates back and forth, keeping secrets.", color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { step: "04", icon: ShieldCheck, title: "Agree On-Chain", desc: "When both parties accept, the final terms are recorded on Ethereum forever.", color: "text-purple-400", bg: "bg-purple-500/10" },
            ].map((item) => (
              <div key={item.step} className="relative p-6 rounded-2xl border border-border/50 bg-background/50 hover:bg-background/80 transition-all group">
                <span className="text-[80px] font-black text-foreground/[0.03] absolute top-2 right-4 select-none">{item.step}</span>
                <div className={`p-3 rounded-lg ${item.bg} ${item.color} mb-4 w-fit`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 p-8 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm">
          <h3 className="text-2xl font-bold mb-3">Ready to negotiate privately?</h3>
          <p className="text-muted-foreground mb-6">No sign-up. No database. Just Venice AI + Ethereum.</p>
          <Link href="/workspace" className="inline-flex items-center justify-center rounded-lg h-12 px-8 font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 group">
            Start Negotiation <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" /> Self Verified Agent
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Zap className="w-3 h-3" /> ENS Identity
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Lock className="w-3 h-3" /> Venice Zero-Retention
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
