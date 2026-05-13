// ETF composition data — update quarterly
// Source: etf.com / justetf.com / provider factsheet
// Last updated: Mai 2026

export type Holding = {
  ticker: string;
  nom: string;
  secteur: string;
  poids: number; // percentage, e.g. 7.2 = 7.2%
};

export type SecteurData = {
  nom: string;
  poids: number;
  couleur: string;
};

export type ETFComposition = {
  symbole: string;
  nom: string;
  description: string;
  top10: Holding[];
  secteurs: SecteurData[];
};

export const ETF_DATA: Record<string, ETFComposition> = {
  SP500S: {
    symbole: "SP500S",
    nom: "UBS ETF S&P 500",
    description: "Réplication du S&P 500 — 500 plus grandes entreprises américaines",
    top10: [
      { ticker: "AAPL",  nom: "Apple",               secteur: "Technologie",             poids: 7.2  },
      { ticker: "MSFT",  nom: "Microsoft",            secteur: "Technologie",             poids: 6.3  },
      { ticker: "NVDA",  nom: "NVIDIA",               secteur: "Technologie",             poids: 6.1  },
      { ticker: "AMZN",  nom: "Amazon",               secteur: "Cons. Discrétionnaire",   poids: 3.6  },
      { ticker: "META",  nom: "Meta Platforms",       secteur: "Communication",           poids: 2.6  },
      { ticker: "GOOGL", nom: "Alphabet A",           secteur: "Communication",           poids: 2.1  },
      { ticker: "BRK.B", nom: "Berkshire Hathaway",   secteur: "Finance",                 poids: 1.8  },
      { ticker: "GOOG",  nom: "Alphabet C",           secteur: "Communication",           poids: 1.8  },
      { ticker: "TSLA",  nom: "Tesla",                secteur: "Cons. Discrétionnaire",   poids: 1.6  },
      { ticker: "AVGO",  nom: "Broadcom",             secteur: "Technologie",             poids: 1.5  },
    ],
    secteurs: [
      { nom: "Technologie",           poids: 31.5, couleur: "#6366f1" },
      { nom: "Finance",               poids: 13.2, couleur: "#0ea5e9" },
      { nom: "Santé",                 poids: 11.8, couleur: "#10b981" },
      { nom: "Cons. Discrétionnaire", poids: 10.3, couleur: "#f59e0b" },
      { nom: "Communication",         poids:  8.9, couleur: "#8b5cf6" },
      { nom: "Industrie",             poids:  8.2, couleur: "#f97316" },
      { nom: "Cons. de Base",         poids:  6.0, couleur: "#14b8a6" },
      { nom: "Énergie",               poids:  3.8, couleur: "#ef4444" },
      { nom: "Immobilier",            poids:  2.2, couleur: "#ec4899" },
      { nom: "Matériaux",             poids:  2.1, couleur: "#84cc16" },
      { nom: "Services Publics",      poids:  2.0, couleur: "#a78bfa" },
    ],
  },
};
