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
  total: number;
  itens: PromobItem[];
}

export interface PromobParsed {
  cliente_nome: string;
  ordem_compra: string;
  total_tabela: number;
  total_pedido: number;
  total_orcamento: number;
  acrescimos: PromobAcrescimo[];
  categorias: PromobCategoria[];
  itens: PromobItem[];
}

const num = (v: string | null | undefined): number => {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : parseFloat(String(v)) || 0;
};

const findData = (parent: Element | null, id: string): string => {
  if (!parent) return "";
  const el = parent.querySelector(`DATA[ID="${id}"], DATA[id="${id}"]`);
  return el?.getAttribute("VALUE") ?? el?.getAttribute("value") ?? el?.textContent?.trim() ?? "";
};

const attr = (el: Element | null, ...names: string[]): string => {
  if (!el) return "";
  for (const n of names) {
    const v = el.getAttribute(n) ?? el.getAttribute(n.toUpperCase()) ?? el.getAttribute(n.toLowerCase());
    if (v != null) return v;
  }
  return "";
};

export function parsePromobXml(xmlText: string): PromobParsed {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Arquivo XML inválido");
  }

  const customers = doc.querySelector("CUSTOMERSDATA, customersdata");
  const cliente_nome = findData(customers, "nomecliente") || findData(customers, "NOMECLIENTE");
  const ordem_compra = findData(customers, "ordem_compra") || findData(customers, "ORDEM_COMPRA");

  const totalPrices = doc.querySelector("TOTALPRICES, totalprices");
  const total_tabela = num(attr(totalPrices, "TABLE", "table"));

  const margins = totalPrices?.querySelector("MARGINS, margins") ?? null;
  const orderEl = margins?.querySelector("ORDER, order") ?? null;
  const budgetEl = margins?.querySelector("BUDGET, budget") ?? null;

  const total_pedido = num(attr(orderEl, "VALUE", "value"));
  const total_orcamento = num(attr(budgetEl, "VALUE", "value"));

  const acrescimos: PromobAcrescimo[] = budgetEl
    ? Array.from(budgetEl.querySelectorAll(":scope > MARGIN, :scope > margin")).map((m, i) => ({
        id: attr(m, "ID", "id") || `acr-${i}`,
        description: attr(m, "DESCRIPTION", "description"),
        value: num(attr(m, "VALUE", "value")),
        percentual: num(attr(m, "PERCENTUAL", "percentual", "PERCENT", "percent")),
      }))
    : [];

  const categoriaEls = Array.from(doc.querySelectorAll("AMBIENTS AMBIENT CATEGORIES > CATEGORY, ambients ambient categories > category"));

  const categorias: PromobCategoria[] = categoriaEls.map((c, ci) => {
    const itensEls = Array.from(c.querySelectorAll(":scope > ITEMS > ITEM, :scope > items > item"));
    const itens: PromobItem[] = itensEls.map((it, ii) => ({
      id: attr(it, "ID", "id") || `${ci}-${ii}`,
      description: attr(it, "DESCRIPTION", "description"),
      reference: attr(it, "REFERENCE", "reference"),
      quantity: num(attr(it, "QUANTITY", "quantity")) || 1,
      unit: attr(it, "UNIT", "unit"),
      price: num(attr(it, "PRICE", "price")),
      total: num(attr(it, "TOTAL", "total")),
    }));

    return {
      id: attr(c, "ID", "id") || `cat-${ci}`,
      description: attr(c, "DESCRIPTION", "description"),
      desconto_pct: num(attr(c, "DISCOUNT", "discount", "DESCONTO", "desconto")),
      total: num(attr(c, "TOTAL", "total")) || itens.reduce((s, x) => s + x.total, 0),
      itens,
    };
  });

  const itens = categorias.flatMap((c) => c.itens);

  return {
    cliente_nome,
    ordem_compra,
    total_tabela,
    total_pedido,
    total_orcamento,
    acrescimos,
    categorias,
    itens,
  };
}
