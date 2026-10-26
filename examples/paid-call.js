// Makes one paid x402 call to /brief ($0.01) through the LangChain tool and prints the settlement tx hash.
// Run: AGENT_PRIVATE_KEY=0x... node examples/paid-call.js
// Or pay from a Binance Agentic Wallet: BLOCKCHAINIQ_SIGNER=binance node examples/paid-call.js
import { createBlockchainIQTools, createBinanceAgenticFetch } from "../src/index.js";

let settlement;
const useBinance = process.env.BLOCKCHAINIQ_SIGNER === "binance";
const [brief] = createBlockchainIQTools({
  maxUsdPerCall: 0.02,
  onSettlement: (s) => (settlement = s),
  ...(useBinance ? { payFetch: createBinanceAgenticFetch({ maxUsdPerCall: 0.02, log: console.log }) } : {}),
});
const out = await brief.invoke({});
console.log("brief:", out.slice(0, 400), "...");
console.log("settlement:", JSON.stringify(settlement, null, 2));
if (settlement?.transaction) console.log(`https://basescan.org/tx/${settlement.transaction}`);
