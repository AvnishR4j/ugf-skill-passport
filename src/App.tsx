import { useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, EventLog, Interface, formatEther } from "ethers";
import { useUGFModal } from "@tychilabs/react-ugf";
import { UGFClient } from "@tychilabs/ugf-testnet-js";

const BASE_SEPOLIA_CHAIN_ID = 84532n;
const BASE_SEPOLIA_CHAIN_ID_HEX = "0x14a34";
const DEMO_WALLET = "0xDC75B897248CB693a65c318d585D64C2107d4997";
const CONTRACT_ADDRESS = import.meta.env.VITE_BADGE_CONTRACT_ADDRESS as string | undefined;
const BASESCAN_URL = import.meta.env.VITE_BASESCAN_BASE_URL ?? "https://sepolia.basescan.org";

const badgeAbi = [
  "function claimBadge(uint8 badgeId) external returns (uint256)",
  "function hasClaimed(address user, uint8 badgeId) external view returns (bool)",
  "event BadgeClaimed(address indexed user, uint8 indexed badgeId, uint256 indexed tokenId)",
];

type Badge = {
  id: number;
  title: string;
  proof: string;
  description: string;
};

type ClaimStage = "idle" | "quote" | "settle" | "execute" | "confirm" | "done" | "error";

type ClaimProof = {
  badgeId: number;
  tokenId: string;
  txHash: string;
};

const badges: Badge[] = [
  {
    id: 0,
    title: "Wallet Basics",
    proof: "Connected a wallet and understood testnet balances.",
    description: "A first credential for getting started with onchain apps.",
  },
  {
    id: 1,
    title: "Gasless First Step",
    proof: "Claimed an NFT badge with Mock USD instead of ETH.",
    description: "The flagship UGF demo: a real contract call without native gas.",
  },
  {
    id: 2,
    title: "Onchain Explorer",
    proof: "Verified a transaction on Base Sepolia.",
    description: "Shows the user can inspect proof after an onchain action lands.",
  },
];

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function stageLabel(stage: ClaimStage) {
  const labels: Record<ClaimStage, string> = {
    idle: "Ready",
    quote: "Quote",
    settle: "Settle",
    execute: "Execute",
    confirm: "Confirm",
    done: "Complete",
    error: "Needs attention",
  };

  return labels[stage];
}

export default function App() {
  const { openUGF } = useUGFModal();
  const [account, setAccount] = useState("");
  const [ethBalance, setEthBalance] = useState("0");
  const [chainId, setChainId] = useState<bigint | null>(null);
  const [selectedBadge, setSelectedBadge] = useState(badges[1]);
  const [completedQuest, setCompletedQuest] = useState(false);
  const [claimedBadges, setClaimedBadges] = useState<Record<number, boolean>>({});
  const [claimProofs, setClaimProofs] = useState<Record<number, ClaimProof>>({});
  const [claimStage, setClaimStage] = useState<ClaimStage>("idle");
  const [status, setStatus] = useState("Connect a wallet to begin.");
  const [txHash, setTxHash] = useState("");
  const [walletAvailable, setWalletAvailable] = useState(false);

  const iface = useMemo(() => new Interface(badgeAbi), []);
  const isConfigured = Boolean(CONTRACT_ADDRESS && CONTRACT_ADDRESS.startsWith("0x"));
  const isBaseSepolia = chainId === BASE_SEPOLIA_CHAIN_ID;
  const canClaim = Boolean(account && isBaseSepolia && completedQuest && isConfigured && !claimedBadges[selectedBadge.id]);

  useEffect(() => {
    const updateWalletAvailability = () => setWalletAvailable(Boolean(window.ethereum));
    updateWalletAvailability();

    window.addEventListener("ethereum#initialized", updateWalletAvailability, { once: true });
    const timer = window.setTimeout(updateWalletAvailability, 750);

    return () => {
      window.removeEventListener("ethereum#initialized", updateWalletAvailability);
      window.clearTimeout(timer);
    };
  }, []);

  async function getProvider() {
    if (!window.ethereum) {
      throw new Error("Install MetaMask or Rabby to use this dApp.");
    }

    return new BrowserProvider(window.ethereum);
  }

  async function refreshWallet(provider: BrowserProvider, address: string) {
    const network = await provider.getNetwork();
    const balance = await provider.getBalance(address);
    setChainId(network.chainId);
    setEthBalance(formatEther(balance));

    if (isConfigured) {
      const contract = new Contract(CONTRACT_ADDRESS!, badgeAbi, provider);
      const entries = await Promise.all(
        badges.map(async (badge) => [badge.id, await contract.hasClaimed(address, badge.id)] as const),
      );
      setClaimedBadges(Object.fromEntries(entries));
      await refreshClaimProofs(provider, address);
    }
  }

  async function refreshClaimProofs(provider: BrowserProvider, address: string) {
    if (!CONTRACT_ADDRESS) return {};

    const contract = new Contract(CONTRACT_ADDRESS, badgeAbi, provider);
    const event = contract.filters.BadgeClaimed(address);
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 50_000);
    const logs = [];

    for (let start = fromBlock; start <= latestBlock; start += 2_000) {
      const end = Math.min(start + 1_999, latestBlock);
      logs.push(...(await contract.queryFilter(event, start, end)));
    }

    const proofs: Record<number, ClaimProof> = {};

    for (const log of logs) {
      if (!(log instanceof EventLog)) continue;

      const badgeId = Number(log.args.badgeId);
      proofs[badgeId] = {
        badgeId,
        tokenId: log.args.tokenId.toString(),
        txHash: log.transactionHash,
      };
    }

    setClaimProofs(proofs);
    return proofs;
  }

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        setClaimStage("error");
        setStatus("No wallet extension detected. Open this app in Chrome or Brave with MetaMask/Rabby installed.");
        window.open("https://metamask.io/download/", "_blank", "noopener,noreferrer");
        return;
      }

      setStatus("Requesting wallet connection...");
      const provider = await getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0] as string;
      setAccount(address);
      await refreshWallet(provider, address);
      setStatus("Wallet connected. Complete a quest and claim through UGF.");
    } catch (error) {
      setClaimStage("error");
      setStatus(error instanceof Error ? error.message : "Wallet connection failed.");
    }
  }

  async function switchToBaseSepolia() {
    try {
      const provider = await getProvider();
      try {
        await provider.send("wallet_switchEthereumChain", [{ chainId: BASE_SEPOLIA_CHAIN_ID_HEX }]);
      } catch (switchError) {
        const errorCode = getWalletErrorCode(switchError);

        if (errorCode !== 4902) {
          throw switchError;
        }

        await provider.send("wallet_addEthereumChain", [
          {
            chainId: BASE_SEPOLIA_CHAIN_ID_HEX,
            chainName: "Base Sepolia",
            nativeCurrency: {
              name: "Sepolia Ether",
              symbol: "ETH",
              decimals: 18,
            },
            rpcUrls: ["https://sepolia.base.org"],
            blockExplorerUrls: ["https://sepolia.basescan.org"],
          },
        ]);
      }

      if (account) {
        await refreshWallet(provider, account);
      }
    } catch (error) {
      setClaimStage("error");
      setStatus(error instanceof Error ? error.message : "Could not switch to Base Sepolia.");
    }
  }

  function getWalletErrorCode(error: unknown): number {
    if (typeof error !== "object" || error === null) return 0;

    const direct = Number((error as { code?: number | string }).code);
    if (Number.isFinite(direct)) return direct;

    const nested = (error as { error?: { code?: number | string } }).error;
    const nestedCode = Number(nested?.code);
    if (Number.isFinite(nestedCode)) return nestedCode;

    return 0;
  }

  async function claimWithUGF() {
    try {
      if (!canClaim || !CONTRACT_ADDRESS) return;

      setTxHash("");
      setClaimStage("quote");
      setStatus("Opening UGF quote for the badge claim...");

      const provider = await getProvider();
      const signer = await provider.getSigner();
      const data = iface.encodeFunctionData("claimBadge", [selectedBadge.id]);

      setClaimStage("settle");
      setStatus("UGF modal will settle gas in TYI_MOCK_USD, then execute the claim on Base Sepolia.");

      const result: unknown = await openUGF({
        signer,
        tx: {
          to: CONTRACT_ADDRESS,
          data,
          value: 0n,
        },
        destChainId: "84532",
      });

      setClaimStage("execute");
      const possibleHash =
        typeof result === "object" && result !== null && "userTxHash" in result
          ? String((result as { userTxHash?: string }).userTxHash ?? "")
          : "";

      setClaimStage("confirm");
      await refreshWallet(provider, account);
      const proofs = await refreshClaimProofs(provider, account);

      setClaimStage("done");
      setTxHash(possibleHash || proofs[selectedBadge.id]?.txHash || "");
      setStatus("Badge claimed. The user completed a real onchain action without holding ETH.");
    } catch (error) {
      setClaimStage("error");
      setStatus(error instanceof Error ? error.message : "UGF claim failed.");
    }
  }

  async function claimWithSdkFallback() {
    try {
      if (!canClaim || !CONTRACT_ADDRESS) return;

      setTxHash("");
      setClaimStage("quote");
      setStatus("Authenticating wallet with the UGF testnet SDK...");

      const provider = await getProvider();
      const signer = await provider.getSigner();
      const data = iface.encodeFunctionData("claimBadge", [selectedBadge.id]);
      const client = new UGFClient();

      await client.auth.login(signer);

      const tx = {
        from: account,
        to: CONTRACT_ADDRESS,
        data,
        value: "0",
      };

      const quote = await client.quote.get({
        payer_address: account,
        tx_object: JSON.stringify(tx),
      });

      setClaimStage("settle");
      setStatus("Authorizing TYI_MOCK_USD payment through the SDK fallback...");
      await client.payment.x402.execute({ quote, signer });

      setClaimStage("execute");
      setStatus("UGF is sponsoring gas and executing the badge claim on Base Sepolia...");
      const { userTxHash } = await client.chains.evm.sponsorAndExecute(quote.digest, signer, async () => ({
        to: CONTRACT_ADDRESS,
        data,
        value: 0n,
      }));

      setClaimStage("confirm");
      await refreshWallet(provider, account);
      const proofs = await refreshClaimProofs(provider, account);

      setClaimStage("done");
      setTxHash(userTxHash || proofs[selectedBadge.id]?.txHash || "");
      setStatus("Badge claimed through the direct UGF testnet SDK fallback.");
    } catch (error) {
      setClaimStage("error");
      setStatus(error instanceof Error ? error.message : "UGF SDK fallback failed.");
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Base Sepolia + Universal Gas Framework</p>
          <h1>Claim onchain skill badges without ETH.</h1>
          <p>
            Skill Passport turns beginner Web3 quests into NFT credentials. UGF lets users pay gas with
            <strong> TYI_MOCK_USD</strong>, so the destination claim works even when their wallet has no native ETH.
          </p>
          <div className="hero-actions">
            <button onClick={connectWallet}>
              {account ? shortAddress(account) : walletAvailable ? "Connect wallet" : "Install wallet"}
            </button>
            {!isBaseSepolia && account ? (
              <button className="secondary" onClick={switchToBaseSepolia}>
                Switch to Base Sepolia
              </button>
            ) : null}
          </div>
          <p className={claimStage === "error" ? "hero-status error" : "hero-status"} role="status">
            {walletAvailable
              ? status
              : "No browser wallet detected. Use Chrome or Brave with MetaMask/Rabby for the live UGF demo."}
          </p>
        </div>
        <div className="demo-panel" aria-label="Judge demo checklist">
          <div>
            <span>Judge demo</span>
            <strong>{stageLabel(claimStage)}</strong>
          </div>
          <ul>
            <li className={account ? "done" : ""}>
              <span>{account ? "Done" : "Pending"}</span> Wallet connected
            </li>
            <li className={isBaseSepolia ? "done" : ""}>
              <span>{isBaseSepolia ? "Done" : "Pending"}</span> Base Sepolia selected
            </li>
            <li className={Number(ethBalance) === 0 ? "done" : ""}>
              <span>{Number(ethBalance) === 0 ? "Done" : "Pending"}</span> Zero ETH compatible
            </li>
            <li className={claimStage === "done" ? "done" : ""}>
              <span>{claimStage === "done" ? "Done" : "Pending"}</span> Badge claimed through UGF
            </li>
          </ul>
        </div>
      </section>

      <section className="status-grid">
        <article>
          <span>Wallet</span>
          <strong>{account ? shortAddress(account) : "Not connected"}</strong>
        </article>
        <article>
          <span>Network</span>
          <strong>{chainId ? (isBaseSepolia ? "Base Sepolia" : `Chain ${chainId}`) : "Unknown"}</strong>
        </article>
        <article>
          <span>ETH balance</span>
          <strong>{Number(ethBalance).toFixed(5)} ETH</strong>
        </article>
        <article>
          <span>Settlement</span>
          <strong>TYI_MOCK_USD</strong>
        </article>
      </section>

      <section className="workspace">
        <div className="badges">
          {badges.map((badge) => (
            <button
              className={`badge-card ${selectedBadge.id === badge.id ? "selected" : ""}`}
              key={badge.id}
              onClick={() => {
                setSelectedBadge(badge);
                setCompletedQuest(Boolean(claimedBadges[badge.id]));
                setClaimStage("idle");
                setTxHash(claimProofs[badge.id]?.txHash ?? "");
              }}
            >
              <span>Quest {badge.id + 1}</span>
              <strong>{badge.title}</strong>
              <p>{badge.description}</p>
              <em>{claimedBadges[badge.id] ? "Claimed" : "Available"}</em>
            </button>
          ))}
        </div>

        <div className="claim-panel">
          <div>
            <span>Selected badge</span>
            <h2>{selectedBadge.title}</h2>
            <p>{selectedBadge.proof}</p>
          </div>

          <label className="quest-check">
            <input
              disabled={claimedBadges[selectedBadge.id]}
              checked={completedQuest}
              onChange={(event) => setCompletedQuest(event.target.checked)}
              type="checkbox"
            />
            {claimedBadges[selectedBadge.id]
              ? "This badge is already claimed by the connected wallet."
              : "I completed this beginner quest and want to mint proof onchain."}
          </label>

          <button disabled={!canClaim} onClick={claimWithUGF}>
            {claimedBadges[selectedBadge.id] ? "Badge already claimed" : "Claim badge with UGF"}
          </button>

          <button className="fallback" disabled={!canClaim} onClick={claimWithSdkFallback}>
            SDK fallback
          </button>

          <p className="status">{status}</p>
          {(txHash || claimProofs[selectedBadge.id]?.txHash) ? (
            <a href={`${BASESCAN_URL}/tx/${txHash || claimProofs[selectedBadge.id]?.txHash}`} rel="noreferrer" target="_blank">
              View confirmed transaction
            </a>
          ) : null}
          {!isConfigured ? (
            <p className="warning">Set VITE_BADGE_CONTRACT_ADDRESS after deploying the SkillPassport contract.</p>
          ) : null}
        </div>

        <div className="ugf-route">
          <h2>UGF route</h2>
          {(["quote", "settle", "execute", "confirm"] as const).map((step) => (
            <div className={claimStage === step || claimStage === "done" ? "route-step active" : "route-step"} key={step}>
              <span>{step}</span>
              <p>
                {step === "quote" && "Price the destination badge claim."}
                {step === "settle" && "Authorize gas payment in TYI_MOCK_USD."}
                {step === "execute" && "UGF sponsors native gas on Base Sepolia."}
                {step === "confirm" && "Return proof that the claim landed onchain."}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="proof-panel">
        <div>
          <span>Demo proof</span>
          <h2>Submission-ready evidence</h2>
          <p>Use these details in the hackathon README, video, and judging walkthrough.</p>
        </div>
        <dl>
          <div>
            <dt>Contract</dt>
            <dd>
              {CONTRACT_ADDRESS ? (
                <a href={`${BASESCAN_URL}/address/${CONTRACT_ADDRESS}`} rel="noreferrer" target="_blank">
                  {shortAddress(CONTRACT_ADDRESS)}
                </a>
              ) : (
                "Not deployed"
              )}
            </dd>
          </div>
          <div>
            <dt>Demo wallet</dt>
            <dd>{shortAddress(account || DEMO_WALLET)}</dd>
          </div>
          <div>
            <dt>Network</dt>
            <dd>Base Sepolia</dd>
          </div>
          <div>
            <dt>UGF settlement</dt>
            <dd>TYI_MOCK_USD</dd>
          </div>
          <div>
            <dt>Claimed proof</dt>
            <dd>
              {claimProofs[selectedBadge.id]?.txHash ? (
                <a href={`${BASESCAN_URL}/tx/${claimProofs[selectedBadge.id].txHash}`} rel="noreferrer" target="_blank">
                  Quest {selectedBadge.id + 1} token #{claimProofs[selectedBadge.id].tokenId}
                </a>
              ) : (
                "Connect wallet to load proof"
              )}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
