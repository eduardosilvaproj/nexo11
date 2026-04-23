// Parser do XML Promob (frontend, via DOMParser)

export interface PromobAcrescimo {
  id: string;
  description: string;
  value: number;
  percentual: number;
}

export interface PromobItem {
  id: string;
  description: string;
  reference: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

export interface PromobCategoria {
  id: string;
  description: string;
  desconto_pct: number;
  tabela: number;
  pedido: number;
  total: number;
  budget: number;
  itens: PromobItem[];
}

export interface PromobParsed {
  cliente_nome: string;
  ordem_compra: string;
  total_tabela: number;
  total_pedido: number;
  total_orcamento: number;
  frete: number;
  montagem: number;
  acrescimos: PromobAcrescimo[];
  categorias: PromobCategoria[];
  itens: PromobItem[];
}

const num = (v: string | null | undefined): number => {
  if (v == null || v === "") return 0;
  const s = String(v).trim();
  // Aceita "1.234,56" e "1234.56"
  const normalized = /,\d{1,2}$/.test(s)
    ? s.replace(/\./g, "").replace(",", ".")
    : s.replace(/,/g, "");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
};

const attr = (el: Element | null, ...names: string[]): string => {
  if (!el) return "";
  for (const n of names) {
    const v = el.getAttribute(n) ?? el.getAttribute(n.toUpperCase()) ?? el.getAttribute(n.toLowerCase());
    if (v != null) return v;
  }
  return "";
};

const findData = (parent: Element | null | Document, id: string): string => {
  if (!parent) return "";
  const sel = `DATA[ID="${id}"], DATA[id="${id}"], DATA[ID="${id.toUpperCase()}"]`;
  const el = (parent as ParentNode).querySelector(sel);
  return el?.getAttribute("VALUE") ?? el?.getAttribute("value") ?? el?.textContent?.trim() ?? "";
};

export function parsePromobXml(xmlText: string): PromobParsed {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  console.log("XML Promob Structure:", doc);

  if (doc.querySelector("parsererror")) {
    throw new Error("Arquivo XML inválido");
  }

  // Cliente
  const cliente_nome = findData(doc, "nomecliente");
  const ordem_compra = findData(doc, "ordem_compra");

  // Totais globais
  const listingTotal = doc.querySelector("LISTING > TOTALPRICES, listing > totalprices");
  const total_tabela = num(attr(listingTotal, "TABLE"));
  
  // O total_orcamento (Valor de Venda Base) deve ser a soma de todos os itens com TYPE="BUDGET"
  const allItems = Array.from(doc.querySelectorAll("ITEM, item"));
  let total_orcamento = 0;
  allItems.forEach(item => {
    if (attr(item, "TYPE") === "BUDGET") {
      // Priorizar o atributo TOTAL se existir, senão PRICE
      const val = num(attr(item, "TOTAL")) || num(attr(item, "PRICE"));
      total_orcamento += val;
    }
  });

  const orderEl = listingTotal?.querySelector("MARGINS ORDER, margins order") ?? null;
  const budgetEl = listingTotal?.querySelector("MARGINS BUDGET, margins budget") ?? null;
  const total_pedido = num(attr(orderEl, "VALUE"));
  // Se não encontrou itens BUDGET, tenta o valor do global (fallback)
  if (total_orcamento === 0) {
    total_orcamento = num(attr(budgetEl, "VALUE"));
  }

  // Acréscimos (BUDGET > MARGIN)
  const acrescimos: PromobAcrescimo[] = budgetEl
    ? Array.from(budgetEl.querySelectorAll(":scope > MARGIN, :scope > margin")).map((m, i) => ({
        id: attr(m, "ID") || `acr-${i}`,
        description: attr(m, "DESCRIPTION"),
        value: num(attr(m, "VALUE")),
        percentual: num(attr(m, "PERCENTUAL", "PERCENT")),
      }))
    : [];

  const matchAcr = (keys: string[]) =>
    acrescimos.find(
      (a) =>
        keys.includes(a.id.toLowerCase()) ||
        keys.some((k) => (a.description || "").toLowerCase().includes(k))
    )?.value ?? 0;

  const frete = matchAcr(["frete", "transporte", "entrega"]);
  const montagem = matchAcr(["montagem", "instalacao", "instalação"]);

  // Categorias
  const categoriaEls = Array.from(doc.querySelectorAll("CATEGORY, category"));
  const categorias: PromobCategoria[] = categoriaEls.map((c, ci) => {
    const tp = c.querySelector(":scope > TOTALPRICES, :scope > totalprices");
    const tabela = num(attr(tp, "TABLE")) || num(attr(c, "TABLE"));
    const catOrder = tp?.querySelector("MARGINS ORDER, margins order") ?? null;
    const catBudget = tp?.querySelector("MARGINS BUDGET, margins budget") ?? null;
    const pedido = num(attr(catOrder, "VALUE")) || num(attr(c, "TOTAL"));
    const budget = num(attr(catBudget, "VALUE")) || num(attr(c, "BUDGET")) || pedido;
    const desconto_pct =
      budget > 0 ? Math.max(0, Math.round((1 - pedido / budget) * 1000) / 10) : 0;

    const itensEls = Array.from(c.querySelectorAll(":scope ITEMS > ITEM, :scope items > item"));
    const itens: PromobItem[] = itensEls.map((it, ii) => {
      const price = it.querySelector(":scope > PRICE, :scope > price");
      return {
        id: attr(it, "ID") || `${ci}-${ii}`,
        description: attr(it, "DESCRIPTION"),
        reference: attr(it, "REFERENCE"),
        quantity: num(attr(it, "QUANTITY")) || 1,
        unit: attr(it, "UNIT"),
        price: num(attr(price, "UNIT")) || num(attr(it, "PRICE")),
        total: num(attr(price, "TOTAL")) || num(attr(it, "TOTAL")),
      };
    });

    return {
      id: attr(c, "ID") || `cat-${ci}`,
      description: attr(c, "DESCRIPTION"),
      desconto_pct,
      tabela,
      pedido,
      budget,
      total: budget || pedido || itens.reduce((s, x) => s + x.total, 0),
      itens,
    };
  });

  const itens = categorias.flatMap((c) => c.itens);

  const result = {
    cliente_nome,
    ordem_compra,
    total_tabela,
    total_pedido,
    total_orcamento,
    frete,
    montagem,
    acrescimos,
    categorias,
    itens,
  };

  console.log("Parsed Promob Data:", result);
  return result;
}

// Helper: calcula valor de venda com descontos do vendedor
export function calcularValorVenda(
  categorias: { tabela: number; desconto_pct: number }[],
  frete: number,
  montagem: number
): number {
  const subtotal = categorias.reduce(
    (sum, cat) => sum + cat.tabela * (1 - (cat.desconto_pct || 0) / 100),
    0
  );
  return subtotal + frete + montagem;
}

// Helper: calcula margem prevista (%) sobre o valor de venda
export function calcularMargem(valorVenda: number, custoTabela: number): number {
  if (!valorVenda || valorVenda <= 0) return 0;
  return Math.round(((valorVenda - custoTabela) / valorVenda) * 1000) / 10;
}
