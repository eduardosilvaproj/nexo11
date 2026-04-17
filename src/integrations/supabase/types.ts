export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agendamentos_montagem: {
        Row: {
          checklist_obra_json: Json
          contrato_id: string
          created_at: string
          data: string
          entrega_confirmada: boolean
          equipe_id: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          retrabalho: boolean
          retrabalho_motivo: string | null
          status: Database["public"]["Enums"]["agendamento_status"]
          updated_at: string
        }
        Insert: {
          checklist_obra_json?: Json
          contrato_id: string
          created_at?: string
          data: string
          entrega_confirmada?: boolean
          equipe_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          retrabalho?: boolean
          retrabalho_motivo?: string | null
          status?: Database["public"]["Enums"]["agendamento_status"]
          updated_at?: string
        }
        Update: {
          checklist_obra_json?: Json
          contrato_id?: string
          created_at?: string
          data?: string
          entrega_confirmada?: boolean
          equipe_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          retrabalho?: boolean
          retrabalho_motivo?: string | null
          status?: Database["public"]["Enums"]["agendamento_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_montagem_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_montagem_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_montagem_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados_pos_venda: {
        Row: {
          contrato_id: string
          created_at: string
          custo: number
          data_abertura: string
          data_fechamento: string | null
          descricao: string
          id: string
          nps: number | null
          nps_comentario: string | null
          status: Database["public"]["Enums"]["chamado_status"]
          tipo: Database["public"]["Enums"]["chamado_tipo"]
          updated_at: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          custo?: number
          data_abertura?: string
          data_fechamento?: string | null
          descricao: string
          id?: string
          nps?: number | null
          nps_comentario?: string | null
          status?: Database["public"]["Enums"]["chamado_status"]
          tipo: Database["public"]["Enums"]["chamado_tipo"]
          updated_at?: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          custo?: number
          data_abertura?: string
          data_fechamento?: string | null
          descricao?: string
          id?: string
          nps?: number | null
          nps_comentario?: string | null
          status?: Database["public"]["Enums"]["chamado_status"]
          tipo?: Database["public"]["Enums"]["chamado_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_pos_venda_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_pos_venda_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          id: string
          loja_id: string
          obrigatorio: boolean
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          id?: string
          loja_id: string
          obrigatorio?: boolean
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          id?: string
          loja_id?: string
          obrigatorio?: boolean
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists_tecnicos: {
        Row: {
          concluido: boolean
          contrato_id: string
          created_at: string
          data: string | null
          id: string
          item: string
          observacao: string | null
          responsavel: string | null
          updated_at: string
        }
        Insert: {
          concluido?: boolean
          contrato_id: string
          created_at?: string
          data?: string | null
          id?: string
          item: string
          observacao?: string | null
          responsavel?: string | null
          updated_at?: string
        }
        Update: {
          concluido?: boolean
          contrato_id?: string
          created_at?: string
          data?: string | null
          id?: string
          item?: string
          observacao?: string | null
          responsavel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_tecnicos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_tecnicos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes: {
        Row: {
          contrato_id: string
          created_at: string
          data_pagamento: string | null
          id: string
          loja_id: string
          margem_realizada_pct: number
          pago: boolean
          updated_at: string
          valor_base: number
          valor_bonus: number
          vendedor_id: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          loja_id: string
          margem_realizada_pct?: number
          pago?: boolean
          updated_at?: string
          valor_base?: number
          valor_bonus?: number
          vendedor_id: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          loja_id?: string
          margem_realizada_pct?: number
          pago?: boolean
          updated_at?: string
          valor_base?: number
          valor_bonus?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_logs: {
        Row: {
          acao: string
          autor_id: string | null
          autor_nome: string | null
          contrato_id: string
          created_at: string
          descricao: string | null
          id: string
          titulo: string
        }
        Insert: {
          acao: string
          autor_id?: string | null
          autor_nome?: string | null
          contrato_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          titulo: string
        }
        Update: {
          acao?: string
          autor_id?: string | null
          autor_nome?: string | null
          contrato_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_logs_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_logs_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          assinado: boolean
          cliente_contato: string | null
          cliente_nome: string
          created_at: string
          data_criacao: string
          data_finalizacao: string | null
          id: string
          loja_id: string
          status: Database["public"]["Enums"]["contrato_status"]
          updated_at: string
          valor_venda: number
          vendedor_id: string | null
        }
        Insert: {
          assinado?: boolean
          cliente_contato?: string | null
          cliente_nome: string
          created_at?: string
          data_criacao?: string
          data_finalizacao?: string | null
          id?: string
          loja_id: string
          status?: Database["public"]["Enums"]["contrato_status"]
          updated_at?: string
          valor_venda?: number
          vendedor_id?: string | null
        }
        Update: {
          assinado?: boolean
          cliente_contato?: string | null
          cliente_nome?: string
          created_at?: string
          data_criacao?: string
          data_finalizacao?: string | null
          id?: string
          loja_id?: string
          status?: Database["public"]["Enums"]["contrato_status"]
          updated_at?: string
          valor_venda?: number
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      custos_fixos: {
        Row: {
          created_at: string
          descricao: string
          id: string
          loja_id: string
          mes_referencia: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          loja_id: string
          mes_referencia: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          loja_id?: string
          mes_referencia?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_fixos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      dre_contrato: {
        Row: {
          contrato_id: string
          custo_comissao_previsto: number
          custo_comissao_real: number
          custo_frete_previsto: number
          custo_frete_real: number
          custo_montagem_previsto: number
          custo_montagem_real: number
          custo_produto_previsto: number
          custo_produto_real: number
          desvio_total: number
          margem_prevista: number
          margem_realizada: number
          outros_custos_previstos: number
          outros_custos_reais: number
          updated_at: string
          valor_venda: number
        }
        Insert: {
          contrato_id: string
          custo_comissao_previsto?: number
          custo_comissao_real?: number
          custo_frete_previsto?: number
          custo_frete_real?: number
          custo_montagem_previsto?: number
          custo_montagem_real?: number
          custo_produto_previsto?: number
          custo_produto_real?: number
          desvio_total?: number
          margem_prevista?: number
          margem_realizada?: number
          outros_custos_previstos?: number
          outros_custos_reais?: number
          updated_at?: string
          valor_venda?: number
        }
        Update: {
          contrato_id?: string
          custo_comissao_previsto?: number
          custo_comissao_real?: number
          custo_frete_previsto?: number
          custo_frete_real?: number
          custo_montagem_previsto?: number
          custo_montagem_real?: number
          custo_produto_previsto?: number
          custo_produto_real?: number
          desvio_total?: number
          margem_prevista?: number
          margem_realizada?: number
          outros_custos_previstos?: number
          outros_custos_reais?: number
          updated_at?: string
          valor_venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "dre_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: true
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dre_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: true
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas: {
        Row: {
          confirmado_por: string | null
          contrato_id: string
          created_at: string
          custo_frete: number
          data_confirmacao: string | null
          data_prevista: string | null
          foto_confirmacao_path: string | null
          id: string
          rota: string | null
          status: Database["public"]["Enums"]["entrega_status"]
          transportadora: string | null
          updated_at: string
        }
        Insert: {
          confirmado_por?: string | null
          contrato_id: string
          created_at?: string
          custo_frete?: number
          data_confirmacao?: string | null
          data_prevista?: string | null
          foto_confirmacao_path?: string | null
          id?: string
          rota?: string | null
          status?: Database["public"]["Enums"]["entrega_status"]
          transportadora?: string | null
          updated_at?: string
        }
        Update: {
          confirmado_por?: string | null
          contrato_id?: string
          created_at?: string
          custo_frete?: number
          data_confirmacao?: string | null
          data_prevista?: string | null
          foto_confirmacao_path?: string | null
          id?: string
          rota?: string | null
          status?: Database["public"]["Enums"]["entrega_status"]
          transportadora?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
        ]
      }
      equipe_membros: {
        Row: {
          created_at: string
          equipe_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          equipe_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          equipe_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipe_membros_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
        ]
      }
      equipes: {
        Row: {
          ativo: boolean
          capacidade_horas_dia: number
          cor: string
          created_at: string
          id: string
          loja_id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capacidade_horas_dia?: number
          cor?: string
          created_at?: string
          id?: string
          loja_id: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capacidade_horas_dia?: number
          cor?: string
          created_at?: string
          id?: string
          loja_id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          contato: string | null
          created_at: string
          email: string | null
          id: string
          loja_id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          contato?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loja_id: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          contato?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loja_id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          contato: string | null
          created_at: string
          data_entrada: string
          data_ultimo_contato: string | null
          email: string | null
          id: string
          loja_id: string
          nome: string
          observacoes: string | null
          origem: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          valor_estimado: number | null
          vendedor_id: string | null
        }
        Insert: {
          contato?: string | null
          created_at?: string
          data_entrada?: string
          data_ultimo_contato?: string | null
          email?: string | null
          id?: string
          loja_id: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          valor_estimado?: number | null
          vendedor_id?: string | null
        }
        Update: {
          contato?: string | null
          created_at?: string
          data_entrada?: string
          data_ultimo_contato?: string | null
          email?: string | null
          id?: string
          loja_id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          valor_estimado?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas: {
        Row: {
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          estado: string | null
          franqueado_id: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          franqueado_id?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          franqueado_id?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      metas_loja: {
        Row: {
          created_at: string
          id: string
          loja_id: string
          mes_referencia: string
          meta_faturamento: number
          meta_margem: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          loja_id: string
          mes_referencia: string
          meta_faturamento?: number
          meta_margem?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          loja_id?: string
          mes_referencia?: string
          meta_faturamento?: number
          meta_margem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_loja_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          contrato_id: string | null
          created_at: string
          id: string
          lida_em: string | null
          link: string | null
          mensagem: string
          tipo: string
          user_id: string
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string
          id?: string
          lida_em?: string | null
          link?: string | null
          mensagem: string
          tipo: string
          user_id: string
        }
        Update: {
          contrato_id?: string | null
          created_at?: string
          id?: string
          lida_em?: string | null
          link?: string | null
          mensagem?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      ordens_producao: {
        Row: {
          contrato_id: string
          created_at: string
          custo_real: number | null
          data_conclusao: string | null
          data_inicio: string | null
          data_previsao: string | null
          fornecedor_id: string | null
          id: string
          itens_json: Json
          observacoes: string | null
          prazo_dias: number | null
          status: Database["public"]["Enums"]["op_status"]
          updated_at: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          custo_real?: number | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_previsao?: string | null
          fornecedor_id?: string | null
          id?: string
          itens_json?: Json
          observacoes?: string | null
          prazo_dias?: number | null
          status?: Database["public"]["Enums"]["op_status"]
          updated_at?: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          custo_real?: number | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_previsao?: string | null
          fornecedor_id?: string | null
          id?: string
          itens_json?: Json
          observacoes?: string | null
          prazo_dias?: number | null
          status?: Database["public"]["Enums"]["op_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_producao_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_producao_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_producao_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_tokens: {
        Row: {
          contrato_id: string
          created_at: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_tokens_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: true
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_tokens_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: true
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_ponto: {
        Row: {
          created_at: string
          id: string
          loja_id: string
          registrado_em: string
          tipo: Database["public"]["Enums"]["ponto_tipo"]
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          loja_id: string
          registrado_em?: string
          tipo: Database["public"]["Enums"]["ponto_tipo"]
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          loja_id?: string
          registrado_em?: string
          tipo?: Database["public"]["Enums"]["ponto_tipo"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_ponto_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_ponto_audit: {
        Row: {
          ajustado_por: string
          ajustado_por_nome: string | null
          created_at: string
          id: string
          loja_id: string
          motivo: string
          registro_id: string
          usuario_id: string
          valor_anterior: string
          valor_novo: string
        }
        Insert: {
          ajustado_por: string
          ajustado_por_nome?: string | null
          created_at?: string
          id?: string
          loja_id: string
          motivo: string
          registro_id: string
          usuario_id: string
          valor_anterior: string
          valor_novo: string
        }
        Update: {
          ajustado_por?: string
          ajustado_por_nome?: string | null
          created_at?: string
          id?: string
          loja_id?: string
          motivo?: string
          registro_id?: string
          usuario_id?: string
          valor_anterior?: string
          valor_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_ponto_audit_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registros_ponto"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_comissao: {
        Row: {
          ativo: boolean
          bonus_ativo: boolean
          created_at: string
          id: string
          loja_id: string
          margem_min_bonus: number
          percentual_base: number
          percentual_bonus: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bonus_ativo?: boolean
          created_at?: string
          id?: string
          loja_id: string
          margem_min_bonus?: number
          percentual_base?: number
          percentual_bonus?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bonus_ativo?: boolean
          created_at?: string
          id?: string
          loja_id?: string
          margem_min_bonus?: number
          percentual_base?: number
          percentual_bonus?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_comissao_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      retrabalhos: {
        Row: {
          contrato_id: string
          created_at: string
          custo: number
          data_resolucao: string | null
          id: string
          motivo: string
          resolvido: boolean
          responsavel: string | null
          updated_at: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          custo?: number
          data_resolucao?: string | null
          id?: string
          motivo: string
          resolvido?: boolean
          responsavel?: string | null
          updated_at?: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          custo?: number
          data_resolucao?: string | null
          id?: string
          motivo?: string
          resolvido?: boolean
          responsavel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retrabalhos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retrabalhos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes: {
        Row: {
          categoria: string
          contrato_id: string | null
          created_at: string
          criado_por: string | null
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          id: string
          loja_id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["transacao_status"]
          tipo: Database["public"]["Enums"]["transacao_tipo"]
          updated_at: string
          valor: number
        }
        Insert: {
          categoria: string
          contrato_id?: string | null
          created_at?: string
          criado_por?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          id?: string
          loja_id: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["transacao_status"]
          tipo: Database["public"]["Enums"]["transacao_tipo"]
          updated_at?: string
          valor?: number
        }
        Update: {
          categoria?: string
          contrato_id?: string | null
          created_at?: string
          criado_por?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          id?: string
          loja_id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["transacao_status"]
          tipo?: Database["public"]["Enums"]["transacao_tipo"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          loja_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          loja_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          loja_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          created_at: string
          email: string | null
          id: string
          loja_id: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          loja_id?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          loja_id?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      usuarios_publico: {
        Row: {
          created_at: string | null
          id: string | null
          loja_id: string | null
          nome: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          loja_id?: string | null
          nome?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          loja_id?: string | null
          nome?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_contratos_dre: {
        Row: {
          assinado: boolean | null
          cliente_contato: string | null
          cliente_nome: string | null
          created_at: string | null
          custo_comissao_previsto: number | null
          custo_comissao_real: number | null
          custo_frete_previsto: number | null
          custo_frete_real: number | null
          custo_montagem_previsto: number | null
          custo_montagem_real: number | null
          custo_produto_previsto: number | null
          custo_produto_real: number | null
          data_criacao: string | null
          data_finalizacao: string | null
          desvio_total: number | null
          dre_updated_at: string | null
          id: string | null
          loja_id: string | null
          margem_prevista: number | null
          margem_realizada: number | null
          outros_custos_previstos: number | null
          outros_custos_reais: number | null
          status: Database["public"]["Enums"]["contrato_status"] | null
          updated_at: string | null
          valor_venda: number | null
          vendedor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ponto_equilibrio: {
        Row: {
          ano: number | null
          custo_fixo_total: number | null
          faturamento_realizado: number | null
          loja_id: string | null
          margem_media: number | null
          mes: string | null
          mes_num: number | null
          pe_calculado: number | null
          ticket_medio: number | null
          total_contratos: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      avancar_contrato: {
        Args: { p_contrato_id: string; p_usuario_id?: string }
        Returns: Json
      }
      contrato_da_loja: { Args: { _contrato_id: string }; Returns: boolean }
      contrato_log_inserir: {
        Args: {
          _acao: string
          _contrato_id: string
          _descricao?: string
          _titulo: string
        }
        Returns: undefined
      }
      current_loja_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _loja_id?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_portal_token: {
        Args: { _contrato_id: string }
        Returns: boolean
      }
      outros_custos_sync_dre: {
        Args: { _contrato_id: string }
        Returns: undefined
      }
      portal_registrar_nps: {
        Args: { _comentario?: string; _nota: number; _token: string }
        Returns: Json
      }
      realtime_canal_contrato_permitido: {
        Args: { _topic: string }
        Returns: boolean
      }
      realtime_canal_user_permitido: {
        Args: { _topic: string }
        Returns: boolean
      }
    }
    Enums: {
      agendamento_status: "agendado" | "em_execucao" | "concluido" | "cancelado"
      app_role:
        | "admin"
        | "vendedor"
        | "tecnico"
        | "montador"
        | "gerente"
        | "franqueador"
      chamado_status: "aberto" | "em_andamento" | "resolvido"
      chamado_tipo: "assistencia" | "reclamacao" | "garantia" | "solicitacao"
      contrato_status:
        | "comercial"
        | "tecnico"
        | "producao"
        | "logistica"
        | "montagem"
        | "pos_venda"
        | "finalizado"
      entrega_status: "pendente" | "confirmada"
      lead_status:
        | "novo"
        | "atendimento"
        | "visita"
        | "proposta"
        | "convertido"
        | "perdido"
      op_status: "aguardando" | "em_corte" | "em_montagem" | "concluido"
      ponto_tipo: "entrada" | "saida"
      transacao_status: "pendente" | "pago" | "cancelado"
      transacao_tipo: "receita" | "despesa"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agendamento_status: ["agendado", "em_execucao", "concluido", "cancelado"],
      app_role: [
        "admin",
        "vendedor",
        "tecnico",
        "montador",
        "gerente",
        "franqueador",
      ],
      chamado_status: ["aberto", "em_andamento", "resolvido"],
      chamado_tipo: ["assistencia", "reclamacao", "garantia", "solicitacao"],
      contrato_status: [
        "comercial",
        "tecnico",
        "producao",
        "logistica",
        "montagem",
        "pos_venda",
        "finalizado",
      ],
      entrega_status: ["pendente", "confirmada"],
      lead_status: [
        "novo",
        "atendimento",
        "visita",
        "proposta",
        "convertido",
        "perdido",
      ],
      op_status: ["aguardando", "em_corte", "em_montagem", "concluido"],
      ponto_tipo: ["entrada", "saida"],
      transacao_status: ["pendente", "pago", "cancelado"],
      transacao_tipo: ["receita", "despesa"],
    },
  },
} as const
