import { createClient } from '@supabase/supabase-js'

// GANTI dengan URL dan Anon Key dari proyek Supabase Anda
const supabaseUrl = 'https://xmcbayejufhftylcpaef.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtY2JheWVqdWZoZnR5bGNwYWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MTEzNzMsImV4cCI6MjA2NzA4NzM3M30.RhLXTSNeeeF4p2FDwWO4IOUzsAoRL3zpayOrJxvcJyA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)