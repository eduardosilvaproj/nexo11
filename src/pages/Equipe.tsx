import { Plus } from "lucide-react";
import { toast } from "sonner";

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
    </div>
  );
}
