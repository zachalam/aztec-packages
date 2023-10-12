import { ContractArtifact } from '@aztec/foundation/abi';

import { NoirWasmCompileOptions, NoirWasmContractCompiler } from './compile/noir/noir-wasm-compiler.js';
import { generateContractArtifact } from './contract-interface-gen/abi.js';

export { NoirVersion } from './noir-version.js';

export { generateNoirContractInterface } from './contract-interface-gen/noir.js';
export { generateTypescriptContractInterface } from './contract-interface-gen/typescript.js';
export { generateContractArtifact };

/**
 * Compile Aztec.nr contracts in project path using a nargo binary available in the shell.
 * @param projectPath - Path to project.
 * @returns Compiled artifacts.
 */
export async function compileUsingNoirWasm(
  projectPath: string,
  opts: NoirWasmCompileOptions = {},
): Promise<ContractArtifact[]> {
  return (await new NoirWasmContractCompiler(projectPath, opts).compile()).map(generateContractArtifact);
}
