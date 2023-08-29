import { expect } from '@esm-bundle/chai';
import { Barretenberg, RawBuffer, Crs } from '../../../dest/browser/index.js';
import { decompressSync as gunzip } from 'fflate';


const bytecode =
  'H4sIAAAAAAAA/+2Z326CMBTGP2SIyCTLsmw3u+ARWv5ouZuPMjN8/0fYyFo5MHbFV6KJJyG1jf16/vT8NPoG4B2/Fvw8KzvmYr4azUM7D+0Dsb+zDzuqeabdeeDqKkzYTG3tUftyhszFgx0jsZbY0dWss7WoTSj2HsW+QIyB0DiKPVPvCf7RScSa258JX8DLiVqDfu9UJjTZDl8udVeEHH1TRXYO+GuksW6p9lXVHopWl/pTFc3J1KqqT3ujja5N/VWYsmxNZQ7NqTmoRldlq891U56t8BP8NGXI8bOwfuoHYswRsS7M/PmGcYQhbFh+Y8Jmai8OYwe2WKzdYczRXATGneM5ehjH8Adj10hsGD/jNmC8JsYcE+vCzJ9vGMcYwoblNyZspvbiMN7YUYLvDmOO5iIw7gqYo4dxAn8wdo3EhvELbgPGG2LMCbEuzPz5hnGCYWOz/MaEzdReHMZbO6Zi7Q5jjuYiMO4KmKOHcQp/MHaNxIbxK24DxltizCmxLleev0vMITHmlOjXI7gfZn+aHvxeZPos/d2J1+437NXEnfAATI3ROeM8egWqryLtPOhm4F1+X3Fn/BoN4HTNOZXfdtwfcmP7BvHx78jZGwAA';
const witness =
  'H4sIAAAAAAAC/62SyQmAMBAAvW9FgljHLuojP1sR++8hCUkHmYWQfQ0DO6aIU/r3pl3y5qo41l0DLLWfhr/hvKTlWH8HevUYy8oAeo0Q6/GXnECvGexrAb1WkLVxLN3B7g3Y6gH2dYJNOFf9nDtgBQAA';

const CIRCUIT_SIZE = 2 ** 19;

// function printUint8ArrayAsHex(uint8Array) {
//   let hexString = "";
//   for (let i = 0; i < uint8Array.length; i++) {
//     const hex = uint8Array[i].toString(16).padStart(2, "0");
//     hexString += hex + " ";
//     if ((i + 1) % 16 === 0) {
//       hexString += "\n";
//     } else if ((i + 1) % 8 === 0) {
//       hexString += " ";
//     }
//   }
//   console.log(hexString);
// }

describe('Create Proof from ACIR bytecode and Verify', () => {
  let api: Barretenberg;
  let numberOfThreads: number;

  before(async () => {
    numberOfThreads = navigator.hardwareConcurrency || 1;
    console.log("Will utilize number of Threads:", numberOfThreads);
    api = await Barretenberg.new(numberOfThreads);
  }, 15000);

  after(async () => {
    // await api.destroy();
  });

  it('Should Prove and Verify 1_mul', async () => {
    // Decode Base64 strings
    const compressedByteCode = Uint8Array.from(atob(bytecode), c => c.charCodeAt(0));
    const compressedWitness = Uint8Array.from(atob(witness), c => c.charCodeAt(0));
    
    const acirUint8Array = gunzip(compressedByteCode);
    const witnessUint8Array = gunzip(compressedWitness);
    
    const isRecursive = false;
    await api.commonInitSlabAllocator(CIRCUIT_SIZE);

    // Plus 1 needed!
    const crs = await Crs.new(CIRCUIT_SIZE + 1);
    await api.srsInitSrs(new RawBuffer(crs.getG1Data()), crs.numPoints, new RawBuffer(crs.getG2Data()));

    const acirComposer = await api.acirNewAcirComposer(CIRCUIT_SIZE);
    console.log("Is Recursive:", isRecursive);
    const proof = await api.acirCreateProof(
      acirComposer,
      acirUint8Array,
      witnessUint8Array,
      isRecursive
    );

  
    const verified = await api.acirVerifyProof(acirComposer, proof, isRecursive);

    // Main thread doesn't do anything in this test, so -1.
    // const threads = (await api.getNumThreads()) - 1;
    // const iterations = 100000;
    // const result = await api.testThreads(threads, iterations);
    expect(verified).to.be.true;
  });
});
