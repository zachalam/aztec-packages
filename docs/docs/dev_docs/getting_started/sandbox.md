---
title: Aztec Sandbox
---

import Image from "@theme/IdealImage";

## Introduction

The Aztec Sandbox aims to provide a local development system against which you can build and test Aztec.nr contracts in a fast, safe, and free environment.

:::info
For a quickstart checkout [the Quickstart section](./quickstart.md)
:::

Here we will walkthrough the process of retrieving the Sandbox, installing the client libraries and using it to deploy and use a fully private token contract on the Aztec network using Aztec.js.

You can find the [complete tutorial code here](https://github.com/AztecProtocol/dev-rel/tree/main/tutorials/sandbox-tutorial/token).

## Prerequisites

- Node.js >= v18
- Docker and Docker Compose (Docker Desktop under WSL2 on windows)

That's it...

## Install the Sandbox

In your terminal:

```sh
/bin/bash -c "$(curl -fsSL 'https://sandbox.aztec.network')"
```

It will download and execute a script invoking docker compose with 2 containers:

- Anvil
- Aztec Sandbox

3 ports will need to be opened on your system in order for you to interact with the sandbox.
The first port is for Anvil, it defaults to 8545 and can be overridden by specifying a value in the environment variable `SANDBOX_ANVIL_PORT`.
The second one is sandbox Aztec Node port, it defaults to 8079 and can be overridden by specifying a value in the environment variable `SANDBOX_AZTEC_NODE_PORT`.
The third is the sandbox PXE port.
It defaults to value 8080 but can be overridden with environment variable `SANDBOX_PXE_PORT`.

Within a few seconds the Sandbox should be up and running!

<Image img={require("/img/sandbox.png")} />

## Project setup

We will deploy a pre-compiled token contract, and send tokens privately, using the Sandbox.

:::info
If you don't want to follow along and copy pasting step-by-step, the full code repository is available [here](https://github.com/AztecProtocol/dev-rel/tree/main/tutorials/sandbox-tutorial/token)
:::

We will create a `yarn` project called `token` (although npm works fine too). If you are familiar with setting up Javascript/Typescript projects then you can skip to step 6.

1. Ensure node version is 18 or higher by running

```sh
node -v
```

2. Initialize a yarn project

```sh
mkdir token
cd token
yarn init -yp
```

3. Create a `src` folder inside your new `token` directory:

```sh
mkdir src
```

4. Add necessary yarn packages (and optionally add typescript too)

```sh
yarn add @aztec/aztec.js @aztec/noir-contracts typescript @types/node
```

5. [Optional] If creating a typescript file, add a `tsconfig.json` file into the project root, here is an example:

```json
{
  "compilerOptions": {
    "outDir": "dest",
    "rootDir": "src",
    "target": "es2020",
    "lib": ["dom", "esnext", "es2017.object"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "downlevelIteration": true,
    "inlineSourceMap": true,
    "declarationMap": true,
    "importHelpers": true,
    "resolveJsonModule": true,
    "composite": true,
    "skipLibCheck": true
  },
  "references": [],
  "include": ["src", "src/*.json"]
}
```

6. Update `package.json` - Add a `scripts` section to `package.json` and set `"type": "module"`:

```json
{
  "name": "token",
  "version": "1.0.0",
  "description": "My first token contract",
  "main": "index.js",
  "author": "Phil",
  "license": "MIT",
  "type": "module",
  "scripts": {
    "build": "yarn clean && tsc -b",
    "build:dev": "tsc -b --watch",
    "clean": "rm -rf ./dest tsconfig.tsbuildinfo",
    "start": "yarn build && DEBUG='token' node ./dest/index.js"
  },
  "dependencies": {
    "@aztec/aztec.js": "latest",
    "@aztec/noir-contracts": "latest",
    "@types/node": "^20.6.3",
    "typescript": "^5.2.2"
  }
}
```

7. Next, install Aztec related dependencies

```sh
yarn add @aztec/aztec.js @aztec/noir-contracts
```

8. Create an `index.ts` file in the `src` directory with the following sandbox connection setup:

```ts
#include_code imports /yarn-project/end-to-end/src/e2e_sandbox_example.test.ts raw

async function main() {
#include_code setup /yarn-project/end-to-end/src/e2e_sandbox_example.test.ts raw
}

main();
```

9. Finally, run the package:

In the project root, run

```sh
yarn start
```

A successful run should show:

```
  token Aztec Sandbox Info  {
    version: 1,
    chainId: 31337,
    rollupAddress: EthAddress {
      buffer: <Buffer cf 7e d3 ac ca 5a 46 7e 9e 70 4c 70 3e 8d 87 f6 34 fb 0f c9>
    },
    client: 'pxe@0.1.0',
    compatibleNargoVersion: '0.11.1-aztec.0'
  }
```

Great! The Sandbox is running and we are able to interact with it.

## Accounts

The sandbox is preloaded with multiple accounts so you don't have to sit and create them. Let's load these accounts

#include_code load_accounts /yarn-project/end-to-end/src/e2e_sandbox_example.test.ts typescript

An explanation on accounts on Aztec can be found [here](../../concepts/foundation/accounts/main.md).

If you want more accounts, you can find instructions in the [Account creation section](../wallets/creating_schnorr_accounts.md).

## Token Contract Deployment

Writing a contract from scratch is beyond the scope of this page. Feel free to look at the [Token contract tutorial](../tutorials/writing_token_contract.md) or the section on aztec-noir contracts [here](../contracts/main.md)

Now that we have our accounts loaded, let's move on to deploy our pre-compiled token contract. Add this to `index.ts` below the code you added earlier:

#include_code Deployment /yarn-project/end-to-end/src/e2e_sandbox_example.test.ts typescript

`yarn start` will now give the following output:

```
  token Aztec Sandbox Info  {
    version: 1,
    chainId: 31337,
    rollupAddress: EthAddress {
      buffer: <Buffer cf 7e d3 ac ca 5a 46 7e 9e 70 4c 70 3e 8d 87 f6 34 fb 0f c9>
    },
    client: 'pxe@0.1.0',
    compatibleNargoVersion: '0.11.1-aztec.0'
  }
  token Creating accounts using schnorr signers... +3ms
  token Created Alice's account at 0x1509b252...0027 +10s
  token Created Bob's account at 0x031862e8...e7a3 +0ms
  token Deploying token contract minting an initial 1000000 tokens to Alice... +1ms
  token Contract successfully deployed at address 0x1c3dc2ed...1362 +15s
```

We can break this down as follows:

1. We create and send a contract deployment transaction to the network.
2. We wait for it to be successfully mined.
3. We retrieve the transaction receipt containing the transaction status and contract address.
4. We connect to the contract with Alice
5. Alice initialize the contract with herself as the admin and a minter.
6. Alice adds Bob as minter.
7. Alice mints 1,000,000 tokens to be claimed by herself in private.
8. Alice claims the tokens privately.

## Viewing the balance of an account

A token contract wouldn't be very useful if you aren't able to query the balance of an account. As part of the deployment, tokens were minted to Alice. We can now call the contract's `balance_of_private()` function to retrieve the balances of the accounts.

Here is the `balance_of_private` code from the contract (no need to paste it into `index.ts`):

#include_code balance_of_private /yarn-project/noir-contracts/src/contracts/token_contract/src/main.nr rust

Call the `balance_of_private` function using the following code (paste this):

#include_code Balance /yarn-project/end-to-end/src/e2e_sandbox_example.test.ts typescript

Running now should yield output:

```
  token Aztec Sandbox Info  {
    version: 1,
    chainId: 31337,
    rollupAddress: EthAddress {
      buffer: <Buffer cf 7e d3 ac ca 5a 46 7e 9e 70 4c 70 3e 8d 87 f6 34 fb 0f c9>
    },
    client: 'pxe@0.1.0',
    compatibleNargoVersion: '0.11.1-aztec.0'
  }
  token Creating accounts using schnorr signers... +3ms
  token Created Alice's account at 0x1509b252...0027 +10s
  token Created Bob's account at 0x031862e8...e7a3 +0ms
  token Deploying token contract minting an initial 1000000 tokens to Alice... +1ms
  token Contract successfully deployed at address 0x1c3dc2ed...1362 +15s
  token Alice's balance 1000000 +9s
  token Bob's balance 0 +33ms
```

In this section, we created 2 instances of the `TokenContract` contract abstraction, one for each of our deployed accounts. This contract abstraction offers a Typescript interface reflecting the abi of the contract. We then call `getBalance()` as a `view` method. View methods can be thought as read-only. No transaction is submitted as a result but a user's state can be queried.

We can see that each account has the expected balance of tokens.

### Diagram of calling an unconstrained (view) function

<img src="/img/sandbox_unconstrained_function.svg" alt="Unconstrained function call" />

## Creating and submitting transactions

Now lets transfer some funds from Alice to Bob by calling the `transfer` function on the contract. This function takes 4 arguments:

1. The sender.
2. The recipient.
3. The quantity of tokens to be transferred.
4. The nonce for the [authentication witness](../../concepts//foundation/accounts/main.md#authorizing-actions), or 0 if msg.sender equal sender.

Here is the Noir code for the `transfer` function (don't paste this into `index.ts`):

#include_code transfer /yarn-project/noir-contracts/src/contracts/token_contract/src/main.nr rust

Here is the Typescript code to call the `transfer` function, add this to your `index.ts` at the bottom of the `main` function:

#include_code Transfer /yarn-project/end-to-end/src/e2e_sandbox_example.test.ts typescript

Our output should now look like this:

```
  token Aztec Sandbox Info  {
    version: 1,
    chainId: 31337,
    rollupAddress: EthAddress {
      buffer: <Buffer cf 7e d3 ac ca 5a 46 7e 9e 70 4c 70 3e 8d 87 f6 34 fb 0f c9>
    },
    client: 'pxe@0.1.0',
    compatibleNargoVersion: '0.11.1-aztec.0'
  }
  token Creating accounts using schnorr signers... +3ms
  token Created Alice's account at 0x1509b252...0027 +10s
  token Created Bob's account at 0x031862e8...e7a3 +0ms
  token Deploying token contract minting an initial 1000000 tokens to Alice... +1ms
  token Contract successfully deployed at address 0x1c3dc2ed...1362 +15s
  token Alice's balance 1000000 +9s
  token Bob's balance 0 +33ms
  token Transferring 543 tokens from Alice to Bob... +0ms
  token Alice's balance 999457 +5s
  token Bob's balance 543 +40ms
```

Here, we used the same contract abstraction as was previously used for reading Alice's balance. But this time we called `send()` generating and sending a transaction to the network. After waiting for the transaction to settle we were able to check the new balance values.

Finally, the contract has a `mint` function that can be used to generate new tokens for an account. This takes 2 arguments:

1. The quantity of tokens to be minted.
2. The recipient of the new tokens.

Here is the Noir code:

#include_code mint /yarn-project/noir-contracts/src/contracts/private_token_contract/src/main.nr rust

Let's mint some tokens to Bob's account using Typescript, add this to `index.ts`:

#include_code Mint /yarn-project/end-to-end/src/e2e_sandbox_example.test.ts typescript

Our complete output should now be:

```
  token Aztec Sandbox Info  {
    version: 1,
    chainId: 31337,
    rollupAddress: EthAddress {
      buffer: <Buffer cf 7e d3 ac ca 5a 46 7e 9e 70 4c 70 3e 8d 87 f6 34 fb 0f c9>
    },
    client: 'pxe@0.1.0',
    compatibleNargoVersion: '0.11.1-aztec.0'
  }
  token Creating accounts using schnorr signers... +3ms
  token Created Alice's account at 0x1509b252...0027 +10s
  token Created Bob's account at 0x031862e8...e7a3 +0ms
  token Deploying token contract minting an initial 1000000 tokens to Alice... +1ms
  token Contract successfully deployed at address 0x1c3dc2ed...1362 +15s
  token Alice's balance 1000000 +9s
  token Bob's balance 0 +33ms
  token Transferring 543 tokens from Alice to Bob... +0ms
  token Alice's balance 999457 +5s
  token Bob's balance 543 +40ms
  token Minting 10000 tokens to Bob... +0ms
  token Alice's balance 999457 +9s
  token Bob's balance 10543 +47ms
```

That's it! We have successfully deployed a private token contract to an instance of the Aztec network and mined private state-transitioning transactions. We have also queried the resulting state all via the interfaces provided by the contract.

You can find the [complete tutorial code here](https://github.com/AztecProtocol/dev-rel/tree/main/tutorials/sandbox-tutorial/token).

### Diagram of sending a transaction

<img src="/img/sandbox_sending_a_tx.svg" alt="Sending a transaction" />

## Next Steps

Here we showed how to interact with the sandbox, but didn't go into details on how to write your own contract or any relevant setup needed for it.

You can find more information about writing Aztec contracts [here](../contracts/main.md) on syntax, compiling, deploying and interacting with how to start writing contracts.
