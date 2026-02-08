/**
 * Yellow Network (Nitrolite/ERC-7824) SDK integration for off-chain session handling.
 * Connects to ClearNode via WebSocket, authenticates with wallet, and supports app sessions.
 */
import {
  type JsonRpcSigner,
  keccak256,
  toUtf8Bytes,
  getBytes,
} from "ethers";
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createAuthVerifyMessageWithJWT,
  createAppSessionMessage,
  createGetAppSessionsMessage,
  parseAnyRPCResponse,
  RPCMethod,
  EIP712AuthTypes,
  type AuthRequestParams,
  type CreateAppSessionRequestParams,
  type MessageSigner,
  type RPCAppDefinition,
  type RPCAppSessionAllocation,
  type RPCProtocolVersion,
} from "@erc7824/nitrolite";
import type { Hex } from "viem";

const EIP712_DOMAIN = { name: "UsageX" };

export const YELLOW_WS_SANDBOX = "wss://clearnet-sandbox.yellow.com/ws";
export const YELLOW_WS_PRODUCTION = "wss://clearnet.yellow.com/ws";

const DEFAULT_SCOPE = "console";
const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Create a MessageSigner that signs auth_verify payloads using EIP-712 with ethers.
 * Used only for the auth challenge response.
 */
function createEthersEIP712AuthSigner(
  signer: JsonRpcSigner,
  authParams: {
    scope: string;
    session_key: string;
    expires_at: bigint;
    allowances: { asset: string; amount: string }[];
  }
): MessageSigner {
  return async (payload) => {
    const method = payload[1];
    if (method !== RPCMethod.AuthVerify) {
      throw new Error(
        `EIP-712 auth signer only supports auth_verify, got ${method}`
      );
    }
    const params = payload[2] as { challenge?: string };
    const challenge = params?.challenge;
    if (typeof challenge !== "string") {
      throw new Error("auth_verify params missing challenge");
    }
    const address = await signer.getAddress();
    const message = {
      challenge,
      scope: authParams.scope,
      wallet: address,
      session_key: authParams.session_key,
      expires_at: authParams.expires_at,
      allowances: authParams.allowances,
    };
    const signature = await signer.signTypedData(
      EIP712_DOMAIN,
      { Policy: EIP712AuthTypes.Policy, Allowance: EIP712AuthTypes.Allowance },
      message
    );
    return signature as Hex;
  };
}

export type YellowConnectionState =
  | "disconnected"
  | "connecting"
  | "authenticating"
  | "connected"
  | "error";

export type YellowClientEvents = {
  state: (state: YellowConnectionState) => void;
  error: (err: string) => void;
  message: (data: unknown) => void;
};

/**
 * Yellow Network client: WebSocket connection to ClearNode with auth and session helpers.
 */
export class YellowClient {
  private ws: WebSocket | null = null;
  private signer: JsonRpcSigner | null = null;
  private authParams: AuthRequestParams | null = null;
  private jwt: string | null = null;
  private state: YellowConnectionState = "disconnected";
  private listeners = {
    state: [] as ((state: YellowConnectionState) => void)[],
    error: [] as ((err: string) => void)[],
    message: [] as ((data: unknown) => void)[],
  };

  constructor(private wsUrl: string) {}

  getState(): YellowConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === "connected" && this.ws?.readyState === WebSocket.OPEN;
  }

  on<K extends keyof YellowClientEvents>(
    event: K,
    cb: YellowClientEvents[K]
  ): void {
    (this.listeners[event] as unknown[]).push(cb);
  }

  off<K extends keyof YellowClientEvents>(
    event: K,
    cb: YellowClientEvents[K]
  ): void {
    const arr = this.listeners[event];
    this.listeners[event] = arr.filter((f) => f !== cb) as typeof arr;
  }

  private setState(s: YellowConnectionState): void {
    this.state = s;
    this.listeners.state.forEach((cb) => cb(s));
  }

  private emitError(err: string): void {
    this.listeners.error.forEach((cb) => cb(err));
  }

  private emitMessage(data: unknown): void {
    this.listeners.message.forEach((cb) => cb(data));
  }

  /**
   * Connect to ClearNode and authenticate with the wallet signer.
   * Call after wallet is connected.
   */
  async connect(signer: JsonRpcSigner): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    this.signer = signer;
    this.setState("connecting");

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;

      ws.onopen = async () => {
        try {
          this.setState("authenticating");
          const address = await signer.getAddress();
          const sessionKey = address; // use same key as wallet for simplicity
          const expiresAt = BigInt(
            Math.floor(Date.now() / 1000) + DEFAULT_EXPIRY_SECONDS
          );
          const params: AuthRequestParams = {
            address: address as `0x${string}`,
            session_key: sessionKey as `0x${string}`,
            application: typeof window !== "undefined" ? window.location.origin : "usagex",
            scope: DEFAULT_SCOPE,
            allowances: [],
            expires_at: expiresAt,
          };
          this.authParams = params;

          const authRequest = await createAuthRequestMessage(params);
          ws.send(authRequest);
        } catch (e) {
          const err = e instanceof Error ? e.message : "Auth request failed";
          this.emitError(err);
          this.setState("error");
          reject(new Error(err));
        }
      };

      ws.onmessage = async (event: MessageEvent) => {
        try {
          const message = parseAnyRPCResponse(event.data as string);
          this.emitMessage(message);

          if (message.method === RPCMethod.AuthChallenge) {
            const challengeMessage =
              "challengeMessage" in message.params
                ? (message.params as { challengeMessage: string }).challengeMessage
                : (message.params as { challenge_message?: string }).challenge_message;
            if (!challengeMessage || !this.signer || !this.authParams) {
              this.emitError("Missing challenge or auth params");
              this.setState("error");
              return;
            }
            const signerFn = createEthersEIP712AuthSigner(this.signer, {
              scope: this.authParams.scope,
              session_key: this.authParams.session_key,
              expires_at: this.authParams.expires_at,
              allowances: this.authParams.allowances,
            });
            const authVerify = await createAuthVerifyMessage(signerFn, {
              method: RPCMethod.AuthChallenge,
              params: { challengeMessage },
            } as { method: typeof RPCMethod.AuthChallenge; params: { challengeMessage: string } });
            ws.send(authVerify);
            return;
          }

          if (message.method === RPCMethod.AuthVerify) {
            const params = message.params as {
              success?: boolean;
              jwt_token?: string;
            };
            if (params?.success) {
              this.jwt = params.jwt_token ?? null;
              this.setState("connected");
              resolve();
            } else {
              const err =
                (params as { error?: string })?.error ?? "Authentication failed";
              this.emitError(err);
              this.setState("error");
              reject(new Error(err));
            }
            return;
          }

          if (message.method === RPCMethod.Error) {
            const err =
              (message.params as { error?: string })?.error ?? "RPC error";
            this.emitError(err);
            this.setState("error");
          }
        } catch (e) {
          const err = e instanceof Error ? e.message : "Parse/handle message failed";
          this.emitError(err);
        }
      };

      ws.onerror = () => {
        this.emitError("WebSocket error");
        this.setState("error");
        reject(new Error("WebSocket error"));
      };

      ws.onclose = () => {
        this.setState("disconnected");
        this.ws = null;
        if (this.state !== "connected") {
          reject(new Error("WebSocket closed before auth"));
        }
      };
    });
  }

  /**
   * Reconnect using stored JWT if available (no wallet popup).
   */
  async reconnectWithJWT(signer: JsonRpcSigner): Promise<void> {
    if (this.jwt) {
      this.signer = signer;
      this.setState("connecting");
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(this.wsUrl);
        this.ws = ws;
        ws.onopen = async () => {
          const msg = await createAuthVerifyMessageWithJWT(this.jwt!);
          ws.send(msg);
        };
        ws.onmessage = async (event: MessageEvent) => {
          const message = parseAnyRPCResponse(event.data as string);
          this.emitMessage(message);
          if (message.method === RPCMethod.AuthVerify) {
            const params = message.params as { success?: boolean };
            if (params?.success) {
              this.setState("connected");
              resolve();
            } else {
              this.jwt = null;
              this.setState("error");
              reject(new Error("JWT reconnect failed"));
            }
          }
        };
        ws.onerror = () => {
          this.setState("error");
          reject(new Error("WebSocket error"));
        };
        ws.onclose = () => {
          this.setState("disconnected");
          this.ws = null;
        };
      });
    } else {
    await this.connect(signer);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.jwt = null;
    this.authParams = null;
    this.signer = null;
    this.setState("disconnected");
  }

  /**
   * Send a raw string message (for signed RPC requests).
   */
  send(message: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.ws.send(message);
    return true;
  }

  /**
   * Create an off-chain app session for usage-based billing.
   * Participants and allocations define the session state; signer must be the connected wallet.
   */
  async createUsageSession(
    signer: JsonRpcSigner,
    params: {
      participants: string[];
      weights?: number[];
      quorum?: number;
      challengePeriod?: number;
      allocations: { participant: string; asset: string; amount: string }[];
    }
  ): Promise<{ appSessionId?: string }> {
    if (!this.isConnected() || !this.signer) {
      throw new Error("Yellow client not connected");
    }
    const definition: RPCAppDefinition = {
      application: "usagex-v1",
      protocol: "NitroRPC/0.2" as RPCProtocolVersion,
      participants: params.participants.map((p) => p as `0x${string}`),
      weights: params.weights ?? params.participants.map(() => 50),
      quorum: params.quorum ?? 100,
      challenge: params.challengePeriod ?? 86400,
      nonce: Date.now(),
    };
    const allocations: RPCAppSessionAllocation[] = params.allocations.map(
      (a) => ({
        participant: a.participant as `0x${string}`,
        asset: a.asset,
        amount: a.amount,
      })
    );
    const createParams: CreateAppSessionRequestParams = {
      definition,
      allocations,
    };
    const signerFn = this.makeMessageSigner(signer) as MessageSigner;
    const msg = await createAppSessionMessage(signerFn, createParams);
    this.send(msg);
    return {};
  }

  /**
   * MessageSigner that hashes JSON payload and signs with ethers (for non-auth methods).
   * Used for create_app_session etc. Compatible with Nitrolite: keccak256(JSON) then sign.
   */
  private makeMessageSigner(signer: JsonRpcSigner): MessageSigner {
    return async (payload) => {
      const json = JSON.stringify(payload, (_, v) =>
        typeof v === "bigint" ? v.toString() : v
      );
      const hash = keccak256(toUtf8Bytes(json));
      const sig = await signer.signMessage(getBytes(hash));
      return sig as Hex;
    };
  }

  /**
   * Request list of app sessions for the given participant.
   */
  async getAppSessions(signer: JsonRpcSigner, participant?: string): Promise<void> {
    if (!this.isConnected()) return;
    const addr = (participant ?? (await signer.getAddress())) as `0x${string}`;
    const signerFn = this.makeMessageSigner(signer) as MessageSigner;
    const msg = await createGetAppSessionsMessage(signerFn, addr);
    this.send(msg);
  }
}
