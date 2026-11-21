"use client";

import React, { useState } from "react";
import { createAnnouncementAction, deleteAnnouncementAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UiverseCheckbox } from "@/components/ui/uiverse-checkbox";
import { formatDate } from "@/lib/utils";

export function AnnouncementsFormAndList({
  announcements,
  stages,
}: {
  announcements: any[];
  stages: any[];
}) {
  const [isPinned, setIsPinned] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">نشر إعلان جديد</h2>
        </CardHeader>
        <CardContent>
          <form action={createAnnouncementAction} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                name="title"
                required
                placeholder="عنوان التبليغ"
                className="md:col-span-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
              <select
                name="stageId"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="">جميع المراحل</option>
                {(stages ?? []).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} فقط
                  </option>
                ))}
              </select>
            </div>
            <textarea
              name="body"
              rows={3}
              required
              placeholder="نص التبليغ للطلبة..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                <UiverseCheckbox
                  checked={isPinned}
                  onChange={setIsPinned}
                  name="isPinned"
                  value="on"
                  size="sm"
                  ariaLabel="تثبيت الإعلان في الأعلى"
                />
                <span onClick={() => setIsPinned(!isPinned)} className="cursor-pointer select-none">
                  تثبيت الإعلان في الأعلى
                </span>
              </div>
              <Button type="submit">نشر الإعلان</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(announcements ?? []).map((a: any) => (
          <Card key={a.id}>
            <CardContent className="p-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">{a.title}</h3>
                  {a.is_pinned && <Badge tone="amber">مثبّت</Badge>}
                  <Badge tone="indigo">{a.stages?.name ?? "جميع المراحل"}</Badge>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1.5 whitespace-pre-line">{a.body}</p>
                <p className="text-xs text-slate-400 mt-2">{formatDate(a.created_at)}</p>
              </div>
              <form action={deleteAnnouncementAction}>
                <input type="hidden" name="id" value={a.id} />
                <Button type="submit" size="sm" variant="danger">
                  حذف
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
