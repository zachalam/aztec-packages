import { AztecNodeService } from '@aztec/aztec-node';
import { AztecRPCServer } from '@aztec/aztec-rpc';
import { AztecRPC, CompleteAddress, ContractFunctionInteraction, Wallet } from '@aztec/aztec.js';
import { DebugLogger } from '@aztec/foundation/log';

import { setup } from './fixtures/utils.js';

describe('e2e_c_gam_contract', () => {
  let aztecNode: AztecNodeService | undefined;
  let aztecRpcServer: AztecRPC;
  let logger: DebugLogger;
  let player1: CompleteAddress;
  let wallet: Wallet;
  let player2: CompleteAddress;
  let contract: CGamContract;

  // const getSimplePrivateKey = (id: number) => {
  //   const data = Buffer.alloc(32);
  //   data.writeUInt32BE(id);
  //   return new PrivateKey(data);
  // };

  beforeEach(async () => {
    ({ aztecNode, aztecRpcServer, wallet, logger } = await setup(2));
    [player1, player2] = await aztecRpcServer.getAccounts();
  }, 100_000);

  afterEach(async () => {
    await aztecNode?.stop();
    if (aztecRpcServer instanceof AztecRPCServer) {
      await aztecRpcServer?.stop();
    }
  });

  const deployContract = async () => {
    logger(`Deploying L2 contract...`);
    const address = await CGamContract.deploy(wallet).send().deployed();
    contract = await CGamContract.at(address.address, wallet);
    logger('L2 contract deployed');
    return contract;
  };

  const buyPack = async (deployedContract: CGamContract, account: CompleteAddress): Promise<bigint[]> => {
    const seed = 1n; // Decided off-chain
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
    const cardData = await buyPack(deployedContract, player1);
    expect(cardData).toEqual([348662030709n, 697324061418n, 1045986092127n]);
  }, 30_000);

  it('should call join_game and queue a public call', async () => {
    const deployedContract = await deployContract();
    const player1Cards = await buyPack(deployedContract, player1);
    expect(player1Cards).toEqual([348662030709n, 697324061418n, 1045986092127n]);
    const player2Cards = await buyPack(deployedContract, player2);
    expect(player2Cards).toEqual([348662030709n, 697324061418n, 1045986092127n]);
    const gameId = 1337n; // decided off-chain
    logger(`Joining game ${gameId}...`);
    for (const [player, cards] of [
      [player1, player1Cards],
      [player2, player2Cards],
    ] as const) {
      const tx: ContractFunctionInteraction = deployedContract.methods.join_game(
        gameId,
        cards.map(cardData => ({ inner: cardData })),
        player.address,
        deployedContract.methods.join_game_pub.selector,
      );
      await tx.send({ origin: player.address }).wait();
    }
  }, 30_000);
});
