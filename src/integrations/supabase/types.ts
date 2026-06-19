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
      app_admins: {
        Row: {
          created_at: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_time: string
          barber_id: string
          barbershop_id: string
          client_attended: boolean | null
          client_id: string
          commission_amount: number | null
          confirmed_via_whatsapp: boolean | null
          created_at: string | null
          ends_at: string | null
          finished_at: string | null
          id: string
          price: number | null
          price_charged: number | null
          service_id: string
          starts_at: string | null
          status: string | null
          whatsapp_sent: boolean | null
        }
        Insert: {
          appointment_time: string
          barber_id: string
          barbershop_id: string
          client_attended?: boolean | null
          client_id: string
          commission_amount?: number | null
          confirmed_via_whatsapp?: boolean | null
          created_at?: string | null
          ends_at?: string | null
          finished_at?: string | null
          id?: string
          price?: number | null
          price_charged?: number | null
          service_id: string
          starts_at?: string | null
          status?: string | null
          whatsapp_sent?: boolean | null
        }
        Update: {
          appointment_time?: string
          barber_id?: string
          barbershop_id?: string
          client_attended?: boolean | null
          client_id?: string
          commission_amount?: number | null
          confirmed_via_whatsapp?: boolean | null
          created_at?: string | null
          ends_at?: string | null
          finished_at?: string | null
          id?: string
          price?: number | null
          price_charged?: number | null
          service_id?: string
          starts_at?: string | null
          status?: string | null
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          active: boolean | null
          barbershop_id: string
          bio: string | null
          commission_pct: number | null
          created_at: string | null
          id: string
          name: string
          photo_url: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          barbershop_id: string
          bio?: string | null
          commission_pct?: number | null
          created_at?: string | null
          id?: string
          name: string
          photo_url?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          barbershop_id?: string
          bio?: string | null
          commission_pct?: number | null
          created_at?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barbers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershops: {
        Row: {
          address: string
          blocked: boolean | null
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          monthly_price: number | null
          name: string
          paid_until: string | null
          payment_due_date: string | null
          payment_status: string | null
          phone: string | null
          slug: string | null
          subscription_status: string | null
          trial_ends_at: string | null
        }
        Insert: {
          address: string
          blocked?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          monthly_price?: number | null
          name: string
          paid_until?: string | null
          payment_due_date?: string | null
          payment_status?: string | null
          phone?: string | null
          slug?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          address?: string
          blocked?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          monthly_price?: number | null
          name?: string
          paid_until?: string | null
          payment_due_date?: string | null
          payment_status?: string | null
          phone?: string | null
          slug?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbershops_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      service_catalog: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          icon_key: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          icon_key?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          icon_key?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_catalog_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          barbershop_id: string
          catalog_service_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          name: string
          price: number
        }
        Insert: {
          barbershop_id: string
          catalog_service_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          name: string
          price: number
        }
        Update: {
          barbershop_id?: string
          catalog_service_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_catalog_service_id_fkey"
            columns: ["catalog_service_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          barbershop_id: string | null
          created_at: string | null
          id: string
          name: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          barbershop_id?: string | null
          created_at?: string | null
          id: string
          name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          barbershop_id?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      owner_appointments_view: {
        Row: {
          barber_name: string | null
          barbershop_id: string | null
          client_attended: boolean | null
          client_name: string | null
          client_phone: string | null
          id: string | null
          price_charged: number | null
          service_name: string | null
          service_price: number | null
          starts_at: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_complete_past_appointments: { Args: never; Returns: undefined }
      barbershop_is_payment_blocked: {
        Args: { p_barbershop_id: string }
        Returns: boolean
      }
      cancel_my_appointment: {
        Args: { p_appointment_id: string }
        Returns: Json
      }
      create_barber:
        | {
            Args: {
              p_avatar_url: string
              p_barbershop_id: string
              p_bio: string
              p_commission_pct: number
              p_email: string
              p_name: string
              p_phone: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_avatar_url: string
              p_barbershop_id: string
              p_bio: string
              p_commission_pct: number
              p_email: string
              p_name: string
              p_password: string
              p_phone: string
            }
            Returns: Json
          }
      create_barbershop_with_owner: {
        Args: {
          barbershop_address: string
          barbershop_name: string
          barbershop_phone: string
          owner_email: string
          owner_name: string
          owner_password: string
          owner_phone: string
        }
        Returns: Json
      }
      delete_barber: { Args: { p_barber_id: string }; Returns: Json }
      delete_barber_safe: { Args: { p_barber_id: string }; Returns: Json }
      delete_barbershop_safe: {
        Args: { p_barbershop_id: string }
        Returns: Json
      }
      ensure_owner_is_barber: {
        Args: { p_barbershop_id: string; p_owner_user_id: string }
        Returns: Json
      }
      finish_appointment_by_owner: {
        Args: { p_appointment_id: string; p_attended: boolean }
        Returns: Json
      }
      finish_barber_appointment: {
        Args: { p_appointment_id: string; p_attended: boolean }
        Returns: Json
      }
      get_auth_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_available_barbershops: {
        Args: never
        Returns: {
          address: string
          blocked: boolean
          category_id: string
          category_name: string
          category_slug: string
          created_at: string
          description: string
          id: string
          latitude: number
          logo_url: string
          longitude: number
          name: string
          phone: string
          subscription_status: string
        }[]
      }
      get_barber_dashboard: { Args: { p_day?: string }; Returns: Json }
      get_barbershops_by_category_service: {
        Args: { p_catalog_service_id?: string; p_category_slug: string }
        Returns: {
          address: string
          blocked: boolean
          category_id: string
          category_name: string
          category_slug: string
          created_at: string
          description: string
          id: string
          latitude: number
          logo_url: string
          longitude: number
          name: string
          phone: string
          subscription_status: string
        }[]
      }
      get_financial_report: {
        Args: {
          p_barbershop_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: Json
      }
      get_owner_dashboard_appointments: {
        Args: { p_day: string }
        Returns: {
          barber_name: string
          client_attended: boolean
          client_name: string
          client_phone: string
          id: string
          price_charged: number
          service_name: string
          starts_at: string
          status: string
        }[]
      }
      get_owner_financial_report: {
        Args: {
          p_barbershop_id?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: Json
      }
      get_superadmin_barbershops: {
        Args: never
        Returns: {
          address: string
          blocked: boolean
          description: string
          id: string
          logo_url: string
          monthly_price: number
          name: string
          owner_name: string
          owner_phone: string
          paid_until: string
          phone: string
          subscription_status: string
          trial_ends_at: string
        }[]
      }
      mark_barbershop_paid: {
        Args: {
          p_amount: number
          p_barbershop_id: string
          p_paid_until: string
          p_provider?: string
          p_reference?: string
        }
        Returns: Json
      }
      normalize_service_slug: { Args: { p_name: string }; Returns: string }
      refresh_barbershop_payment_status: {
        Args: { p_barbershop_id: string }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
      upsert_catalog_service: {
        Args: { p_barbershop_id: string; p_name: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
