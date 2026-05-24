
import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ArrowDownCircle, ArrowUpCircle, History, Edit, Package } from "lucide-react";
import { MovimentacaoDialog } from "./MovimentacaoDialog";
import { HistoricoDrawer } from "./HistoricoDrawer";

interface AlmoxarifadoTableProps {
  items: any[];
  isLoading: boolean;
  onEdit: (item: any) => void;
  onRefresh: () => void;
}

export function AlmoxarifadoTable({ items, isLoading, onEdit, onRefresh }: AlmoxarifadoTableProps) {
  const [movementItem, setMovementItem] = useState<{ item: any, type: 'entrada' | 'saida' } | null>(null);
  const [historyItem, setHistoryItem] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        Carregando itens...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Package size={48} className="text-slate-200 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Não há itens cadastrados no almoxarifado.</h3>
        <p className="text-slate-500">Comece cadastrando um novo item ou mude os filtros de busca.</p>
      </div>
    );
  }

  const getStatusBadge = (item: any) => {
    const disponivel = (item.quantidade_total || 0) - (item.quantidade_reservada || 0);
    if (disponivel <= 0) return <Badge variant="destructive">Sem estoque</Badge>;
    if (disponivel <= (item.estoque_minimo || 0)) return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Baixo estoque</Badge>;
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Normal</Badge>;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-[100px]">Código</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-center">Un.</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right text-slate-400">Reservado</TableHead>
            <TableHead className="text-right font-semibold">Disponível</TableHead>
            <TableHead className="text-right">Mínimo</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const disponivel = (item.quantidade_total || 0) - (item.quantidade_reservada || 0);
            return (
              <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                <TableCell className="font-mono text-xs text-slate-500">{item.codigo || "-"}</TableCell>
                <TableCell className="font-medium text-slate-900">{item.descricao}</TableCell>
                <TableCell>
                  {item.categoria ? (
                    <Badge variant="outline" className="font-normal text-slate-500">{item.categoria}</Badge>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-center text-slate-600">{item.unidade}</TableCell>
                <TableCell className="text-right">{Number(item.quantidade_total || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right text-slate-400">{Number(item.quantidade_reservada || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold text-blue-600">{Number(disponivel).toLocaleString()}</TableCell>
                <TableCell className="text-right text-slate-500">{Number(item.estoque_minimo || 0).toLocaleString()}</TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(item)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setMovementItem({ item, type: 'entrada' })} className="text-green-600 focus:text-green-700 focus:bg-green-50">
                        <ArrowUpCircle size={16} className="mr-2" />
                        Entrada manual
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMovementItem({ item, type: 'saida' })} className="text-orange-600 focus:text-orange-700 focus:bg-orange-50">
                        <ArrowDownCircle size={16} className="mr-2" />
                        Saída manual
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setHistoryItem(item)}>
                        <History size={16} className="mr-2" />
                        Histórico
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Edit size={16} className="mr-2" />
                        Editar item
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <MovimentacaoDialog 
        item={movementItem?.item} 
        type={movementItem?.type || 'entrada'} 
        open={!!movementItem} 
        onOpenChange={(open) => !open && setMovementItem(null)}
        onSuccess={onRefresh}
      />

      <HistoricoDrawer 
        item={historyItem} 
        open={!!historyItem} 
        onOpenChange={(open) => !open && setHistoryItem(null)}
      />
    </div>
  );
}
