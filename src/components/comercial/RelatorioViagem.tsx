import { forwardRef } from "react";

const brl = (n: number) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  result: any;
  origem?: string;
  destino?: string;
  valorVenda?: number;
}

export const RelatorioViagem = forwardRef<HTMLDivElement, Props>(
  ({ result, origem, destino, valorVenda }, ref) => {
    if (!result) return null;
    const d = result.detalhamento || {};
    const m = d.montadores || {};
    const med = d.medidor || {};
    const ger = d.gerente || {};
    const params = d.parametros || {};
    const semanas = result.semanas ?? 0;
    const finsExtras = result.fins_de_semana_extras ?? 0;

    const Block = ({ title, rows, subtotal }: { title: string; rows: [string, string][]; subtotal: number }) => (
      <div className="rounded-lg border border-slate-200 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          ─── {title} ───
        </div>
        <div className="space-y-1 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-slate-700">{label}</span>
              <span className="font-mono tabular-nums">{value}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5 font-semibold">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums">{brl(subtotal)}</span>
          </div>
        </div>
      </div>
    );

    return (
      <div ref={ref} className="space-y-3 bg-white p-4 text-slate-900">
        <div className="text-center border-b border-slate-300 pb-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            ═══ Resumo da Operação ═══
          </div>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div><span className="text-slate-500">Distância:</span> <b>{result.distancia_km} km</b></div>
            <div><span className="text-slate-500">Dias montagem:</span> <b>{result.dias_montagem}</b></div>
            <div><span className="text-slate-500">Montadores:</span> <b>{result.qtd_montadores}</b></div>
            <div><span className="text-slate-500">Veículos:</span> <b>{result.qtd_veiculos}</b></div>
          </div>
          {(origem || destino) && (
            <div className="mt-2 text-xs text-slate-600">
              {origem && <div><b>Origem:</b> {origem}</div>}
              {destino && <div><b>Destino:</b> {destino}</div>}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-xs">
          <div className="font-semibold text-slate-700 mb-1">Cronograma</div>
          <ul className="space-y-0.5 text-slate-600 list-disc list-inside">
            {semanas > 0 && <li>{semanas} semana(s) completa(s) (seg–sex, 5 dias)</li>}
            {finsExtras > 0 && <li>{finsExtras} fim(ns) de semana: retorno dos montadores</li>}
            <li>Total: {result.dias_montagem} dias úteis · {result.noites_hospedado} noite(s) hospedado</li>
            <li>Gerente de montagem: últimos 2 dias</li>
            <li>Medidor: 1 dia (bate-volta)</li>
          </ul>
        </div>

        <div className="grid gap-3">
          <Block
            title={`Montadores (${m.pessoas ?? 0} pessoa${(m.pessoas ?? 0) > 1 ? "s" : ""} · ${m.veiculos ?? 0} veículo(s))`}
            rows={[
              ["Hospedagem", `${m.noites ?? 0} × ${m.pessoas ?? 0} × ${brl(params.hotel_por_pessoa)} = ${brl(m.hotel)}`],
              ["Refeição", `${m.noites ?? 0} × ${m.pessoas ?? 0} × ${brl(params.refeicao_montador_dia)} = ${brl(m.refeicao)}`],
              ["Combustível (viagens)", `${m.viagens ?? 0} × ${brl((params.gasolina_por_carro_ida_volta ?? 0) * (m.veiculos ?? 0))} = ${brl(m.gasolina)}`],
              ["Pedágio (viagens)", `${m.viagens ?? 0} × ${brl((params.pedagio_por_carro_ida_volta ?? 0) * (m.veiculos ?? 0))} = ${brl(m.pedagio)}`],
              ["Locomoção diária (hotel↔obra)", `${m.noites ?? 0} dias × ${(params.locomocao_diaria_km ?? 0) * 2}km × ${m.veiculos ?? 0} carro(s) = ${brl(m.locomocao_diaria)}`],
            ]}
            subtotal={m.subtotal}
          />
          <Block
            title="Medidor (bate-volta)"
            rows={[
              ["Combustível", brl(med.gasolina)],
              ["Pedágio", brl(med.pedagio)],
              ["Refeição", brl(med.refeicao)],
            ]}
            subtotal={med.subtotal}
          />
          <Block
            title="Gerente de Montagem"
            rows={[
              ["Hospedagem (1 noite)", brl(ger.hotel)],
              ["Refeição (2 dias)", brl(ger.refeicao)],
              ["Combustível", brl(ger.gasolina)],
              ["Pedágio", brl(ger.pedagio)],
            ]}
            subtotal={ger.subtotal}
          />
        </div>

        <div className="rounded-lg bg-slate-900 text-white p-4 text-center">
          <div className="text-[11px] uppercase tracking-wider opacity-70">Custo Total de Viagem</div>
          <div className="text-3xl font-bold mt-1 font-mono">{brl(result.custo_total)}</div>
          {valorVenda ? (
            <div className="text-xs opacity-70 mt-1">
              {((result.custo_total / valorVenda) * 100).toFixed(2)}% do valor da venda ({brl(valorVenda)})
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);
RelatorioViagem.displayName = "RelatorioViagem";
