// LangChain tools for the Blockchain IQ x402 API (pay-per-call crypto data, USDC on Base).
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";

export const BLOCKCHAINIQ_BASE_URL = "https://www.blockchainiq.co/api/x402/v1";

/** Build a fetch that pays x402 402s in USDC on Base, with a per-call spend cap (USD). */
export function createPayingFetch({ privateKey, maxUsdPerCall = 0.1 } = {}) {
  const key = privateKey ?? process.env.AGENT_PRIVATE_KEY;
  if (!key) throw new Error("Set AGENT_PRIVATE_KEY (a dedicated wallet holding a little USDC on Base).");
  const account = privateKeyToAccount(key);
  const client = x402Client.fromConfig({
    schemes: [{ network: "eip155:*", client: new ExactEvmScheme(account) }],
    spendControls: { maxAmountPerPayment: maxUsdPerCall },
  });
  return { payFetch: wrapFetchWithPayment(fetch, client), address: account.address };
}

async function paidGet(payFetch, path, onSettlement) {
  const res = await payFetch(`${BLOCKCHAINIQ_BASE_URL}${path}`);
  const body = await res.json();
  if (!res.ok) throw new Error(`Blockchain IQ ${path} failed: HTTP ${res.status} ${JSON.stringify(body)}`);
  const header = res.headers.get("payment-response");
  const settlement = header ? decodePaymentResponseHeader(header) : null;
  if (settlement && onSettlement) onSettlement({ path, ...settlement });
  return { data: body.data, settlement };
}

/**
 * Returns LangChain tools: blockchainiq_brief ($0.01) and blockchainiq_event_risk ($0.05).
 * Options: privateKey, maxUsdPerCall, onSettlement(settlement) callback for the tx hash,
 * or payFetch (e.g. createBinanceAgenticFetch()) to pay from a Binance Agentic Wallet.
 */
export function createBlockchainIQTools(options = {}) {
  const payFetch = options.payFetch ?? createPayingFetch(options).payFetch;
  const { onSettlement } = options;

  const brief = tool(
    async () => JSON.stringify((await paidGet(payFetch, "/brief", onSettlement)).data),
    {
      name: "blockchainiq_brief",
      description:
        "Crypto market brief (paid, $0.01 USDC via x402): BTC, ETH, SOL and XRP prices with 24h/7d/30d moves, scheduled events in the next 48 hours, and risk flags. Use as the opening call of a trading or research loop.",
      schema: z.object({}),
    }
  );

  const eventRisk = tool(
    async ({ days, minImportance }) => {
      const q = new URLSearchParams();
      if (days) q.set("days", String(days));
      if (minImportance) q.set("minImportance", String(minImportance));
      const qs = q.toString() ? `?${q}` : "";
      return JSON.stringify((await paidGet(payFetch, `/event-risk${qs}`, onSettlement)).data);
    },
    {
      name: "blockchainiq_event_risk",
      description:
        "Scheduled market-moving events (paid, $0.05 USDC via x402): US data releases, FOMC/ECB/BoJ decisions, Treasury auctions and crypto/regulatory milestones, each with importance 1-3 and its official source. Check before acting on a trade.",
      schema: z.object({
        days: z.number().int().min(1).max(90).optional().describe("Window length in days, default 7"),
        minImportance: z.number().int().min(1).max(3).optional().describe("Lowest importance to include, default 1"),
      }),
    }
  );

  return [brief, eventRisk];
}

export { createBinanceAgenticFetch } from "./binance-signer.js";
