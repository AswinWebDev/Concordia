import { ArrowRight, ShieldCheck, Zap, Lock } from "lucide-react";
import CreateRoom from "../components/CreateRoom";

export default function Home() {
  return (
    <div className="flex flex-col items-center pt-24 pb-16 min-h-screen relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] rounded-full bg-accent/20 blur-[100px]" />
      
      <div className="container px-4 md:px-6 max-w-6xl z-10">
        <div className="flex flex-col items-center space-y-8 text-center">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-background/50 px-3 py-1 text-sm font-medium backdrop-blur-md shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
            Private inference meets public trust
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Agree with Confidence. <br className="hidden md:block" />
            Sign without Secrets.
          </h1>
          
          <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl leading-relaxed">
            Concordia uses <strong className="text-foreground font-semibold">Venice AI</strong> to privately explain contracts 
            and <strong className="text-foreground font-semibold">Ethereum</strong> to enforce escrow—so you never leak sensitive data to generic LLMs.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center pt-4">
            <button className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg h-12 px-8 font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 group">
              Start an Agreement
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-accent hover:text-accent-foreground h-12 px-8 font-medium transition-colors">
              View Demo Contract
            </button>
          </div>
        </div>

        {/* Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
          <div className="flex flex-col items-start p-6 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-colors hover:bg-background/80 hover:border-border">
            <div className="p-3 rounded-lg bg-primary/10 text-primary mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Zero-Retention Privacy</h3>
            <p className="text-muted-foreground leading-relaxed">
              We process your contract using Venice&apos;s no-retention API. Your NDAs, freelancer rates, and sensitive terms never become training data.
            </p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-colors hover:bg-background/80 hover:border-border">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500 mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Tamper-Proof Escrow</h3>
            <p className="text-muted-foreground leading-relaxed">
              Once both parties press &quot;Agree&quot;, the contract hash is stored on Ethereum. Escrowed stablecoins trigger only when conditions are met.
            </p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-colors hover:bg-background/80 hover:border-border">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500 mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI Contract Copilot</h3>
            <p className="text-muted-foreground leading-relaxed">
              Get an instant summary, flagging of risky clauses, and plain-language definitions of what you&apos;re actually signing before you commit.
            </p>
          </div>
        </div>

        {/* Create Room Interactive Component */}
        <div className="mt-24 w-full relative group pb-24">
           <CreateRoom />
        </div>
      </div>
    </div>
  )
}
