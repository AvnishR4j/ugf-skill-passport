import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { ethers } from "ethers";
import solc from "solc";

const envPath = path.resolve(".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    process.env[key] ??= value;
  }
}

const rpcUrl = process.env.VITE_BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

if (!privateKey) {
  throw new Error("Set DEPLOYER_PRIVATE_KEY in your environment before deploying.");
}

const contractPath = path.resolve("contracts", "SkillPassport.sol");
const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "SkillPassport.sol": {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors?.filter((entry: { severity: string }) => entry.severity === "error");

if (errors?.length) {
  throw new Error(errors.map((entry: { formattedMessage: string }) => entry.formattedMessage).join("\n"));
}

const compiled = output.contracts["SkillPassport.sol"].SkillPassport;
const abi = compiled.abi;
const bytecode = `0x${compiled.evm.bytecode.object}`;

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);
const factory = new ethers.ContractFactory(abi, bytecode, wallet);

console.log(`Deploying from ${wallet.address} to Base Sepolia...`);
const contract = await factory.deploy();
await contract.waitForDeployment();

const address = await contract.getAddress();
console.log(`SkillPassport deployed at ${address}`);
console.log(`Set VITE_BADGE_CONTRACT_ADDRESS=${address}`);
