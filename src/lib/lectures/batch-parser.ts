import type { FileCategory, ParsedBatchLecture } from "@/types/database";

const TEXT_LIKE_EXTS = new Set(["json", "csv", "txt"]);

function splitLines(text: string): string[] {
  return text
    .split(String.fromCharCode(10))
    .map((line) => line.replace(new RegExp(String.fromCharCode(13), "g"), "").trim())
    .filter(Boolean);
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line.charAt(i);
    if (ch === '"') {
      if (inQuotes && line.charAt(i + 1) === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseLeadingNumber(input: string, fallbackIndex: number): { lectureNumber: number; title: string } {
  let i = 0;
  let numStr = "";
  while (i < input.length && input.charCodeAt(i) >= 48 && input.charCodeAt(i) <= 57) {
    numStr += input.charAt(i);
    i++;
  }
  if (!numStr) {
    return { lectureNumber: fallbackIndex + 1, title: input.trim() };
  }
  const separators = new Set(["-", "–", "—", ":", ".", "،", ")", " "]);
  while (i < input.length && separators.has(input.charAt(i))) {
    i++;
  }
  const parsedNum = Number(numStr);
  const lectureNumber = Number.isFinite(parsedNum) && parsedNum >= 1 ? Math.floor(parsedNum) : fallbackIndex + 1;
  const title = input.slice(i).trim() || input.trim();
  return { lectureNumber, title };
}

function stripExtension(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const dotIdx = base.lastIndexOf(".");
  return dotIdx > 0 ? base.slice(0, dotIdx) : base;
}

function detectCategoryFromText(text: string, fallback: FileCategory): FileCategory {
  const lower = text.toLowerCase();
  if (
    lower.includes("عملي") ||
    lower.includes("مختبر") ||
    lower.includes("تطبيق") ||
    lower.includes("practical") ||
    lower.includes("lab")
  ) {
    return "practical";
  }
  if (lower.includes("نظري") || lower.includes("theory")) {
    return "theory";
  }
  return fallback;
}

export function parseLecturesFromUploadedFiles(
  entries: Array<{ name: string; textContent: string; file?: File }>,
  defaultSemester = 1,
  defaultCategory: FileCategory = "theory"
): ParsedBatchLecture[] {
  const items: ParsedBatchLecture[] = [];

  entries.forEach((entry, fileIdx) => {
    const lowerName = entry.name.toLowerCase();
    const dotIdx = lowerName.lastIndexOf(".");
    const ext = dotIdx >= 0 ? lowerName.slice(dotIdx + 1) : "";
    const cleaned = entry.textContent.replace(/^\ufeff/, "").trim();

    if (TEXT_LIKE_EXTS.has(ext) && cleaned) {
      if (ext === "json" || cleaned.startsWith("[") || cleaned.startsWith("{")) {
        try {
          const parsed = JSON.parse(cleaned);
          const arr = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.lectures)
            ? parsed.lectures
            : [];

          if (arr.length > 0) {
            arr.forEach((raw: Record<string, unknown>, idx: number) => {
              if (!raw || typeof raw !== "object") return;
              const title = String(raw.title ?? raw.name ?? raw["عنوان"] ?? "").trim();
              if (!title) return;
              const numRaw = Number(raw.lectureNumber ?? raw.lecture_number ?? raw.number ?? raw["رقم"] ?? idx + 1);
              const lectureNumber = Number.isFinite(numRaw) && numRaw >= 1 ? Math.floor(numRaw) : idx + 1;
              const semRaw = Number(raw.semester ?? raw.course ?? defaultSemester);
              const semester = semRaw === 2 ? 2 : 1;
              const rawCat = String(raw.category ?? raw.type ?? raw["تصنيف"] ?? "").trim();
              const category = rawCat ? detectCategoryFromText(rawCat, defaultCategory) : detectCategoryFromText(title, defaultCategory);
              const description = String(raw.description ?? raw.notes ?? raw["وصف"] ?? "").trim();
              items.push({
                tempId: `batch-${fileIdx}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
                lectureNumber,
                semester,
                category,
                title,
                description,
                selected: true,
              });
            });
            return;
          }
        } catch {
          // Fallback to line parsing
        }
      }

      const lines = splitLines(cleaned);
      if (lines.length > 0) {
        const firstLine = lines[0];
        const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
        if (ext === "csv" || firstLine.includes(delimiter)) {
          const firstCols = splitCsvLine(firstLine, delimiter).map((c) => c.toLowerCase());
          const hasHeader = firstCols.some((c) =>
            ["title", "lecture_number", "lecturenumber", "number", "description", "العنوان", "رقم", "وصف"].includes(c)
          );
          const startIdx = hasHeader ? 1 : 0;
          const titleCol = hasHeader
            ? Math.max(0, firstCols.findIndex((c) => ["title", "name", "عنوان"].includes(c)))
            : 1;
          const numCol = hasHeader
            ? firstCols.findIndex((c) => ["lecture_number", "lecturenumber", "number", "num", "رقم"].includes(c))
            : 0;
          const descCol = hasHeader
            ? firstCols.findIndex((c) => ["description", "desc", "notes", "وصف"].includes(c))
            : 2;

          let addedFromCsv = 0;
          for (let i = startIdx; i < lines.length; i++) {
            const cols = splitCsvLine(lines[i], delimiter);
            if (cols.length === 0) continue;

            let title = "";
            let lectureNumber = i - startIdx + 1;
            let description = "";

            if (hasHeader) {
              title = cols[titleCol] ?? cols[0] ?? "";
              if (numCol >= 0 && cols[numCol]) {
                const n = Number(cols[numCol]);
                if (Number.isFinite(n) && n >= 1) lectureNumber = Math.floor(n);
              }
              if (descCol >= 0 && cols[descCol]) description = cols[descCol];
            } else if (cols.length >= 2 && !Number.isNaN(Number(cols[0])) && cols[0].trim() !== "") {
              lectureNumber = Math.max(1, Math.floor(Number(cols[0])));
              title = cols[1] ?? "";
              description = cols.slice(2).join(" - ");
            } else {
              title = cols[0] ?? "";
              description = cols.slice(1).join(" - ");
            }

            title = title.trim();
            if (!title) continue;
            addedFromCsv++;
            items.push({
              tempId: `batch-${fileIdx}-${i}-${Math.random().toString(36).slice(2, 7)}`,
              lectureNumber,
              semester: defaultSemester,
              category: detectCategoryFromText(title, defaultCategory),
              title,
              description: description.trim(),
              selected: true,
            });
          }
          if (addedFromCsv > 0) return;
        }

        let addedFromTxt = 0;
        lines.forEach((line, idx) => {
          const pipeParts = line.split("|");
          const mainPart = (pipeParts[0] ?? "").trim();
          const description = pipeParts.slice(1).join(" | ").trim();
          const { lectureNumber, title } = parseLeadingNumber(mainPart, idx);
          if (!title) return;
          addedFromTxt++;
          items.push({
            tempId: `batch-${fileIdx}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
            lectureNumber,
            semester: defaultSemester,
            category: detectCategoryFromText(title, defaultCategory),
            title,
            description,
            selected: true,
          });
        });
        if (addedFromTxt > 0) return;
      }
    }

    const rawTitle = stripExtension(entry.name).replace(/[_-]+/g, " ").trim() || entry.name;
    const { lectureNumber, title } = parseLeadingNumber(rawTitle, fileIdx);
    const detectedCat = detectCategoryFromText(entry.name, defaultCategory);
    items.push({
      tempId: `batch-file-${fileIdx}-${Math.random().toString(36).slice(2, 7)}`,
      lectureNumber,
      semester: defaultSemester,
      category: detectedCat,
      title,
      description: "",
      selected: true,
      sourceFile: entry.file,
      sourceFileName: entry.name,
    });
  });

  return items;
}
