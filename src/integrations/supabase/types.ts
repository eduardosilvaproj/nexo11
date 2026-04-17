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
          created_at: string
          franqueado_id: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          franqueado_id?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          franqueado_id?: string | null
          id?: string
          nome?: string
          updated_at?: string
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
          id: string
          itens_json: Json
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
          id?: string
          itens_json?: Json
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
          id?: string
          itens_json?: Json
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
      [_ in never]: never
    }
    Functions: {
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
      outros_custos_sync_dre: {
        Args: { _contrato_id: string }
        Returns: undefined
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
    },
  },
} as const
