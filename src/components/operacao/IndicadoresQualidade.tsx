import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export function IndicadoresQualidade() {
  const { data: ocorrencias, isLoading } = useQuery({
    queryKey: ["operacao-ocorrencias-qualidade"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacao_ocorrencias")
        .select("*");
      if (error) throw error;
      return data;
    }
  });

  const porTipo = ocorrencias?.reduce((acc: any, o) => {
    acc[o.tipo] = (acc[o.tipo] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.keys(porTipo || {}).map(key => ({
    name: key.replace('_', ' ').charAt(0).toUpperCase() + key.replace('_', ' ').slice(1),
    total: porTipo[key]
  })).sort((a, b) => b.total - a.total);

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#64748b'];

  if (isLoading) return <div className="p-8 text-center">Carregando qualidade...</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Ocorrências por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Ranking de Contratos com Problemas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* This would be real data in a full implementation */}
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
                <div>
                  <div className="text-sm font-bold text-red-900">#4582 - Maria Silva</div>
                  <div className="text-xs text-red-700">3 ocorrências em aberto (Material Faltando)</div>
                </div>
                <Badge variant="destructive">CRÍTICO</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-100 rounded-lg">
                <div>
                  <div className="text-sm font-bold text-orange-900">#4610 - João Pedro</div>
                  <div className="text-xs text-orange-700">2 ocorrências (Avaria)</div>
                </div>
                <Badge variant="default" className="bg-orange-500">ALTO</Badge>
              </div>
              <p className="text-[11px] text-slate-400 text-center italic mt-4">
                Exibindo contratos com prioridade de resolução urgente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  const variants: any = {
    destructive: "bg-red-100 text-red-700 border-red-200",
    default: "bg-slate-900 text-slate-50",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}
