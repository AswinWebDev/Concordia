import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Web3Provider } from '@/components/Web3Provider'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Concordia | Private Contract Copilot',
  description: 'Understand, negotiate, and finalize agreements privately with Venice AI and Ethereum.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground flex flex-col`} suppressHydrationWarning>
        <Web3Provider>
          <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center mx-auto px-4 max-w-6xl">
              <div className="flex gap-2 items-center text-xl font-bold tracking-tight">
                <span className="text-primary bg-primary/10 p-1.5 rounded-lg border border-primary/20">C</span>
                Concordia
              </div>
              <div className="ml-auto flex items-center gap-4">
                <nav className="flex items-center gap-6 text-sm font-medium">
                  <a href="#features" className="text-foreground/60 transition-colors hover:text-foreground">Features</a>
                  <a href="#how-it-works" className="text-foreground/60 transition-colors hover:text-foreground">How it Works</a>
                </nav>
                <ConnectButton />
              </div>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer className="border-t border-border/40 py-6 md:py-0">
            <div className="container mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-4 md:h-24">
              <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                Built natively for The Synthesis Hackathon.
              </p>
              <div className="flex gap-4 items-center">
                <span className="text-sm text-muted-foreground">Powered by Venice & Ethereum</span>
              </div>
            </div>
          </footer>
        </Web3Provider>
      </body>
    </html>
  )
}
