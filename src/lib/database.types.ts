// Hand-written mirror of supabase/migrations/20260921000001_hangout_rooms_chat.sql
// Regenerate once a database is reachable:
//   npx supabase gen types typescript --local > src/lib/database.types.ts

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          name: string;
          host_id: string | null;
          session_duration_minutes: number;
          invite_token: string;
          created_at: string;
          expires_at: string;
          visibility: "private" | "public";
          password_hash: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          host_id?: string | null;
          session_duration_minutes: number;
          invite_token: string;
          created_at?: string;
          expires_at: string;
          visibility?: "private" | "public";
          password_hash?: string | null;
        };
        Update: {
          name?: string;
          host_id?: string | null;
          expires_at?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          room_id: string;
          display_name: string;
          avatar_url: string | null;
          is_host: boolean;
          is_online: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          display_name: string;
          avatar_url?: string | null;
          is_host?: boolean;
          is_online?: boolean;
          joined_at?: string;
        };
        Update: {
          display_name?: string;
          avatar_url?: string | null;
          is_host?: boolean;
          is_online?: boolean;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          room_id: string;
          sender_id: string | null;
          type: "text" | "emoji" | "image" | "system";
          content: string;
          reactions: Record<string, string[]>;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_id?: string | null;
          type: "text" | "emoji" | "image" | "system";
          content: string;
          reactions?: Record<string, string[]>;
          created_at?: string;
        };
        Update: {
          reactions?: Record<string, string[]>;
        };
        Relationships: [];
      };
      polls: {
        Row: {
          id: string;
          room_id: string;
          question: string;
          created_by: string | null;
          created_at: string;
          closes_at: string | null;
          is_closed: boolean;
        };
        Insert: {
          id?: string;
          room_id: string;
          question: string;
          created_by?: string | null;
          created_at?: string;
          closes_at?: string | null;
          is_closed?: boolean;
        };
        Update: {
          is_closed?: boolean;
          closes_at?: string | null;
        };
        Relationships: [];
      };
      poll_options: {
        Row: { id: string; poll_id: string; label: string; position: number };
        Insert: { id?: string; poll_id: string; label: string; position?: number };
        Update: { label?: string };
        Relationships: [];
      };
      poll_votes: {
        Row: { poll_id: string; member_id: string; option_id: string; created_at: string };
        Insert: { poll_id: string; member_id: string; option_id: string };
        Update: { option_id?: string };
        Relationships: [];
      };
      game_sessions: {        Row: {
          id: string;
          room_id: string;
          type: "tictactoe" | "wordguess";
          status: "in-progress" | "finished";
          players: string[];
          spectators: string[];
          scores: Record<string, number>;
          state: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          type: "tictactoe" | "wordguess";
          status?: "in-progress" | "finished";
          players?: string[];
          spectators?: string[];
          scores?: Record<string, number>;
          state?: Record<string, unknown>;
        };
        Update: {
          status?: "in-progress" | "finished";
          players?: string[];
          spectators?: string[];
          scores?: Record<string, number>;
          state?: Record<string, unknown>;
        };
        Relationships: [];
      };
      private_threads: {
        Row: {
          id: string;
          room_id: string;
          member_a_id: string;
          member_b_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          member_a_id: string;
          member_b_id: string;
        };
        Update: { updated_at?: string };
        Relationships: [];
      };
      private_messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_id: string;
          content: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      room_blocks: {
        Row: {
          id: string;
          room_id: string;
          display_name: string;
          blocked_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          display_name: string;
          blocked_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
