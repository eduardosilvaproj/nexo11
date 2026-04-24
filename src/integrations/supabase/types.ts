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
      ambiente_itens_extras: {
        Row: {
          ambiente_id: string
          contrato_id: string
          created_at: string
          descricao: string
          id: string
          loja_id: string
          observacoes: string | null
          origem: string
          quantidade: number
          status_compra: string
          unidade: string | null
          updated_at: string
        }
        Insert: {
          ambiente_id: string
          contrato_id: string
          created_at?: string
          descricao: string
          id?: string
          loja_id: string
          observacoes?: string | null
          origem?: string
          quantidade?: number
          status_compra?: string
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          ambiente_id?: string
          contrato_id?: string
          created_at?: string
          descricao?: string
          id?: string
          loja_id?: string
          observacoes?: string | null
          origem?: string
          quantidade?: number
          status_compra?: string
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
      contrato_ambientes: {
        Row: {
          aprovacao_solicitada_em: string | null
          aprovacao_solicitada_por: string | null
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
          itens_conferencia_json: Json
          itens_original_json: Json
          loja_id: string
          medidor_id: string | null
          montador_id: string | null
          nome: string
          observacoes: string | null
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
          itens_conferencia_json?: Json
          itens_original_json?: Json
          loja_id: string
          medidor_id?: string | null
          montador_id?: string | null
          nome: string
          observacoes?: string | null
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
          itens_conferencia_json?: Json
          itens_original_json?: Json
          loja_id?: string
          medidor_id?: string | null
          montador_id?: string | null
          nome?: string
          observacoes?: string | null
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
          assinatura_hash: string | null
          assinatura_ip: string | null
          assinatura_nome: string | null
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
          projetista_id: string | null
          status: Database["public"]["Enums"]["contrato_status"]
          sub_etapa_tecnico: string
          trava_medicao_ok: boolean
          trava_producao_ok: boolean
          trava_tecnico_ok: boolean
          updated_at: string
          valor_venda: number
          vendedor_id: string | null
        }
        Insert: {
          assinado?: boolean
          assinatura_hash?: string | null
          assinatura_ip?: string | null
          assinatura_nome?: string | null
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
          projetista_id?: string | null
          status?: Database["public"]["Enums"]["contrato_status"]
          sub_etapa_tecnico?: string
          trava_medicao_ok?: boolean
          trava_producao_ok?: boolean
          trava_tecnico_ok?: boolean
          updated_at?: string
          valor_venda?: number
          vendedor_id?: string | null
        }
        Update: {
          assinado?: boolean
          assinatura_hash?: string | null
          assinatura_ip?: string | null
          assinatura_nome?: string | null
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
          projetista_id?: string | null
          status?: Database["public"]["Enums"]["contrato_status"]
          sub_etapa_tecnico?: string
          trava_medicao_ok?: boolean
          trava_producao_ok?: boolean
          trava_tecnico_ok?: boolean
          updated_at?: string
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
      lojas: {
        Row: {
          cidade: string | null
          cnpj: string | null
          contrato_modelo: string | null
          created_at: string
          email: string | null
          endereco: string | null
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
          contrato_modelo?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
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
          contrato_modelo?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
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
          contrato_id: string
          created_at: string
          created_by: string | null
          id: string
          itens_json: Json
          loja_id: string
          observacoes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ambiente_id?: string | null
          contrato_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          itens_json?: Json
          loja_id: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ambiente_id?: string | null
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          itens_json?: Json
          loja_id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisicoes_compra_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "contrato_ambientes"
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
          comissao_percentual: number | null
          created_at: string
          email: string | null
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
      aprovar_conferencia_ambiente: {
        Args: { _ambiente_id: string }
        Returns: Json
      }
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
      gerar_comissoes_ambiente: {
        Args: { _ambiente_id: string; _gatilho: string; _tipos_papel: string[] }
        Returns: undefined
      }
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
      portal_assinar_contrato:
        | { Args: { _token: string }; Returns: Json }
        | {
            Args: {
              _hash_frontend?: string
              _ip: string
              _nome: string
              _token: string
            }
            Returns: Json
          }
      portal_registrar_nps: {
        Args: { _comentario?: string; _nota: number; _token: string }
        Returns: Json
      }
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
    }
    Enums: {
      agendamento_status: "agendado" | "em_execucao" | "concluido" | "cancelado"
      ambiente_status_montagem: "pendente" | "agendado" | "concluido" | "pago"
      app_role:
        | "admin"
        | "vendedor"
        | "tecnico"
        | "montador"
        | "gerente"
        | "franqueador"
        | "medidor"
        | "conferente"
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
      ambiente_status_montagem: ["pendente", "agendado", "concluido", "pago"],
      app_role: [
        "admin",
        "vendedor",
        "tecnico",
        "montador",
        "gerente",
        "franqueador",
        "medidor",
        "conferente",
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
