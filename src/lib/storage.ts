import { createClient } from "@supabase/supabase-js";

// Service-role client — server-side only, never import from client components.
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

export const MEDIA_BUCKET = "Travel_archives";

export default supabase;
