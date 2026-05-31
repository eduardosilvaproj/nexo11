import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TerceirizadaTab } from "@/components/producao/TerceirizadaTab";
import { InternaKanban } from "@/components/producao/InternaKanban";
import { ProducaoDashboard } from "@/components/producao/ProducaoDashboard";
import { PageHeader } from "@/components/ui/page-header";

export default function Producao() {
  return (
    <div className="p-4 md:p-8">
      <PageHeader title="NEXO Produção" subtitle="Ordens de produção ativas" />

      {/* Dashboard KPIs + Alertas */}
      <ProducaoDashboard />

      <Tabs defaultValue="terceirizada" className="w-full mt-6">
        <TabsList className="bg-transparent p-0 h-auto rounded-none border-b border-[#E8ECF2] w-full justify-start gap-6 mb-6">
          <TabsTrigger
            value="terceirizada"
            className="rounded-none bg-transparent px-0 pb-3 pt-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#1E6FBF] data-[state=active]:border-b-2 data-[state=active]:border-[#1E6FBF] text-[#6B7A90] text-sm font-medium"
          >
            Terceirizada (Promob)
          </TabsTrigger>
          <TabsTrigger
            value="interna"
            className="rounded-none bg-transparent px-0 pb-3 pt-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#1E6FBF] data-[state=active]:border-b-2 data-[state=active]:border-[#1E6FBF] text-[#6B7A90] text-sm font-medium"
          >
            Interna
          </TabsTrigger>
        </TabsList>

        <TabsContent value="terceirizada" className="mt-0">
          <TerceirizadaTab />
        </TabsContent>
        <TabsContent value="interna" className="mt-0">
          <InternaKanban />
        </TabsContent>
      </Tabs>
    </div>
  );
}
