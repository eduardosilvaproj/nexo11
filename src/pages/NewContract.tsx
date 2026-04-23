import { NovoContratoWizard } from "@/components/comercial/NovoContratoWizard";
import { useSearchParams } from "react-router-dom";

export default function NewContract() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("leadId") || undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Novo Contrato</h1>
        <p className="text-slate-500 text-sm">Siga os passos para gerar um novo contrato e orçamento</p>
      </div>
      <NovoContratoWizard leadId={leadId} />
    </div>
  );
}
