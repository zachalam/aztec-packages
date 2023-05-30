import { compile } from '@noir-lang/noir_wasm';
import nodePath from 'path';
import fsSync from 'fs';
import fs from 'fs/promises';
import noirResolver from '@noir-lang/noir-source-resolver';
import toml from 'toml';
import { NoirCompiledContract } from './noir_artifact.js';
import { ContractAbi, FunctionType } from '@aztec/foundation/abi';
import { mockVerificationKey } from './mockedKeys.js';

/**
 * A dependency entry of Nargo.toml.
 */
export interface Dependency {
  /**
   * Path to the dependency.
   */
  path?: string;
  /**
   * Git repository of the dependency.
   */
  git?: string;
}

/**
 * A class that compiles noir contracts and outputs the Aztec ABI.
 */
export class ContractCompiler {
  constructor(private projectPath: string) {}

  /**
   * Compiles the contracts in projectPath and returns the Aztec ABI.
   * @returns Aztec ABI of the compiled contracts.
   */
  public async compile(): Promise<ContractAbi[]> {
    const noirContracts = await this.compileNoir();
    const abis: ContractAbi[] = noirContracts.map(this.convertToAztecABI);
    return abis;
  }

  /**
   * Converts a compiled noir contract to Aztec ABI.
   * @param contract - A compiled noir contract.
   * @returns Aztec ABI of the contract.
   */
  private convertToAztecABI(contract: NoirCompiledContract): ContractAbi {
    return {
      ...contract,
      functions: contract.functions
        .map(noirFn => {
          const functionType = noirFn.function_type.toLowerCase() as FunctionType;

          let parameters = noirFn.abi.parameters;
          // If the function is not unconstrained, the first item is inputs or CallContext which we should omit
          // This can be removed when we have oracles again, since we can load the Inputs or CallContext via oracle
          if (functionType !== FunctionType.UNCONSTRAINED) parameters = parameters.slice(1);
          // If the function is not secret, drop any padding from the end
          if (functionType !== FunctionType.SECRET && parameters[parameters.length - 1].name.endsWith('padding'))
            parameters = parameters.slice(0, parameters.length - 1);

          let returnTypes = [noirFn.abi.return_type];
          // If the function is secret, the return is the public inputs, which should be omitted
          if (functionType === FunctionType.SECRET) returnTypes = [];

          return {
            name: noirFn.name,
            functionType: functionType,
            parameters,
            returnTypes,
            bytecode: Buffer.from(noirFn.bytecode).toString('hex'),
            verificationKey: mockVerificationKey,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  /**
   * Reads the dependencies of a noir crate.
   * @param cratePath - Path to the noir crate.
   * @returns A map of dependencies.
   */
  private async readDependencies(cratePath: string) {
    const { dependencies } = toml.parse(
      await fs.readFile(nodePath.join(cratePath, 'Nargo.toml'), { encoding: 'utf8' }),
    );
    return (dependencies || {}) as Record<string, Dependency>;
  }

  /**
   * Executes the noir compiler.
   * @returns A list of compiled noir contracts.
   */
  private async compileNoir(): Promise<NoirCompiledContract[]> {
    const dependenciesMap = await this.readDependencies(this.projectPath);

    /**
     * The resolver receives a relative path, and the first part of the path can be a dependency name.
     * If the dependency is found in the map, the rest of the path inside that dependency src folder.
     * Otherwise, resolve the full relative path requested inside the project path.
     */
    noirResolver.initialiseResolver((id: string) => {
      const idParts = id.split('/');

      let path;
      if (dependenciesMap[idParts[0]]) {
        const [dependencyName, ...dependencySubpathParts] = idParts;
        const dependency = dependenciesMap[dependencyName];
        if (!dependency.path) {
          throw new Error(`Don't know how to resolve dependency ${dependencyName}`);
        }
        path = nodePath.resolve(this.projectPath, dependency.path, 'src', dependencySubpathParts.join('/'));
      } else {
        path = nodePath.join(this.projectPath, 'src', idParts.join('/'));
      }

      // The resolver does not support async resolution
      // and holding the whole project in memory is not reasonable
      const result = fsSync.readFileSync(path, { encoding: 'utf8' });
      return result;
    });

    return compile({
      contracts: true,
      optional_dependencies_set: Object.keys(dependenciesMap), // eslint-disable-line camelcase
    });
  }
}
