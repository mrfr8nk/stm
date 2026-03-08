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
          max_uses: number | null
          role: Database["public"]["Enums"]["app_role"]
          use_count: number
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
          max_uses?: number | null
          role: Database["public"]["Enums"]["app_role"]
          use_count?: number
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
          max_uses?: number | null
          role?: Database["public"]["Enums"]["app_role"]
          use_count?: number
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
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          form: number
          full_name: string
          gender: string | null
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
          user_id: string | null
        }
        Insert: {
          address?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          form?: number
          full_name: string
          gender?: string | null
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
          user_id?: string | null
        }
        Update: {
          address?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          form?: number
          full_name?: string
          gender?: string | null
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
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
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
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          type?: string
          updated_at?: string
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
          receipt_image_url: string | null
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
          receipt_image_url?: string | null
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
          receipt_image_url?: string | null
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
      homepage_updates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          image_url: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
      parent_student_links: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: []
      }
      petty_cash: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          deleted_at: string | null
          description: string
          id: string
          notes: string | null
          payment_method: string | null
          receipt_image_url: string | null
          receipt_reference: string | null
          recorded_by: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          date?: string
          deleted_at?: string | null
          description: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_image_url?: string | null
          receipt_reference?: string | null
          recorded_by: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          deleted_at?: string | null
          description?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_image_url?: string | null
          receipt_reference?: string | null
          recorded_by?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          banned_reason: string | null
          created_at: string
          email: string | null
          full_name: string
          gender: string | null
          id: string
          is_banned: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_banned?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_banned?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      record_book_columns: {
        Row: {
          column_type: string
          created_at: string
          display_order: number
          id: string
          name: string
          record_book_id: string
        }
        Insert: {
          column_type?: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
          record_book_id: string
        }
        Update: {
          column_type?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          record_book_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_book_columns_record_book_id_fkey"
            columns: ["record_book_id"]
            isOneToOne: false
            referencedRelation: "record_books"
            referencedColumns: ["id"]
          },
        ]
      }
      record_book_entries: {
        Row: {
          column_id: string
          created_at: string
          id: string
          record_book_id: string
          student_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          column_id: string
          created_at?: string
          id?: string
          record_book_id: string
          student_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          column_id?: string
          created_at?: string
          id?: string
          record_book_id?: string
          student_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "record_book_entries_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "record_book_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_book_entries_record_book_id_fkey"
            columns: ["record_book_id"]
            isOneToOne: false
            referencedRelation: "record_books"
            referencedColumns: ["id"]
          },
        ]
      }
      record_books: {
        Row: {
          academic_year: number
          class_id: string | null
          created_at: string
          id: string
          name: string
          subject_id: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: number
          class_id?: string | null
          created_at?: string
          id?: string
          name: string
          subject_id?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: number
          class_id?: string | null
          created_at?: string
          id?: string
          name?: string
          subject_id?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_books_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_books_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      report_verifications: {
        Row: {
          academic_year: number
          average_mark: number | null
          class_name: string | null
          generated_at: string
          generated_by: string | null
          id: string
          level: string | null
          position: number | null
          serial_number: string
          student_code: string | null
          student_id: string
          student_name: string
          subjects_count: number | null
          term: string
          total_students: number | null
        }
        Insert: {
          academic_year: number
          average_mark?: number | null
          class_name?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          level?: string | null
          position?: number | null
          serial_number: string
          student_code?: string | null
          student_id: string
          student_name: string
          subjects_count?: number | null
          term: string
          total_students?: number | null
        }
        Update: {
          academic_year?: number
          average_mark?: number | null
          class_name?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          level?: string | null
          position?: number | null
          serial_number?: string
          student_code?: string | null
          student_id?: string
          student_name?: string
          subjects_count?: number | null
          term?: string
          total_students?: number | null
        }
        Relationships: []
      }
      scholarships: {
        Row: {
          coverage_percentage: number
          coverage_type: string
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean
          notes: string | null
          organization_name: string
          start_date: string
          student_id: string
          updated_at: string
        }
        Insert: {
          coverage_percentage?: number
          coverage_type?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_name: string
          start_date?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          coverage_percentage?: number
          coverage_type?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_name?: string
          start_date?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_gallery: {
        Row: {
          bio: string | null
          category: string
          created_at: string
          created_by: string | null
          department: string | null
          display_order: number
          education: string | null
          email: string | null
          experience: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          position: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          display_order?: number
          education?: string | null
          email?: string | null
          experience?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          position: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          display_order?: number
          education?: string | null
          email?: string | null
          experience?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          position?: string
          subject?: string | null
          updated_at?: string
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
          gender: string | null
          graduation_status: string | null
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
          gender?: string | null
          graduation_status?: string | null
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
          gender?: string | null
          graduation_status?: string | null
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
      user_presence: {
        Row: {
          is_online: boolean
          last_seen: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_seen?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_seen?: string
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
      create_direct_conversation: {
        Args: { _recipient_id: string; _title?: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      academic_level: "zjc" | "o_level" | "a_level"
      app_role: "admin" | "teacher" | "student" | "parent"
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
      app_role: ["admin", "teacher", "student", "parent"],
      attendance_status: ["present", "absent", "late", "excused"],
      school_term: ["term_1", "term_2", "term_3"],
    },
  },
} as const
