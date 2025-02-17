import { ContractArtifact } from '@aztec/foundation/abi';
import { fileURLToPath } from '@aztec/foundation/url';

import { execSync } from 'child_process';
import path from 'path';

import { compileUsingNargo, generateNoirContractInterface, generateTypescriptContractInterface } from './index.js';

function isNargoAvailable() {
  try {
    execSync(`which nargo`);
    return true;
  } catch (error) {
    return false;
  }
}

const describeIf = (cond: () => boolean) => (cond() ? describe : xdescribe);

describe('noir-compiler', () => {
  let projectPath: string;
  beforeAll(() => {
    const currentDirName = path.dirname(fileURLToPath(import.meta.url));
    projectPath = path.join(currentDirName, 'fixtures/test_contract');
  });

  describeIf(isNargoAvailable)('using nargo binary', () => {
    let compiled: ContractArtifact[];
    beforeAll(async () => {
      compiled = await compileUsingNargo(projectPath);
    });

    it('compiles the test contract', () => {
      expect(compiled).toMatchSnapshot();
    });

    it('generates typescript interface', () => {
      const result = generateTypescriptContractInterface(compiled[0], `../target/test.json`);
      expect(result).toMatchSnapshot();
    });

    it('generates Aztec.nr external interface', () => {
      const result = generateNoirContractInterface(compiled[0]);
      expect(result).toMatchSnapshot();
    });
  });
});
