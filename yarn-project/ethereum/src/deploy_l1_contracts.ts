import { DebugLogger } from '@aztec/foundation/log';

import type { Abi, Narrow } from 'abitype';
import {
  Account,
  Address,
  Chain,
  Hex,
  HttpTransport,
  PublicClient,
  WalletClient,
  createPublicClient,
  createWalletClient,
  getContract,
  http
} from 'viem';
import { HDAccount, PrivateKeyAccount } from 'viem/accounts';

import { L1ContractAddresses } from './l1_contract_addresses.js';
import { ZERO_ETH_ADDRESS } from '@aztec/types';

/**
 * Return type of the deployL1Contract function.
 */
export type DeployL1Contracts = {
  /**
   * Wallet Client Type.
   */
  walletClient: WalletClient<HttpTransport, Chain, Account>;
  /**
   * Public Client Type.
   */
  publicClient: PublicClient<HttpTransport, Chain>;

  /**
   * The currently deployed l1 contract addresses
   */
  l1ContractAddresses: L1ContractAddresses;
};

/**
 * Contract artifacts
 */
export interface ContractArtifacts {
  /**
   * The contract abi.
   */
  contractAbi: Abi;
  /**
   * The contract bytecode
   */
  contractBytecode: Hex;
}

/**
 * All L1 Contract Artifacts for deployment
 */
export interface L1ContractArtifactsForDeployment {
  /**
   * Contract deployment emitter artifacts
   */
  contractDeploymentEmitter: ContractArtifacts;
  /**
   * Decoder contract artifacts
   */
  decoderHelper?: ContractArtifacts;
  /**
   * Inbox contract artifacts
   */
  inbox: ContractArtifacts;
  /**
   * Outbox contract artifacts
   */
  outbox: ContractArtifacts;
  /**
   * Registry contract artifacts
   */
  registry: ContractArtifacts;
  /**
   * Rollup contract artifacts
   */
  rollup: ContractArtifacts;
}

/**
 * Deploys the aztec L1 contracts; Rollup, Contract Deployment Emitter & (optionally) Decoder Helper.
 * @param rpcUrl - URL of the ETH RPC to use for deployment.
 * @param account - Private Key or HD Account that will deploy the contracts.
 * @param chain - The chain instance to deploy to.
 * @param logger - A logger object.
 * @param contractsToDeploy - The set of L1 artifacts to be deployed
 * @returns A list of ETH addresses of the deployed contracts.
 */
export const deployL1Contracts = async (
  rpcUrl: string,
  account: HDAccount | PrivateKeyAccount,
  chain: Chain,
  logger: DebugLogger,
  contractsToDeploy: L1ContractArtifactsForDeployment,
): Promise<DeployL1Contracts> => {
  logger('Deploying contracts...');

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const registryAddress = await deployL1Contract(
    walletClient,
    publicClient,
    contractsToDeploy.registry.contractAbi,
    contractsToDeploy.registry.contractBytecode,
  );
  logger(`Deployed Registry at ${registryAddress}`);

  const inboxAddress = await deployL1Contract(
    walletClient,
    publicClient,
    contractsToDeploy.inbox.contractAbi,
    contractsToDeploy.inbox.contractBytecode,
    [registryAddress],
  );
  logger(`Deployed Inbox at ${inboxAddress}`);

  const outboxAddress = await deployL1Contract(
    walletClient,
    publicClient,
    contractsToDeploy.outbox.contractAbi,
    contractsToDeploy.outbox.contractBytecode,
    [registryAddress],
  );
  logger(`Deployed Outbox at ${outboxAddress}`);

  const rollupAddress = await deployL1Contract(
    walletClient,
    publicClient,
    contractsToDeploy.rollup.contractAbi,
    contractsToDeploy.rollup.contractBytecode,
    [registryAddress],
  );
  logger(`Deployed Rollup at ${rollupAddress}`);

  // We need to call a function on the registry to set the various contract addresses.
  const registryContract = getContract({
    address: registryAddress,
    abi: contractsToDeploy.registry.contractAbi,
    publicClient,
    walletClient,
  });
  await registryContract.write.upgrade(
    [rollupAddress, inboxAddress, outboxAddress],
    { account },
  );

  const contractDeploymentEmitterAddress = await deployL1Contract(
    walletClient,
    publicClient,
    contractsToDeploy.contractDeploymentEmitter.contractAbi,
    contractsToDeploy.contractDeploymentEmitter.contractBytecode,
  );
  logger(`Deployed contract deployment emitter at ${contractDeploymentEmitterAddress}`);

  let decoderHelperAddress: Address | undefined;
  if (contractsToDeploy.decoderHelper) {
    decoderHelperAddress = await deployL1Contract(
      walletClient,
      publicClient,
      contractsToDeploy.decoderHelper.contractAbi,
      contractsToDeploy.decoderHelper.contractBytecode,
    );
    logger(`Deployed DecoderHelper at ${decoderHelperAddress}`);
  }

  const l1Contracts: L1ContractAddresses = {
    rollupAddress,
    registryAddress,
    inboxAddress,
    outboxAddress,
    contractDeploymentEmitterAddress,
    decoderHelperAddress: decoderHelperAddress ?? ZERO_ETH_ADDRESS,
  };

  return {
    walletClient,
    publicClient,
    l1ContractAddresses: l1Contracts,
  };
};

/**
 * Helper function to deploy ETH contracts.
 * @param walletClient - A viem WalletClient.
 * @param publicClient - A viem PublicClient.
 * @param abi - The ETH contract's ABI (as abitype's Abi).
 * @param bytecode  - The ETH contract's bytecode.
 * @param args - Constructor arguments for the contract.
 * @returns The ETH address the contract was deployed to.
 */
export async function deployL1Contract(
  walletClient: WalletClient<HttpTransport, Chain, Account>,
  publicClient: PublicClient<HttpTransport, Chain>,
  abi: Narrow<readonly unknown[] | Abi>,
  bytecode: Hex,
  args: readonly unknown[] = [],
): Promise<Address> {
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;
  if (!contractAddress) {
    throw new Error(`No contract address found in receipt: ${JSON.stringify(receipt)}`);
  }

  return receipt.contractAddress!;
}
