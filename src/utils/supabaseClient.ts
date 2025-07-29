import { createClient } from '@supabase/supabase-js';

console.log("DEBUG SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("DEBUG SUPABASE KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
