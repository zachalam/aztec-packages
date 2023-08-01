import { ContractAbi } from '@aztec/foundation/abi';
// @ts-ignore
import SimpleJson from './artifact.json' assert { type: 'json' };
export const SimpleContractAbi = SimpleJson as ContractAbi;
