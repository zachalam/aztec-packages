import { Address } from "viem/accounts";
import { getAddress } from "viem/utils";

export  { getAddress };

/**
 * A type alias for viem's address.
 */
export type EthAddress = Address;

export const ZERO_ETH_ADDRESS = getAddress('0x0000000000000000000000000000000000000000');

/**
 * Gets a random Eth address.
 * @returns A random Eth address.
 */
export function getRandomEthAddress(): EthAddress {
  return getAddress('0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0'));
}
