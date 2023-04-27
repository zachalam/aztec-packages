import {
  ACVMField,
  acvm,
  toACVMField,
  fromACVMField,
  ZERO_ACVM_FIELD,
  toAcvmCallPrivateStackItem,
  toACVMWitness,
  toACVMCallContext,
  toACVMContractDeploymentData,
} from '../acvm/index.js';
import { AztecAddress, EthAddress, Fr } from '@aztec/foundation';
import { CallContext, PrivateCallStackItem, FunctionData } from '@aztec/circuits.js';
import { extractPublicInputs, frToAztecAddress, frToSelector } from '../acvm/deserialize.js';
import { FunctionAbi } from '@aztec/noir-contracts';
import { createDebugLogger } from '@aztec/foundation/log';
import { ClientTxExecutionContext } from './client_execution_context.js';
import { sizeOfType } from '../index.js';

export interface NewNoteData {
  preimage: Fr[];
  storageSlot: Fr;
  owner: { x: Fr; y: Fr };
}

export interface NewNullifierData {
  preimage: Fr[];
  storageSlot: Fr;
  nullifier: Fr;
}

export interface ExecutionPreimages {
  newNotes: NewNoteData[];
  nullifiedNotes: NewNullifierData[];
}

export interface ExecutionResult {
  // Needed for prover
  acir: Buffer;
  vk: Buffer;
  partialWitness: Map<number, ACVMField>;
  // Needed for the verifier (kernel)
  callStackItem: PrivateCallStackItem;
  // Needed for the user
  preimages: ExecutionPreimages;
  // Nested executions
  nestedExecutions: this[];
}

export class PrivateFunctionExecution {
  constructor(
    private context: ClientTxExecutionContext,
    private abi: FunctionAbi,
    private contractAddress: AztecAddress,
    private functionData: FunctionData,
    private args: Fr[],
    private callContext: CallContext,

    private log = createDebugLogger('aztec:simulator:secret_execution'),
  ) {}

  public async run(): Promise<ExecutionResult> {
    this.log(
      `Executing external function ${this.contractAddress.toShortString()}:${this.functionData.functionSelector.toString(
        'hex',
      )}`,
    );

    const acir = Buffer.from(this.abi.bytecode, 'hex');

    const argsSize = this.abi.parameters.reduce((acc, param) => acc + sizeOfType(param.type), 0);
    const initialWitness = toACVMWitness(1, this.args.slice(0, argsSize));

    const newNotePreimages: NewNoteData[] = [];
    const newNullifiers: NewNullifierData[] = [];
    const nestedExecutionContexts: ExecutionResult[] = [];

    console.log(initialWitness);

    const { partialWitness } = await acvm(acir, initialWitness, {
      loadPrivateFunctionContext:  () => this.loadContext(),
      getSecretKey: async ([address]: ACVMField[]) => [
        toACVMField(await this.context.db.getSecretKey(this.contractAddress, frToAztecAddress(fromACVMField(address)))),
      ],
      getNotes2: ([storageSlot]: ACVMField[]) => this.context.getNotes(this.contractAddress, storageSlot, 2),
      getRandomField: () => Promise.resolve([toACVMField(Fr.random())]),
      notifyCreatedNote: ([storageSlot, ownerX, ownerY, ...acvmPreimage]: ACVMField[]) => {
        newNotePreimages.push({
          preimage: acvmPreimage.map(f => fromACVMField(f)),
          storageSlot: fromACVMField(storageSlot),
          owner: {
            x: fromACVMField(ownerX),
            y: fromACVMField(ownerY),
          },
        });
        return Promise.resolve([ZERO_ACVM_FIELD]);
      },
      notifyNullifiedNote: ([slot, nullifier, ...acvmPreimage]: ACVMField[]) => {
        newNullifiers.push({
          preimage: acvmPreimage.map(f => fromACVMField(f)),
          storageSlot: fromACVMField(slot),
          nullifier: fromACVMField(nullifier),
        });
        return Promise.resolve([ZERO_ACVM_FIELD]);
      },
      callPrivateFunction: async ([acvmContractAddress, acvmFunctionSelector, ...acvmArgs]) => {
        const childExecutionResult = await this.callPrivateFunction(
          frToAztecAddress(fromACVMField(acvmContractAddress)),
          frToSelector(fromACVMField(acvmFunctionSelector)),
          acvmArgs.map(f => fromACVMField(f)),
          this.callContext,
        );

        nestedExecutionContexts.push(childExecutionResult);

        return toAcvmCallPrivateStackItem(childExecutionResult.callStackItem);
      },
    });

    const publicInputs = extractPublicInputs(partialWitness, acir);

    const callStackItem = new PrivateCallStackItem(this.contractAddress, this.functionData, publicInputs);

    return {
      acir,
      partialWitness,
      callStackItem,
      preimages: {
        newNotes: newNotePreimages,
        nullifiedNotes: newNullifiers,
      },
      vk: Buffer.from(this.abi.verificationKey!, 'hex'),
      nestedExecutions: nestedExecutionContexts,
    };
  }

  private loadContext(){
    return Promise.resolve([
      ...toACVMCallContext(this.callContext),

      toACVMField(this.context.historicRoots.privateDataTreeRoot),
      toACVMField(this.context.historicRoots.nullifierTreeRoot),
      toACVMField(this.context.historicRoots.contractTreeRoot),

      ...toACVMContractDeploymentData(this.context.request.txContext.contractDeploymentData),
    ])
  }

  private async callPrivateFunction(
    targetContractAddress: AztecAddress,
    targetFunctionSelector: Buffer,
    targetArgs: Fr[],
    callerContext: CallContext,
  ) {
    const targetAbi = await this.context.db.getFunctionABI(targetContractAddress, targetFunctionSelector);
    const targetPortalContractAddress = await this.context.db.getPortalContractAddress(targetContractAddress);
    const targetFunctionData = new FunctionData(targetFunctionSelector, true, false);
    const derivedCallContext = this.deriveCallContext(
      callerContext,
      targetContractAddress,
      targetPortalContractAddress,
      false,
      false,
    );

    const nestedExecution = new PrivateFunctionExecution(
      this.context,
      targetAbi,
      targetContractAddress,
      targetFunctionData,
      targetArgs,
      derivedCallContext,
    );

    return nestedExecution.run();
  }

  private deriveCallContext(
    parentContext: CallContext,
    targetContractAddress: AztecAddress,
    portalContractAddress: EthAddress,
    isDelegateCall = false,
    isStaticCall = false,
  ) {
    return new CallContext(
      parentContext.storageContractAddress,
      targetContractAddress,
      portalContractAddress,
      isDelegateCall,
      isStaticCall,
      false,
    );
  }
}
