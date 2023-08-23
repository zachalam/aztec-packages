import { AztecNodeService } from '@aztec/aztec-node';
import { AztecRPCServer } from '@aztec/aztec-rpc';
import { AztecRPC, CompleteAddress, ContractDeployer, ContractFunctionInteraction, Wallet } from '@aztec/aztec.js';
import { DebugLogger } from '@aztec/foundation/log';
import { CGamContract, CGamContractAbi } from '@aztec/noir-contracts/types';

import { setup } from './fixtures/utils.js';

describe('e2e_c_gam_contract', () => {
  let aztecNode: AztecNodeService | undefined;
  let aztecRpcServer: AztecRPC;
  let wallet: Wallet;
  let accounts: CompleteAddress[];
  let logger: DebugLogger;
  let owner: CompleteAddress;
  // let recipient: CompleteAddress;

  let contract: CGamContract;

  beforeEach(async () => {
    ({ aztecNode, aztecRpcServer, accounts, logger, wallet } = await setup(/*two accounts for 2 players*/ 2));
    owner = accounts[0];
    // recipient = accounts[1]; // TODO play game with this guy
  }, 100_000);

  afterEach(async () => {
    await aztecNode?.stop();
    if (aztecRpcServer instanceof AztecRPCServer) {
      await aztecRpcServer?.stop();
    }
  });

  const deployContract = async () => {
    logger(`Deploying L2 contract...`);
    const deployer = new ContractDeployer(CGamContractAbi, aztecRpcServer);
    const tx = deployer.deploy().send();
    await tx.isMined();
    const receipt = await tx.getReceipt();
    contract = await CGamContract.at(receipt.contractAddress!, wallet);
    logger('L2 contract deployed');
    return contract;
  };

  const buyPackAndGetData = async (
    deployedContract: CGamContract,
    account: CompleteAddress,
    logger: DebugLogger,
  ): Promise<bigint[]> => {
    const seed = 1n;
    const tx: ContractFunctionInteraction = deployedContract.methods.buy_pack(seed, account.address);
    await tx.send({ origin: account.address }).wait();
    logger(`We bought our pack!`);
    const cardData = await deployedContract.methods
      .get_pack_cards_unconstrained(seed, account.address)
      .view({ from: account.address });
    return cardData;
  };

  it('should call buy_pack and see notes', async () => {
    const deployedContract = await deployContract();
    const cardData = await buyPackAndGetData(deployedContract, owner, logger);
    // Test that we have received the expected card data
    expect(cardData).toEqual([328682529145n, 657365058290n, 986047587435n]);
  }, 30_000);

  it('should call join_game and queue a public call', async () => {
    const deployedContract = await deployContract();
    const cardData = await buyPackAndGetData(deployedContract, owner, logger);
    // Test that we have received the expected card data
    expect(cardData).toEqual([328682529145n, 657365058290n, 986047587435n]);
    const gameId = 1337n; // decided off-chain
    logger(`Joining game ${gameId}...`);
    const tx: ContractFunctionInteraction = deployedContract.methods.join_game(
      gameId,
      cardData.map(cardData => ({ inner: cardData })),
      owner.address,
      deployedContract.methods.join_game_pub.selector,
    );
    await tx.send({ origin: owner.address }).wait();
  }, 30_000);
});
