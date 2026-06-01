import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uypvfkpbkmcbkjgadspf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5cHZma3Bia21jYmtqZ2Fkc3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjczMTIsImV4cCI6MjA5NTQwMzMxMn0.hqQO_qrC1SQEzdOX4lvQ1uvLZ477yRvMsXD2haZMgSQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
