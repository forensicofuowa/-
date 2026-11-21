"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Square, Trash2, Users } from "lucide-react";
import {
  bulkPermanentlyDeleteUsersAction,
  bulkUpdateUsersAction,
  permanentlyDeleteUserAction,
  updateUserAccountAction,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UiverseCheckbox } from "@/components/ui/uiverse-checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDate, roleLabel, statusLabel } from "@/lib/utils";

export function UsersBulkManager({ users }: { users: any[] }) {
  const router = useRouter();
  const selectableUsers = users.filter((u) => u.role !== "super_admin");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busy, setBusy] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const filteredUsers = users.filter((u) =>
    statusFilter === "all" ? true : u.status === statusFilter
  );

  const allFilteredSelectable = filteredUsers.filter((u) => u.role !== "super_admin");
  const allChecked =
    allFilteredSelectable.length > 0 &&
    allFilteredSelectable.every((u) => selectedIds.includes(u.id));

  function toggleAll() {
    if (allChecked) {
      const removeSet = new Set(allFilteredSelectable.map((u) => u.id));
      setSelectedIds((prev) => prev.filter((id) => !removeSet.has(id)));
    } else {
      const next = new Set([...selectedIds, ...allFilteredSelectable.map((u) => u.id)]);
      setSelectedIds(Array.from(next));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function selectAllPending() {
    const pendingIds = selectableUsers.filter((u) => u.status === "pending").map((u) => u.id);
    setSelectedIds(pendingIds);
  }

  async function handlePermanentDeleteOne(userId: string, fullName: string) {
    const confirmed = window.confirm(
      `تحذير: سيتم حذف حساب (${fullName}) نهائياً من قاعدة البيانات ومن نظام الدخول، ولن يتمكن من الدخول إلا إذا سجّل من جديد ووافقت أنت عليه. هل أنت متأكد؟`
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage(null);
    const res = await permanentlyDeleteUserAction(userId);
    setBusy(false);
    if (!res.ok) {
      setMessage({ type: "err", text: res.error ?? "تعذّر حذف المستخدم نهائياً." });
      return;
    }
    setSelectedIds((prev) => prev.filter((id) => id !== userId));
    setMessage({
      type: "ok",
      text: `تم حذف (${fullName}) نهائياً من قاعدة البيانات. يمكنه التسجيل من جديد بانتظار موافقتك.`,
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-slate-800 dark:text-slate-100">
              قائمة الحسابات ({filteredUsers.length} من {users.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">قيد المراجعة فقط</option>
              <option value="active">المفعّلون فقط</option>
              <option value="disabled">المعطّلون فقط</option>
            </select>

            <Button type="button" size="sm" variant="outline" onClick={selectAllPending}>
              تحديد كل المعلّقين ({selectableUsers.filter((u) => u.status === "pending").length})
            </Button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <form
            action={bulkUpdateUsersAction}
            onSubmit={() => setTimeout(() => setSelectedIds([]), 200)}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 px-4 py-2.5"
          >
            <input type="hidden" name="userIds" value={JSON.stringify(selectedIds)} />
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              تم تحديد {selectedIds.length} حساب للإجراء الجماعي:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <select
                name="bulkStatus"
                defaultValue="active"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs"
              >
                <option value="">— بدون تغيير الحالة —</option>
                <option value="active">موافقة وتفعيل (Active)</option>
                <option value="disabled">تعطيل الحسابات (Disabled)</option>
                <option value="pending">إعادة للمراجعة (Pending)</option>
              </select>

              <select
                name="bulkRole"
                defaultValue=""
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs"
              >
                <option value="">— بدون تغيير الدور —</option>
                <option value="student">تحويل إلى طالب</option>
                <option value="instructor">تحويل إلى تدريسي</option>
                <option value="admin">تحويل إلى مدير</option>
              </select>

              <Button type="submit" size="sm">
                تطبيق على المحدد ({selectedIds.length})
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                إلغاء
              </Button>
            </div>
          </form>
        )}
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 w-10">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-slate-600 dark:text-slate-300 hover:text-indigo-600"
                  title="تحديد الكل"
                >
                  {allChecked ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4" />}
                </button>
              </th>
              <th className="px-4 py-3">الاسم والبريد</th>
              <th className="px-4 py-3">المرحلة</th>
              <th className="px-4 py-3">الدور</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3">تاريخ التسجيل</th>
              <th className="px-4 py-3">إجراء فردي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredUsers.map((u: any) => {
              const isSelected = selectedIds.includes(u.id);
              return (
                <tr
                  key={u.id}
                  className={
                    isSelected
                      ? "bg-indigo-50/40 dark:bg-indigo-950/30"
                      : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  }
                >
                  <td className="px-4 py-3">
                    {u.role !== "super_admin" ? (
                      <UiverseCheckbox
                        checked={isSelected}
                        onChange={() => toggleOne(u.id)}
                        ariaLabel={`تحديد حساب ${u.full_name}`}
                      />
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{u.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                      {u.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.stages?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone="indigo">{roleLabel(u.role)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        u.status === "active"
                          ? "green"
                          : u.status === "pending"
                          ? "amber"
                          : "red"
                      }
                    >
                      {statusLabel(u.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== "super_admin" ? (
                      <form action={updateUserAccountAction} className="flex flex-wrap items-center gap-1.5">
                        <input type="hidden" name="userId" value={u.id} />
                        <select
                          name="role"
                          defaultValue={u.role}
                          className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                        >
                          <option value="student">طالب</option>
                          <option value="instructor">تدريسي</option>
                          <option value="admin">مدير</option>
                        </select>
                        <select
                          name="status"
                          defaultValue={u.status}
                          className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                        >
                          <option value="active">مفعّل</option>
                          <option value="pending">قيد المراجعة</option>
                          <option value="disabled">معطّل</option>
                        </select>
                        <Button type="submit" size="sm">
                          حفظ
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-slate-400">مشرف عام</span>
                    )}
                    {u.role !== "super_admin" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => handlePermanentDeleteOne(u.id, u.full_name)}
                      title="حذف نهائي من قاعدة البيانات"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف نهائي</span>
                    </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
    </div>
  );
}
