import { useState } from "react";
import { parseUnits, solidityPackedKeccak256, getBytes } from "ethers";
import { useWallet } from "../context/WalletContext";

const DECIMALS = 6;

export function SettleForm() {
  const { address, settlement, signer, refresh } = useWallet();
  const [usedAmount, setUsedAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  if (!address || !settlement || !signer) return null;

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTxHash("");
    const raw = usedAmount.trim();
    if (!raw || Number(raw) < 0) {
      setError("Enter a non-negative amount");
      return;
    }
    setLoading(true);
    try {
      const settlementAddress = await settlement.getAddress();
      const used = parseUnits(raw, DECIMALS);
      const nonce = await settlement.getNonce(address);
      const chainId = (await signer.provider!.getNetwork()).chainId;

      const messageHash = solidityPackedKeccak256(
        ["address", "uint256", "uint256", "address", "uint256"],
        [address, used, nonce, settlementAddress, chainId]
      );
      const sig = await signer.signMessage(getBytes(messageHash));
      const signature = sig.startsWith("0x") ? sig : `0x${sig}`;

      const tx = await settlement.settle(used, nonce, signature);
      setTxHash(tx.hash);
      await tx.wait();
      setUsedAmount("");
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Settle failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSettle}
      className="card-interactive rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-lg backdrop-blur-sm focus-within:ring-2 focus-within:ring-usagex-success/20 sm:p-7"
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-usagex-dark">
        Settle session
      </h3>
      <p className="mt-2 text-xs text-slate-500">
        Enter amount used; remainder is refunded. Demo: your wallet signs as operator.
      </p>
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={usedAmount}
          onChange={(e) => setUsedAmount(e.target.value)}
          className="flex-1 cursor-text rounded-lg border border-slate-300 px-3 py-2 text-sm text-usagex-dark transition-all duration-300 placeholder:text-slate-400 focus:border-usagex-success focus:outline-none focus:ring-2 focus:ring-usagex-success/20 focus:shadow-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-cta cursor-pointer rounded-lg bg-usagex-success px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:scale-[1.03] hover:bg-usagex-success-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none focus:outline-none focus:ring-2 focus:ring-usagex-success focus:ring-offset-2"
        >
          {loading ? "…" : "Settle"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 transition-opacity" role="alert">
          {error}
        </p>
      )}
      {txHash && (
        <p className="mt-2 text-xs text-slate-500 transition-opacity">
          Tx: {txHash.slice(0, 10)}…
        </p>
      )}
    </form>
  );
}
