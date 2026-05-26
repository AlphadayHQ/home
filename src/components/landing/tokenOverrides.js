// Manual ticker overrides while the backend lacks a `token_symbol` field on views.
// TODO: remove once /ui/views/resolve/ returns a canonical token symbol.
const TOKEN_OVERRIDES = {
  avalanche: "AVAX",
  ethereum: "ETH",
  bitcoin: "BTC",
  arbitrum: "ARB",
  optimism: "OP",
  polygon: "MATIC",
  solana: "SOL",
  "rocket-pool": "RPL",
  chainlink: "LINK",
  uniswap: "UNI",
  aave: "AAVE",
  lido: "LDO",
};

export function getToken(board) {
  if (!board?.slug) return null;
  return TOKEN_OVERRIDES[board.slug] || null;
}
