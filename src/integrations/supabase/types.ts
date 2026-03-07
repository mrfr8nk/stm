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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academic_sessions: {
        Row: {
          academic_year: number
          created_at: string
          end_date: string
          id: string
          is_current: boolean
          start_date: string
          term: Database["public"]["Enums"]["school_term"]
        }
        Insert: {
          academic_year: number
          created_at?: string
          end_date: string
          id?: string
          is_current?: boolean
          start_date: string
          term: Database["public"]["Enums"]["school_term"]
        }
        Update: {
          academic_year?: number
          created_at?: string
          end_date?: string
          id?: string
          is_current?: boolean
          start_date?: string
          term?: Database["public"]["Enums"]["school_term"]
        }
        Relationships: []
      }
      access_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          expires_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          used: boolean
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          used?: boolean
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          used?: boolean
          used_by?: string | null
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          is_pinned: boolean | null
          target_class_id: string | null
          target_role: Database["public"]["Enums"]["app_role"] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_pinned?: boolean | null
          target_class_id?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_pinned?: boolean | null
          target_class_id?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_target_class_id_fkey"
            columns: ["target_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          form: number
          full_name: string
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          level: Database["public"]["Enums"]["academic_level"]
          notes: string | null
          phone: string | null
          previous_school: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          form?: number
          full_name: string
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          level?: Database["public"]["Enums"]["academic_level"]
          notes?: string | null
          phone?: string | null
          previous_school?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          form?: number
          full_name?: string
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          level?: Database["public"]["Enums"]["academic_level"]
          notes?: string | null
          phone?: string | null
          previous_school?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          marked_by: string
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date?: string
          id?: string
          marked_by: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: number
          class_teacher_id: string | null
          created_at: string
          deleted_at: string | null
          form: number
          id: string
          level: Database["public"]["Enums"]["academic_level"]
          name: string
          stream: string | null
        }
        Insert: {
          academic_year?: number
          class_teacher_id?: string | null
          created_at?: string
          deleted_at?: string | null
          form: number
          id?: string
          level: Database["public"]["Enums"]["academic_level"]
          name: string
          stream?: string | null
        }
        Update: {
          academic_year?: number
          class_teacher_id?: string | null
          created_at?: string
          deleted_at?: string | null
          form?: number
          id?: string
          level?: Database["public"]["Enums"]["academic_level"]
          name?: string
          stream?: string | null
        }
        Relationships: []
      }
      fee_records: {
        Row: {
          academic_year: number
          amount_due: number
          amount_paid: number
          created_at: string
          currency: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          receipt_number: string | null
          student_id: string
          term: Database["public"]["Enums"]["school_term"]
          zig_amount: number | null
        }
        Insert: {
          academic_year?: number
          amount_due: number
          amount_paid?: number
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          student_id: string
          term: Database["public"]["Enums"]["school_term"]
          zig_amount?: number | null
        }
        Update: {
          academic_year?: number
          amount_due?: number
          amount_paid?: number
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          student_id?: string
          term?: Database["public"]["Enums"]["school_term"]
          zig_amount?: number | null
        }
        Relationships: []
      }
      grades: {
        Row: {
          academic_year: number
          class_id: string
          comment: string | null
          created_at: string
          deleted_at: string | null
          grade_letter: string | null
          id: string
          mark: number
          student_id: string
          subject_id: string
          teacher_id: string
          term: Database["public"]["Enums"]["school_term"]
          updated_at: string
        }
        Insert: {
          academic_year?: number
          class_id: string
          comment?: string | null
          created_at?: string
          deleted_at?: string | null
          grade_letter?: string | null
          id?: string
          mark: number
          student_id: string
          subject_id: string
          teacher_id: string
          term: Database["public"]["Enums"]["school_term"]
          updated_at?: string
        }
        Update: {
          academic_year?: number
          class_id?: string
          comment?: string | null
          created_at?: string
          deleted_at?: string | null
          grade_letter?: string | null
          id?: string
          mark?: number
          student_id?: string
          subject_id?: string
          teacher_id?: string
          term?: Database["public"]["Enums"]["school_term"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_scales: {
        Row: {
          description: string | null
          grade_letter: string
          id: string
          level: Database["public"]["Enums"]["academic_level"]
          max_mark: number
          min_mark: number
        }
        Insert: {
          description?: string | null
          grade_letter: string
          id?: string
          level: Database["public"]["Enums"]["academic_level"]
          max_mark: number
          min_mark: number
        }
        Update: {
          description?: string | null
          grade_letter?: string
          id?: string
          level?: Database["public"]["Enums"]["academic_level"]
          max_mark?: number
          min_mark?: number
        }
        Relationships: []
      }
      monthly_tests: {
        Row: {
          academic_year: number
          class_id: string
          comment: string | null
          created_at: string
          deleted_at: string | null
          id: string
          mark: number
          month: number
          student_id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          academic_year?: number
          class_id: string
          comment?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          mark: number
          month: number
          student_id: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          academic_year?: number
          class_id?: string
          comment?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          mark?: number
          month?: number
          student_id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_tests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          address: string | null
          allergies: string | null
          birth_cert_number: string | null
          blood_type: string | null
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          enrollment_date: string | null
          form: number
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          is_active: boolean | null
          level: Database["public"]["Enums"]["academic_level"]
          medical_conditions: string | null
          national_id: string | null
          student_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          birth_cert_number?: string | null
          blood_type?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          enrollment_date?: string | null
          form: number
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          is_active?: boolean | null
          level: Database["public"]["Enums"]["academic_level"]
          medical_conditions?: string | null
          national_id?: string | null
          student_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
          birth_cert_number?: string | null
          blood_type?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          enrollment_date?: string | null
          form?: number
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          is_active?: boolean | null
          level?: Database["public"]["Enums"]["academic_level"]
          medical_conditions?: string | null
          national_id?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_compulsory: boolean | null
          level: Database["public"]["Enums"]["academic_level"] | null
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_compulsory?: boolean | null
          level?: Database["public"]["Enums"]["academic_level"] | null
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_compulsory?: boolean | null
          level?: Database["public"]["Enums"]["academic_level"] | null
          name?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      teacher_assignments: {
        Row: {
          academic_year: number
          class_id: string
          created_at: string
          id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          academic_year?: number
          class_id: string
          created_at?: string
          id?: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          academic_year?: number
          class_id?: string
          created_at?: string
          id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_profiles: {
        Row: {
          created_at: string
          date_joined: string | null
          department: string | null
          employee_id: string | null
          id: string
          qualification: string | null
          subjects_taught: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_joined?: string | null
          department?: string | null
          employee_id?: string | null
          id?: string
          qualification?: string | null
          subjects_taught?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_joined?: string | null
          department?: string | null
          employee_id?: string | null
          id?: string
          qualification?: string | null
          subjects_taught?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_grade: {
        Args: {
          _level: Database["public"]["Enums"]["academic_level"]
          _mark: number
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      academic_level: "zjc" | "o_level" | "a_level"
      app_role: "admin" | "teacher" | "student"
      attendance_status: "present" | "absent" | "late" | "excused"
      school_term: "term_1" | "term_2" | "term_3"
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
      academic_level: ["zjc", "o_level", "a_level"],
      app_role: ["admin", "teacher", "student"],
      attendance_status: ["present", "absent", "late", "excused"],
      school_term: ["term_1", "term_2", "term_3"],
    },
  },
} as const
