import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertOctagon, Car, Fuel, Wrench } from "lucide-react";

export default function FrotaDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["frota_dashboard"],
    queryFn: async () => {
      const [vRes, abRes, manRes, alRes] = await Promise.all([
        (supabase as any).from("veiculos").select("id,status"),
        (supabase as any).from("frota_abastecimentos").select("valor_total,litros,status,data_abastecimento"),
        (supabase as any).from("frota_manutencoes").select("id,status,data_prevista"),
        (supabase as any).from("frota_alertas").select("id,tipo,mensagem,severidade,created_at,lida").eq("lida", false).order("created_at", { ascending: false }).limit(10),
      ]);
      const veiculos = vRes.data || [];
      const abast = abRes.data || [];
      const manut = manRes.data || [];
      const alertas = alRes.data || [];

      const now = new Date();
      const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const gastosMes = abast
        .filter((a: any) => a.data_abastecimento?.startsWith(mesAtual) && a.status !== "reprovado")
        .reduce((s: number, a: any) => s + Number(a.valor_total || 0), 0);
      const litrosMes = abast
        .filter((a: any) => a.data_abastecimento?.startsWith(mesAtual) && a.status !== "reprovado")
        .reduce((s: number, a: any) => s + Number(a.litros || 0), 0);

      return {
        total: veiculos.length,
        disponiveis: veiculos.filter((v: any) => v.status === "disponivel").length,
        em_uso: veiculos.filter((v: any) => v.status === "em_uso").length,
        manutencao: veiculos.filter((v: any) => v.status === "manutencao").length,
        manut_pendentes: manut.filter((m: any) => m.status !== "concluido").length,
        gastosMes,
        litrosMes,
        alertas,
        abast_pendentes: abast.filter((a: any) => a.status === "solicitado").length,
      };
    },
  });

  const kpis = [
    { label: "Veículos ativos", value: stats?.total ?? 0, icon: Car, color: "text-blue-600" },
    { label: "Em uso agora", value: stats?.em_uso ?? 0, icon: Car, color: "text-green-600" },
    { label: "Manutenções pendentes", value: stats?.manut_pendentes ?? 0, icon: Wrench, color: "text-amber-600" },
    { label: "Aprovações pendentes", value: stats?.abast_pendentes ?? 0, icon: Fuel, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-slate-500">{k.label}</p>
                  <p className="mt-1 text-2xl font-bold">{k.value}</p>
                </div>
                <k.icon className={`h-8 w-8 ${k.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumo financeiro do mês</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Gasto com combustível</span>
              <span className="font-semibold">R$ {Number(stats?.gastosMes ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Litros abastecidos</span>
              <span className="font-semibold">{Number(stats?.litrosMes ?? 0).toFixed(1)} L</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Preço médio por litro</span>
              <span className="font-semibold">
                R$ {stats && stats.litrosMes > 0 ? (stats.gastosMes / stats.litrosMes).toFixed(2) : "0,00"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-red-500" /> Alertas abertos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(stats?.alertas ?? []).length === 0 && (
              <p className="text-sm text-slate-500">Nenhum alerta pendente.</p>
            )}
            {(stats?.alertas ?? []).map((a: any) => (
              <div key={a.id} className="flex items-start gap-2 rounded-md border border-slate-100 p-2">
                <Badge variant={a.severidade === "alta" ? "destructive" : "secondary"} className="mt-0.5">
                  {a.tipo}
                </Badge>
                <span className="text-sm">{a.mensagem}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
