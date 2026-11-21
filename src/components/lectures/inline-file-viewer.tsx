"use client";

import React, { useEffect, useRef, useState } from "react";
import { Download, Eye, Loader2, Maximize2, Minimize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fileCategoryLabel, formatBytes } from "@/lib/utils";
import type { LectureFile } from "@/types/database";

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp"]);
const PDF_EXTS = new Set(["pdf"]);

export function InlineFileViewer({ files }: { files: LectureFile[] }) {
  const [activeFile, setActiveFile] = useState<LectureFile | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  async function openPreview(file: LectureFile) {
    setActiveFile(file);
    setSignedUrl(null);
    setZoom(100);
    setLoadingUrl(true);
    try {
      const res = await fetch(`/api/files/${file.id}/download?mode=json`);
      const data = await res.json();
      if (res.ok && data.signedUrl) {
        setSignedUrl(data.signedUrl);
      }
    } finally {
      setLoadingUrl(false);
    }
  }

  function closePreview() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setActiveFile(null);
    setSignedUrl(null);
  }

  async function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(() => {});
    } else {
      await document.exitFullscreen().catch(() => {});
    }
  }

  const ext = activeFile?.ext.toLowerCase() ?? "";
  const isImage = IMAGE_EXTS.has(ext);
  const isPdf = PDF_EXTS.has(ext);

  return (
    <>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {files.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  f.category === "practical"
                    ? "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-300"
                    : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300"
                }`}
              >
                <Eye className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {f.original_name}
                  </p>
                  <Badge tone={f.category === "practical" ? "teal" : "indigo"}>
                    {fileCategoryLabel(f.category)}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {f.ext.toUpperCase()} • {formatBytes(f.size_bytes)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" type="button" onClick={() => openPreview(f)}>
                <Eye className="h-4 w-4" />
                <span>معاينة مدمجة</span>
              </Button>
              <a href={`/api/files/${f.id}/download`}>
                <Button size="sm" type="button">
                  <Download className="h-4 w-4" />
                  <span>تحميل</span>
                </Button>
              </a>
            </div>
          </li>
        ))}
      </ul>

      {activeFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 md:p-6">
          <div
            ref={containerRef}
            className="w-full h-full max-w-6xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Top Viewer Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <Badge tone={activeFile.category === "practical" ? "teal" : "indigo"}>
                  {fileCategoryLabel(activeFile.category)}
                </Badge>
                <span className="font-semibold text-sm truncate">{activeFile.original_name}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {(isImage || isPdf) && (
                  <>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(50, z - 25))}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                      title="تصغير"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-mono px-2 text-slate-300">{zoom}%</span>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(250, z + 25))}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                      title="تكبير"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="ملء الشاشة"
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>

                <a
                  href={`/api/files/${activeFile.id}/download`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>تحميل</span>
                </a>

                <button
                  type="button"
                  onClick={closePreview}
                  className="p-2 rounded-lg bg-red-600/90 hover:bg-red-600 text-white"
                  title="إغلاق"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
              {loadingUrl ? (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <span className="text-sm">جارٍ تجهيز المعاينة...</span>
                </div>
              ) : !signedUrl ? (
                <p className="text-sm text-red-600">تعذّر تحميل المعاينة. جرّب زر التحميل المباشر.</p>
              ) : isImage ? (
                <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
                  <img
                    src={signedUrl}
                    alt={activeFile.original_name}
                    style={{ width: `${zoom}%`, maxWidth: "none" }}
                    className="rounded-lg shadow-md transition-all"
                  />
                </div>
              ) : isPdf ? (
                <div
                  style={{ width: `${zoom}%`, height: "100%" }}
                  className="min-w-full min-h-[72vh] transition-all"
                >
                  <iframe
                    src={`${signedUrl}#toolbar=1&view=FitH`}
                    title={activeFile.original_name}
                    className="w-full h-full min-h-[72vh] rounded-lg border border-slate-300 dark:border-slate-700 bg-white"
                  />
                </div>
              ) : (
                <div className="text-center max-w-md space-y-3 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    المعاينة المباشرة داخل المتصفح متاحة لملفات PDF والصور
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    هذا الملف بصيغة <strong>{activeFile.ext.toUpperCase()}</strong>؛ يمكنك تحميله مباشرة وفتحه على جهازك.
                  </p>
                  <a href={`/api/files/${activeFile.id}/download`} className="inline-block">
                    <Button>
                      <Download className="h-4 w-4" />
                      <span>تحميل الملف الآن</span>
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
