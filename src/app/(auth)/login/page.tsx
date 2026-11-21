"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { loginAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">منصة قسم الادلة الجنائية </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">سجل دخول أو انشأ حساب بأيميل فعال "حصراً"</p>
        </div>

        <form action={action} className="space-y-4">
          {state?.error && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/60 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {state.error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              name="email"
              required
              dir="ltr"
              placeholder="name@university.edu.iq"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-left focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور</label>
            <input
              type="password"
              name="password"
              required
              dir="ltr"
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-left focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <Button type="submit" disabled={pending} className="w-full py-2.5">
            {pending ? "جارٍ الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          ليس لديك حساب؟{" "}
          <Link href="/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            إنشاء حساب جديد
          </Link>
        </p>
      </div>
    </div>
  );
}
