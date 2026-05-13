// XIRR — Extended Internal Rate of Return
// Calculates the annualized return accounting for the timing of cash flows.
//
// Cash flow convention:
//   Negative = money OUT of your pocket (purchases, fees)
//   Positive = money INTO your pocket (sales, dividends, current value)

export type CashFlow = {
  date: Date;
  amount: number;
};

// Net Present Value at a given rate
function npv(rate: number, cfs: CashFlow[], t0: number): number {
  return cfs.reduce((sum, cf) => {
    const years = (cf.date.getTime() - t0) / (365.25 * 24 * 3600 * 1000);
    return sum + cf.amount / Math.pow(1 + rate, years);
  }, 0);
}

// Derivative of NPV (for Newton-Raphson)
function dnpv(rate: number, cfs: CashFlow[], t0: number): number {
  return cfs.reduce((sum, cf) => {
    const years = (cf.date.getTime() - t0) / (365.25 * 24 * 3600 * 1000);
    if (years === 0) return sum;
    return sum - years * cf.amount / Math.pow(1 + rate, years + 1);
  }, 0);
}

export function xirr(cashFlows: CashFlow[]): number | null {
  if (cashFlows.length < 2) return null;

  const hasPositive = cashFlows.some((cf) => cf.amount > 0);
  const hasNegative = cashFlows.some((cf) => cf.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const t0 = Math.min(...cashFlows.map((cf) => cf.date.getTime()));

  // Try multiple starting points to avoid local minima
  const guesses = [0.1, 0.0, 0.5, -0.1, 1.0];
  for (const guess of guesses) {
    let rate = guess;
    for (let i = 0; i < 200; i++) {
      const n = npv(rate, cashFlows, t0);
      const d = dnpv(rate, cashFlows, t0);
      if (Math.abs(d) < 1e-12) break;
      const next = rate - n / d;
      if (!isFinite(next)) break;
      if (next <= -1) { rate = -0.9999; continue; }
      if (Math.abs(next - rate) < 1e-8) return next;
      rate = next;
    }
  }
  return null;
}

// Parse dd/mm/yyyy → Date
export function parseAppDate(dateStr: string | undefined | null): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split("/");
  if (parts.length !== 3) return new Date();
  return new Date(+parts[2], +parts[1] - 1, +parts[0]);
}

export type XIRRResult = {
  rate: number;       // annualized rate, e.g. 0.082 = 8.2%
  pct: number;        // rate * 100
  months: number;     // holding period in months
};

// Build XIRR from investment data
export function computeXIRR(params: {
  transactions: { date: string; type: string; quantite: number; prixUnitaire: number; frais: number }[];
  currentValueChf: number;
  dividendes?: { date: string; montant: number }[];
}): XIRRResult | null {
  const { transactions, currentValueChf, dividendes = [] } = params;

  const cfs: CashFlow[] = [];

  for (const tx of transactions) {
    const date = parseAppDate(tx.date);
    const amount = tx.quantite * tx.prixUnitaire + tx.frais;
    if (tx.type === "Achat") {
      cfs.push({ date, amount: -amount }); // money out
    } else if (tx.type === "Vente") {
      cfs.push({ date, amount: +amount }); // money in
    }
  }

  for (const div of dividendes) {
    cfs.push({ date: parseAppDate(div.date), amount: +div.montant });
  }

  // Current portfolio value = money you'd receive if you sold today
  if (currentValueChf > 0) {
    cfs.push({ date: new Date(), amount: currentValueChf });
  }

  if (cfs.length < 2) return null;

  const rate = xirr(cfs);
  if (rate === null || !isFinite(rate) || rate < -1) return null;

  const dates = cfs.filter((cf) => cf.amount < 0).map((cf) => cf.date.getTime());
  const firstDate = Math.min(...dates);
  const months = (Date.now() - firstDate) / (30.44 * 24 * 3600 * 1000);

  return { rate, pct: rate * 100, months };
}
