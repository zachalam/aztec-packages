import { AztecNode } from '@aztec/aztec-node';
import { Ecdsa, Secp256k1 } from '@aztec/barretenberg.js/crypto';
import { Fr } from '@aztec/circuits.js';
// TODO: Change to secp256k1
import { ConstantKeyPair } from '@aztec/key-store';
import { L2Block, MerkleTreeId, UnverifiedData } from '@aztec/types';
import { MockProxy, mock } from 'jest-mock-extended';
import { Database, MemoryDB } from '../database/index.js';
import { Synchroniser } from './synchroniser.js';

describe('Synchroniser', () => {
  let secp256k1: Secp256k1;
  let ecdsa: Ecdsa;
  let aztecNode: MockProxy<AztecNode>;
  let database: Database;
  let synchroniser: TestSynchroniser;
  let roots: Record<MerkleTreeId, Fr>;

  beforeAll(async () => {
    secp256k1 = await Secp256k1.new();
    ecdsa = await Ecdsa.new();
  });

  beforeEach(() => {
    roots = {
      [MerkleTreeId.CONTRACT_TREE]: Fr.random(),
      [MerkleTreeId.PRIVATE_DATA_TREE]: Fr.random(),
      [MerkleTreeId.NULLIFIER_TREE]: Fr.random(),
      [MerkleTreeId.PUBLIC_DATA_TREE]: Fr.random(),
      [MerkleTreeId.L1_TO_L2_MESSAGES_TREE]: Fr.random(),
      [MerkleTreeId.L1_TO_L2_MESSAGES_ROOTS_TREE]: Fr.random(),
      [MerkleTreeId.CONTRACT_TREE_ROOTS_TREE]: Fr.random(),
      [MerkleTreeId.PRIVATE_DATA_TREE_ROOTS_TREE]: Fr.random(),
    };

    aztecNode = mock<AztecNode>();
    aztecNode.getUnverifiedData.mockResolvedValue([]);

    database = new MemoryDB();

    synchroniser = new TestSynchroniser(aztecNode, database);
  });

  it('should create account state', async () => {
    const account = ConstantKeyPair.random(secp256k1, ecdsa);
    const address = account.getPublicKey().toAztecAddress();

    expect(synchroniser.getAccount(address)).toBeUndefined();

    await synchroniser.addAccount(await account.getPrivateKey());

    expect(synchroniser.getAccount(address)!.getEthPublicKey()).toEqual(account.getPublicKey());
  });

  it('sets tree roots from aztec node on initial sync', async () => {
    aztecNode.getBlockHeight.mockResolvedValue(3);
    aztecNode.getTreeRoots.mockResolvedValue(roots);

    await synchroniser.initialSync();

    expect(await database.getTreeRoots()).toEqual(roots);
  });

  it('sets tree roots from latest block', async () => {
    const block = L2Block.random(1, 4);

    aztecNode.getBlocks.mockResolvedValue([block]);
    aztecNode.getUnverifiedData.mockResolvedValue([UnverifiedData.random(4)]);

    await synchroniser.work();

    const roots = await database.getTreeRoots();
    expect(roots[MerkleTreeId.CONTRACT_TREE]).toEqual(block.endContractTreeSnapshot.root);
  });

  it('overrides tree roots from initial sync once block height is larger', async () => {
    // Initial sync is done on block with height 3
    aztecNode.getBlockHeight.mockResolvedValue(3);
    aztecNode.getTreeRoots.mockResolvedValue(roots);

    await synchroniser.initialSync();
    const roots0 = await database.getTreeRoots();
    expect(roots0[MerkleTreeId.CONTRACT_TREE]).toEqual(roots[MerkleTreeId.CONTRACT_TREE]);

    // We then process block with height 1, this should not change tree roots
    const block1 = L2Block.random(1, 4);
    aztecNode.getBlocks.mockResolvedValueOnce([block1]);
    aztecNode.getUnverifiedData.mockResolvedValue([UnverifiedData.random(4)]);

    await synchroniser.work();
    const roots1 = await database.getTreeRoots();
    expect(roots1[MerkleTreeId.CONTRACT_TREE]).toEqual(roots[MerkleTreeId.CONTRACT_TREE]);
    expect(roots1[MerkleTreeId.CONTRACT_TREE]).not.toEqual(block1.endContractTreeSnapshot.root);

    // But they should change when we process block with height 5
    const block5 = L2Block.random(5, 4);
    aztecNode.getBlocks.mockResolvedValueOnce([block5]);

    await synchroniser.work();
    const roots5 = await database.getTreeRoots();
    expect(roots5[MerkleTreeId.CONTRACT_TREE]).not.toEqual(roots[MerkleTreeId.CONTRACT_TREE]);
    expect(roots5[MerkleTreeId.CONTRACT_TREE]).toEqual(block5.endContractTreeSnapshot.root);
  });
});

class TestSynchroniser extends Synchroniser {
  public work() {
    return super.work();
  }

  public initialSync(): Promise<void> {
    return super.initialSync();
  }
}
