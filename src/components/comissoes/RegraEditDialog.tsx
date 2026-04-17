import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { RegraComissao } from "./ComissoesRelatorioTab";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  regra: RegraComissao;
  onSave: (r: RegraComissao) => void;
}

export function RegraEditDialog({ open, onOpenChange, regra, onSave }: Props) {
  // Internal form state in percentage units (3.0 = 3%)
  const [base, setBase] = useState(regra.percentual_base * 100);
  const [bonusOn, setBonusOn] = useState(regra.percentual_bonus > 0);
  const [margemMin, setMargemMin] = useState(regra.margem_min_bonus);
  const [bonusPct, setBonusPct] = useState(regra.percentual_bonus * 100);

  useEffect(() => {
    if (open) {
      setBase(regra.percentual_base * 100);
      setBonusOn(regra.percentual_bonus > 0);
      setMargemMin(regra.margem_min_bonus);
      setBonusPct(regra.percentual_bonus * 100);
    }
  }, [open, regra]);

  // Live simulator
  const exemploValor = 35000;
  const exemploMargem = 31;
  const baseCalc = exemploValor * (base / 100);
  const bonusCalc =
    bonusOn && exemploMargem >= margemMin ? exemploValor * (bonusPct / 100) : 0;
  const totalCalc = baseCalc + bonusCalc;

  function handleSave() {
    if (base < 0 || base > 20) {
      toast.error("Percentual base deve estar entre 0% e 20%");
      return;
    }
    if (bonusOn && (margemMin < 0 || margemMin > 60)) {
      toast.error("Margem mínima deve estar entre 0% e 60%");
      return;
    }
    onSave({
      percentual_base: base / 100,
      margem_min_bonus: bonusOn ? margemMin : 100,
      percentual_bonus: bonusOn ? bonusPct / 100 : 0,
    });
    toast.success("Regra atualizada");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Configurar regra de comissão</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="base">Percentual base (%) *</Label>
            <Input
              id="base"
              type="number"
              step="0.1"
              min={0}
              max={20}
              value={base}
              onChange={(e) => setBase(parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-[#6B7A90]">
              Aplicado sobre valor de venda de todo contrato finalizado
            </p>
          </div>

          <div className="space-y-3 rounded-md border p-3" style={{ borderColor: "#E8ECF2" }}>
            <div className="flex items-center justify-between">
              <Label htmlFor="bonus-toggle" className="text-sm">
                Ativar bônus por qualidade de margem
              </Label>
              <Switch id="bonus-toggle" checked={bonusOn} onCheckedChange={setBonusOn} />
            </div>

            {bonusOn && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="margem">Margem mínima para bônus (%) *</Label>
                  <Input
                    id="margem"
                    type="number"
                    step="1"
                    min={0}
                    max={60}
                    value={margemMin}
                    onChange={(e) => setMargemMin(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-[#6B7A90]">
                    Contratos com margem realizada acima deste % ganham bônus
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bonuspct">Percentual do bônus (%) *</Label>
                  <Input
                    id="bonuspct"
                    type="number"
                    step="0.1"
                    min={0}
                    value={bonusPct}
                    onChange={(e) => setBonusPct(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-md p-3" style={{ background: "#F5F7FA" }}>
            <p className="text-xs text-[#6B7A90]">
              Com essas regras, um contrato de {fmtBRL(exemploValor)} com margem {exemploMargem}% gera:
            </p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-[#6B7A90]">Comissão base:</span>
                <span className="tabular-nums text-[#0D1117]">{fmtBRL(baseCalc)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[#6B7A90]">Bônus:</span>
                <span className="tabular-nums" style={{ color: "#E8A020" }}>
                  {bonusOn && exemploMargem >= margemMin ? fmtBRL(bonusCalc) : "—"}
                </span>
              </div>
              <div
                className="flex items-baseline justify-between border-t pt-1.5"
                style={{ borderColor: "#E8ECF2" }}
              >
                <span className="text-[#6B7A90]">Total:</span>
                <span className="tabular-nums" style={{ color: "#12B76A", fontWeight: 500 }}>
                  {fmtBRL(totalCalc)}
                </span>
              </div>
            </div>
          </div>

          <div
            className="rounded-md p-3 text-xs"
            style={{ background: "#FEF3C7", color: "#633806" }}
          >
            Alterações valem para novos contratos finalizados. Comissões já calculadas não são afetadas.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            style={{ background: "#1E6FBF", color: "white" }}
          >
            Salvar regra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
