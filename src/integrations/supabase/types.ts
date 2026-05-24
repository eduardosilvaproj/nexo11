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
      acompanhamento_acessos: {
        Row: {
          ativo: boolean
          created_at: string | null
          expira_em: string | null
          id: string
          nome_cliente: string | null
          serial: string
          ultimo_acesso_em: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          expira_em?: string | null
          id?: string
          nome_cliente?: string | null
          serial: string
          ultimo_acesso_em?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          expira_em?: string | null
          id?: string
          nome_cliente?: string | null
          serial?: string
          ultimo_acesso_em?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      acompanhamento_modulos: {
        Row: {
          anotacoes_internas: string | null
          aprovado: boolean
          aprovado_em: string | null
          aprovado_por: string | null
          area: string | null
          created_at: string
          funcionalidades_json: Json
          id: string
          nome: string
          ok_items_json: Json
          ordem: number | null
          percentual: number
          print_url: string | null
          processos_json: Json
          proximos_passos_json: Json
          resumo_modulo: string | null
          revisar_items_json: Json
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          anotacoes_internas?: string | null
          aprovado?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          area?: string | null
          created_at?: string
          funcionalidades_json?: Json
          id?: string
          nome: string
          ok_items_json?: Json
          ordem?: number | null
          percentual?: number
          print_url?: string | null
          processos_json?: Json
          proximos_passos_json?: Json
          resumo_modulo?: string | null
          revisar_items_json?: Json
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          anotacoes_internas?: string | null
          aprovado?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          area?: string | null
          created_at?: string
          funcionalidades_json?: Json
          id?: string
          nome?: string
          ok_items_json?: Json
          ordem?: number | null
          percentual?: number
          print_url?: string | null
          processos_json?: Json
          proximos_passos_json?: Json
          resumo_modulo?: string | null
          revisar_items_json?: Json
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      ambiente_itens_extras: {
        Row: {
          ambiente_id: string
          contrato_id: string
          created_at: string
          data_compra: string | null
          data_recebimento: string | null
          descricao: string
          descricao_normalizada: string | null
          divergencia_estoque: boolean
          divergencia_observacoes: string | null
          id: string
          item_estoque_id: string | null
          justificativa: string | null
          loja_id: string
          observacoes: string | null
          origem: string
          previsao_chegada: string | null
          quantidade: number
          quantidade_a_comprar: number | null
          quantidade_atendida: number | null
          quantidade_em_estoque: number | null
          requisicao_compra_id: string | null
          requisicao_id: string | null
          reserva_id: string | null
          roteamento_detalhes: string | null
          separacao_concluida_em: string | null
          separacao_iniciada_em: string | null
          status: string
          status_compra: string
          status_fluxo: string | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          ambiente_id: string
          contrato_id: string
          created_at?: string
          data_compra?: string | null
          data_recebimento?: string | null
          descricao: string
          descricao_normalizada?: string | null
          divergencia_estoque?: boolean
          divergencia_observacoes?: string | null
          id?: string
          item_estoque_id?: string | null
          justificativa?: string | null
          loja_id: string
          observacoes?: string | null
          origem?: string
          previsao_chegada?: string | null
          quantidade?: number
          quantidade_a_comprar?: number | null
          quantidade_atendida?: number | null
          quantidade_em_estoque?: number | null
          requisicao_compra_id?: string | null
          requisicao_id?: string | null
          reserva_id?: string | null
          roteamento_detalhes?: string | null
          separacao_concluida_em?: string | null
          separacao_iniciada_em?: string | null
          status?: string
          status_compra?: string
          status_fluxo?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          ambiente_id?: string
          contrato_id?: string
          created_at?: string
          data_compra?: string | null
          data_recebimento?: string | null
          descricao?: string
          descricao_normalizada?: string | null
          divergencia_estoque?: boolean
          divergencia_observacoes?: string | null
          id?: string
          item_estoque_id?: string | null
          justificativa?: string | null
          loja_id?: string
          observacoes?: string | null
          origem?: string
          previsao_chegada?: string | null
          quantidade?: number
          quantidade_a_comprar?: number | null
          quantidade_atendida?: number | null
          quantidade_em_estoque?: number | null
          requisicao_compra_id?: string | null
          requisicao_id?: string | null
          reserva_id?: string | null
          roteamento_detalhes?: string | null
          separacao_concluida_em?: string | null
          separacao_iniciada_em?: string | null
          status?: string
          status_compra?: string
          status_fluxo?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambiente_itens_extras_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "contrato_ambientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambiente_itens_extras_item_estoque_id_fkey"
            columns: ["item_estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambiente_itens_extras_requisicao_compra_id_fkey"
            columns: ["requisicao_compra_id"]
            isOneToOne: false
            referencedRelation: "requisicoes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambiente_itens_extras_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "requisicoes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambiente_itens_extras_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "estoque_reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      anexos_operacionais: {
        Row: {
          arquivo_url: string
          contrato_id: string | null
          created_at: string
          descricao: string | null
          documento_id: string | null
          entidade_id: string | null
          entidade_tipo: string
          enviado_por: string | null
          id: string
          loja_id: string
          mime_type: string | null
          modulo: string
          tamanho_bytes: number | null
          tipo: string
          titulo: string
        }
        Insert: {
          arquivo_url: string
          contrato_id?: string | null
          created_at?: string
          descricao?: string | null
          documento_id?: string | null
          entidade_id?: string | null
          entidade_tipo: string
          enviado_por?: string | null
          id?: string
          loja_id: string
          mime_type?: string | null
          modulo: string
          tamanho_bytes?: number | null
          tipo?: string
          titulo: string
        }
        Update: {
          arquivo_url?: string
          contrato_id?: string | null
          created_at?: string
          descricao?: string | null
          documento_id?: string | null
          entidade_id?: string | null
          entidade_tipo?: string
          enviado_por?: string | null
          id?: string
          loja_id?: string
          mime_type?: string | null
          modulo?: string
          tamanho_bytes?: number | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "anexos_operacionais_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_operacionais_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_operacionais_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_emitidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_operacionais_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      automacao_execucoes: {
        Row: {
          created_at: string | null
          entidade_id: string
          entidade_tipo: string
          erro: string | null
          executado_em: string | null
          gatilho: string
          id: string
          loja_id: string
          regra_id: string | null
          resultado: Json
          status: string
        }
        Insert: {
          created_at?: string | null
          entidade_id: string
          entidade_tipo: string
          erro?: string | null
          executado_em?: string | null
          gatilho: string
          id?: string
          loja_id: string
          regra_id?: string | null
          resultado?: Json
          status?: string
        }
        Update: {
          created_at?: string | null
          entidade_id?: string
          entidade_tipo?: string
          erro?: string | null
          executado_em?: string | null
          gatilho?: string
          id?: string
          loja_id?: string
          regra_id?: string | null
          resultado?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automacao_execucoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automacao_execucoes_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "automacao_regras"
            referencedColumns: ["id"]
          },
        ]
      }
      automacao_regras: {
        Row: {
          acoes: Json
          ativo: boolean
          condicoes: Json
          created_at: string | null
          created_by: string | null
          delay_minutos: number
          descricao: string | null
          gatilho: string
          id: string
          loja_id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          acoes?: Json
          ativo?: boolean
          condicoes?: Json
          created_at?: string | null
          created_by?: string | null
          delay_minutos?: number
          descricao?: string | null
          gatilho: string
          id?: string
          loja_id: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          acoes?: Json
          ativo?: boolean
          condicoes?: Json
          created_at?: string | null
          created_by?: string | null
          delay_minutos?: number
          descricao?: string | null
          gatilho?: string
          id?: string
          loja_id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automacao_regras_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
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
      chat_conversas: {
        Row: {
          contrato_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          loja_id: string
          modulo: string | null
          tipo: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          loja_id: string
          modulo?: string | null
          tipo: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          contrato_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          loja_id?: string
          modulo?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_mensagens: {
        Row: {
          anexo_nome: string | null
          anexo_tipo: string | null
          anexo_url: string | null
          contrato_id: string
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          remetente_id: string | null
          remetente_nome: string
          remetente_tipo: string
        }
        Insert: {
          anexo_nome?: string | null
          anexo_tipo?: string | null
          anexo_url?: string | null
          contrato_id: string
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          remetente_id?: string | null
          remetente_nome: string
          remetente_tipo: string
        }
        Update: {
          anexo_nome?: string | null
          anexo_tipo?: string | null
          anexo_url?: string | null
          contrato_id?: string
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          remetente_id?: string | null
          remetente_nome?: string
          remetente_tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_mensagens_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_mensagens_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_mensagens_v2: {
        Row: {
          anexo_url: string | null
          conversa_id: string
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          id: string
          loja_id: string
          mensagem: string | null
          tipo: string | null
          usuario_id: string
        }
        Insert: {
          anexo_url?: string | null
          conversa_id: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          loja_id: string
          mensagem?: string | null
          tipo?: string | null
          usuario_id: string
        }
        Update: {
          anexo_url?: string | null
          conversa_id?: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          loja_id?: string
          mensagem?: string | null
          tipo?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_mensagens_v2_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "chat_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_mensagens_v2_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participantes: {
        Row: {
          conversa_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          usuario_id: string
        }
        Insert: {
          conversa_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          usuario_id: string
        }
        Update: {
          conversa_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participantes_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "chat_conversas"
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
          tipo: string
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
          tipo?: string
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
          tipo?: string
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
          sub_etapa: string
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
          sub_etapa?: string
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
          sub_etapa?: string
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
      cliente_comunicacoes: {
        Row: {
          assunto: string | null
          canal: string
          cliente_id: string | null
          contrato_id: string | null
          created_at: string
          destinatario: string
          enviado_em: string | null
          enviado_por: string | null
          erro: string | null
          id: string
          loja_id: string
          mensagem: string
          portal_token_id: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          assunto?: string | null
          canal: string
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string
          destinatario: string
          enviado_em?: string | null
          enviado_por?: string | null
          erro?: string | null
          id?: string
          loja_id: string
          mensagem: string
          portal_token_id?: string | null
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          assunto?: string | null
          canal?: string
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string
          destinatario?: string
          enviado_em?: string | null
          enviado_por?: string | null
          erro?: string | null
          id?: string
          loja_id?: string
          mensagem?: string
          portal_token_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_comunicacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_comunicacoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_comunicacoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_comunicacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_comunicacoes_portal_token_id_fkey"
            columns: ["portal_token_id"]
            isOneToOne: false
            referencedRelation: "portal_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_pesquisas: {
        Row: {
          classificacao: string | null
          cliente_id: string
          comentario: string | null
          contrato_id: string
          created_at: string | null
          enviada_em: string | null
          enviada_por: string | null
          etapa: string
          id: string
          loja_id: string
          motivos: string[] | null
          nota: number | null
          portal_token_id: string | null
          respondida_em: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          classificacao?: string | null
          cliente_id: string
          comentario?: string | null
          contrato_id: string
          created_at?: string | null
          enviada_em?: string | null
          enviada_por?: string | null
          etapa: string
          id?: string
          loja_id: string
          motivos?: string[] | null
          nota?: number | null
          portal_token_id?: string | null
          respondida_em?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          classificacao?: string | null
          cliente_id?: string
          comentario?: string | null
          contrato_id?: string
          created_at?: string | null
          enviada_em?: string | null
          enviada_por?: string | null
          etapa?: string
          id?: string
          loja_id?: string
          motivos?: string[] | null
          nota?: number | null
          portal_token_id?: string | null
          respondida_em?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_pesquisas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_pesquisas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_pesquisas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_pesquisas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_pesquisas_portal_token_id_fkey"
            columns: ["portal_token_id"]
            isOneToOne: false
            referencedRelation: "portal_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_preferencias_comunicacao: {
        Row: {
          canal_preferido: string | null
          cliente_id: string
          email_opt_in: boolean
          email_validado: boolean
          id: string
          loja_id: string
          opt_out_em: string | null
          sms_opt_in: boolean
          telefone_validado: boolean
          updated_at: string | null
          whatsapp_opt_in: boolean
        }
        Insert: {
          canal_preferido?: string | null
          cliente_id: string
          email_opt_in?: boolean
          email_validado?: boolean
          id?: string
          loja_id: string
          opt_out_em?: string | null
          sms_opt_in?: boolean
          telefone_validado?: boolean
          updated_at?: string | null
          whatsapp_opt_in?: boolean
        }
        Update: {
          canal_preferido?: string | null
          cliente_id?: string
          email_opt_in?: boolean
          email_validado?: boolean
          id?: string
          loja_id?: string
          opt_out_em?: string | null
          sms_opt_in?: boolean
          telefone_validado?: boolean
          updated_at?: string | null
          whatsapp_opt_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cliente_preferencias_comunicacao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_preferencias_comunicacao_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          celular: string | null
          cep: string | null
          cidade: string | null
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          loja_id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          loja_id: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          loja_id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes: {
        Row: {
          ambiente_id: string | null
          base_calculo: number
          contrato_id: string
          created_at: string
          data_gatilho: string | null
          data_pagamento: string | null
          gatilho: string | null
          id: string
          loja_id: string
          observacoes: string | null
          papel_id: string
          percentual: number
          status: string
          updated_at: string
          usuario_id: string
          valor: number
        }
        Insert: {
          ambiente_id?: string | null
          base_calculo?: number
          contrato_id: string
          created_at?: string
          data_gatilho?: string | null
          data_pagamento?: string | null
          gatilho?: string | null
          id?: string
          loja_id: string
          observacoes?: string | null
          papel_id: string
          percentual?: number
          status?: string
          updated_at?: string
          usuario_id: string
          valor?: number
        }
        Update: {
          ambiente_id?: string | null
          base_calculo?: number
          contrato_id?: string
          created_at?: string
          data_gatilho?: string | null
          data_pagamento?: string | null
          gatilho?: string | null
          id?: string
          loja_id?: string
          observacoes?: string | null
          papel_id?: string
          percentual?: number
          status?: string
          updated_at?: string
          usuario_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "contrato_ambientes"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "comissoes_papel_id_fkey"
            columns: ["papel_id"]
            isOneToOne: false
            referencedRelation: "papeis_comissao"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_alerts: {
        Row: {
          canal: string
          created_at: string | null
          id: string
          loja_id: string | null
          mensagem: string
          metadata: Json | null
          resolvido: boolean | null
          resolvido_em: string | null
          severidade: string
          tipo: string
        }
        Insert: {
          canal: string
          created_at?: string | null
          id?: string
          loja_id?: string | null
          mensagem: string
          metadata?: Json | null
          resolvido?: boolean | null
          resolvido_em?: string | null
          severidade?: string
          tipo: string
        }
        Update: {
          canal?: string
          created_at?: string | null
          id?: string
          loja_id?: string | null
          mensagem?: string
          metadata?: Json | null
          resolvido?: boolean | null
          resolvido_em?: string | null
          severidade?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_alerts_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_outbox: {
        Row: {
          assunto: string | null
          canal: string
          cliente_id: string | null
          comunicacao_id: string | null
          contrato_id: string | null
          created_at: string | null
          created_by: string | null
          destinatario: string
          dry_run: boolean | null
          entregue_em: string | null
          enviado_em: string | null
          erro: string | null
          id: string
          lido_em: string | null
          loja_id: string
          max_tentativas: number
          mensagem: string
          metadata: Json | null
          payload: Json
          processado_em: string | null
          provider: string | null
          provider_message_id: string | null
          proxima_tentativa_em: string | null
          status: string
          template_key: string | null
          tentativas: number
          updated_at: string | null
        }
        Insert: {
          assunto?: string | null
          canal: string
          cliente_id?: string | null
          comunicacao_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          created_by?: string | null
          destinatario: string
          dry_run?: boolean | null
          entregue_em?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          lido_em?: string | null
          loja_id: string
          max_tentativas?: number
          mensagem: string
          metadata?: Json | null
          payload?: Json
          processado_em?: string | null
          provider?: string | null
          provider_message_id?: string | null
          proxima_tentativa_em?: string | null
          status?: string
          template_key?: string | null
          tentativas?: number
          updated_at?: string | null
        }
        Update: {
          assunto?: string | null
          canal?: string
          cliente_id?: string | null
          comunicacao_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          created_by?: string | null
          destinatario?: string
          dry_run?: boolean | null
          entregue_em?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          lido_em?: string | null
          loja_id?: string
          max_tentativas?: number
          mensagem?: string
          metadata?: Json | null
          payload?: Json
          processado_em?: string | null
          provider?: string | null
          provider_message_id?: string | null
          proxima_tentativa_em?: string | null
          status?: string
          template_key?: string | null
          tentativas?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_outbox_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_outbox_comunicacao_id_fkey"
            columns: ["comunicacao_id"]
            isOneToOne: false
            referencedRelation: "cliente_comunicacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_outbox_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_outbox_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_outbox_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_settings: {
        Row: {
          ativo: boolean
          canal: string
          configuracao: Json
          created_at: string | null
          created_by: string | null
          dry_run: boolean | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          last_webhook_at: string | null
          limite_diario: number | null
          loja_id: string
          provider: string
          remetente: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          canal: string
          configuracao?: Json
          created_at?: string | null
          created_by?: string | null
          dry_run?: boolean | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          last_webhook_at?: string | null
          limite_diario?: number | null
          loja_id: string
          provider: string
          remetente?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          canal?: string
          configuracao?: Json
          created_at?: string | null
          created_by?: string | null
          dry_run?: boolean | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          last_webhook_at?: string | null
          limite_diario?: number | null
          loja_id?: string
          provider?: string
          remetente?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_settings_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicado_leituras: {
        Row: {
          comunicado_id: string
          id: string
          lido_em: string | null
          usuario_id: string
        }
        Insert: {
          comunicado_id: string
          id?: string
          lido_em?: string | null
          usuario_id: string
        }
        Update: {
          comunicado_id?: string
          id?: string
          lido_em?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicado_leituras_comunicado_id_fkey"
            columns: ["comunicado_id"]
            isOneToOne: false
            referencedRelation: "comunicados"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados: {
        Row: {
          ativo: boolean | null
          expira_em: string | null
          id: string
          loja_id: string | null
          mensagem: string
          perfil_destino: string | null
          prioridade: string | null
          publicado_em: string | null
          publicado_por: string | null
          titulo: string
        }
        Insert: {
          ativo?: boolean | null
          expira_em?: string | null
          id?: string
          loja_id?: string | null
          mensagem: string
          perfil_destino?: string | null
          prioridade?: string | null
          publicado_em?: string | null
          publicado_por?: string | null
          titulo: string
        }
        Update: {
          ativo?: boolean | null
          expira_em?: string | null
          id?: string
          loja_id?: string | null
          mensagem?: string
          perfil_destino?: string | null
          prioridade?: string | null
          publicado_em?: string | null
          publicado_por?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      condicoes_pagamento: {
        Row: {
          ativo: boolean
          created_at: string | null
          id: string
          loja_id: string
          nome: string
          ordem: number | null
          parcelas: number
          taxa: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          loja_id: string
          nome: string
          ordem?: number | null
          parcelas?: number
          taxa?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          loja_id?: string
          nome?: string
          ordem?: number | null
          parcelas?: number
          taxa?: number
        }
        Relationships: [
          {
            foreignKeyName: "condicoes_pagamento_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      conferencia_ambientes: {
        Row: {
          ambiente_id: string | null
          aprovado_por: string | null
          contrato_id: string | null
          created_at: string | null
          custo_conferencia: number | null
          custo_original: number | null
          data_aprovacao: string | null
          id: string
          itens_extras: Json | null
          loja_id: string | null
          status: string | null
          updated_at: string | null
          variacao_percentual: number | null
          xml_conferencia_raw: string | null
        }
        Insert: {
          ambiente_id?: string | null
          aprovado_por?: string | null
          contrato_id?: string | null
          created_at?: string | null
          custo_conferencia?: number | null
          custo_original?: number | null
          data_aprovacao?: string | null
          id?: string
          itens_extras?: Json | null
          loja_id?: string | null
          status?: string | null
          updated_at?: string | null
          variacao_percentual?: number | null
          xml_conferencia_raw?: string | null
        }
        Update: {
          ambiente_id?: string | null
          aprovado_por?: string | null
          contrato_id?: string | null
          created_at?: string | null
          custo_conferencia?: number | null
          custo_original?: number | null
          data_aprovacao?: string | null
          id?: string
          itens_extras?: Json | null
          loja_id?: string | null
          status?: string | null
          updated_at?: string | null
          variacao_percentual?: number | null
          xml_conferencia_raw?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conferencia_ambientes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conferencia_ambientes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_messages: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_name: string
          sender_type: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_name: string
          sender_type: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_messages_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_messages_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_ambientes: {
        Row: {
          aprovacao_solicitada_em: string | null
          aprovacao_solicitada_por: string | null
          checklist_json: Json | null
          conferencia_aprovada_em: string | null
          conferencia_aprovada_por: string | null
          conferencia_status: string
          conferencia_xml_raw: string | null
          conferente_id: string | null
          contrato_id: string
          created_at: string
          custo_conferencia: number | null
          custo_original: number | null
          data_conferencia: string | null
          data_medicao: string | null
          data_montagem: string | null
          desconto_percentual: number
          id: string
          inclui_ferragens: boolean | null
          itens_conferencia_json: Json
          itens_original_json: Json
          loja_id: string
          medicao_concluido: boolean | null
          medicao_fotos: Json | null
          medicao_scan_url: string | null
          medicao_scans: Json | null
          medidor_id: string | null
          montador_id: string | null
          nome: string
          observacoes: string | null
          observacoes_conferencia: string | null
          origem: string | null
          percentual_conferente: number
          percentual_medidor: number
          percentual_montador: number
          status_conferencia: Database["public"]["Enums"]["ambiente_status_montagem"]
          status_medicao: Database["public"]["Enums"]["ambiente_status_montagem"]
          status_montagem: Database["public"]["Enums"]["ambiente_status_montagem"]
          updated_at: string
          valor_bruto: number
          valor_conferente: number
          valor_liquido: number
          valor_medidor: number
          valor_montador: number
          variacao_pct: number | null
        }
        Insert: {
          aprovacao_solicitada_em?: string | null
          aprovacao_solicitada_por?: string | null
          checklist_json?: Json | null
          conferencia_aprovada_em?: string | null
          conferencia_aprovada_por?: string | null
          conferencia_status?: string
          conferencia_xml_raw?: string | null
          conferente_id?: string | null
          contrato_id: string
          created_at?: string
          custo_conferencia?: number | null
          custo_original?: number | null
          data_conferencia?: string | null
          data_medicao?: string | null
          data_montagem?: string | null
          desconto_percentual?: number
          id?: string
          inclui_ferragens?: boolean | null
          itens_conferencia_json?: Json
          itens_original_json?: Json
          loja_id: string
          medicao_concluido?: boolean | null
          medicao_fotos?: Json | null
          medicao_scan_url?: string | null
          medicao_scans?: Json | null
          medidor_id?: string | null
          montador_id?: string | null
          nome: string
          observacoes?: string | null
          observacoes_conferencia?: string | null
          origem?: string | null
          percentual_conferente?: number
          percentual_medidor?: number
          percentual_montador?: number
          status_conferencia?: Database["public"]["Enums"]["ambiente_status_montagem"]
          status_medicao?: Database["public"]["Enums"]["ambiente_status_montagem"]
          status_montagem?: Database["public"]["Enums"]["ambiente_status_montagem"]
          updated_at?: string
          valor_bruto?: number
          valor_conferente?: number
          valor_liquido?: number
          valor_medidor?: number
          valor_montador?: number
          variacao_pct?: number | null
        }
        Update: {
          aprovacao_solicitada_em?: string | null
          aprovacao_solicitada_por?: string | null
          checklist_json?: Json | null
          conferencia_aprovada_em?: string | null
          conferencia_aprovada_por?: string | null
          conferencia_status?: string
          conferencia_xml_raw?: string | null
          conferente_id?: string | null
          contrato_id?: string
          created_at?: string
          custo_conferencia?: number | null
          custo_original?: number | null
          data_conferencia?: string | null
          data_medicao?: string | null
          data_montagem?: string | null
          desconto_percentual?: number
          id?: string
          inclui_ferragens?: boolean | null
          itens_conferencia_json?: Json
          itens_original_json?: Json
          loja_id?: string
          medicao_concluido?: boolean | null
          medicao_fotos?: Json | null
          medicao_scan_url?: string | null
          medicao_scans?: Json | null
          medidor_id?: string | null
          montador_id?: string | null
          nome?: string
          observacoes?: string | null
          observacoes_conferencia?: string | null
          origem?: string | null
          percentual_conferente?: number
          percentual_medidor?: number
          percentual_montador?: number
          status_conferencia?: Database["public"]["Enums"]["ambiente_status_montagem"]
          status_medicao?: Database["public"]["Enums"]["ambiente_status_montagem"]
          status_montagem?: Database["public"]["Enums"]["ambiente_status_montagem"]
          updated_at?: string
          valor_bruto?: number
          valor_conferente?: number
          valor_liquido?: number
          valor_medidor?: number
          valor_montador?: number
          variacao_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_ambientes_conferente_id_fkey"
            columns: ["conferente_id"]
            isOneToOne: false
            referencedRelation: "tecnicos_montadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_ambientes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_ambientes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_ambientes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_ambientes_medidor_id_fkey"
            columns: ["medidor_id"]
            isOneToOne: false
            referencedRelation: "tecnicos_montadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_ambientes_montador_id_fkey"
            columns: ["montador_id"]
            isOneToOne: false
            referencedRelation: "tecnicos_montadores"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_eventos: {
        Row: {
          contrato_id: string
          created_at: string
          descricao: string | null
          entidade_id: string | null
          entidade_tipo: string | null
          id: string
          loja_id: string
          metadata: Json
          modulo: string
          tipo: string
          titulo: string
          usuario_id: string | null
          visivel_cliente: boolean
        }
        Insert: {
          contrato_id: string
          created_at?: string
          descricao?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          loja_id: string
          metadata?: Json
          modulo: string
          tipo: string
          titulo: string
          usuario_id?: string | null
          visivel_cliente?: boolean
        }
        Update: {
          contrato_id?: string
          created_at?: string
          descricao?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          loja_id?: string
          metadata?: Json
          modulo?: string
          tipo?: string
          titulo?: string
          usuario_id?: string | null
          visivel_cliente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "contrato_eventos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_eventos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_eventos_loja_id_fkey"
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
          etapa: string | null
          id: string
          titulo: string
          usuario_nome: string | null
        }
        Insert: {
          acao?: string
          autor_id?: string | null
          autor_nome?: string | null
          contrato_id: string
          created_at?: string
          descricao?: string | null
          etapa?: string | null
          id?: string
          titulo: string
          usuario_nome?: string | null
        }
        Update: {
          acao?: string
          autor_id?: string | null
          autor_nome?: string | null
          contrato_id?: string
          created_at?: string
          descricao?: string | null
          etapa?: string | null
          id?: string
          titulo?: string
          usuario_nome?: string | null
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
          assinado_em: string | null
          assinado_ip: string | null
          assinado_nome: string | null
          assinado_user_agent: string | null
          assinatura_hash: string | null
          assinatura_imagem_url: string | null
          assinatura_ip: string | null
          assinatura_nome: string | null
          assinatura_user_agent: string | null
          cliente_contato: string | null
          cliente_id: string | null
          cliente_nome: string
          conferencia_responsavel_id: string | null
          contrato_gerado: boolean
          created_at: string
          data_assinatura: string | null
          data_criacao: string
          data_finalizacao: string | null
          id: string
          loja_id: string
          medicao_responsavel_id: string | null
          pdf_assinado_url: string | null
          projetista_id: string | null
          status: Database["public"]["Enums"]["contrato_status"]
          sub_etapa_tecnico: string
          trava_medicao_ok: boolean
          trava_producao_ok: boolean
          trava_tecnico_ok: boolean
          updated_at: string
          url_contrato_assinado: string | null
          valor_venda: number
          vendedor_id: string | null
        }
        Insert: {
          assinado?: boolean
          assinado_em?: string | null
          assinado_ip?: string | null
          assinado_nome?: string | null
          assinado_user_agent?: string | null
          assinatura_hash?: string | null
          assinatura_imagem_url?: string | null
          assinatura_ip?: string | null
          assinatura_nome?: string | null
          assinatura_user_agent?: string | null
          cliente_contato?: string | null
          cliente_id?: string | null
          cliente_nome: string
          conferencia_responsavel_id?: string | null
          contrato_gerado?: boolean
          created_at?: string
          data_assinatura?: string | null
          data_criacao?: string
          data_finalizacao?: string | null
          id?: string
          loja_id: string
          medicao_responsavel_id?: string | null
          pdf_assinado_url?: string | null
          projetista_id?: string | null
          status?: Database["public"]["Enums"]["contrato_status"]
          sub_etapa_tecnico?: string
          trava_medicao_ok?: boolean
          trava_producao_ok?: boolean
          trava_tecnico_ok?: boolean
          updated_at?: string
          url_contrato_assinado?: string | null
          valor_venda?: number
          vendedor_id?: string | null
        }
        Update: {
          assinado?: boolean
          assinado_em?: string | null
          assinado_ip?: string | null
          assinado_nome?: string | null
          assinado_user_agent?: string | null
          assinatura_hash?: string | null
          assinatura_imagem_url?: string | null
          assinatura_ip?: string | null
          assinatura_nome?: string | null
          assinatura_user_agent?: string | null
          cliente_contato?: string | null
          cliente_id?: string | null
          cliente_nome?: string
          conferencia_responsavel_id?: string | null
          contrato_gerado?: boolean
          created_at?: string
          data_assinatura?: string | null
          data_criacao?: string
          data_finalizacao?: string | null
          id?: string
          loja_id?: string
          medicao_responsavel_id?: string | null
          pdf_assinado_url?: string | null
          projetista_id?: string | null
          status?: Database["public"]["Enums"]["contrato_status"]
          sub_etapa_tecnico?: string
          trava_medicao_ok?: boolean
          trava_producao_ok?: boolean
          trava_tecnico_ok?: boolean
          updated_at?: string
          url_contrato_assinado?: string | null
          valor_venda?: number
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_projetista_id_fkey"
            columns: ["projetista_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_projetista_id_fkey"
            columns: ["projetista_id"]
            isOneToOne: false
            referencedRelation: "usuarios_publico"
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
      device_tokens: {
        Row: {
          ativo: boolean
          created_at: string | null
          id: string
          last_seen_at: string | null
          loja_id: string
          platform: string
          token: string
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          loja_id: string
          platform: string
          token: string
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          loja_id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_aceites: {
        Row: {
          aceito_em: string
          assinatura_url: string | null
          contrato_id: string | null
          created_at: string
          documento_id: string
          documento_responsavel: string | null
          id: string
          ip_origem: string | null
          loja_id: string
          nome_responsavel: string
          observacoes: string | null
          tipo: string
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          aceito_em?: string
          assinatura_url?: string | null
          contrato_id?: string | null
          created_at?: string
          documento_id: string
          documento_responsavel?: string | null
          id?: string
          ip_origem?: string | null
          loja_id: string
          nome_responsavel: string
          observacoes?: string | null
          tipo?: string
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          aceito_em?: string
          assinatura_url?: string | null
          contrato_id?: string | null
          created_at?: string
          documento_id?: string
          documento_responsavel?: string | null
          id?: string
          ip_origem?: string | null
          loja_id?: string
          nome_responsavel?: string
          observacoes?: string | null
          tipo?: string
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_aceites_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_aceites_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_aceites_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_emitidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_aceites_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_emitidos: {
        Row: {
          arquivo_url: string | null
          cancelado_em: string | null
          contrato_id: string | null
          created_at: string
          dados_snapshot: Json
          emitido_em: string
          emitido_por: string | null
          entidade_id: string | null
          entidade_tipo: string
          id: string
          loja_id: string
          motivo_cancelamento: string | null
          numero: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          visivel_cliente: boolean
        }
        Insert: {
          arquivo_url?: string | null
          cancelado_em?: string | null
          contrato_id?: string | null
          created_at?: string
          dados_snapshot?: Json
          emitido_em?: string
          emitido_por?: string | null
          entidade_id?: string | null
          entidade_tipo: string
          id?: string
          loja_id: string
          motivo_cancelamento?: string | null
          numero?: string | null
          status?: string
          tipo: string
          titulo: string
          updated_at?: string
          visivel_cliente?: boolean
        }
        Update: {
          arquivo_url?: string | null
          cancelado_em?: string | null
          contrato_id?: string | null
          created_at?: string
          dados_snapshot?: Json
          emitido_em?: string
          emitido_por?: string | null
          entidade_id?: string | null
          entidade_tipo?: string
          id?: string
          loja_id?: string
          motivo_cancelamento?: string | null
          numero?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          visivel_cliente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "documentos_emitidos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_emitidos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_emitidos_loja_id_fkey"
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
          endereco: string | null
          foto_confirmacao_path: string | null
          id: string
          observacoes: string | null
          responsavel: string | null
          rota: string | null
          status: Database["public"]["Enums"]["entrega_status"]
          status_visual: Database["public"]["Enums"]["entrega_status_visual"]
          transportadora: string | null
          turno: Database["public"]["Enums"]["entrega_turno"]
          updated_at: string
        }
        Insert: {
          confirmado_por?: string | null
          contrato_id: string
          created_at?: string
          custo_frete?: number
          data_confirmacao?: string | null
          data_prevista?: string | null
          endereco?: string | null
          foto_confirmacao_path?: string | null
          id?: string
          observacoes?: string | null
          responsavel?: string | null
          rota?: string | null
          status?: Database["public"]["Enums"]["entrega_status"]
          status_visual?: Database["public"]["Enums"]["entrega_status_visual"]
          transportadora?: string | null
          turno?: Database["public"]["Enums"]["entrega_turno"]
          updated_at?: string
        }
        Update: {
          confirmado_por?: string | null
          contrato_id?: string
          created_at?: string
          custo_frete?: number
          data_confirmacao?: string | null
          data_prevista?: string | null
          endereco?: string | null
          foto_confirmacao_path?: string | null
          id?: string
          observacoes?: string | null
          responsavel?: string | null
          rota?: string | null
          status?: Database["public"]["Enums"]["entrega_status"]
          status_visual?: Database["public"]["Enums"]["entrega_status_visual"]
          transportadora?: string | null
          turno?: Database["public"]["Enums"]["entrega_turno"]
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
      estoque_itens: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo: string | null
          codigo_ean: string | null
          codigo_fornecedor: string | null
          created_at: string
          custo_medio_unitario: number
          descricao: string
          estoque_minimo: number
          foto_url: string | null
          id: string
          loja_id: string | null
          quantidade_reservada: number
          quantidade_total: number
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string | null
          codigo_ean?: string | null
          codigo_fornecedor?: string | null
          created_at?: string
          custo_medio_unitario?: number
          descricao: string
          estoque_minimo?: number
          foto_url?: string | null
          id?: string
          loja_id?: string | null
          quantidade_reservada?: number
          quantidade_total?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string | null
          codigo_ean?: string | null
          codigo_fornecedor?: string | null
          created_at?: string
          custo_medio_unitario?: number
          descricao?: string
          estoque_minimo?: number
          foto_url?: string | null
          id?: string
          loja_id?: string | null
          quantidade_reservada?: number
          quantidade_total?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      estoque_movimentacoes: {
        Row: {
          comprovante_url: string | null
          contrato_id: string | null
          created_at: string
          data: string
          descricao: string | null
          endereco_saida: string | null
          id: string
          item_id: string
          loja_destino_id: string | null
          loja_id: string | null
          motivo: string | null
          observacoes: string | null
          quantidade: number
          requisicao_id: string | null
          responsavel_id: string | null
          subtipo: string
          tipo: string
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          comprovante_url?: string | null
          contrato_id?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          endereco_saida?: string | null
          id?: string
          item_id: string
          loja_destino_id?: string | null
          loja_id?: string | null
          motivo?: string | null
          observacoes?: string | null
          quantidade: number
          requisicao_id?: string | null
          responsavel_id?: string | null
          subtipo: string
          tipo: string
          valor_total?: number | null
          valor_unitario?: number
        }
        Update: {
          comprovante_url?: string | null
          contrato_id?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          endereco_saida?: string | null
          id?: string
          item_id?: string
          loja_destino_id?: string | null
          loja_id?: string | null
          motivo?: string | null
          observacoes?: string | null
          quantidade?: number
          requisicao_id?: string | null
          responsavel_id?: string | null
          subtipo?: string
          tipo?: string
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentacoes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_reservas: {
        Row: {
          contrato_id: string
          created_at: string
          id: string
          item_id: string
          liberada_at: string | null
          loja_id: string | null
          observacoes: string | null
          origem_conferencia_id: string | null
          quantidade: number
          status: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          id?: string
          item_id: string
          liberada_at?: string | null
          loja_id?: string | null
          observacoes?: string | null
          origem_conferencia_id?: string | null
          quantidade: number
          status?: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          id?: string
          item_id?: string
          liberada_at?: string | null
          loja_id?: string | null
          observacoes?: string | null
          origem_conferencia_id?: string | null
          quantidade?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_reservas_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_reservas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      expedicoes_almoxarifado: {
        Row: {
          carregado_at: string | null
          contrato_id: string
          created_at: string | null
          entregue_at: string | null
          id: string
          item_id: string
          loja_id: string
          movimentacao_id: string
          observacoes: string | null
          quantidade: number
          requisicao_id: string
          responsavel_carregamento_id: string | null
          responsavel_entrega_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          carregado_at?: string | null
          contrato_id: string
          created_at?: string | null
          entregue_at?: string | null
          id?: string
          item_id: string
          loja_id: string
          movimentacao_id: string
          observacoes?: string | null
          quantidade: number
          requisicao_id: string
          responsavel_carregamento_id?: string | null
          responsavel_entrega_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          carregado_at?: string | null
          contrato_id?: string
          created_at?: string | null
          entregue_at?: string | null
          id?: string
          item_id?: string
          loja_id?: string
          movimentacao_id?: string
          observacoes?: string | null
          quantidade?: number
          requisicao_id?: string
          responsavel_carregamento_id?: string | null
          responsavel_entrega_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expedicoes_almoxarifado_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedicoes_almoxarifado_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedicoes_almoxarifado_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedicoes_almoxarifado_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedicoes_almoxarifado_movimentacao_id_fkey"
            columns: ["movimentacao_id"]
            isOneToOne: false
            referencedRelation: "estoque_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedicoes_almoxarifado_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "requisicoes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_contas_pagar: {
        Row: {
          categoria: string
          comissao_id: string | null
          contrato_id: string | null
          created_at: string | null
          data_pagamento: string | null
          descricao: string
          forma_pagamento: string | null
          fornecedor_id: string | null
          id: string
          loja_id: string
          observacoes: string | null
          status: string
          updated_at: string | null
          valor: number
          vencimento: string
        }
        Insert: {
          categoria: string
          comissao_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          descricao: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          loja_id: string
          observacoes?: string | null
          status?: string
          updated_at?: string | null
          valor?: number
          vencimento: string
        }
        Update: {
          categoria?: string
          comissao_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          descricao?: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          loja_id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string | null
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_contas_pagar_comissao_id_fkey"
            columns: ["comissao_id"]
            isOneToOne: false
            referencedRelation: "comissoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_contas_pagar_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_contas_pagar_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_contas_pagar_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_contas_receber: {
        Row: {
          cliente_id: string | null
          contrato_id: string | null
          created_at: string | null
          data_pagamento: string | null
          descricao: string
          forma_pagamento: string | null
          id: string
          loja_id: string
          lote_parcelamento_id: string | null
          numero_parcela: number | null
          observacoes: string | null
          parcela_numero: number | null
          parcela_total: number | null
          status: string
          total_parcelas: number | null
          updated_at: string | null
          valor: number
          vencimento: string
        }
        Insert: {
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          descricao: string
          forma_pagamento?: string | null
          id?: string
          loja_id: string
          lote_parcelamento_id?: string | null
          numero_parcela?: number | null
          observacoes?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          status?: string
          total_parcelas?: number | null
          updated_at?: string | null
          valor?: number
          vencimento: string
        }
        Update: {
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          loja_id?: string
          lote_parcelamento_id?: string | null
          numero_parcela?: number | null
          observacoes?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          status?: string
          total_parcelas?: number | null
          updated_at?: string | null
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_contas_receber_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_contas_receber_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_contas_receber_loja_id_fkey"
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
          prazo_padrao_dias: number
          telefone: string | null
          tipo: string
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
          prazo_padrao_dias?: number
          telefone?: string | null
          tipo?: string
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
          prazo_padrao_dias?: number
          telefone?: string | null
          tipo?: string
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
      integracoes: {
        Row: {
          ativo: boolean
          config: Json
          created_at: string
          id: string
          loja_id: string
          tipo: string
          ultima_sincronizacao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          config?: Json
          created_at?: string
          id?: string
          loja_id: string
          tipo: string
          ultima_sincronizacao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          config?: Json
          created_at?: string
          id?: string
          loja_id?: string
          tipo?: string
          ultima_sincronizacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integracoes_loja_id_fkey"
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
      lista_compra_itens: {
        Row: {
          created_at: string
          descricao: string
          id: string
          item_estoque_id: string | null
          lista_id: string
          observacoes: string | null
          origem: string
          quantidade_separada: number
          quantidade_solicitada: number
          requisicao_id: string | null
          reserva_id: string | null
          separado: boolean
          separado_at: string | null
          separado_por: string | null
          unidade: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          item_estoque_id?: string | null
          lista_id: string
          observacoes?: string | null
          origem: string
          quantidade_separada?: number
          quantidade_solicitada: number
          requisicao_id?: string | null
          reserva_id?: string | null
          separado?: boolean
          separado_at?: string | null
          separado_por?: string | null
          unidade?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          item_estoque_id?: string | null
          lista_id?: string
          observacoes?: string | null
          origem?: string
          quantidade_separada?: number
          quantidade_solicitada?: number
          requisicao_id?: string | null
          reserva_id?: string | null
          separado?: boolean
          separado_at?: string | null
          separado_por?: string | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lista_compra_itens_item_estoque_id_fkey"
            columns: ["item_estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_compra_itens_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "listas_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_compra_itens_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "requisicoes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_compra_itens_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "estoque_reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      listas_compra: {
        Row: {
          assinatura_motorista_url: string | null
          assinatura_recebedor_url: string | null
          assinatura_separador_url: string | null
          cliente_nome: string
          codigo: string | null
          comprovante_entrega_url: string | null
          conferencia_id: string | null
          contrato_id: string
          created_at: string
          data_entrega: string | null
          data_prevista_entrega: string | null
          endereco_entrega: string | null
          id: string
          latitude_entrega: number | null
          loja_id: string | null
          longitude_entrega: number | null
          motorista_nome: string | null
          observacoes: string | null
          recebedor_documento: string | null
          recebedor_nome: string | null
          rota_id: string | null
          separacao_concluida_at: string | null
          separacao_iniciada_at: string | null
          separador_id: string | null
          separador_nome: string | null
          status: string
          tarefa_logistica_id: string | null
          updated_at: string
        }
        Insert: {
          assinatura_motorista_url?: string | null
          assinatura_recebedor_url?: string | null
          assinatura_separador_url?: string | null
          cliente_nome: string
          codigo?: string | null
          comprovante_entrega_url?: string | null
          conferencia_id?: string | null
          contrato_id: string
          created_at?: string
          data_entrega?: string | null
          data_prevista_entrega?: string | null
          endereco_entrega?: string | null
          id?: string
          latitude_entrega?: number | null
          loja_id?: string | null
          longitude_entrega?: number | null
          motorista_nome?: string | null
          observacoes?: string | null
          recebedor_documento?: string | null
          recebedor_nome?: string | null
          rota_id?: string | null
          separacao_concluida_at?: string | null
          separacao_iniciada_at?: string | null
          separador_id?: string | null
          separador_nome?: string | null
          status?: string
          tarefa_logistica_id?: string | null
          updated_at?: string
        }
        Update: {
          assinatura_motorista_url?: string | null
          assinatura_recebedor_url?: string | null
          assinatura_separador_url?: string | null
          cliente_nome?: string
          codigo?: string | null
          comprovante_entrega_url?: string | null
          conferencia_id?: string | null
          contrato_id?: string
          created_at?: string
          data_entrega?: string | null
          data_prevista_entrega?: string | null
          endereco_entrega?: string | null
          id?: string
          latitude_entrega?: number | null
          loja_id?: string | null
          longitude_entrega?: number | null
          motorista_nome?: string | null
          observacoes?: string | null
          recebedor_documento?: string | null
          recebedor_nome?: string | null
          rota_id?: string | null
          separacao_concluida_at?: string | null
          separacao_iniciada_at?: string | null
          separador_id?: string | null
          separador_nome?: string | null
          status?: string
          tarefa_logistica_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listas_compra_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listas_compra_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listas_compra_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listas_compra_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "logistica_rotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listas_compra_tarefa_logistica_id_fkey"
            columns: ["tarefa_logistica_id"]
            isOneToOne: false
            referencedRelation: "logistica_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_rotas: {
        Row: {
          codigo: string | null
          created_at: string
          data: string
          encerrada_at: string | null
          id: string
          iniciada_at: string | null
          km_final: number | null
          km_inicial: number | null
          loja_id: string | null
          motorista_id: string | null
          motorista_nome: string | null
          observacoes: string | null
          status: string
          veiculo_placa: string | null
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          data: string
          encerrada_at?: string | null
          id?: string
          iniciada_at?: string | null
          km_final?: number | null
          km_inicial?: number | null
          loja_id?: string | null
          motorista_id?: string | null
          motorista_nome?: string | null
          observacoes?: string | null
          status?: string
          veiculo_placa?: string | null
        }
        Update: {
          codigo?: string | null
          created_at?: string
          data?: string
          encerrada_at?: string | null
          id?: string
          iniciada_at?: string | null
          km_final?: number | null
          km_inicial?: number | null
          loja_id?: string | null
          motorista_id?: string | null
          motorista_nome?: string | null
          observacoes?: string | null
          status?: string
          veiculo_placa?: string | null
        }
        Relationships: []
      }
      logistica_tarefas: {
        Row: {
          cliente_nome: string | null
          contrato_id: string | null
          created_at: string
          data_executada: string | null
          data_prevista: string
          descricao: string | null
          endereco: string
          foto_comprovante_url: string | null
          id: string
          iniciada_at: string | null
          itens_json: Json | null
          latitude: number | null
          loja_id: string | null
          longitude: number | null
          motivo: string | null
          observacoes: string | null
          ordem: number
          responsavel_id: string | null
          responsavel_nome: string | null
          rota_id: string | null
          status: string
          tipo: string
        }
        Insert: {
          cliente_nome?: string | null
          contrato_id?: string | null
          created_at?: string
          data_executada?: string | null
          data_prevista: string
          descricao?: string | null
          endereco: string
          foto_comprovante_url?: string | null
          id?: string
          iniciada_at?: string | null
          itens_json?: Json | null
          latitude?: number | null
          loja_id?: string | null
          longitude?: number | null
          motivo?: string | null
          observacoes?: string | null
          ordem?: number
          responsavel_id?: string | null
          responsavel_nome?: string | null
          rota_id?: string | null
          status?: string
          tipo: string
        }
        Update: {
          cliente_nome?: string | null
          contrato_id?: string | null
          created_at?: string
          data_executada?: string | null
          data_prevista?: string
          descricao?: string | null
          endereco?: string
          foto_comprovante_url?: string | null
          id?: string
          iniciada_at?: string | null
          itens_json?: Json | null
          latitude?: number | null
          loja_id?: string | null
          longitude?: number | null
          motivo?: string | null
          observacoes?: string | null
          ordem?: number
          responsavel_id?: string | null
          responsavel_nome?: string | null
          rota_id?: string | null
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistica_tarefas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_tarefas_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "logistica_rotas"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas: {
        Row: {
          ativo: boolean
          cidade: string | null
          cnpj: string | null
          contrato_modelo: string | null
          created_at: string
          desconto_maximo_sem_aprovacao: number | null
          email: string | null
          endereco: string | null
          estado: string | null
          franqueado_id: string | null
          id: string
          matriz_id: string | null
          nome: string
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          contrato_modelo?: string | null
          created_at?: string
          desconto_maximo_sem_aprovacao?: number | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          franqueado_id?: string | null
          id?: string
          matriz_id?: string | null
          nome: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          contrato_modelo?: string | null
          created_at?: string
          desconto_maximo_sem_aprovacao?: number | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          franqueado_id?: string | null
          id?: string
          matriz_id?: string | null
          nome?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lojas_matriz_id_fkey"
            columns: ["matriz_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
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
      mobile_feedback: {
        Row: {
          anexo_url: string | null
          created_at: string | null
          descricao: string
          id: string
          impacto: string
          loja_id: string
          modulo: string
          perfil: string | null
          plataforma: string | null
          status: string
          tipo: string
          updated_at: string | null
          usuario_id: string
          versao_app: string | null
        }
        Insert: {
          anexo_url?: string | null
          created_at?: string | null
          descricao: string
          id?: string
          impacto: string
          loja_id: string
          modulo: string
          perfil?: string | null
          plataforma?: string | null
          status?: string
          tipo: string
          updated_at?: string | null
          usuario_id: string
          versao_app?: string | null
        }
        Update: {
          anexo_url?: string | null
          created_at?: string | null
          descricao?: string
          id?: string
          impacto?: string
          loja_id?: string
          modulo?: string
          perfil?: string | null
          plataforma?: string | null
          status?: string
          tipo?: string
          updated_at?: string | null
          usuario_id?: string
          versao_app?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_feedback_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_sync_logs: {
        Row: {
          acao: string
          created_at: string | null
          device_info: Json | null
          erro: string | null
          id: string
          loja_id: string
          status: string
          tabela: string
          usuario_id: string
        }
        Insert: {
          acao: string
          created_at?: string | null
          device_info?: Json | null
          erro?: string | null
          id?: string
          loja_id: string
          status: string
          tabela: string
          usuario_id: string
        }
        Update: {
          acao?: string
          created_at?: string | null
          device_info?: Json | null
          erro?: string | null
          id?: string
          loja_id?: string
          status?: string
          tabela?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_sync_logs_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      nexo_atualizacoes: {
        Row: {
          autor: string | null
          created_at: string | null
          id: string
          item_id: string | null
          texto: string
        }
        Insert: {
          autor?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          texto: string
        }
        Update: {
          autor?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexo_atualizacoes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "nexo_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      nexo_itens: {
        Row: {
          ambiente: string
          bloqueado: boolean
          created_at: string | null
          data_prevista: string | null
          descricao: string | null
          id: string
          modulo_id: string | null
          prioridade: string
          progresso_percentual: number
          proxima_acao: string | null
          responsavel: string | null
          status: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          ambiente?: string
          bloqueado?: boolean
          created_at?: string | null
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          modulo_id?: string | null
          prioridade?: string
          progresso_percentual?: number
          proxima_acao?: string | null
          responsavel?: string | null
          status?: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          ambiente?: string
          bloqueado?: boolean
          created_at?: string | null
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          modulo_id?: string | null
          prioridade?: string
          progresso_percentual?: number
          proxima_acao?: string | null
          responsavel?: string | null
          status?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nexo_itens_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "nexo_modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      nexo_modulos: {
        Row: {
          ambiente: string
          bloqueado: boolean
          created_at: string | null
          data_prevista: string | null
          dependencias: string | null
          descricao: string | null
          escopo: string | null
          fora_do_escopo: string | null
          id: string
          nome: string
          objetivo: string | null
          prioridade: string
          progresso_percentual: number
          responsavel: string | null
          status: string
          ultima_atualizacao: string | null
          updated_at: string | null
        }
        Insert: {
          ambiente?: string
          bloqueado?: boolean
          created_at?: string | null
          data_prevista?: string | null
          dependencias?: string | null
          descricao?: string | null
          escopo?: string | null
          fora_do_escopo?: string | null
          id?: string
          nome: string
          objetivo?: string | null
          prioridade?: string
          progresso_percentual?: number
          responsavel?: string | null
          status?: string
          ultima_atualizacao?: string | null
          updated_at?: string | null
        }
        Update: {
          ambiente?: string
          bloqueado?: boolean
          created_at?: string | null
          data_prevista?: string | null
          dependencias?: string | null
          descricao?: string | null
          escopo?: string | null
          fora_do_escopo?: string | null
          id?: string
          nome?: string
          objetivo?: string | null
          prioridade?: string
          progresso_percentual?: number
          responsavel?: string | null
          status?: string
          ultima_atualizacao?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notas_fiscais_entrada: {
        Row: {
          chave_acesso: string | null
          created_at: string
          created_by: string | null
          data_emissao: string | null
          data_entrada: string
          fornecedor_cnpj: string | null
          fornecedor_id: string | null
          fornecedor_nome: string | null
          id: string
          loja_id: string | null
          numero_nf: string | null
          observacoes: string | null
          requisicao_id: string | null
          serie: string | null
          status: string
          valor_frete: number | null
          valor_icms: number | null
          valor_ipi: number | null
          valor_produtos: number | null
          valor_total: number
          xml_content: string | null
          xml_url: string | null
        }
        Insert: {
          chave_acesso?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_entrada?: string
          fornecedor_cnpj?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          id?: string
          loja_id?: string | null
          numero_nf?: string | null
          observacoes?: string | null
          requisicao_id?: string | null
          serie?: string | null
          status?: string
          valor_frete?: number | null
          valor_icms?: number | null
          valor_ipi?: number | null
          valor_produtos?: number | null
          valor_total?: number
          xml_content?: string | null
          xml_url?: string | null
        }
        Update: {
          chave_acesso?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_entrada?: string
          fornecedor_cnpj?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          id?: string
          loja_id?: string | null
          numero_nf?: string | null
          observacoes?: string | null
          requisicao_id?: string | null
          serie?: string | null
          status?: string
          valor_frete?: number | null
          valor_icms?: number | null
          valor_ipi?: number | null
          valor_produtos?: number | null
          valor_total?: number
          xml_content?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_entrada_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_entrada_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais_itens: {
        Row: {
          codigo_ean: string | null
          codigo_fornecedor: string | null
          criar_novo_item: boolean
          descricao: string
          id: string
          item_estoque_id: string | null
          movimentacao_id: string | null
          n_item: number
          ncm: string | null
          nota_id: string
          observacoes: string | null
          quantidade: number
          status: string
          unidade: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          codigo_ean?: string | null
          codigo_fornecedor?: string | null
          criar_novo_item?: boolean
          descricao: string
          id?: string
          item_estoque_id?: string | null
          movimentacao_id?: string | null
          n_item: number
          ncm?: string | null
          nota_id: string
          observacoes?: string | null
          quantidade: number
          status?: string
          unidade?: string | null
          valor_total: number
          valor_unitario: number
        }
        Update: {
          codigo_ean?: string | null
          codigo_fornecedor?: string | null
          criar_novo_item?: boolean
          descricao?: string
          id?: string
          item_estoque_id?: string | null
          movimentacao_id?: string | null
          n_item?: number
          ncm?: string | null
          nota_id?: string
          observacoes?: string | null
          quantidade?: number
          status?: string
          unidade?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_itens_item_estoque_id_fkey"
            columns: ["item_estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_itens_movimentacao_id_fkey"
            columns: ["movimentacao_id"]
            isOneToOne: false
            referencedRelation: "estoque_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_itens_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais_entrada"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          contrato_id: string | null
          created_at: string
          entidade_id: string | null
          entidade_tipo: string | null
          id: string
          lida: boolean
          lida_at: string | null
          link: string | null
          loja_id: string | null
          mensagem: string
          modulo: string
          perfil_destino: string | null
          prioridade: string
          resolvida: boolean
          resolvida_at: string | null
          tipo: string
          titulo: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          lida?: boolean
          lida_at?: string | null
          link?: string | null
          loja_id?: string | null
          mensagem: string
          modulo?: string
          perfil_destino?: string | null
          prioridade?: string
          resolvida?: boolean
          resolvida_at?: string | null
          tipo: string
          titulo?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          contrato_id?: string | null
          created_at?: string
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          lida?: boolean
          lida_at?: string | null
          link?: string | null
          loja_id?: string | null
          mensagem?: string
          modulo?: string
          perfil_destino?: string | null
          prioridade?: string
          resolvida?: boolean
          resolvida_at?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      operacao_checkins: {
        Row: {
          contrato_id: string | null
          created_at: string | null
          duracao_minutos: number | null
          entidade_id: string
          entidade_tipo: string
          finalizado_em: string | null
          funcionario_id: string | null
          id: string
          iniciado_em: string
          latitude_fim: number | null
          latitude_inicio: number | null
          loja_id: string
          longitude_fim: number | null
          longitude_inicio: number | null
          modulo: string
          observacoes: string | null
          status: string
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string | null
          duracao_minutos?: number | null
          entidade_id: string
          entidade_tipo: string
          finalizado_em?: string | null
          funcionario_id?: string | null
          id?: string
          iniciado_em?: string
          latitude_fim?: number | null
          latitude_inicio?: number | null
          loja_id: string
          longitude_fim?: number | null
          longitude_inicio?: number | null
          modulo: string
          observacoes?: string | null
          status?: string
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          contrato_id?: string | null
          created_at?: string | null
          duracao_minutos?: number | null
          entidade_id?: string
          entidade_tipo?: string
          finalizado_em?: string | null
          funcionario_id?: string | null
          id?: string
          iniciado_em?: string
          latitude_fim?: number | null
          latitude_inicio?: number | null
          loja_id?: string
          longitude_fim?: number | null
          longitude_inicio?: number | null
          modulo?: string
          observacoes?: string | null
          status?: string
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacao_checkins_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacao_checkins_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacao_checkins_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "rh_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacao_checkins_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      operacao_ocorrencias: {
        Row: {
          checkin_id: string | null
          contrato_id: string | null
          created_at: string | null
          descricao: string
          entidade_id: string
          entidade_tipo: string
          funcionario_id: string | null
          id: string
          loja_id: string
          modulo: string
          prioridade: string
          resolvido_em: string | null
          resolvido_por: string | null
          status: string
          tipo: string
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          checkin_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          descricao: string
          entidade_id: string
          entidade_tipo: string
          funcionario_id?: string | null
          id?: string
          loja_id: string
          modulo: string
          prioridade?: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          tipo: string
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          checkin_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          descricao?: string
          entidade_id?: string
          entidade_tipo?: string
          funcionario_id?: string | null
          id?: string
          loja_id?: string
          modulo?: string
          prioridade?: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          tipo?: string
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacao_ocorrencias_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "operacao_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacao_ocorrencias_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacao_ocorrencias_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacao_ocorrencias_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "rh_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacao_ocorrencias_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      operacao_slas: {
        Row: {
          ativo: boolean
          created_at: string | null
          created_by: string | null
          exigir_assinatura: boolean
          exigir_evidencia: boolean
          id: string
          loja_id: string
          modulo: string
          nome: string
          prazo_dias: number | null
          prazo_horas: number | null
          tipo_tarefa: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          created_by?: string | null
          exigir_assinatura?: boolean
          exigir_evidencia?: boolean
          id?: string
          loja_id: string
          modulo: string
          nome: string
          prazo_dias?: number | null
          prazo_horas?: number | null
          tipo_tarefa?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          created_by?: string | null
          exigir_assinatura?: boolean
          exigir_evidencia?: boolean
          id?: string
          loja_id?: string
          modulo?: string
          nome?: string
          prazo_dias?: number | null
          prazo_horas?: number | null
          tipo_tarefa?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operacao_slas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          acrescimos: Json | null
          arquivo_nome: string | null
          categorias: Json | null
          cliente_id: string
          condicao_pagamento_id: string | null
          contrato_id: string | null
          created_at: string | null
          desconto_global: number | null
          frete_fabrica: number | null
          frete_loja: number | null
          id: string
          itens: Json | null
          loja_id: string
          montagem_fabrica: number | null
          montagem_loja: number | null
          nome: string
          ocultar_parceiro: boolean | null
          ordem_compra: string | null
          parcelas: number | null
          parcelas_datas: Json | null
          percentual_parceiro: number | null
          projetista_id: string | null
          status: string | null
          taxa_financeira: number | null
          tipo_venda: string | null
          total_pedido: number | null
          total_tabela: number | null
          updated_at: string | null
          valor_com_taxa: number | null
          valor_negociado: number | null
          valor_parcela: number | null
          vendedor_id: string | null
          xml_raw: string | null
        }
        Insert: {
          acrescimos?: Json | null
          arquivo_nome?: string | null
          categorias?: Json | null
          cliente_id: string
          condicao_pagamento_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          desconto_global?: number | null
          frete_fabrica?: number | null
          frete_loja?: number | null
          id?: string
          itens?: Json | null
          loja_id: string
          montagem_fabrica?: number | null
          montagem_loja?: number | null
          nome: string
          ocultar_parceiro?: boolean | null
          ordem_compra?: string | null
          parcelas?: number | null
          parcelas_datas?: Json | null
          percentual_parceiro?: number | null
          projetista_id?: string | null
          status?: string | null
          taxa_financeira?: number | null
          tipo_venda?: string | null
          total_pedido?: number | null
          total_tabela?: number | null
          updated_at?: string | null
          valor_com_taxa?: number | null
          valor_negociado?: number | null
          valor_parcela?: number | null
          vendedor_id?: string | null
          xml_raw?: string | null
        }
        Update: {
          acrescimos?: Json | null
          arquivo_nome?: string | null
          categorias?: Json | null
          cliente_id?: string
          condicao_pagamento_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          desconto_global?: number | null
          frete_fabrica?: number | null
          frete_loja?: number | null
          id?: string
          itens?: Json | null
          loja_id?: string
          montagem_fabrica?: number | null
          montagem_loja?: number | null
          nome?: string
          ocultar_parceiro?: boolean | null
          ordem_compra?: string | null
          parcelas?: number | null
          parcelas_datas?: Json | null
          percentual_parceiro?: number | null
          projetista_id?: string | null
          status?: string | null
          taxa_financeira?: number | null
          tipo_venda?: string | null
          total_pedido?: number | null
          total_tabela?: number | null
          updated_at?: string | null
          valor_com_taxa?: number | null
          valor_negociado?: number | null
          valor_parcela?: number | null
          vendedor_id?: string | null
          xml_raw?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_condicao_pagamento_id_fkey"
            columns: ["condicao_pagamento_id"]
            isOneToOne: false
            referencedRelation: "condicoes_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_projetista_id_fkey"
            columns: ["projetista_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_projetista_id_fkey"
            columns: ["projetista_id"]
            isOneToOne: false
            referencedRelation: "usuarios_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "usuarios_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos_promob: {
        Row: {
          acrescimos: Json | null
          arquivo_nome: string | null
          categorias: Json | null
          cliente_nome: string | null
          contrato_id: string | null
          created_at: string
          criado_por: string | null
          desconto_global: number | null
          id: string
          itens: Json | null
          loja_id: string
          ordem_compra: string | null
          status: string
          total_orcamento: number | null
          total_pedido: number | null
          total_tabela: number | null
          updated_at: string
          valor_negociado: number | null
        }
        Insert: {
          acrescimos?: Json | null
          arquivo_nome?: string | null
          categorias?: Json | null
          cliente_nome?: string | null
          contrato_id?: string | null
          created_at?: string
          criado_por?: string | null
          desconto_global?: number | null
          id?: string
          itens?: Json | null
          loja_id: string
          ordem_compra?: string | null
          status?: string
          total_orcamento?: number | null
          total_pedido?: number | null
          total_tabela?: number | null
          updated_at?: string
          valor_negociado?: number | null
        }
        Update: {
          acrescimos?: Json | null
          arquivo_nome?: string | null
          categorias?: Json | null
          cliente_nome?: string | null
          contrato_id?: string | null
          created_at?: string
          criado_por?: string | null
          desconto_global?: number | null
          id?: string
          itens?: Json | null
          loja_id?: string
          ordem_compra?: string | null
          status?: string
          total_orcamento?: number | null
          total_pedido?: number | null
          total_tabela?: number | null
          updated_at?: string
          valor_negociado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_promob_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_promob_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_promob_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
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
      papeis_comissao: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          loja_id: string
          nome: string
          percentual_padrao: number
          regra_pagamento: Database["public"]["Enums"]["papel_comissao_regra"]
          tipo: Database["public"]["Enums"]["papel_comissao_tipo"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          loja_id: string
          nome: string
          percentual_padrao?: number
          regra_pagamento?: Database["public"]["Enums"]["papel_comissao_regra"]
          tipo: Database["public"]["Enums"]["papel_comissao_tipo"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          loja_id?: string
          nome?: string
          percentual_padrao?: number
          regra_pagamento?: Database["public"]["Enums"]["papel_comissao_regra"]
          tipo?: Database["public"]["Enums"]["papel_comissao_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "papeis_comissao_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_acessos: {
        Row: {
          cliente_id: string
          codigo: string
          contrato_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          loja_id: string
          token: string
        }
        Insert: {
          cliente_id: string
          codigo: string
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          loja_id: string
          token?: string
        }
        Update: {
          cliente_id?: string
          codigo?: string
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          loja_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_acessos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_acessos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_acessos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_acessos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
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
          revogado: boolean
          token: string
          ultimo_acesso_em: string | null
        }
        Insert: {
          contrato_id: string
          created_at?: string
          expires_at?: string
          id?: string
          revogado?: boolean
          token?: string
          ultimo_acesso_em?: string | null
        }
        Update: {
          contrato_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          revogado?: boolean
          token?: string
          ultimo_acesso_em?: string | null
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
      producao_interna: {
        Row: {
          cliente_nome: string
          contrato_id: string | null
          created_at: string
          data_prevista: string | null
          descricao: string | null
          fornecedor_id: string | null
          id: string
          loja_id: string
          observacoes: string | null
          prioridade: Database["public"]["Enums"]["producao_interna_prioridade"]
          status: Database["public"]["Enums"]["producao_interna_status"]
          updated_at: string
        }
        Insert: {
          cliente_nome: string
          contrato_id?: string | null
          created_at?: string
          data_prevista?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          loja_id: string
          observacoes?: string | null
          prioridade?: Database["public"]["Enums"]["producao_interna_prioridade"]
          status?: Database["public"]["Enums"]["producao_interna_status"]
          updated_at?: string
        }
        Update: {
          cliente_nome?: string
          contrato_id?: string | null
          created_at?: string
          data_prevista?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          loja_id?: string
          observacoes?: string | null
          prioridade?: Database["public"]["Enums"]["producao_interna_prioridade"]
          status?: Database["public"]["Enums"]["producao_interna_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producao_interna_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producao_interna_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producao_interna_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producao_interna_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      producao_terceirizada: {
        Row: {
          cliente_nome: string | null
          contrato_id: string | null
          created_at: string
          data_prevista: string | null
          fornecedor_id: string | null
          id: string
          importado_em: string
          loja_id: string
          numero_pedido: string
          oc: string | null
          situacao: string | null
          status: Database["public"]["Enums"]["producao_terceirizada_status"]
          tipo: string | null
          tipo_entrada: string
          transportadora: string | null
          updated_at: string
          vinculo_status: string
        }
        Insert: {
          cliente_nome?: string | null
          contrato_id?: string | null
          created_at?: string
          data_prevista?: string | null
          fornecedor_id?: string | null
          id?: string
          importado_em?: string
          loja_id: string
          numero_pedido: string
          oc?: string | null
          situacao?: string | null
          status?: Database["public"]["Enums"]["producao_terceirizada_status"]
          tipo?: string | null
          tipo_entrada?: string
          transportadora?: string | null
          updated_at?: string
          vinculo_status?: string
        }
        Update: {
          cliente_nome?: string | null
          contrato_id?: string | null
          created_at?: string
          data_prevista?: string | null
          fornecedor_id?: string | null
          id?: string
          importado_em?: string
          loja_id?: string
          numero_pedido?: string
          oc?: string | null
          situacao?: string | null
          status?: Database["public"]["Enums"]["producao_terceirizada_status"]
          tipo?: string | null
          tipo_entrada?: string
          transportadora?: string | null
          updated_at?: string
          vinculo_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "producao_terceirizada_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producao_terceirizada_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_dre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producao_terceirizada_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producao_terceirizada_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
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
      requisicoes_compra: {
        Row: {
          ambiente_id: string | null
          codigo_rastreio: string | null
          contrato_id: string
          created_at: string
          created_by: string | null
          data_recebimento: string | null
          descricao: string | null
          destino_funcionario_id: string | null
          destino_observacoes: string | null
          destino_tipo: string | null
          id: string
          item_estoque_id: string | null
          itens_json: Json
          loja_id: string
          observacoes: string | null
          origem_conferencia_id: string | null
          previsao_entrega: string | null
          quantidade: number | null
          recebido_por: string | null
          status: string
          tipo_lancamento: string | null
          unidade: string | null
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          ambiente_id?: string | null
          codigo_rastreio?: string | null
          contrato_id: string
          created_at?: string
          created_by?: string | null
          data_recebimento?: string | null
          descricao?: string | null
          destino_funcionario_id?: string | null
          destino_observacoes?: string | null
          destino_tipo?: string | null
          id?: string
          item_estoque_id?: string | null
          itens_json?: Json
          loja_id: string
          observacoes?: string | null
          origem_conferencia_id?: string | null
          previsao_entrega?: string | null
          quantidade?: number | null
          recebido_por?: string | null
          status?: string
          tipo_lancamento?: string | null
          unidade?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          ambiente_id?: string | null
          codigo_rastreio?: string | null
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          data_recebimento?: string | null
          descricao?: string | null
          destino_funcionario_id?: string | null
          destino_observacoes?: string | null
          destino_tipo?: string | null
          id?: string
          item_estoque_id?: string | null
          itens_json?: Json
          loja_id?: string
          observacoes?: string | null
          origem_conferencia_id?: string | null
          previsao_entrega?: string | null
          quantidade?: number | null
          recebido_por?: string | null
          status?: string
          tipo_lancamento?: string | null
          unidade?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "requisicoes_compra_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "contrato_ambientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_compra_item_estoque_id_fkey"
            columns: ["item_estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
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
      reunioes: {
        Row: {
          acoes: string | null
          audio_url: string | null
          cliente_nome: string
          created_at: string
          created_by: string | null
          data_reuniao: string
          decisoes: string | null
          descricao: string | null
          duracao: string | null
          duracao_segundos: number
          erro_resumo: string | null
          id: string
          loja_id: string | null
          origem: string | null
          participantes: string | null
          proximos_passos: string | null
          resumo_ia: string | null
          status: string
          titulo: string
          transcricao: string | null
        }
        Insert: {
          acoes?: string | null
          audio_url?: string | null
          cliente_nome: string
          created_at?: string
          created_by?: string | null
          data_reuniao?: string
          decisoes?: string | null
          descricao?: string | null
          duracao?: string | null
          duracao_segundos?: number
          erro_resumo?: string | null
          id?: string
          loja_id?: string | null
          origem?: string | null
          participantes?: string | null
          proximos_passos?: string | null
          resumo_ia?: string | null
          status?: string
          titulo: string
          transcricao?: string | null
        }
        Update: {
          acoes?: string | null
          audio_url?: string | null
          cliente_nome?: string
          created_at?: string
          created_by?: string | null
          data_reuniao?: string
          decisoes?: string | null
          descricao?: string | null
          duracao?: string | null
          duracao_segundos?: number
          erro_resumo?: string | null
          id?: string
          loja_id?: string | null
          origem?: string | null
          participantes?: string | null
          proximos_passos?: string | null
          resumo_ia?: string | null
          status?: string
          titulo?: string
          transcricao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_disponibilidade_excecoes: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_fim: string
          data_inicio: string
          funcionario_id: string
          id: string
          loja_id: string
          motivo: string | null
          origem: string | null
          origem_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_fim: string
          data_inicio: string
          funcionario_id: string
          id?: string
          loja_id: string
          motivo?: string | null
          origem?: string | null
          origem_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          funcionario_id?: string
          id?: string
          loja_id?: string
          motivo?: string | null
          origem?: string | null
          origem_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "rh_disponibilidade_excecoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "rh_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_disponibilidade_excecoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_documentos: {
        Row: {
          arquivo_url: string
          created_at: string | null
          descricao: string | null
          enviado_por: string | null
          funcionario_id: string
          id: string
          loja_id: string
          tipo: string
          titulo: string
          visivel_funcionario: boolean
        }
        Insert: {
          arquivo_url: string
          created_at?: string | null
          descricao?: string | null
          enviado_por?: string | null
          funcionario_id: string
          id?: string
          loja_id: string
          tipo: string
          titulo: string
          visivel_funcionario?: boolean
        }
        Update: {
          arquivo_url?: string
          created_at?: string | null
          descricao?: string | null
          enviado_por?: string | null
          funcionario_id?: string
          id?: string
          loja_id?: string
          tipo?: string
          titulo?: string
          visivel_funcionario?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "rh_documentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "rh_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_documentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_escalas: {
        Row: {
          ativo: boolean
          created_at: string | null
          dia_semana: number
          funcionario_id: string
          hora_fim: string
          hora_inicio: string
          id: string
          intervalo_fim: string | null
          intervalo_inicio: string | null
          loja_id: string
          observacoes: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          dia_semana: number
          funcionario_id: string
          hora_fim: string
          hora_inicio: string
          id?: string
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
          loja_id: string
          observacoes?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          dia_semana?: number
          funcionario_id?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
          loja_id?: string
          observacoes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_escalas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "rh_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_escalas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_eventos: {
        Row: {
          created_at: string | null
          descricao: string | null
          entidade_id: string | null
          entidade_tipo: string | null
          funcionario_id: string
          id: string
          loja_id: string
          metadata: Json | null
          tipo: string
          titulo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          funcionario_id: string
          id?: string
          loja_id: string
          metadata?: Json | null
          tipo: string
          titulo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          funcionario_id?: string
          id?: string
          loja_id?: string
          metadata?: Json | null
          tipo?: string
          titulo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_eventos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "rh_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_eventos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_funcionarios: {
        Row: {
          cargo: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          cpf: string | null
          created_at: string | null
          data_admissao: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          id: string
          loja_id: string
          nome: string
          observacoes: string | null
          setor: string | null
          status: string
          telefone: string | null
          updated_at: string | null
          user_id: string | null
          usuario_id: string | null
        }
        Insert: {
          cargo?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf?: string | null
          created_at?: string | null
          data_admissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          loja_id: string
          nome: string
          observacoes?: string | null
          setor?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          cargo?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf?: string | null
          created_at?: string | null
          data_admissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          loja_id?: string
          nome?: string
          observacoes?: string | null
          setor?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_funcionarios_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_funcionarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_funcionarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_solicitacoes: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          anexo_url: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          funcionario_id: string
          id: string
          loja_id: string
          motivo: string | null
          observacoes: string | null
          resposta: string | null
          status: string
          tipo: string
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          anexo_url?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          funcionario_id: string
          id?: string
          loja_id: string
          motivo?: string | null
          observacoes?: string | null
          resposta?: string | null
          status?: string
          tipo: string
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          anexo_url?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          funcionario_id?: string
          id?: string
          loja_id?: string
          motivo?: string | null
          observacoes?: string | null
          resposta?: string | null
          status?: string
          tipo?: string
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_solicitacoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "rh_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_solicitacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_desconto: {
        Row: {
          created_at: string
          id: string
          orcamento_id: string | null
          percentual_solicitado: number | null
          status: Database["public"]["Enums"]["status_solicitacao"]
          updated_at: string
          vendedor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          orcamento_id?: string | null
          percentual_solicitado?: number | null
          status?: Database["public"]["Enums"]["status_solicitacao"]
          updated_at?: string
          vendedor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          orcamento_id?: string | null
          percentual_solicitado?: number | null
          status?: Database["public"]["Enums"]["status_solicitacao"]
          updated_at?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_desconto_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      tecnicos_montadores: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          funcoes: string[]
          id: string
          loja_id: string
          nome: string
          percentual_padrao: number
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          funcoes?: string[]
          id?: string
          loja_id: string
          nome: string
          percentual_padrao?: number
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          funcoes?: string[]
          id?: string
          loja_id?: string
          nome?: string
          percentual_padrao?: number
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "montadores_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
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
      transferencias_estoque: {
        Row: {
          codigo: string | null
          created_at: string
          created_by: string | null
          data_envio: string | null
          data_recebimento: string | null
          id: string
          loja_destino_id: string
          loja_origem_id: string
          motorista_nome: string | null
          observacoes: string | null
          recebido_por: string | null
          status: string
          valor_total: number
          veiculo_placa: string | null
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          data_envio?: string | null
          data_recebimento?: string | null
          id?: string
          loja_destino_id: string
          loja_origem_id: string
          motorista_nome?: string | null
          observacoes?: string | null
          recebido_por?: string | null
          status?: string
          valor_total?: number
          veiculo_placa?: string | null
        }
        Update: {
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          data_envio?: string | null
          data_recebimento?: string | null
          id?: string
          loja_destino_id?: string
          loja_origem_id?: string
          motorista_nome?: string | null
          observacoes?: string | null
          recebido_por?: string | null
          status?: string
          valor_total?: number
          veiculo_placa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_estoque_loja_destino_id_fkey"
            columns: ["loja_destino_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_estoque_loja_origem_id_fkey"
            columns: ["loja_origem_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias_itens: {
        Row: {
          conferido_destino: boolean
          conferido_origem: boolean
          custo_unitario: number
          descricao: string
          id: string
          item_destino_id: string | null
          item_origem_id: string
          quantidade: number
          transferencia_id: string
          unidade: string | null
        }
        Insert: {
          conferido_destino?: boolean
          conferido_origem?: boolean
          custo_unitario?: number
          descricao: string
          id?: string
          item_destino_id?: string | null
          item_origem_id: string
          quantidade: number
          transferencia_id: string
          unidade?: string | null
        }
        Update: {
          conferido_destino?: boolean
          conferido_origem?: boolean
          custo_unitario?: number
          descricao?: string
          id?: string
          item_destino_id?: string | null
          item_origem_id?: string
          quantidade?: number
          transferencia_id?: string
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_itens_item_destino_id_fkey"
            columns: ["item_destino_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_itens_item_origem_id_fkey"
            columns: ["item_origem_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_itens_transferencia_id_fkey"
            columns: ["transferencia_id"]
            isOneToOne: false
            referencedRelation: "transferencias_estoque"
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
      usuario_lojas: {
        Row: {
          created_at: string
          id: string
          loja_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          loja_id: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          loja_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_lojas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_lojas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_lojas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          comissao_percentual: number | null
          created_at: string
          email: string | null
          funcoes: string[] | null
          funcoes_app_habilitadas: string[] | null
          id: string
          loja_id: string | null
          nome: string
          papel_comissao_id: string | null
          updated_at: string
        }
        Insert: {
          comissao_percentual?: number | null
          created_at?: string
          email?: string | null
          funcoes?: string[] | null
          funcoes_app_habilitadas?: string[] | null
          id: string
          loja_id?: string | null
          nome: string
          papel_comissao_id?: string | null
          updated_at?: string
        }
        Update: {
          comissao_percentual?: number | null
          created_at?: string
          email?: string | null
          funcoes?: string[] | null
          funcoes_app_habilitadas?: string[] | null
          id?: string
          loja_id?: string | null
          nome?: string
          papel_comissao_id?: string | null
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
          {
            foreignKeyName: "usuarios_papel_comissao_id_fkey"
            columns: ["papel_comissao_id"]
            isOneToOne: false
            referencedRelation: "papeis_comissao"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_lojas: {
        Row: {
          acesso_total: boolean
          cidades_atendimento: string[] | null
          created_at: string
          id: string
          is_principal: boolean
          loja_id: string
          role: string
          user_id: string
        }
        Insert: {
          acesso_total?: boolean
          cidades_atendimento?: string[] | null
          created_at?: string
          id?: string
          is_principal?: boolean
          loja_id: string
          role: string
          user_id: string
        }
        Update: {
          acesso_total?: boolean
          cidades_atendimento?: string[] | null
          created_at?: string
          id?: string
          is_principal?: boolean
          loja_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_lojas_loja_id_fkey"
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
      v_communication_metrics: {
        Row: {
          canal: string | null
          entregues: number | null
          enviados: number | null
          falhas: number | null
          loja_id: string | null
          opt_outs: number | null
          pendentes: number | null
          tempo_medio_entrega: number | null
          tempo_medio_processamento: number | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_outbox_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_communication_settings: {
        Row: {
          ativo: boolean | null
          canal: string | null
          configuracao_masked: Json | null
          created_at: string | null
          dry_run: boolean | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string | null
          last_webhook_at: string | null
          limite_diario: number | null
          loja_id: string | null
          provider: string | null
          remetente: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          canal?: string | null
          configuracao_masked?: never
          created_at?: string | null
          dry_run?: boolean | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string | null
          last_webhook_at?: string | null
          limite_diario?: number | null
          loja_id?: string | null
          provider?: string | null
          remetente?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          canal?: string | null
          configuracao_masked?: never
          created_at?: string | null
          dry_run?: boolean | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string | null
          last_webhook_at?: string | null
          limite_diario?: number | null
          loja_id?: string | null
          provider?: string | null
          remetente?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_settings_loja_id_fkey"
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
      vw_fluxo_caixa: {
        Row: {
          categoria: string | null
          contrato_id: string | null
          created_at: string | null
          data: string | null
          descricao: string | null
          id: string | null
          loja_id: string | null
          status: string | null
          tipo: string | null
          valor: number | null
        }
        Relationships: []
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
      aprovar_conferencia_ambiente: {
        Args: { _ambiente_id: string }
        Returns: Json
      }
      avancar_contrato: {
        Args: { p_contrato_id: string; p_usuario_id?: string }
        Returns: Json
      }
      baixar_estoque_requisicao: {
        Args: {
          p_item_id_ou_idx: string
          p_requisicao_id: string
          p_reserva_id: string
          p_usuario_id: string
        }
        Returns: Json
      }
      calcular_disponibilidade_funcionario: {
        Args: {
          p_data_fim: string
          p_data_inicio: string
          p_funcionario_id: string
        }
        Returns: Json
      }
      cancelar_reserva_estoque_requisicao: {
        Args: {
          p_item_id_ou_idx: string
          p_requisicao_id: string
          p_reserva_id: string
          p_usuario_id: string
        }
        Returns: Json
      }
      check_cliente_opt_in: {
        Args: { p_canal: string; p_cliente_id: string; p_loja_id: string }
        Returns: boolean
      }
      check_communication_anomalies: { Args: never; Returns: undefined }
      check_communication_quota: {
        Args: { p_canal: string; p_loja_id: string }
        Returns: boolean
      }
      confirmar_pagamento_comissao:
        | {
            Args: {
              p_comissao_id: string
              p_data_pagamento: string
              p_forma_pagamento?: string
            }
            Returns: undefined
          }
        | {
            Args: { p_comissao_id: string; p_usuario_id: string }
            Returns: undefined
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
      estornar_lancamento: {
        Args: { p_id: string; p_tipo: string }
        Returns: undefined
      }
      gerar_comissoes_ambiente: {
        Args: { _ambiente_id: string; _gatilho: string; _tipos_papel: string[] }
        Returns: undefined
      }
      gerar_parcelas_contrato: {
        Args: {
          p_contrato_id: string
          p_loja_id: string
          p_lote_id?: string
          p_parcelas: Json
        }
        Returns: undefined
      }
      get_acompanhamento_publico: {
        Args: { p_serial: string }
        Returns: Json[]
      }
      has_role: {
        Args: {
          _loja_id?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_on_loja: {
        Args: {
          p_loja_id: string
          p_required_roles: Database["public"]["Enums"]["app_role"][]
          p_user_id: string
        }
        Returns: boolean
      }
      has_valid_portal_token: {
        Args: { _contrato_id: string }
        Returns: boolean
      }
      is_rh_admin_or_manager: {
        Args: { target_loja_id: string }
        Returns: boolean
      }
      is_store_admin_or_manager: {
        Args: { target_loja_id: string }
        Returns: boolean
      }
      outros_custos_sync_dre: {
        Args: { _contrato_id: string }
        Returns: undefined
      }
      portal_assinar_contrato:
        | {
            Args: {
              _assinatura_imagem_url?: string
              _ip: string
              _nome: string
              _token: string
              _user_agent: string
            }
            Returns: Json
          }
        | {
            Args: {
              _assinatura_imagem_url: string
              _data_assinatura: string
              _hash: string
              _ip: string
              _nome: string
              _token: string
              _user_agent: string
            }
            Returns: Json
          }
        | {
            Args: {
              _ip: string
              _nome: string
              _token: string
              _user_agent?: string
            }
            Returns: Json
          }
      portal_cliente_obter_pesquisas: {
        Args: never
        Returns: {
          classificacao: string | null
          cliente_id: string
          comentario: string | null
          contrato_id: string
          created_at: string | null
          enviada_em: string | null
          enviada_por: string | null
          etapa: string
          id: string
          loja_id: string
          motivos: string[] | null
          nota: number | null
          portal_token_id: string | null
          respondida_em: string | null
          status: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "cliente_pesquisas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      portal_cliente_responder_pesquisa: {
        Args: {
          p_comentario?: string
          p_motivos?: string[]
          p_nota: number
          p_pesquisa_id: string
        }
        Returns: Json
      }
      portal_registrar_nps: {
        Args: { _comentario?: string; _nota: number; _token: string }
        Returns: Json
      }
      portal_token_cliente_id: { Args: never; Returns: string }
      portal_token_contrato_id: { Args: never; Returns: string }
      portal_validar_codigo: { Args: { _codigo: string }; Returns: Json }
      realtime_canal_contrato_permitido: {
        Args: { _topic: string }
        Returns: boolean
      }
      realtime_canal_user_permitido: {
        Args: { _topic: string }
        Returns: boolean
      }
      reservar_estoque_requisicao: {
        Args: {
          p_contrato_id: string
          p_item_estoque_id: string
          p_item_id_ou_idx: string
          p_loja_id: string
          p_quantidade: number
          p_requisicao_id: string
          p_usuario_id: string
        }
        Returns: Json
      }
      sync_expedicoes_almoxarifado: { Args: never; Returns: undefined }
      user_is_matriz: { Args: { p_user: string }; Returns: boolean }
      user_lojas_ids: { Args: { p_user: string }; Returns: string[] }
      validar_acesso_acompanhamento: {
        Args: { p_serial: string }
        Returns: Json
      }
    }
    Enums: {
      agendamento_status: "agendado" | "em_execucao" | "concluido" | "cancelado"
      ambiente_status_montagem:
        | "pendente"
        | "agendado"
        | "concluido"
        | "pago"
        | "liberado_conferencia"
      app_role:
        | "admin"
        | "vendedor"
        | "tecnico"
        | "montador"
        | "gerente"
        | "franqueador"
        | "medidor"
        | "conferente"
        | "admin_master"
        | "comprador"
        | "almoxarife"
        | "logistico"
        | "financeiro"
        | "pos_venda"
        | "rh"
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
        | "cancelado"
      entrega_status: "pendente" | "confirmada"
      entrega_status_visual:
        | "a_agendar"
        | "agendado"
        | "em_rota"
        | "entregue"
        | "reagendado"
      entrega_turno: "manha" | "tarde" | "dia_todo"
      lead_status:
        | "novo"
        | "atendimento"
        | "visita"
        | "proposta"
        | "convertido"
        | "perdido"
      op_status: "aguardando" | "em_corte" | "em_montagem" | "concluido"
      papel_comissao_regra:
        | "contrato_assinado"
        | "por_ambiente_tecnico"
        | "por_ambiente_montagem"
      papel_comissao_tipo:
        | "vendedor"
        | "projetista"
        | "vendedor_projetista"
        | "gerente_comercial"
        | "gerente_operacional"
        | "gerente_montagem"
      ponto_tipo: "entrada" | "saida"
      producao_interna_prioridade: "normal" | "urgente"
      producao_interna_status:
        | "a_fazer"
        | "em_andamento"
        | "aguardando_material"
        | "concluido"
      producao_terceirizada_status:
        | "aguardando_fabricacao"
        | "em_producao"
        | "pronto_retirada"
        | "atrasado"
      status_solicitacao: "pendente" | "aprovado" | "reprovado"
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
      ambiente_status_montagem: [
        "pendente",
        "agendado",
        "concluido",
        "pago",
        "liberado_conferencia",
      ],
      app_role: [
        "admin",
        "vendedor",
        "tecnico",
        "montador",
        "gerente",
        "franqueador",
        "medidor",
        "conferente",
        "admin_master",
        "comprador",
        "almoxarife",
        "logistico",
        "financeiro",
        "pos_venda",
        "rh",
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
        "cancelado",
      ],
      entrega_status: ["pendente", "confirmada"],
      entrega_status_visual: [
        "a_agendar",
        "agendado",
        "em_rota",
        "entregue",
        "reagendado",
      ],
      entrega_turno: ["manha", "tarde", "dia_todo"],
      lead_status: [
        "novo",
        "atendimento",
        "visita",
        "proposta",
        "convertido",
        "perdido",
      ],
      op_status: ["aguardando", "em_corte", "em_montagem", "concluido"],
      papel_comissao_regra: [
        "contrato_assinado",
        "por_ambiente_tecnico",
        "por_ambiente_montagem",
      ],
      papel_comissao_tipo: [
        "vendedor",
        "projetista",
        "vendedor_projetista",
        "gerente_comercial",
        "gerente_operacional",
        "gerente_montagem",
      ],
      ponto_tipo: ["entrada", "saida"],
      producao_interna_prioridade: ["normal", "urgente"],
      producao_interna_status: [
        "a_fazer",
        "em_andamento",
        "aguardando_material",
        "concluido",
      ],
      producao_terceirizada_status: [
        "aguardando_fabricacao",
        "em_producao",
        "pronto_retirada",
        "atrasado",
      ],
      status_solicitacao: ["pendente", "aprovado", "reprovado"],
      transacao_status: ["pendente", "pago", "cancelado"],
      transacao_tipo: ["receita", "despesa"],
    },
  },
} as const
