"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { registerAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import type { Stage } from "@/types/database";

export function RegisterClient({ stages }: { stages: Stage[] }) {
  const [state, action, pending] = useActionState(registerAction, null);
  const [role, setRole] = useState<"student" | "instructor">("student");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إنشاء حساب جديد</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">سيتم تفعيل حسابك بعد موافقة إدارة القسم</p>
        </div>

        <form action={action} className="space-y-4">
          {state?.error && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/60 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {state.error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل</label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="مثال: علي حسين محمد"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع الحساب</label>
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "student" | "instructor")}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="student">طالب</option>
              <option value="instructor">تدريسي</option>
            </select>
          </div>

          {role === "student" && stages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المرحلة الدراسية</label>
              <select
                name="stageId"
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              name="email"
              required
              dir="ltr"
              placeholder="name@example.com"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-left focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              dir="ltr"
              placeholder="6 أحرف أو أكثر"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-left focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <Button type="submit" disabled={pending} className="w-full py-2.5">
            {pending ? "جارٍ التسجيل..." : "تقديم طلب التسجيل"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
