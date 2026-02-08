import { AnimatedBackground } from "./components/AnimatedBackground";
import { ConnectButton } from "./components/ConnectButton";
import { Logo } from "./components/Logo";
import { BalanceCard } from "./components/BalanceCard";
import { DepositForm } from "./components/DepositForm";
import { SettleForm } from "./components/SettleForm";
import { useYellow } from "./context/YellowContext";
import { useWallet } from "./context/WalletContext";
import { useState } from "react";

const STEPS = [
  {
    title: "Deposit USDC",
    body: "Open a usage session by depositing into the settlement contract. Your balance is your spending limit.",
  },
  {
    title: "Use the app",
    body: "Consume credits as you go. Usage is tracked off-chain for instant, gasless UX.",
  },
  {
    title: "Settle",
    body: "Settle on-chain once. Pay only for what you used; the rest is refunded automatically.",
  },
];

const USE_CASES = [
  { title: "Pay-per-use APIs", desc: "Charge per API call or compute minute instead of fixed plans." },
  { title: "Creator & dev tools", desc: "Meter usage by time, exports, or features." },
  { title: "AI agents & oracles", desc: "Bill for inference, tool calls, or data usage." },
  { title: "Time-based services", desc: "Session or time-based billing with automatic refunds." },
];

const BENEFITS = [
  "No per-action gas — instant, Web2-like UX",
  "Trustless settlement and refunds on-chain",
  "USDC-based, stable pricing",
  "Built as developer infrastructure",
];

function scrollToSession() {
  document.getElementById("session")?.scrollIntoView({ behavior: "smooth" });
}

export default function App() {
  const {
    yellowState,
    yellowError,
    yellowConnected,
    connectYellow,
    disconnectYellow,
    createUsageSession,
  } = useYellow();
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionSuccess, setSessionSuccess] = useState(false);
  const { address } = useWallet();

  const handleStartOffChainSession = async () => {
    if (!address || !yellowConnected) return;
    setSessionError(null);
    setSessionSuccess(false);
    setSessionLoading(true);
    try {
      await createUsageSession({
        participants: [address],
        allocations: [
          { participant: address, asset: "usdc", amount: "1000000" },
        ],
      });
      setSessionSuccess(true);
    } catch (e) {
      setSessionError(e instanceof Error ? e.message : "Failed to create session");
    } finally {
      setSessionLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent text-usagex-dark">
      <AnimatedBackground />
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Logo />
          <ConnectButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-4 pb-8 sm:px-6 sm:pt-5 sm:pb-10 lg:px-8 lg:pt-6 lg:pb-12">
        <div className="grid grid-cols-1 gap-4 lg:gap-6">
          {/* Hero card */}
          <section
            className="card hero-gradient rounded-2xl border border-usagex-primary/20 p-5 shadow-xl sm:p-6 lg:p-8 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "0ms" }}
            aria-label="About UsageX"
          >
            <p className="mb-2 text-usagex-primary text-sm font-semibold uppercase tracking-wider opacity-0 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
              Web3 billing infrastructure
            </p>
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-usagex-dark opacity-0 animate-fade-in-up sm:text-3xl lg:text-4xl" style={{ animationDelay: "120ms" }}>
              Usage-based billing for decentralized apps
            </h2>
            <p className="mb-5 max-w-2xl text-slate-600 text-base leading-relaxed opacity-0 animate-fade-in-up sm:text-lg" style={{ animationDelay: "180ms" }}>
              Charge by <strong className="text-usagex-dark">actual usage</strong>—API calls, time, features—instead of per-transaction fees or fixed subscriptions. Pay only for what you use; unused funds are refunded automatically.
            </p>
            <button
              type="button"
              onClick={scrollToSession}
              className="btn-cta cursor-pointer rounded-xl bg-usagex-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md opacity-0 animate-fade-in-up hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-usagex-primary focus:ring-offset-2"
              style={{ animationDelay: "240ms" }}
            >
              Get started →
            </button>
          </section>

          {/* Problem + solution card */}
          <section
            className="card rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-lg backdrop-blur-sm sm:p-6 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "280ms" }}
            aria-label="The problem"
          >
            <h3 className="section-heading mb-4 text-sm font-semibold uppercase tracking-wide text-usagex-primary">
              The problem & solution
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-slate-600 text-sm font-medium text-usagex-dark">Problem</p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Most Web3 apps use one-time payments, per-transaction fees, or fixed subscriptions. That doesn’t fit pay-per-use APIs, creator tools, or AI agents. Charging on-chain for every action is slow and bad for UX.
                </p>
              </div>
              <div>
                <p className="mb-2 text-slate-600 text-sm font-medium text-usagex-dark">Solution</p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  UsageX uses <strong className="text-usagex-dark">programmable usage credits</strong>: deposit once, consume credits as you use the app, settle once at the end. No per-action gas, instant UX, trustless refunds.
                </p>
              </div>
            </div>
          </section>

          {/* How it works - 3 cards */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6" aria-label="How it works">
            <h3 className="section-heading col-span-full mb-0 text-sm font-semibold uppercase tracking-wide text-usagex-primary opacity-0 animate-fade-in-up" style={{ animationDelay: "360ms" }}>
              How it works
            </h3>
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="card-interactive group flex flex-col rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-lg backdrop-blur-sm opacity-0 animate-fade-in-up sm:p-7"
                style={{ animationDelay: `${400 + i * 80}ms` }}
              >
                <span
                  className="mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-usagex-primary text-base font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <h4 className="mb-2 font-semibold text-usagex-dark transition-colors group-hover:text-usagex-primary">{step.title}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </section>

          {/* Built for - 4 cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6" aria-label="Built for">
            <h3 className="section-heading col-span-full mb-0 text-sm font-semibold uppercase tracking-wide text-usagex-primary opacity-0 animate-fade-in-up" style={{ animationDelay: "640ms" }}>
              Built for
            </h3>
            {USE_CASES.map((item, i) => (
              <div
                key={item.title}
                className="card-interactive group rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-lg backdrop-blur-sm opacity-0 animate-fade-in-up sm:p-6"
                style={{ animationDelay: `${680 + i * 60}ms` }}
              >
                <h4 className="mb-2 font-semibold text-usagex-dark transition-colors duration-300 group-hover:text-usagex-primary">{item.title}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </section>

          {/* Why UsageX - 1 card */}
          <section
            className="card rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-lg backdrop-blur-sm opacity-0 animate-fade-in-up sm:p-6"
            style={{ animationDelay: "920ms" }}
            aria-label="Why UsageX"
          >
            <h3 className="section-heading mb-5 text-sm font-semibold uppercase tracking-wide text-usagex-primary">
              Why UsageX
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="group flex cursor-pointer items-center gap-3 rounded-xl py-2.5 pr-4 transition-all duration-300 hover:translate-x-1 hover:scale-[1.01] hover:bg-slate-50/80 hover:pl-4"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-usagex-primary transition-transform duration-300 group-hover:scale-125" aria-hidden />
                  <span className="text-slate-600 text-sm sm:text-base">{benefit}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Your session - section title + 2 cards */}
          <section
            id="session"
            className="scroll-mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "1000ms" }}
            aria-label="Your session"
          >
            <div className="lg:col-span-2">
              <h2 className="mb-2 text-xl font-semibold text-usagex-dark">
                Your session
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed sm:text-base">
                Connect your wallet, deposit USDC to open a usage session, then settle when you’re done. Unused funds are refunded automatically.
              </p>
            </div>
            {/* Yellow Network – off-chain session handling */}
            <section
              className="card-interactive group col-span-full rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-lg backdrop-blur-sm sm:p-6"
              aria-label="Yellow Network"
            >
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-usagex-primary">
                Yellow Network
              </h3>
              <p className="mb-4 text-slate-600 text-sm leading-relaxed">
                Off-chain sessions &amp; instant usage accounting. Connect to enable usage tracking without per-action gas.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    yellowConnected
                      ? "bg-usagex-success/15 text-usagex-success"
                      : yellowState === "connecting" || yellowState === "authenticating"
                        ? "bg-usagex-primary/15 text-usagex-primary"
                        : yellowState === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      yellowConnected
                        ? "bg-usagex-success"
                        : yellowState === "connecting" || yellowState === "authenticating"
                          ? "animate-pulse bg-usagex-primary"
                          : yellowState === "error"
                            ? "bg-red-500"
                            : "bg-slate-400"
                    }`}
                    aria-hidden
                  />
                  {yellowState === "connecting" || yellowState === "authenticating"
                    ? "Connecting…"
                    : yellowConnected
                      ? "Connected"
                      : yellowState === "error"
                        ? "Error"
                        : "Disconnected"}
                </span>
                {yellowError && (
                  <span className="text-red-600 text-xs" role="alert">
                    {yellowError}
                  </span>
                )}
                {yellowConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={disconnectYellow}
                      className="cursor-pointer rounded-lg border border-slate-300 bg-usagex-surface px-3 py-1.5 text-sm font-medium text-usagex-dark transition-all duration-300 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-usagex-primary/30"
                    >
                      Disconnect Yellow
                    </button>
                    <button
                      type="button"
                      onClick={handleStartOffChainSession}
                      disabled={sessionLoading || !address}
                      className="btn-cta cursor-pointer rounded-lg bg-usagex-success px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none focus:outline-none focus:ring-2 focus:ring-usagex-success focus:ring-offset-2"
                    >
                      {sessionLoading ? "Creating…" : "Start off-chain session"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={connectYellow}
                    disabled={yellowState === "connecting" || yellowState === "authenticating"}
                    className="btn-cta cursor-pointer rounded-lg bg-usagex-primary px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none focus:outline-none focus:ring-2 focus:ring-usagex-primary focus:ring-offset-2"
                  >
                    Connect Yellow
                  </button>
                )}
              </div>
              {sessionError && (
                <p className="mt-3 text-red-600 text-sm" role="alert">
                  {sessionError}
                </p>
              )}
              {sessionSuccess && (
                <p className="mt-3 text-usagex-success text-sm">
                  Off-chain session created. Usage can be tracked without per-action gas.
                </p>
              )}
            </section>
            <BalanceCard />
            <div className="flex flex-col gap-6">
              <DepositForm />
              <SettleForm />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
