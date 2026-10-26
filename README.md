# langchain-blockchainiq

LangChain tools for the [Blockchain IQ](https://www.blockchainiq.co/agents) x402 API: crypto market data your agent buys per call in USDC on Base. No account, no API key.

| Tool | Resource | Price |
|---|---|---|
| `blockchainiq_brief` | `/brief` (BTC, ETH, SOL, XRP moves, 48h events, risk flags) | $0.01 |
| `blockchainiq_event_risk` | `/event-risk` (`days`, `minImportance`) | $0.05 |

## Install
```
npm install
```

## Use
```js
import { createBlockchainIQTools } from "langchain-blockchainiq";
const tools = createBlockchainIQTools({ maxUsdPerCall: 0.1 }); // reads AGENT_PRIVATE_KEY
// bind to any tool-calling model: model.bindTools(tools)
```

## Paid-call demo
```
AGENT_PRIVATE_KEY=0x... npm run demo
```
Prints the brief and the x402 settlement (payer, network, transaction hash) from the `PAYMENT-RESPONSE` header.

Use a dedicated wallet with a small USDC balance on Base. Settlement is gasless for the payer, and the spend cap refuses any call above `maxUsdPerCall`. Data is market data, not investment advice. MIT license.

## Pay from a Binance Agentic Wallet (no private key)
Sign in the `baw` CLI (`baw auth signin`), then set `BLOCKCHAINIQ_SIGNER=binance`. On each HTTP 402 the integration runs `baw x402-payment preview` and `sign` for the Base USDC option, then replays the request with the `PAYMENT-SIGNATURE` header. Keys stay in Binance's MPC wallet.

## Verified paid call
`BLOCKCHAINIQ_SIGNER=binance node examples/paid-call.js` paid `/brief` ($0.01 USDC on Base) through this integration:
[0xdb52f3b2a00aae98a3f0b9df867249459d0b926a6ecbc5ff07d4da916f1cb312](https://basescan.org/tx/0xdb52f3b2a00aae98a3f0b9df867249459d0b926a6ecbc5ff07d4da916f1cb312)
