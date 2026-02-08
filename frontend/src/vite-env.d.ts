/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SETTLEMENT_ADDRESS: string;
  readonly VITE_CHAIN_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
