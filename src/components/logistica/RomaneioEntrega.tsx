import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Volume {
  numero: string;
  descricao: string;
}

interface Props {
  entregaId: string;
  clienteNome: string;
  endereco: string;
  volumes: Volume[];
}

export function RomaneioEntrega({ entregaId, clienteNome, endereco, volumes }: Props) {
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const now = new Date();
      const dataFormatada = now.toLocaleDateString("pt-BR");
      const horaFormatada = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("ROMANEIO DE ENTREGA", pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Data: ${dataFormatada}  |  Hora: ${horaFormatada}`, pageWidth / 2, 28, { align: "center" });

      // Divider
      doc.setDrawColor(200);
      doc.line(14, 33, pageWidth - 14, 33);

      // Client info
      let y = 42;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Cliente:", 14, y);
      doc.setFont("helvetica", "normal");
      doc.text(clienteNome, 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Endereço:", 14, y);
      doc.setFont("helvetica", "normal");
      const endLines = doc.splitTextToSize(endereco || "—", pageWidth - 60);
      doc.text(endLines, 44, y);
      y += endLines.length * 6 + 4;

      y += 6;
      doc.setFont("helvetica", "bold");
      doc.text("Entrega ID:", 14, y);
      doc.setFont("helvetica", "normal");
      doc.text(entregaId.slice(0, 8), 48, y);

      // Volumes table
      y += 14;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Volumes", 14, y);
      y += 8;

      // Table header
      doc.setFontSize(10);
      doc.setFillColor(240, 240, 240);
      doc.rect(14, y - 4, pageWidth - 28, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.text("#", 18, y);
      doc.text("Número", 30, y);
      doc.text("Descrição", 80, y);
      y += 8;

      // Table rows
      doc.setFont("helvetica", "normal");
      volumes.forEach((vol, idx) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        doc.text(String(idx + 1), 18, y);
        doc.text(vol.numero || "—", 30, y);
        const descLines = doc.splitTextToSize(vol.descricao || "—", pageWidth - 94);
        doc.text(descLines, 80, y);
        y += descLines.length * 5 + 4;
      });

      if (volumes.length === 0) {
        doc.text("Nenhum volume registrado", 18, y);
        y += 8;
      }

      // Signature lines
      y = Math.max(y + 20, 220);
      doc.setDrawColor(100);
      doc.line(14, y, 90, y);
      doc.line(pageWidth - 90, y, pageWidth - 14, y);

      y += 6;
      doc.setFontSize(10);
      doc.text("Entregue por:", 14, y);
      doc.text("Recebido por:", pageWidth - 90, y);

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 10;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Gerado em ${dataFormatada} às ${horaFormatada}`,
        pageWidth / 2,
        footerY,
        { align: "center" }
      );

      doc.save(`romaneio-${entregaId.slice(0, 8)}.pdf`);
      toast.success("Romaneio gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar romaneio");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={generating}
      className="text-[13px] gap-1.5"
    >
      {generating ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
      Romaneio PDF
    </Button>
  );
}
