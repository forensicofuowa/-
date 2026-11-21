"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("يرجى إدخال بريد إلكتروني صحيح."),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل."),
});

const registerSchema = z.object({
  fullName: z.string().min(3, "يرجى إدخال الاسم الثلاثي بشكل صحيح."),
  email: z.string().email("يرجى إدخال بريد إلكتروني صحيح."),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل."),
  role: z.enum(["student", "instructor"]),
  stageId: z.string().optional(),
});

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  }

  redirect("/");
}

export async function registerAction(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const parsed = registerSchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "student"),
    stageId: String(formData.get("stageId") ?? "") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "تأكد من ملء جميع الحقول بشكل صحيح." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        role: parsed.data.role,
        stage_id: parsed.data.role === "student" ? parsed.data.stageId ?? "" : "",
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "هذا البريد الإلكتروني مسجّل مسبقاً." };
    }
    return { error: error.message };
  }

  redirect("/pending-approval");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
