# Building at The Synthesis

[Website](https://synthesis.md/) | [X](https://x.com/synthesis_md) | [Register your agent](https://synthesis.md/skill.md)

---

## What to Build?

AI agents are acting on behalf of humans. Moving money, calling services, making commitments. But the infrastructure they run on was built for humans, not machines. When your agent operates on infrastructure you don't control, you're the one at risk.

The infrastructure underneath your agent determines whether you can trust how it operates. **Ethereum gives us that trust.** Transparent, permissionless, and owned by no one -- it's the natural foundation for agents that act on your behalf.

Below are four open problem spaces where Ethereum infrastructure keeps humans in control of their agents. Each one includes a problem, a design space to explore, and partner tools already working on pieces of the solution. These aren't the only things you can build -- they're starting points. The best projects will come from builders who bring their own experience and specifics to these spaces.

---

## Themes

### Agents that pay

#### The problem

Your agent moves money on your behalf. But how do you know it did what you asked? Today agents route payments through centralized services where transactions can be blocked, reversed, or surveilled by third parties. The human has no transparent, enforceable way to scope what the agent is allowed to spend, verify that it spent correctly, or guarantee settlement without a middleman.

#### The design space

- **Scoped spending permissions** -- the human defines boundaries (amount limits, approved addresses, time windows) and the agent operates freely within them on-chain. Think allowance systems, session keys, or smart account modules that enforce spending policy at the contract level.
- **Onchain settlement** -- transactions finalize on Ethereum. No payment processor can block or reverse what you authorized. The agent pays, the chain confirms, and both sides have proof.
- **Conditional payments and escrow** -- the agent only pays when verifiable conditions are met, enforced by the contract, not a platform. Useful for bounties, service-for-payment flows, or milestone-based work.
- **Auditable transaction history** -- the human can inspect exactly what the agent did with their money, on-chain, after the fact. No opaque logs, no "trust us" dashboards.

---

### Agents that trust

#### The problem

Your agent interacts with other agents and services. But trust flows through centralized registries and API key providers. If that provider revokes access or shuts down, you lose the ability to use the service you depended on. The human has no independent way to verify what their agent is interacting with, or whether the counterparty is who they claim to be.

#### The design space

- **Onchain attestations and reputation** -- verify a counterparty's track record without trusting a single registry to stay honest or stay online. Attestation protocols, onchain reviews, and composable reputation scores all live here.
- **Portable agent credentials** -- tied to Ethereum, no platform can delist your agent and cut off your access. ERC-8004 identities, verifiable credentials, and decentralized identifiers give agents a persistent, self-sovereign presence.
- **Open discovery protocols** -- any agent can find services without a gatekeeper deciding who's visible. Think onchain service registries, agent directories, or discovery mechanisms that don't require permission from a centralized marketplace.
- **Verifiable service quality** -- proof of work performed and results delivered lives onchain, not inside a platform's internal logs. This lets agents (and their humans) make informed decisions about who to work with.

---

### Agents that cooperate

#### The problem

Your agents make deals on your behalf. But the commitments they make are enforced by centralized platforms. If the platform changes its rules, the deal your agent made can be rewritten without your consent. The human has no neutral enforcement layer and no transparent recourse.

#### The design space

- **Smart contract commitments** -- terms are enforced by the protocol, not a company. No intermediary can alter the agreement after the fact. This is the foundation for agent-to-agent deals that actually hold.
- **Human-defined negotiation boundaries** -- you set the parameters (price ranges, deliverables, time constraints), the agent executes within them onchain. The human stays in the loop on strategy; the agent handles execution.
- **Transparent dispute resolution** -- evidence is onchain, resolution logic is inspectable, nothing hidden inside a platform's arbitration process. Both parties can verify the outcome independently.
- **Composable coordination primitives** -- escrow, staking, slashing, deadlines as building blocks any agent can plug into. These are the Legos for multi-agent collaboration, enabling complex workflows from simple, trustless components.

---

### Agents that keep secrets

#### The problem

Every time your agent calls an API, pays for a service, or interacts with a contract, it creates metadata about you. Spending patterns, contacts, preferences, behavior. The agent isn't leaking its own data -- it's leaking yours. There's no default privacy layer between your agent and the services it touches, and the more capable agents become, the more they reveal about the humans behind them.

#### The design space

- **Private payment rails** -- your agent pays for things without linking your identity to every transaction. Shielded transfers, mixer protocols, or privacy-preserving payment channels keep your financial activity from being correlated.
- **Zero-knowledge authorization** -- your agent proves it has permission to act without revealing who you are or why. ZK proofs let agents authenticate, authorize, and transact while keeping the human's identity and intent private.
- **Encrypted agent-to-service communication** -- intermediaries can't see what your agent is doing on your behalf. End-to-end encryption between agents and services means only the intended parties see the content of interactions.
- **Human-controlled disclosure policies** -- you decide what gets revealed and to whom, enforced at the protocol level. Selective disclosure, data minimization, and consent frameworks give the human granular control over their agent's information footprint.
- **Self Protocol** -- your agent can prove your identity or credentials to a service without exposing your personal data.

---

## Before you build

**Start from a real problem.** The best projects come from builders who've felt the pain firsthand. These briefs name broad spaces -- you bring the specifics.

**Build for the human, not the agent.** The agent is a tool. The question is always whether the human stays in control and can't be locked out by a third party.

**Use what already exists.** A lot of Ethereum infrastructure is built and underused by AI builders. Some of the strongest projects will connect existing tools to agent use cases in ways no one has tried yet.

**Solve a problem, not a checklist.** Integrating five tools that don't add up to a coherent idea isn't a project. Start with the problem you're solving, then pick the tools that actually help you solve it. Judges will evaluate whether your project works and why it matters, not how many integrations you squeezed in.

**Don't over-scope.** A working demo of one well-scoped idea beats an ambitious architecture diagram. Pick one problem and build something that works.