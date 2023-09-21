import { AztecNodeService } from '@aztec/aztec-node';
import { AztecRPCServer } from '@aztec/aztec-rpc';
import { AccountWallet, AztecAddress } from '@aztec/aztec.js';
import { Fr, FunctionSelector } from '@aztec/circuits.js';
import { EthAddress } from '@aztec/foundation/eth-address';
import { DebugLogger } from '@aztec/foundation/log';
import { TokenBridgeContract, TokenContract } from '@aztec/noir-contracts/types';
import { AztecRPC, TxStatus } from '@aztec/types';

import { CrossChainTestHarness } from './fixtures/cross_chain_test_harness.js';
import { delay, hashPayload, setup } from './fixtures/utils.js';

describe('e2e_cross_chain_messaging', () => {
  let aztecNode: AztecNodeService;
  let aztecRpcServer: AztecRPC;
  let logger: DebugLogger;

  let user1Wallet: AccountWallet;
  let user2Wallet: AccountWallet;
  let ethAccount: EthAddress;
  let ownerAddress: AztecAddress;

  let crossChainTestHarness: CrossChainTestHarness;
  let l2Token: TokenContract;
  let l2Bridge: TokenBridgeContract;
  let outbox: any;

  beforeEach(async () => {
    const {
      aztecNode,
      aztecRpcServer: aztecRpcServer_,
      deployL1ContractsValues,
      accounts,
      wallets,
      logger: logger_,
      cheatCodes,
    } = await setup(2);
    crossChainTestHarness = await CrossChainTestHarness.new(
      aztecNode,
      aztecRpcServer_,
      deployL1ContractsValues,
      accounts,
      wallets[0],
      logger_,
      cheatCodes,
    );

    l2Token = crossChainTestHarness.l2Token;
    l2Bridge = crossChainTestHarness.l2Bridge;
    ethAccount = crossChainTestHarness.ethAccount;
    ownerAddress = crossChainTestHarness.ownerAddress;
    outbox = crossChainTestHarness.outbox;
    aztecRpcServer = crossChainTestHarness.aztecRpcServer;
    user1Wallet = wallets[0];
    user2Wallet = wallets[1];
    logger = logger_;
    logger('Successfully deployed contracts and initialized portal');
  }, 100_000);

  afterEach(async () => {
    await aztecNode?.stop();
    if (aztecRpcServer instanceof AztecRPCServer) {
      await aztecRpcServer?.stop();
    }
    await crossChainTestHarness?.stop();
  });

  it.only('Milestone 2: Deposit funds from L1 -> L2 and withdraw back to L1', async () => {
    // Generate a claim secret using pedersen
    const l1TokenBalance = 1000000n;
    const bridgeAmount = 100n;

    const [secretForL2MessageConsumption, secretHashForL2MessageConsumption] =
      await crossChainTestHarness.generateClaimSecret();
    const [secretForRedeemingMintedNotes, secretHashForRedeemingMintedNotes] =
      await crossChainTestHarness.generateClaimSecret();

    // 1. Mint tokens on L1
    logger(`Minting ${l1TokenBalance} tokens on L1 to user...`)
    await crossChainTestHarness.mintTokensOnL1(l1TokenBalance);
    logger(`Minted ${l1TokenBalance} tokens on L1 to user. L1 Balance - ${l1TokenBalance}`)

    // 2. Deposit tokens to the TokenPortal
    const messageKey = await crossChainTestHarness.sendTokensToPortalPrivate(
      bridgeAmount,
      secretHashForL2MessageConsumption,
      secretHashForRedeemingMintedNotes,
    );
    expect(await crossChainTestHarness.getL1BalanceOf(ethAccount)).toBe(l1TokenBalance - bridgeAmount);
    logger(`💰->🏦 User sends ${bridgeAmount} tokens to the TokenPortal to deposit into Aztec privately.\nL1 Balance - ${l1TokenBalance - bridgeAmount}\nL2 Private Balance - 0`)
    logger(`\n📨 User sends a message to the L2 bridge with`)
    logger(`1. The amount of tokens they want to deposit`)
    logger(`2. The secret hash to consume the message on L2`)
    logger(`3. The secret hash to redeem the minted notes`)
    logger(`4. The deadline sequencer has to consume the message`)
    logger(`5. The canceller address who can cancel the L1 to L2 message`)
    logger(`\n🔑 Message Key: ${messageKey}\n`)

    // Wait for the archiver to process the message
    logger(`\nWaiting for the archiver to process the message...`)
    await delay(5000); /// waiting 5 seconds.

    // Perform an unrelated transaction on L2 to progress the rollup. Here we mint public tokens.
    logger(`\n🤖 Performing an unrelated transaction on L2 to progress the rollup. This makes the sequencer fetch all pending L1 to L2 messages and "confirm" then in the rollup contract.`);
    const unrelatedMintAmount = 99n;
    await crossChainTestHarness.mintTokensPublicOnL2(unrelatedMintAmount);
    await crossChainTestHarness.expectPublicBalanceOnL2(ownerAddress, unrelatedMintAmount);
    logger(`🤖 The L1 to L2 message is now committed to aztec world state...`)
    logger(`The message can now be consumed on aztec`)

    // 3. Consume L1-> L2 message and mint private tokens on L2
    logger("\nAn operator may call TokenBridge.claim_private(), with relevant information to consume the message and mint tokens:")
    logger(`1. The amount of tokens to mint`)
    logger(`2. The secret hash to redeem minted notes (note: the hash not the secret)`)
    logger(`3. The canceller address who can cancel the L1 to L2 message`)
    logger(`4. The message key of the L1 to L2 message`)
    logger(`5. The secret to consume the message on L1`)
    await crossChainTestHarness.consumeMessageOnAztecAndMintSecretly(
      bridgeAmount,
      secretHashForRedeemingMintedNotes,
      messageKey,
      secretForL2MessageConsumption,
    );
    logger(`\n🤫 User successfully consumed L1 to L2 message secretly.... L2 Private Balance - 0 `)
    // tokens were minted privately in a TransparentNote which the owner (person who knows the secret) must redeem:
    logger(`🤫 User must now redeem their minted notes by calling Token.redeemShielded() with the secret`);
    await crossChainTestHarness.redeemShieldPrivatelyOnL2(bridgeAmount, secretForRedeemingMintedNotes);
    await crossChainTestHarness.expectPrivateBalanceOnL2(ownerAddress, bridgeAmount);
    logger(`🤫 User redeems their newly minted notes KACHING! but secretly... L2 Private Balance - ${bridgeAmount}`)

    // time to withdraw the funds again!
    logger('\nWithdrawing funds from L2 back to L1');

    // 4. Give approval to bridge to burn owner's funds:
    const withdrawAmount = 9n;
    logger(`\n🔥 User creates authorization witness to approves the bridge to burn ${withdrawAmount} tokens on their behalf`);
    const nonce = Fr.random();
    const burnMessageHash = await hashPayload([
      l2Bridge.address.toField(),
      l2Token.address.toField(),
      FunctionSelector.fromSignature('burn((Field),Field,Field)').toField(),
      ownerAddress.toField(),
      new Fr(withdrawAmount),
      nonce,
    ]);
    await user1Wallet.createAuthWitness(burnMessageHash);

    // 5. Withdraw owner's funds from L2 to L1
    const entryKey = await crossChainTestHarness.checkEntryIsNotInOutbox(withdrawAmount);
    logger(`📨 User calls Bridge.exit_to_l1_private() to burn their tokens on L2 and send a message to the L1 to mint them with arguments:`)
    logger(`1. The recipient of the tokens on L1`)
    logger(`2. The amount of tokens they want to exit`)
    logger(`3. The address that can consume the message on L1 (here 0x0)`)
    logger(`4. The nonce of the message used in the approval...`)
    await crossChainTestHarness.withdrawPrivateFromAztecToL1(withdrawAmount, nonce);
    await crossChainTestHarness.expectPrivateBalanceOnL2(ownerAddress, bridgeAmount - withdrawAmount);
    logger(`🤫 User successfully withdrew ${withdrawAmount} tokens from Aztec to L1. L2 Private Balance - ${bridgeAmount - withdrawAmount}\nL1 Balance - ${l1TokenBalance - bridgeAmount}`);


    // Check balance before and after exit.
    logger(`\n🏦->💰 User now withdraws ${withdrawAmount} tokens from the TokenPortal to themselves on L1 with parameters`)
    logger(`1. The amount of tokens to withdraw`)
    logger(`2. The recipient of the tokens`)
    logger(`3. If a designated caller has been assigned (here no)`)
    expect(await crossChainTestHarness.getL1BalanceOf(ethAccount)).toBe(l1TokenBalance - bridgeAmount);
    await crossChainTestHarness.withdrawFundsFromBridgeOnL1(withdrawAmount, entryKey);
    expect(await crossChainTestHarness.getL1BalanceOf(ethAccount)).toBe(l1TokenBalance - bridgeAmount + withdrawAmount);
    logger(`User L1 Balance - ${l1TokenBalance - bridgeAmount + withdrawAmount}`);

    expect(await outbox.read.contains([entryKey.toString(true)])).toBeFalsy();
  }, 120_000);

  // Unit tests for TokenBridge's private methods.
  it('Someone else can mint funds to me on my behalf (privately)', async () => {
    const l1TokenBalance = 1000000n;
    const bridgeAmount = 100n;
    const [secretForL2MessageConsumption, secretHashForL2MessageConsumption] =
      await crossChainTestHarness.generateClaimSecret();
    const [secretForRedeemingMintedNotes, secretHashForRedeemingMintedNotes] =
      await crossChainTestHarness.generateClaimSecret();

    await crossChainTestHarness.mintTokensOnL1(l1TokenBalance);
    const messageKey = await crossChainTestHarness.sendTokensToPortalPrivate(
      bridgeAmount,
      secretHashForL2MessageConsumption,
      secretHashForRedeemingMintedNotes,
    );
    expect(await crossChainTestHarness.getL1BalanceOf(ethAccount)).toBe(l1TokenBalance - bridgeAmount);

    // Wait for the archiver to process the message
    await delay(5000); /// waiting 5 seconds.

    // Perform an unrelated transaction on L2 to progress the rollup. Here we mint public tokens.
    const unrelatedMintAmount = 99n;
    await crossChainTestHarness.mintTokensPublicOnL2(unrelatedMintAmount);
    await crossChainTestHarness.expectPublicBalanceOnL2(ownerAddress, unrelatedMintAmount);

    // 3. Consume L1-> L2 message and mint private tokens on L2

    // Sending wrong secret hashes should fail:
    await expect(
      l2Bridge
        .withWallet(user2Wallet)
        .methods.claim_private(
          bridgeAmount,
          secretHashForL2MessageConsumption,
          { address: ethAccount.toField() },
          messageKey,
          secretForL2MessageConsumption,
        )
        .simulate(),
    ).rejects.toThrowError("Cannot satisfy constraint 'l1_to_l2_message_data.message.content == content");

    // send the right one -
    const consumptionTx = l2Bridge
      .withWallet(user2Wallet)
      .methods.claim_private(
        bridgeAmount,
        secretHashForRedeemingMintedNotes,
        { address: ethAccount.toField() },
        messageKey,
        secretForL2MessageConsumption,
      )
      .send();
    const consumptionReceipt = await consumptionTx.wait();
    expect(consumptionReceipt.status).toBe(TxStatus.MINED);

    // Now user1 can claim the notes that user2 minted on their behalf.
    await crossChainTestHarness.redeemShieldPrivatelyOnL2(bridgeAmount, secretForRedeemingMintedNotes);
    await crossChainTestHarness.expectPrivateBalanceOnL2(ownerAddress, bridgeAmount);
  }, 50_000);

  it("Bridge can't withdraw my funds if I don't give approval", async () => {
    const mintAmountToUser1 = 100n;
    await crossChainTestHarness.mintTokensPublicOnL2(mintAmountToUser1);

    const withdrawAmount = 9n;
    const nonce = Fr.random();
    const expectedBurnMessageHash = await hashPayload([
      l2Bridge.address.toField(),
      l2Token.address.toField(),
      FunctionSelector.fromSignature('burn((Field),Field,Field)').toField(),
      user1Wallet.getAddress().toField(),
      new Fr(withdrawAmount),
      nonce,
    ]);
    // Should fail as owner has not given approval to bridge burn their funds.
    await expect(
      l2Bridge
        .withWallet(user1Wallet)
        .methods.exit_to_l1_private(
          { address: ethAccount.toField() },
          { address: l2Token.address },
          withdrawAmount,
          { address: EthAddress.ZERO.toField() },
          nonce,
        )
        .simulate(),
    ).rejects.toThrowError(`Unknown auth witness for message hash 0x${expectedBurnMessageHash.toString('hex')}`);
  });
});
