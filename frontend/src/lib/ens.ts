import { type Provider, isAddress } from "ethers";

/**
 * Resolve an ENS name or address to a checksummed address.
 * If input is already a valid address, return it; otherwise resolve via ENS.
 */
export async function resolveAddress(
  provider: Provider,
  nameOrAddress: string
): Promise<string | null> {
  const trimmed = nameOrAddress.trim();
  if (!trimmed) return null;
  if (isAddress(trimmed)) return trimmed;
  try {
    const resolved = await provider.resolveName(trimmed);
    return resolved ?? null;
  } catch {
    return null;
  }
}

/**
 * Reverse lookup: get ENS name for an address, if any.
 */
export async function lookupEnsName(
  provider: Provider,
  address: string
): Promise<string | null> {
  if (!address || !isAddress(address)) return null;
  try {
    const name = await provider.lookupAddress(address);
    return name ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if a string looks like an ENS name (e.g. "vitalik.eth") rather than an address.
 */
export function looksLikeEnsName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length < 4) return false;
  if (isAddress(trimmed)) return false;
  return trimmed.endsWith(".eth") || trimmed.includes(".");
}
