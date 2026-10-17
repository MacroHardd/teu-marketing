
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "clientes": {
                  Row: {
                    "aceito_em": string,"ativo": boolean,"desativado_em": string | null,"email": string,"id": string,"parceiro_id": string,"ultimo_acesso_em": string | null,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aceito_em"?: string,"ativo"?: boolean,"desativado_em"?: string | null,"email": string,"id"?: string,"parceiro_id": string,"ultimo_acesso_em"?: string | null,"usuario_id": string
                  }
                  Update: {
                    "aceito_em"?: string,"ativo"?: boolean,"desativado_em"?: string | null,"email"?: string,"id"?: string,"parceiro_id"?: string,"ultimo_acesso_em"?: string | null,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clientes_parceiro_id_fkey"
      columns: ["parceiro_id"]
isOneToOne: false
      referencedRelation: "parceiros"
      referencedColumns: ["id"]
    }
                  ]
                },"convites": {
                  Row: {
                    "aceito_em": string | null,"cliente_id": string | null,"criado_em": string,"email": string,"enviado_em": string | null,"expira_em": string,"id": string,"lote_id": string | null,"origem": string,"parceiro_id": string,"status": Database["public"]['Enums']["convite_status"],"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aceito_em"?: string | null,"cliente_id"?: string | null,"criado_em"?: string,"email": string,"enviado_em"?: string | null,"expira_em"?: string,"id"?: string,"lote_id"?: string | null,"origem"?: string,"parceiro_id": string,"status"?: Database["public"]['Enums']["convite_status"],"token_hash": string
                  }
                  Update: {
                    "aceito_em"?: string | null,"cliente_id"?: string | null,"criado_em"?: string,"email"?: string,"enviado_em"?: string | null,"expira_em"?: string,"id"?: string,"lote_id"?: string | null,"origem"?: string,"parceiro_id"?: string,"status"?: Database["public"]['Enums']["convite_status"],"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "convites_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "convites_parceiro_id_fkey"
      columns: ["parceiro_id"]
isOneToOne: false
      referencedRelation: "parceiros"
      referencedColumns: ["id"]
    }
                  ]
                },"eventos": {
                  Row: {
                    "cliente_id": string | null,"id": string,"nome": string,"ocorrido_em": string,"parceiro_id": string,"post_id": string | null,"props": NonNullable<Json>,"sessao_id": string | null,"versao_app": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cliente_id"?: string | null,"id"?: string,"nome": string,"ocorrido_em"?: string,"parceiro_id": string,"post_id"?: string | null,"props"?: NonNullable<Json>,"sessao_id"?: string | null,"versao_app"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string | null,"id"?: string,"nome"?: string,"ocorrido_em"?: string,"parceiro_id"?: string,"post_id"?: string | null,"props"?: NonNullable<Json>,"sessao_id"?: string | null,"versao_app"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "eventos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "eventos_parceiro_id_fkey"
      columns: ["parceiro_id"]
isOneToOne: false
      referencedRelation: "parceiros"
      referencedColumns: ["id"]
    }
                  ]
                },"parceiros": {
                  Row: {
                    "assentos": number,"criado_em": string,"email_responsavel": string,"id": string,"nome": string,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assentos": number,"criado_em"?: string,"email_responsavel": string,"id"?: string,"nome": string,"usuario_id"?: string | null
                  }
                  Update: {
                    "assentos"?: number,"criado_em"?: string,"email_responsavel"?: string,"id"?: string,"nome"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"perfis_marca": {
                  Row: {
                    "arroba": string,"atualizado_em": string,"cliente_id": string,"cor": string | null,"logo_meta": Json | null,"logo_path": string | null,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "arroba"?: string,"atualizado_em"?: string,"cliente_id": string,"cor"?: string | null,"logo_meta"?: Json | null,"logo_path"?: string | null,"nome"?: string
                  }
                  Update: {
                    "arroba"?: string,"atualizado_em"?: string,"cliente_id"?: string,"cor"?: string | null,"logo_meta"?: Json | null,"logo_path"?: string | null,"nome"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "perfis_marca_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: true
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "ajustes": NonNullable<Json>,"atualizado_em": string,"cliente_id": string,"criado_em": string,"estilo": string | null,"exportado_em": string | null,"foto_meta": Json | null,"foto_path": string | null,"id": string,"legenda": string,"status": Database["public"]['Enums']["post_status"],"texto": string,"variacao": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ajustes"?: NonNullable<Json>,"atualizado_em"?: string,"cliente_id": string,"criado_em"?: string,"estilo"?: string | null,"exportado_em"?: string | null,"foto_meta"?: Json | null,"foto_path"?: string | null,"id"?: string,"legenda"?: string,"status"?: Database["public"]['Enums']["post_status"],"texto"?: string,"variacao"?: string | null
                  }
                  Update: {
                    "ajustes"?: NonNullable<Json>,"atualizado_em"?: string,"cliente_id"?: string,"criado_em"?: string,"estilo"?: string | null,"exportado_em"?: string | null,"foto_meta"?: Json | null,"foto_path"?: string | null,"id"?: string,"legenda"?: string,"status"?: Database["public"]['Enums']["post_status"],"texto"?: string,"variacao"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "aceitar_convite":
{ Args: { "p_token_hash": string,"p_usuario_id": string }; Returns: Json
                           },
"meu_acesso":
{ Args: Record<PropertyKey, never>; Returns: Json
                           }
          }
          Enums: {
            "convite_status": "agendado"|"enviado"|"aceito"|"expirado"|"cancelado","post_status": "rascunho"|"exportado"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "convite_status": ["agendado", "enviado", "aceito", "expirado", "cancelado"],"post_status": ["rascunho", "exportado"]
          }
        }
} as const
