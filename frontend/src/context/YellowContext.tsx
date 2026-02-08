import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useWallet } from "./WalletContext";
import {
  YellowClient,
  type YellowConnectionState,
} from "../lib/yellow";

const YELLOW_WS_URL =
  import.meta.env.VITE_YELLOW_WS_URL || "wss://clearnet-sandbox.yellow.com/ws";

type YellowContextValue = {
  yellowState: YellowConnectionState;
  yellowError: string | null;
  yellowConnected: boolean;
  connectYellow: () => Promise<void>;
  disconnectYellow: () => void;
  createUsageSession: (params: {
    participants: string[];
    allocations: { participant: string; asset: string; amount: string }[];
  }) => Promise<{ appSessionId?: string }>;
};

const YellowContext = createContext<YellowContextValue | null>(null);

export function YellowProvider({ children }: { children: React.ReactNode }) {
  const { signer } = useWallet();
  const [yellowState, setYellowState] = useState<YellowConnectionState>("disconnected");
  const [yellowError, setYellowError] = useState<string | null>(null);
  const clientRef = useRef<YellowClient | null>(null);

  const connectYellow = useCallback(async () => {
    if (!signer) {
      setYellowError("Connect wallet first");
      return;
    }
    setYellowError(null);
    if (clientRef.current?.isConnected()) {
      return;
    }
    const client = new YellowClient(YELLOW_WS_URL);
    clientRef.current = client;
    client.on("state", setYellowState);
    client.on("error", (err) => setYellowError(err));
    try {
      await client.connect(signer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Yellow connect failed";
      setYellowError(msg);
      setYellowState("error");
    }
  }, [signer]);

  const disconnectYellow = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setYellowState("disconnected");
    setYellowError(null);
  }, []);

  const createUsageSession = useCallback(
    async (params: {
      participants: string[];
      allocations: { participant: string; asset: string; amount: string }[];
    }) => {
      if (!signer || !clientRef.current?.isConnected()) {
        throw new Error("Connect wallet and Yellow first");
      }
      return clientRef.current.createUsageSession(signer, params);
    },
    [signer]
  );

  useEffect(() => {
    if (!signer) {
      disconnectYellow();
    }
  }, [signer, disconnectYellow]);

  const value: YellowContextValue = {
    yellowState,
    yellowError,
    yellowConnected: yellowState === "connected",
    connectYellow,
    disconnectYellow,
    createUsageSession,
  };

  return (
    <YellowContext.Provider value={value}>
      {children}
    </YellowContext.Provider>
  );
}

export function useYellow() {
  const ctx = useContext(YellowContext);
  if (!ctx) {
    throw new Error("useYellow must be used within YellowProvider");
  }
  return ctx;
}
