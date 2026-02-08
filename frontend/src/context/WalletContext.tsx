import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { BrowserProvider, Contract, JsonRpcSigner } from "ethers";
import SETTLEMENT_ABI from "../abi/UsageXSettlement.json";
import MOCK_ERC20_ABI from "../abi/MockERC20.json";
import { lookupEnsName, resolveAddress } from "../lib/ens";

const SETTLEMENT_ADDRESS_OR_ENS = import.meta.env.VITE_SETTLEMENT_ADDRESS || "";

type WalletContextValue = {
  address: string | null;
  ensName: string | null;
  chainId: number | null;
  signer: JsonRpcSigner | null;
  provider: BrowserProvider | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  settlement: Contract | null;
  token: Contract | null;
  refresh: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [settlement, setSettlement] = useState<Contract | null>(null);
  const [token, setToken] = useState<Contract | null>(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("Install MetaMask or another Web3 wallet.");
      return;
    }
    const prov = new BrowserProvider(window.ethereum);
    const accounts = await prov.send("eth_requestAccounts", []);
    const net = await prov.getNetwork();
    const sig = await prov.getSigner();
    setProvider(prov);
    setSigner(sig);
    const userAddress = accounts[0];
    setAddress(userAddress);
    setChainId(Number(net.chainId));

    // ENS: reverse lookup for connected wallet
    try {
      const name = await lookupEnsName(prov, userAddress);
      setEnsName(name);
    } catch {
      setEnsName(null);
    }

    // Settlement: resolve ENS name to address if needed
    if (SETTLEMENT_ADDRESS_OR_ENS && sig) {
      let settlementAddress: string | null = null;
      try {
        settlementAddress = await resolveAddress(prov, SETTLEMENT_ADDRESS_OR_ENS);
      } catch {
        settlementAddress = null;
      }
      if (settlementAddress) {
        const settlementContract = new Contract(settlementAddress, SETTLEMENT_ABI as never, sig);
        setSettlement(settlementContract);
        try {
          const tokenAddr = await settlementContract.token();
          setToken(new Contract(tokenAddr, MOCK_ERC20_ABI as never, sig));
        } catch {
          setToken(null);
        }
      } else {
        setSettlement(null);
        setToken(null);
      }
    } else {
      setSettlement(null);
      setToken(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!provider || !signer || !SETTLEMENT_ADDRESS_OR_ENS) return;
    let settlementAddress: string | null = null;
    try {
      settlementAddress = await resolveAddress(provider, SETTLEMENT_ADDRESS_OR_ENS);
    } catch {
      settlementAddress = null;
    }
    if (!settlementAddress) {
      setSettlement(null);
      setToken(null);
      return;
    }
    const settlementContract = new Contract(settlementAddress, SETTLEMENT_ABI as never, signer);
    setSettlement(settlementContract);
    try {
      const tokenAddr = await settlementContract.token();
      setToken(new Contract(tokenAddr, MOCK_ERC20_ABI as never, signer));
    } catch {
      setToken(null);
    }
  }, [provider, signer]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setEnsName(null);
    setChainId(null);
    setSigner(null);
    setProvider(null);
    setSettlement(null);
    setToken(null);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.on("accountsChanged", (accounts: unknown) => {
      if (Array.isArray(accounts) && accounts.length === 0) disconnect();
      else connect();
    });
    window.ethereum.on("chainChanged", () => connect());
  }, [connect, disconnect]);

  return (
    <WalletContext.Provider
      value={{
        address,
        ensName,
        chainId,
        signer,
        provider,
        connect,
        disconnect,
        settlement,
        token,
        refresh,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

declare global {
  interface Window {
    ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown>; on: (event: string, cb: (...args: unknown[]) => void) => void };
  }
}
