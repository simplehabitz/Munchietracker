
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://kklwhdaabjgzkktrqopc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__dUkU2yRj8V5pLuldn2qxA_cTsRAw0L';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
