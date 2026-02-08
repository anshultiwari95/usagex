import { useWallet } from "../context/WalletContext";

export function ConnectButton() {
  const { address, ensName, chainId, connect, disconnect, settlement } = useWallet();
  const expectedChain = import.meta.env.VITE_CHAIN_ID ? Number(import.meta.env.VITE_CHAIN_ID) : 31337;
  const wrongChain = chainId != null && chainId !== expectedChain;

  if (address) {
    const displayName = ensName ?? `${address.slice(0, 6)}…${address.slice(-4)}`;
    return (
      <div className="flex flex-wrap items-center gap-3 transition-all duration-200">
        {wrongChain && (
          <span className="text-usagex-accent text-sm font-medium">
            Switch to chain {expectedChain}
          </span>
        )}
        {!settlement && !wrongChain && (
          <span className="text-usagex-accent text-sm font-medium">
            Set VITE_SETTLEMENT_ADDRESS
          </span>
        )}
        <span className="text-slate-500 font-mono text-sm truncate max-w-[180px] transition-colors" title={address}>
          {displayName}
        </span>
        <button
          type="button"
          onClick={disconnect}
          className="cursor-pointer rounded-lg border border-slate-300 bg-usagex-surface px-3 py-1.5 text-sm font-medium text-usagex-dark transition-all duration-300 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-100 hover:opacity-90 hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-usagex-primary/30"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={connect}
      className="btn-cta cursor-pointer rounded-lg bg-usagex-primary px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:scale-[1.03] hover:bg-usagex-primary-hover active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-usagex-primary focus:ring-offset-2"
    >
      Connect wallet
    </button>
  );
}
