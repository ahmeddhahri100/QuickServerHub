// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const isPlaceholder = !rawUrl || rawUrl === 'your_supabase_project_url' || !rawUrl.startsWith('http');

if (isPlaceholder) {
  console.warn(
    '⚠️  Supabase credentials not set. Please update your .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

const supabaseUrl = isPlaceholder ? 'https://placeholder.supabase.co' : rawUrl;
const supabaseAnonKey = !rawKey || rawKey === 'your_supabase_anon_key' ? 'placeholder' : rawKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

