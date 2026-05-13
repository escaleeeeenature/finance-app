// eslint-disable-next-line @typescript-eslint/no-require-imports
const yahooFinance = require("yahoo-finance2").default ?? require("yahoo-finance2");

export type PriceResult = {
  price: number;
  currency: string;
  live: boolean;
};

// Try ticker with common exchange suffixes (SIX Swiss, Paris, London, etc.)
const SUFFIXES = ["", ".SW", ".PA", ".L", ".DE", ".MI", ".AS", ".VX"];

export async function fetchPrice(ticker: string): Promise<PriceResult | null> {
  for (const suffix of SUFFIXES) {
    try {
      const quote = await yahooFinance.quote(
        ticker + suffix,
        {},
        { validateResult: false }
      );
      const price = quote?.regularMarketPrice;
      if (price && price > 0) {
        return {
          price,
          currency: quote.currency || "CHF",
          live: true,
        };
      }
    } catch {
      // try next suffix
    }
  }
  return null;
}

export async function fetchPrices(
  tickers: string[]
): Promise<Record<string, PriceResult>> {
  const entries = await Promise.all(
    tickers.map(async (ticker) => {
      const result = await fetchPrice(ticker);
      return [ticker, result] as const;
    })
  );
  const out: Record<string, PriceResult> = {};
  for (const [ticker, result] of entries) {
    if (result) out[ticker] = result;
  }
  return out;
}

// Fetch exchange rate to CHF (e.g. USD → CHF)
export async function fetchToChf(currency: string): Promise<number> {
  if (currency === "CHF") return 1;
  try {
    const pair = `${currency}CHF=X`;
    const quote = await yahooFinance.quote(pair, {}, { validateResult: false });
    const rate = quote?.regularMarketPrice;
    if (rate && rate > 0) return rate;
  } catch { /* fallback */ }
  // Static fallbacks
  if (currency === "USD") return 0.9;
  if (currency === "EUR") return 0.97;
  if (currency === "GBP") return 1.14;
  return 1;
}
