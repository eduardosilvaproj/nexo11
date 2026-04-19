import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TerceirizadaTab } from "@/components/producao/TerceirizadaTab";
import { InternaKanban } from "@/components/producao/InternaKanban";

export default function Producao() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0D1117" }}>NEXO Produção</h1>
        <p style={{ fontSize: 13, color: "#6B7A90" }}>Ordens de produção ativas</p>
      </div>

      <Tabs defaultValue="terceirizada" className="w-full">
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
