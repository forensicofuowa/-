export const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "csv",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "txt",
  "zip",
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export const DANGEROUS_EXTENSIONS = new Set([
  "exe", "dll", "bat", "cmd", "com", "scr", "msi", "sh", "bash", "ps1",
  "vbs", "js", "mjs", "cjs", "jar", "apk", "php", "asp", "aspx", "jsp",
  "py", "rb", "html", "htm", "svg", "xml", "hta", "lnk", "iso", "dmg",
  "docm", "xlsm", "pptm",
]);

export const MIME_BY_EXTENSION: Record<AllowedExtension, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  txt: "text/plain",
  zip: "application/zip",
};

export function checkFileName(name: string): { ok: true; ext: AllowedExtension } | { ok: false; error: string } {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 255) {
    return { ok: false, error: "اسم الملف غير صالح أو طويل جداً." };
  }
  const base = trimmed.split(/[\\/]/).pop() ?? "";
  const parts = base.split(".");
  if (parts.length < 2) {
    return { ok: false, error: "يجب أن يحتوي الملف على امتداد واضح (مثل .pdf)." };
  }
  const exts = parts.slice(1).map((p) => p.trim().toLowerCase());
  if (exts.some((e) => DANGEROUS_EXTENSIONS.has(e))) {
    return { ok: false, error: "هذا النوع من الملفات محظور لأسباب أمنية." };
  }
  const lastExt = exts[exts.length - 1];
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(lastExt)) {
    return { ok: false, error: `الامتداد (.${lastExt}) غير مدعوم.` };
  }
  return { ok: true, ext: lastExt as AllowedExtension };
}

const startsWith = (b: Uint8Array, sig: number[], offset = 0) =>
  b.length >= offset + sig.length && sig.every((v, i) => b[offset + i] === v);

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

function indexOfBytes(haystack: Uint8Array, needle: number[], from = 0): number {
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

export function looksExecutable(head: Uint8Array): boolean {
  return (
    startsWith(head, [0x4d, 0x5a]) ||
    startsWith(head, [0x7f, 0x45, 0x4c, 0x46]) ||
    startsWith(head, [0xca, 0xfe, 0xba, 0xbe]) ||
    startsWith(head, ascii("#!"))
  );
}

function zipEntryNames(tail: Uint8Array): string[] {
  const names: string[] = [];
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let pos = 0;
  const cdSig = [0x50, 0x4b, 0x01, 0x02];
  while ((pos = indexOfBytes(tail, cdSig, pos)) !== -1) {
    if (pos + 46 > tail.length) break;
    const nameLen = (tail[pos + 28] ?? 0) | ((tail[pos + 29] ?? 0) << 8);
    const extraLen = (tail[pos + 30] ?? 0) | ((tail[pos + 31] ?? 0) << 8);
    const commentLen = (tail[pos + 32] ?? 0) | ((tail[pos + 33] ?? 0) << 8);
    if (pos + 46 + nameLen > tail.length) break;
    names.push(decoder.decode(tail.subarray(pos + 46, pos + 46 + nameLen)));
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return names;
}

const OOXML_ROOT: Partial<Record<AllowedExtension, string>> = {
  docx: "word/",
  xlsx: "xl/",
  pptx: "ppt/",
};

export function verifySignature(
  ext: AllowedExtension,
  head: Uint8Array,
  tail?: Uint8Array
): { ok: true } | { ok: false; error: string } {
  if (head.length === 0) return { ok: false, error: "الملف فارغ." };
  if (looksExecutable(head)) return { ok: false, error: "تم رفض الملف لاحتوائه على كود تنفيذي غير مسموح." };

  const mismatch = { ok: false as const, error: "محتوى الملف لا يطابق امتداده المعلن (فشل فحص البصمة)." };

  switch (ext) {
    case "pdf":
      return indexOfBytes(head.subarray(0, 1024), ascii("%PDF-")) !== -1 ? { ok: true } : mismatch;
    case "jpg":
    case "jpeg":
      return startsWith(head, [0xff, 0xd8, 0xff]) ? { ok: true } : mismatch;
    case "png":
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ? { ok: true } : mismatch;
    case "webp":
      return startsWith(head, ascii("RIFF")) && startsWith(head, ascii("WEBP"), 8) ? { ok: true } : mismatch;
    case "doc":
    case "ppt":
    case "xls":
      return startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) ? { ok: true } : mismatch;
    case "zip":
      return startsWith(head, [0x50, 0x4b, 0x03, 0x04]) || startsWith(head, [0x50, 0x4b, 0x05, 0x06])
        ? { ok: true }
        : mismatch;
    case "docx":
    case "xlsx":
    case "pptx": {
      if (!startsWith(head, [0x50, 0x4b, 0x03, 0x04])) return mismatch;
      if (!tail || tail.length === 0) return { ok: true };
      const names = zipEntryNames(tail);
      if (names.length === 0) return { ok: true };
      const root = OOXML_ROOT[ext] as string;
      const hasMacros = names.some((n) => n.toLowerCase().endsWith("vbaproject.bin"));
      if (hasMacros) return { ok: false, error: "ملفات أوفيس التي تحتوي على ماكرو (Macros) غير مسموحة." };
      return names.some((n) => n.startsWith(root)) ? { ok: true } : mismatch;
    }
    case "txt":
    case "csv":
      return head.includes(0) ? mismatch : { ok: true };
  }
}
