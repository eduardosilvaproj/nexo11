import { useNavigate } from "react-router-dom";
import { ContratosTable } from "@/components/comercial/ContratosTable";
import { Plus } from "lucide-react";

export default function Contratos() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0D1117]">Contratos</h1>
          <p className="text-sm text-[#6B7A90] mt-0.5">
            Visualize e acompanhe todos os contratos da loja
          </p>
        </div>
        <button
          onClick={() => navigate("/contratos/novo")}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-white transition-colors hover:bg-[#0B4A8A]"
          style={{ background: "#1E6FBF", borderRadius: 8, fontSize: 13, fontWeight: 500 }}
        >
          <Plus className="h-4 w-4" /> Novo contrato
        </button>
      </div>

      <ContratosTable onCreate={() => navigate("/contratos/novo")} />
    </div>
  );
}
