
import { Package, AlertTriangle, ArrowUpRight, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AlmoxarifadoStatsProps {
  items: any[];
}

export function AlmoxarifadoStats({ items }: AlmoxarifadoStatsProps) {
  const totalItems = items.length;
  const lowStockItems = items.filter(item => (item.quantidade_total || 0) <= (item.estoque_minimo || 0)).length;
  const totalBalance = items.reduce((acc, item) => acc + (Number(item.quantidade_total) || 0), 0);
  const estimatedValue = items.reduce((acc, item) => acc + (Number(item.quantidade_total) * Number(item.custo_medio_unitario) || 0), 0);

  const stats = [
    {
      label: "Total de itens ativos",
      value: totalItems,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      label: "Itens abaixo do mínimo",
      value: lowStockItems,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      label: "Saldo total em estoque",
      value: totalBalance.toLocaleString('pt-BR'),
      icon: ArrowUpRight,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      label: "Valor estimado",
      value: `R$ ${estimatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon size={24} className={stat.color} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
