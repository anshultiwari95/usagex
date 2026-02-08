import { useState } from "react";
import { parseUnits } from "ethers";
import { useWallet } from "../context/WalletContext";

const DECIMALS = 6;

export function DepositForm() {
  const { settlement, token, address, refresh } = useWallet();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  if (!address || !settlement || !token) return null;

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTxHash("");
    const raw = amount.trim();
    if (!raw || Number(raw) <= 0) {
      setError("Enter a positive amount");
      return;
    }
    setLoading(true);
    try {
      const value = parseUnits(raw, DECIMALS);
      const settlementAddress = await settlement.getAddress();
      const allowance = await token.allowance(address, settlementAddress);
      if (allowance < value) {
        const approveTx = await token.approve(settlementAddress, value);
        await approveTx.wait();
      }
      const tx = await settlement.deposit(value);
      setTxHash(tx.hash);
      await tx.wait();
      setAmount("");
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleDeposit}
      className="card-interactive rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-lg backdrop-blur-sm focus-within:ring-2 focus-within:ring-usagex-primary/20 sm:p-7"
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-usagex-dark">
        Deposit USDC
      </h3>
      <p className="mt-2 text-xs text-slate-500">
        Approve and deposit to open a usage session.
      </p>
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 cursor-text rounded-lg border border-slate-300 px-3 py-2 text-sm text-usagex-dark transition-all duration-300 placeholder:text-slate-400 focus:border-usagex-primary focus:outline-none focus:ring-2 focus:ring-usagex-primary/20 focus:shadow-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-cta cursor-pointer rounded-lg bg-usagex-primary px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none focus:outline-none focus:ring-2 focus:ring-usagex-primary focus:ring-offset-2"
        >
          {loading ? "…" : "Deposit"}
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
