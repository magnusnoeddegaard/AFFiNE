// Type declarations for @supabase/supabase-js
declare module '@supabase/supabase-js' {
  export interface SupabaseClient {
    auth: {
      signInWithPassword(credentials: { email: string; password: string }): Promise<any>;
      signUp(credentials: { email: string; password: string; options?: any }): Promise<any>;
      admin: {
        updateUserById(userId: string, attributes: any): Promise<any>;
        deleteUser(userId: string): Promise<any>;
      };
    };
  }

  export function createClient(url: string, key: string): SupabaseClient;
}