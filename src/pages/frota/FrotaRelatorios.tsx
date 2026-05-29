import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function FrotaRelatorios() {
  const { data } = useQuery({
    queryKey: ["frota_relatorio"],
    queryFn: async () => {
      const [vRes, mRes, abRes, manRes, mulRes] = await Promise.all([
        (supabase as any).from("veiculos").select("id,placa,modelo,km_atual"),
        (supabase as any).from("frota_movimentacoes").select("veiculo_id,km_percorrido,pessoa_id"),
        (supabase as any).from("frota_abastecimentos").select("veiculo_id,litros,valor_total,status"),
        (supabase as any).from("frota_manutencoes").select("veiculo_id,valor"),
        (supabase as any).from("frota_multas").select("veiculo_id,pessoa_id,valor,pontos"),
      ]);
      const veiculos = vRes.data || [];
      const movs = mRes.data || [];
      const abast = (abRes.data || []).filter((a: any) => a.status !== "reprovado");
      const manut = manRes.data || [];
      const multas = mulRes.data || [];

      const porVeiculo = veiculos.map((v: any) => {
        const km = movs.filter((m: any) => m.veiculo_id === v.id).reduce((s: number, m: any) => s + Number(m.km_percorrido || 0), 0);
        const litros = abast.filter((a: any) => a.veiculo_id === v.id).reduce((s: number, a: any) => s + Number(a.litros || 0), 0);
        const gastoComb = abast.filter((a: any) => a.veiculo_id === v.id).reduce((s: number, a: any) => s + Number(a.valor_total || 0), 0);
        const gastoMan = manut.filter((m: any) => m.veiculo_id === v.id).reduce((s: number, m: any) => s + Number(m.valor || 0), 0);
        const gastoMul = multas.filter((m: any) => m.veiculo_id === v.id).reduce((s: number, m: any) => s + Number(m.valor || 0), 0);
        const total = gastoComb + gastoMan + gastoMul;
        return {
          ...v,
          km_rodado: km,
          litros,
          consumo: litros > 0 ? km / litros : 0,
          custo_total: total,
          custo_por_km: km > 0 ? total / km : 0,
        };
      });

      return { porVeiculo };
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Desempenho por veículo</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Placa</TableHead><TableHead>Modelo</TableHead>
              <TableHead>KM rodados</TableHead><TableHead>Litros</TableHead>
              <TableHead>Consumo (km/L)</TableHead><TableHead>Custo total</TableHead>
              <TableHead>R$ / km</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(data?.porVeiculo ?? []).map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono">{v.placa}</TableCell>
                  <TableCell>{v.modelo}</TableCell>
                  <TableCell>{Number(v.km_rodado).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{Number(v.litros).toFixed(1)}</TableCell>
                  <TableCell>{v.consumo > 0 ? v.consumo.toFixed(2) : "—"}</TableCell>
                  <TableCell>R$ {v.custo_total.toFixed(2)}</TableCell>
                  <TableCell>{v.custo_por_km > 0 ? `R$ ${v.custo_por_km.toFixed(2)}` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
