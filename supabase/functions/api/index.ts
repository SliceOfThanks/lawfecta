// Supabase entry point for the DELA api function (deploy with verify_jwt false; DELA checks its own sessions).
// Secrets this function reads: BD_SHARED_SECRET (and BD_SHARED_SECRET_NEXT while the secret is being changed), DELA_ORIGINS, STAGING_API_URL (Live only), BREVO_API_KEY (if Brevo is used),
// AI_KEY_ENCRYPTION_SECRET (seals members' own AI keys), OPENAI_API_KEY and ANTHROPIC_API_KEY (Lawfecta's own AI keys).
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { handle } from "./app.ts";
import { supabaseStorage } from "./lib/files/storage.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const storage = supabaseStorage(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

Deno.serve((req) =>
  handle(req, {
    env,
    storage,
    rpc: async (fn, args) => {
      const { data, error } = await db.rpc(fn, args);
      if (error) throw new Error(fn + ": " + error.message);
      return data;
    },
  })
);
