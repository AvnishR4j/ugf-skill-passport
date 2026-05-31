# UGF Skill Passport

UGF Skill Passport is a beginner-friendly Base Sepolia dApp where users complete simple Web3 quests and claim onchain NFT skill badges without needing native ETH for the claim flow.

The project demonstrates the Universal Gas Framework testnet requirement directly: the user takes a real onchain action, UGF quotes and settles the gas payment in `TYI_MOCK_USD`, then executes and confirms the badge mint on Base Sepolia.

## Live Demo Proof

| Item | Value |
| --- | --- |
| Network | Base Sepolia (`84532`) |
| Contract | `0x3E10c764b3E30D8EE789EC45233D05b8186b2812` |
| Contract explorer | https://sepolia.basescan.org/address/0x3E10c764b3E30D8EE789EC45233D05b8186b2812 |
| Demo wallet | `0xDC75B897248CB693a65c318d585D64C2107d4997` |
| Claimed badge | Quest 2: `Gasless First Step` |
| Claim transaction | https://sepolia.basescan.org/tx/0x700e34c6c1cbeec25693a380a4a2002ff6ea77a8fab563b932ecea9e1261c93e |
| Onchain proof | `hasClaimed(wallet, 1) == true` |
| UGF settlement coin | `TYI_MOCK_USD` |

The transaction above mints ERC-721 token `#1` of `UGF Skill Passport` on Base Sepolia.

## What It Does

- Lets a beginner connect a wallet and select a Web3 learning quest.
- Encodes a real contract call: `claimBadge(uint8 badgeId)`.
- Opens the UGF testnet modal with destination chain `84532`.
- Pays the gas quote in `TYI_MOCK_USD`.
- Lets UGF handle settlement, sponsored execution, and confirmation.
- Shows a judge-ready proof panel with contract, network, wallet, settlement coin, and transaction proof.

## Demo Script

Use Quest 2 for the primary judging walkthrough.

1. Open the app locally.
2. Connect MetaMask on Base Sepolia.
3. Select `Gasless First Step`.
4. Show `Settlement: TYI_MOCK_USD`.
5. Click `Claim badge with UGF`.
6. Confirm the UGF modal flow.
7. Show the completed badge state and the BaseScan transaction.

Note: the deployed demo wallet has already claimed Quest 2, because the proof transaction is live. The contract intentionally prevents duplicate claims for the same wallet and badge. For a live repeat, use Quest 1 or Quest 3 with the same wallet, or use a fresh wallet for Quest 2.

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

The deployed contract is already available on Base Sepolia. To use it locally, set:

```bash
VITE_BADGE_CONTRACT_ADDRESS=0x3E10c764b3E30D8EE789EC45233D05b8186b2812
VITE_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
VITE_BASESCAN_BASE_URL=https://sepolia.basescan.org
```

To deploy a new contract:

```bash
DEPLOYER_PRIVATE_KEY=0x... npm run deploy:contract
```

The deployer needs Base Sepolia ETH only for deployment. End-user badge claims are routed through UGF.

## Requirement Mapping

- **Beginner-friendly dApp:** quest-based skill passport.
- **Real onchain action:** ERC-721 badge mint.
- **Required network:** Base Sepolia.
- **UGF integration:** `UGFProvider mode="testnet"` and `openUGF`.
- **Gas settlement:** `TYI_MOCK_USD`.
- **No paymasters/bundlers/ERC-4337:** app only encodes the destination call and opens UGF.

## Security Notes

- `.env` is ignored by git and must never be committed.
- Use only test wallets and testnet funds.
- Never share a private key or seed phrase.

## License

MIT
