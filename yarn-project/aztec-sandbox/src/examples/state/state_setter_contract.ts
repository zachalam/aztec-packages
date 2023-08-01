
import { Contract, Wallet, createAccounts, createAztecRpcClient } from '@aztec/aztec.js';
import { AztecAddress, Fr, PrivateKey } from '@aztec/circuits.js';
import { createDebugLogger } from '@aztec/foundation/log';
import { SchnorrSingleKeyAccountContractAbi } from '@aztec/noir-contracts/artifacts';

import { SimpleContract } from './state/simpleTypes.js';

const logger = createDebugLogger('aztec:http-rpc-client');

export const privateKey = PrivateKey.fromString('ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');

const url = 'http://localhost:8080';

const aztecRpcClient = createAztecRpcClient(url);
let wallet: Wallet;


/**
 * Deploys the ZK Token contract.
 * @param owner - The address that the initial balance will belong to.
 * @returns An Aztec Contract object with the zk token's ABI.
 */
async function deployZKContract() {
  logger('Deploying L2 contract...');
  const tx = SimpleContract.deploy(aztecRpcClient).send();
  const receipt = await tx.getReceipt();
  const contract = new SimpleContract(receipt.contractAddress!, wallet);
  await tx.isMined();
  await tx.getReceipt();
  logger('L2 contract deployed');
  return contract;
}

/**
 * Gets a user's balance from a ZK Token contract.
 * @param contract - The ZK Token contract.
 * @param ownerAddress - Balance owner's Aztec Address.
 * @returns The owner's current balance of the token.
 */
// async function getBalance(contract: Contract, ownerAddress: AztecAddress) {
//   const [balance] = await contract.methods.getBalance(ownerAddress).view({ from: ownerAddress });
//   return balance;
// }

/**
 * Main function.
 */
async function main() {
  logger('Running ZK contract test on HTTP interface.');

  wallet = await createAccounts(aztecRpcClient, SchnorrSingleKeyAccountContractAbi, privateKey, Fr.random(), 2);
  logger("creating accounts");
  const accounts = await aztecRpcClient.getAccounts();
  const [ownerAddress] = accounts;
  logger(`Created ${accounts.length} accounts`);

  const simpleContract = await deployZKContract();
    const tx = simpleContract.methods.set(100n, ownerAddress).send({ origin: ownerAddress });
    await tx.isMined();
    logger('Set successful');


}

main()
  .then(() => {
    logger('Finished running successfuly.');
    process.exit(0);
  })
  .catch(err => {
    logger('Error in main fn: ', err);
    process.exit(1);
  });
