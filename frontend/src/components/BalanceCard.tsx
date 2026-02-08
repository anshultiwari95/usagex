import { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";

const DECIMALS = 6;

function formatUnits(value: bigint) {
  const s = value.toString().padStart(DECIMALS + 1, "0");
  const intPart = s.slice(0, -DECIMALS) || "0";
  const decPart = s.slice(-DECIMALS).replace(/\.?0+$/, "");
  return `${intPart}.${decPart}`;
}

export function BalanceCard() {
  const { address, settlement, token } = useWallet();
  const [depositBalance, setDepositBalance] = useState<bigint>(0n);
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  const [nonce, setNonce] = useState<bigint>(0n);

  useEffect(() => {
    if (!address || !settlement) return;
    let cancelled = false;
    (async () => {
      try {
        const [bal, n] = await Promise.all([
          settlement.getBalance(address),
          settlement.getNonce(address),
        ]);
        if (cancelled) return;
        setDepositBalance(bal);
        setNonce(n);
        if (token) {
          const tb = await token.balanceOf(address);
          if (!cancelled) setTokenBalance(tb);
        }
      } catch {
        if (!cancelled) setDepositBalance(0n);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, settlement, token]);

  if (!address || !settlement) return null;

  return (
    <div className="card-interactive rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-lg backdrop-blur-sm focus-within:ring-2 focus-within:ring-usagex-primary/20 sm:p-7">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Your session
      </h3>
      <div className="mt-4 space-y-3">
        <p className="flex justify-between text-sm transition-colors">
          <span className="text-slate-600">Deposit balance</span>
          <span className="font-mono font-medium text-usagex-dark">
            {formatUnits(depositBalance)} USDC
          </span>
        </p>
        {token && (
          <p className="flex justify-between text-sm transition-colors">
            <span className="text-slate-600">Wallet balance</span>
            <span className="font-mono font-medium text-usagex-dark">
              {formatUnits(tokenBalance)} USDC
            </span>
          </p>
        )}
        <p className="flex justify-between text-sm transition-colors">
          <span className="text-slate-600">Settlement nonce</span>
          <span className="font-mono text-usagex-dark">{nonce.toString()}</span>
        </p>
      </div>
    </div>
  );
}
