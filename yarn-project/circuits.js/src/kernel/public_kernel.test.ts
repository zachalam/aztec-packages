import {
  CircuitError,
  Fr,
  MAX_PRIVATE_CALL_STACK_LENGTH_PER_TX,
  MAX_PUBLIC_DATA_READS_PER_CALL,
  MAX_PUBLIC_DATA_READS_PER_TX,
  makeTuple,
  simulatePublicKernelInitCircuit,
  simulatePublicKernelInnerCircuit,
} from '../index.js';
import {
  makePublicDataRead,
  makePublicKernelInputsInitWithTweak,
  makePublicKernelInputsInnerWithTweak,
} from '../tests/factories.js';

describe('kernel/public_kernel', () => {
  it('simulates public kernel circuit with previous public kernel', async function () {
    const input = await makePublicKernelInputsInnerWithTweak(1, input => {
      input.publicCall.callStackItem.functionData.isConstructor = false;
      input.publicCall.callStackItem.functionData.isPrivate = false;
    });
    const result = await simulatePublicKernelInnerCircuit(input);
    expect(result).toBeDefined();
  });

  it('simulates public kernel circuit with previous private kernel', async function () {
    const input = await makePublicKernelInputsInitWithTweak(1, input => {
      input.previousKernel.publicInputs.end.privateCallStack = makeTuple(MAX_PRIVATE_CALL_STACK_LENGTH_PER_TX, Fr.zero);
    });
    const result = await simulatePublicKernelInitCircuit(input);
    expect(result).toBeDefined();
  });

  it('simulating public kernel circuit fails when aggregating proofs will overflow', async function () {
    const input = await makePublicKernelInputsInnerWithTweak(1, input => {
      input.publicCall.callStackItem.functionData.isConstructor = false;
      input.publicCall.callStackItem.functionData.isPrivate = false;

      // Cause array overflow
      const fullStateReadsObject = makeTuple(MAX_PUBLIC_DATA_READS_PER_TX, makePublicDataRead, 0x01);
      input.previousKernel.publicInputs.end.publicDataReads = fullStateReadsObject;
    });

    await expect(simulatePublicKernelInnerCircuit(input)).rejects.toThrow(
      new CircuitError(
        7009,
        `public_kernel_circuit: too many public data reads in one tx - array_push: capacity exceeded. Limit: ${MAX_PUBLIC_DATA_READS_PER_CALL}
Refer to https://docs.aztec.network/aztec/protocol/errors for more information.`,
      ),
    );
  });
});
