# UGF Skill Passport

Skill Passport is a beginner-friendly dApp for the UGF hackathon. Users complete simple Web3 quests and claim onchain NFT badges on Base Sepolia without needing ETH in their wallet. The claim transaction is routed through UGF, and gas is settled in `TYI_MOCK_USD`.

## Stack

- Vite + React + TypeScript
- `@tychilabs/react-ugf@2.0.0`
- `@tychilabs/ugf-testnet-js@0.1.3`
- `ethers@6`
- Solidity badge contract compiled with `solc`

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Deploy the contract after adding a funded Base Sepolia deployer key:

```bash
DEPLOYER_PRIVATE_KEY=0x... npm run deploy:contract
```

Then set the printed address in `.env`:

```bash
VITE_BADGE_CONTRACT_ADDRESS=0x...
```

## Judge Demo Script

1. Open the app and connect a wallet.
2. Switch to Base Sepolia.
3. Use the UGF faucet to get `TYI_MOCK_USD`.
4. Keep the wallet at zero Base Sepolia ETH for the end-user demo.
5. Select `Gasless First Step`.
6. Check the quest completion box.
7. Click `Claim badge with UGF`.
8. Confirm the UGF modal flow.
9. Show the completed badge and BaseScan transaction.

## Deployed Demo Proof

- Contract: `0x3E10c764b3E30D8EE789EC45233D05b8186b2812`
- Network: Base Sepolia (`84532`)
- Demo wallet: `0xDC75B897248CB693a65c318d585D64C2107d4997`
- Claimed badge: Quest 2, `Gasless First Step`
- Onchain proof: `hasClaimed(0xDC75B897248CB693a65c318d585D64C2107d4997, 1) == true`
- Settlement coin shown in the UGF modal: `TYI_MOCK_USD`
- Contract explorer: `https://sepolia.basescan.org/address/0x3E10c764b3E30D8EE789EC45233D05b8186b2812`

The demo claim was completed through the UGF modal, where the wallet paid the gas quote in `TYI_MOCK_USD` instead of sending a normal Base Sepolia ETH gas transaction from the app.

## Requirement Mapping

- Beginner-friendly dApp: quest-based skill passport.
- Real onchain action: NFT badge mint.
- Chain: Base Sepolia.
- Gas abstraction: UGF testnet mode.
- Settlement coin: `TYI_MOCK_USD`.
- No end-user ETH requirement: claim goes through `openUGF`.

## Notes for Judges

The deployed contract prevents duplicate claims for the same badge and wallet. If Quest 2 is already claimed by the demo wallet, select Quest 1 or Quest 3 to run another live claim.
