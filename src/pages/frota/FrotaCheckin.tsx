import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

/**
 * Tela responsiva para check-in/check-out de veículos.
 * Funcionário escolhe um veículo disponível, registra KM e foto do hodômetro,
 * e ao retornar faz check-out com KM final.
 */
export default function FrotaCheckin() {
  const qc = useQueryClient();
  const [veiculoId, setVeiculoId] = useState<string | null>(null);
  const [km, setKm] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: veiculos } = useQuery({
    queryKey: ["veiculos_checkin"],
    queryFn: async () => (await (supabase as any).from("veiculos").select("id,placa,modelo,marca,km_atual,status").neq("status", "inativo").order("placa")).data || [],
  });

  const { data: minhaMov } = useQuery({
    queryKey: ["minha_mov"],
    queryFn: async () => {
      const u = (await supabase.auth.getUser()).data.user;
      if (!u) return null;
      const { data: me } = await (supabase as any).from("pessoas").select("id").eq("auth_user_id", u.id).single();
      if (!me) return null;
      const { data } = await (supabase as any)
        .from("frota_movimentacoes")
        .select("*, veiculo:veiculos(placa,modelo)")
        .eq("pessoa_id", me.id)
        .eq("status", "aberto")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const upload = async (file: File, prefix: string) => {
    const path = `hodometros/${prefix}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("frota").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("frota").getPublicUrl(path);
    return data.publicUrl;
  };

  const doCheckin = async () => {
    if (!veiculoId || !km || !foto) return toast.error("Preencha veículo, KM e foto");
    setBusy(true);
    try {
      const url = await upload(foto, "in");
      const { data, error } = await (supabase as any).rpc("frota_checkin", {
        _veiculo_id: veiculoId,
        _km_inicial: Number(km),
        _foto_url: url,
      });
      if (error) throw error;
      if (!data?.ok) return toast.error(data?.erro || "Falhou");
      toast.success("Check-in realizado");
      setVeiculoId(null); setKm(""); setFoto(null);
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doCheckout = async () => {
    if (!minhaMov || !km || !foto) return toast.error("Preencha KM final e foto");
    setBusy(true);
    try {
      const url = await upload(foto, "out");
      const { data, error } = await (supabase as any).rpc("frota_checkout", {
        _mov_id: minhaMov.id,
        _km_final: Number(km),
        _foto_url: url,
      });
      if (error) throw error;
      if (!data?.ok) return toast.error(data?.erro || "Falhou");
      toast.success("Check-out realizado");
      setKm(""); setFoto(null);
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (minhaMov) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4">
        <h1 className="text-xl font-bold">Veículo em uso</h1>
        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <Badge variant="secondary">Em uso</Badge>
              <p className="mt-1 text-lg font-mono font-bold">{minhaMov.veiculo?.placa}</p>
              <p className="text-sm text-slate-500">{minhaMov.veiculo?.modelo}</p>
            </div>
            <p className="text-sm">KM inicial: <strong>{minhaMov.km_inicial}</strong></p>
            <div><Label>KM final (hodômetro)</Label><Input type="number" value={km} onChange={(e) => setKm(e.target.value)} /></div>
            <div>
              <Label>Foto do hodômetro</Label>
              <Input type="file" accept="image/*" capture="environment" onChange={(e) => setFoto(e.target.files?.[0] || null)} />
            </div>
            <Button className="w-full" onClick={doCheckout} disabled={busy}>
              <LogOut className="mr-2 h-4 w-4" />Finalizar check-out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-bold">Check-in de veículo</h1>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <Label>Veículo</Label>
            <div className="mt-2 grid gap-2">
              {(veiculos || []).filter((v: any) => v.status === "disponivel").map((v: any) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { setVeiculoId(v.id); setKm(String(v.km_atual || 0)); }}
                  className={`rounded-lg border p-3 text-left transition ${veiculoId === v.id ? "border-primary bg-primary/5" : "border-slate-200"}`}
                >
                  <p className="font-mono font-bold">{v.placa}</p>
                  <p className="text-xs text-slate-500">{v.marca} {v.modelo} — {Number(v.km_atual).toLocaleString("pt-BR")} km</p>
                </button>
              ))}
              {(veiculos || []).filter((v: any) => v.status === "disponivel").length === 0 && (
                <p className="text-sm text-slate-500">Nenhum veículo disponível.</p>
              )}
            </div>
          </div>
          <div><Label>KM atual</Label><Input type="number" value={km} onChange={(e) => setKm(e.target.value)} /></div>
          <div>
            <Label className="flex items-center gap-1"><Camera className="h-4 w-4" />Foto do hodômetro</Label>
            <Input type="file" accept="image/*" capture="environment" onChange={(e) => setFoto(e.target.files?.[0] || null)} />
          </div>
          <Button className="w-full" onClick={doCheckin} disabled={busy || !veiculoId}>
            <LogIn className="mr-2 h-4 w-4" />Fazer check-in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
