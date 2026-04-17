import { Plus, Users, UserCheck, UserX, Clock } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Metric = {
  label: string;
  value: string;
  icon: typeof Users;
  borderColor: string;
};

const metrics: Metric[] = [
  { label: "Total de membros", value: "0", icon: Users, borderColor: "#1E6FBF" },
  { label: "Presentes hoje", value: "0", icon: UserCheck, borderColor: "#12B76A" },
  { label: "Ausentes hoje", value: "0", icon: UserX, borderColor: "#E53935" },
  { label: "Horas hoje", value: "0h", icon: Clock, borderColor: "#E8A020" },
];

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  return (
    <div
      className="rounded-xl bg-white p-4"
      style={{
        border: "0.5px solid #E8ECF2",
        borderTop: `3px solid ${metric.borderColor}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p style={{ fontSize: 12, color: "#6B7A90" }}>{metric.label}</p>
          <p
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#0D1117",
              marginTop: 6,
            }}
          >
            {metric.value}
          </p>
        </div>
        <Icon className="h-4 w-4" style={{ color: metric.borderColor }} />
      </div>
    </div>
  );
}

export default function Equipe() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "#0D1117" }}>
            NEXO Equipe
          </h1>
          <p style={{ fontSize: 13, color: "#6B7A90", marginTop: 4 }}>
            Pessoas, ponto e desempenho
          </p>
        </div>
        <button
          onClick={() => toast.info("Em breve: cadastro de novo membro")}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-white"
          style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
        >
          <Plus className="h-4 w-4" /> Novo membro
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} metric={m} />
        ))}
      </div>

      <Tabs defaultValue="membros" className="w-full">
        <TabsList
          className="h-auto gap-1 rounded-lg bg-transparent p-0"
          style={{ borderBottom: "1px solid #E8ECF2" }}
        >
          {[
            { value: "membros", label: "Membros" },
            { value: "ponto", label: "Ponto" },
            { value: "desempenho", label: "Desempenho" },
          ].map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              style={{ fontSize: 13, color: "#6B7A90" }}
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="membros" className="mt-6">
          <p style={{ fontSize: 13, color: "#6B7A90" }}>
            Nenhum membro cadastrado.
          </p>
        </TabsContent>
        <TabsContent value="ponto" className="mt-6">
          <p style={{ fontSize: 13, color: "#6B7A90" }}>
            Sem registros de ponto.
          </p>
        </TabsContent>
        <TabsContent value="desempenho" className="mt-6">
          <p style={{ fontSize: 13, color: "#6B7A90" }}>
            Sem dados de desempenho.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
