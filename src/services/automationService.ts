import { supabase } from "@/integrations/supabase/client";

export type TriggerType =
  | "contrato_criado"
  | "documento_pendente_assinatura"
  | "entrega_agendada"
  | "entrega_concluida"
  | "montagem_agendada"
  | "montagem_concluida"
  | "pos_venda_aberto"
  | "pos_venda_resolvido"
  | "nps_respondido"
  | "nps_detrator"
  | "sla_proximo_vencimento"
  | "sla_rompido"
  | "ocorrencia_critica"
  | "tarefa_sem_checkin"
  | "offline_sync_falhou";

export interface AutomationAction {
  tipo:
    | "criar_notificacao"
    | "criar_comunicacao_cliente"
    | "criar_pesquisa_nps"
    | "registrar_evento_timeline"
    | "criar_tarefa_acompanhamento"
    | "marcar_contrato_atencao"
    | "alertar_gerente";
  params: Record<string, any>;
}

export interface AutomationRule {
  id: string;
  loja_id: string;
  nome: string;
  descricao?: string;
  gatilho: TriggerType;
  condicoes: Record<string, any>;
  acoes: AutomationAction[];
  delay_minutos: number;
  ativo: boolean;
}

export const automationService = {
  async dispararGatilho(
    gatilho: TriggerType,
    entidade_tipo: string,
    entidade_id: string,
    loja_id: string,
    metadata: Record<string, any> = {}
  ) {
    console.log(`[Automation] Gatilho disparado: ${gatilho} para ${entidade_tipo}:${entidade_id}`);

    // Buscar regras ativas para este gatilho nesta loja
    const { data: regras, error: errorRegras } = await supabase
      .from("automacao_regras")
      .select("*")
      .eq("gatilho", gatilho)
      .eq("loja_id", loja_id)
      .eq("ativo", true);

    if (errorRegras) {
      console.error("[Automation] Erro ao buscar regras:", errorRegras);
      return;
    }

    if (!regras || regras.length === 0) {
      console.log("[Automation] Nenhuma regra ativa encontrada para este gatilho.");
      return;
    }

    for (const regra of regras) {
      await this.registrarExecucao(regra as AutomationRule, entidade_tipo, entidade_id, metadata);
    }
  },

  async registrarExecucao(
    regra: AutomationRule,
    entidade_tipo: string,
    entidade_id: string,
    metadata: Record<string, any>
  ) {
    // Verificar idempotência (ex: não criar 2 pesquisas NPS para o mesmo contrato/etapa hoje)
    // Por simplicidade nesta fase, vamos apenas logar e executar.
    
    const { data: execucao, error: errorExec } = await supabase
      .from("automacao_execucoes")
      .insert({
        loja_id: regra.loja_id,
        regra_id: regra.id,
        gatilho: regra.gatilho,
        entidade_tipo,
        entidade_id,
        status: "pendente",
        resultado: { metadata }
      })
      .select()
      .single();

    if (errorExec) {
      console.error("[Automation] Erro ao registrar execução:", errorExec);
      return;
    }

    // Se não houver delay, executa agora
    if (regra.delay_minutos === 0) {
      await this.executarRegra(execucao.id);
    }
  },

  async executarRegra(execucao_id: string) {
    const { data: execucao, error: errorFetch } = await supabase
      .from("automacao_execucoes")
      .select("*, automacao_regras(*)")
      .eq("id", execucao_id)
      .single();

    if (errorFetch || !execucao) return;

    const regra = execucao.automacao_regras as any as AutomationRule;
    const resultados_acoes = [];
    let status_final = "executada";
    let erro_final = null;

    try {
      for (const acao of regra.acoes) {
        const result = await this.processarAcao(acao, execucao);
        resultados_acoes.push({ acao: acao.tipo, status: "ok", result });
      }
    } catch (err: any) {
      console.error("[Automation] Erro na execução das ações:", err);
      status_final = "falhou";
      erro_final = err.message || "Erro desconhecido";
    }

    await supabase
      .from("automacao_execucoes")
      .update({
        status: status_final,
        resultado: { ...((execucao.resultado as object) || {}), acoes: resultados_acoes },
        erro: erro_final,
        executado_em: new Date().toISOString()
      })
      .eq("id", execucao_id);
  },

  async processarAcao(acao: AutomationAction, execucao: any) {
    const { tipo, params } = acao;
    const { loja_id, entidade_id, entidade_tipo, resultado } = execucao;
    const metadata = (resultado as any)?.metadata || {};

    switch (tipo) {
      case "criar_notificacao":
        return await supabase.from("notificacoes").insert({
          loja_id,
          titulo: params.titulo || "Automação",
          mensagem: params.mensagem || "Ação executada",
          perfil_destino: params.perfil_destino,
          usuario_id: params.usuario_id,
          prioridade: params.prioridade || "media",
          modulo: params.modulo || "automacao",
          entidade_tipo,
          entidade_id
        });

      case "registrar_evento_timeline":
        return await supabase.from("contrato_eventos").insert({
          contrato_id: entidade_tipo === "contrato" ? entidade_id : metadata.contrato_id,
          tipo: "automacao",
          titulo: params.titulo || "Ação Automatizada",
          descricao: params.descricao || "Executado via motor de automações",
          visivel_cliente: params.visivel_cliente || false,
          metadata: { regra_id: execucao.regra_id }
        });

      case "criar_pesquisa_nps":
        return await supabase.from("cliente_pesquisas").insert({
          loja_id,
          contrato_id: entidade_tipo === "contrato" ? entidade_id : metadata.contrato_id,
          cliente_id: metadata.cliente_id,
          etapa: params.etapa || "geral",
          status: "enviada"
        });

      case "criar_comunicacao_cliente":
        return await supabase.from("cliente_comunicacoes").insert({
          loja_id,
          contrato_id: entidade_tipo === "contrato" ? entidade_id : metadata.contrato_id,
          cliente_id: metadata.cliente_id,
          canal: params.canal || "manual",
          tipo: params.tipo || "aviso_geral",
          destinatario: metadata.cliente_contato || "Cliente",
          assunto: params.assunto || "Atualização do seu projeto",
          mensagem: params.mensagem || "Olá! Temos novidades sobre seu projeto.",
          status: "preparado"
        });

      case "alertar_gerente":
        return await supabase.from("notificacoes").insert({
          loja_id,
          titulo: "ALERTA CRÍTICO: " + (params.titulo || "Atenção"),
          mensagem: params.mensagem || "Uma situação crítica requer sua atenção.",
          perfil_destino: "gerente",
          prioridade: "critica",
          modulo: "alerta_gestao",
          entidade_tipo,
          entidade_id
        });

      default:
        console.warn(`[Automation] Ação não suportada: ${tipo}`);
        return { warning: "Ação não suportada" };
    }
  }
};
