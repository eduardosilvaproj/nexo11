import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContratosTable } from "@/components/comercial/ContratosTable";
import { SimuladorViagemDialog } from "@/components/comercial/SimuladorViagemDialog";
import { Plus, MapPin } from "lucide-react";

export default function Contratos() {
  const navigate = useNavigate();
  const [simOpen, setSimOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0D1117]">Contratos</h1>
          <p className="text-sm text-[#6B7A90] mt-0.5">
            Visualize e acompanhe todos os contratos da loja
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSimOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 transition-colors hover:bg-[#F2F5F9]"
            style={{ background: "#FFFFFF", border: "1px solid #E8ECF2", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#0D1117" }}
          >
            <MapPin className="h-4 w-4" /> Simular viagem
          </button>
          <button
            onClick={() => navigate("/contratos/novo")}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-white transition-colors hover:bg-[#0B4A8A]"
            style={{ background: "#1E6FBF", borderRadius: 8, fontSize: 13, fontWeight: 500 }}
          >
            <Plus className="h-4 w-4" /> Novo contrato
          </button>
        </div>
      </div>

      <ContratosTable onCreate={() => navigate("/contratos/novo")} />
      <SimuladorViagemDialog open={simOpen} onOpenChange={setSimOpen} />
    </div>
  );
}
