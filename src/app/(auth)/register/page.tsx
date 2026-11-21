import { createClient } from "@/lib/supabase/server";
import type { Stage } from "@/types/database";
import { RegisterClient } from "./register-client";

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: stages } = await supabase
    .from("stages")
    .select("*")
    .eq("is_archived", false)
    .order("level_number", { ascending: true });

  return <RegisterClient stages={(stages as Stage[]) ?? []} />;
}
