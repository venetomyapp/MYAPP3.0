// lib/parse.ts
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export async function parseBufferToText(
  buf: Buffer,
  mimeType?: string,
  filename?: string
): Promise<string> {
  const name = (filename || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();
  try {
    if (mime.includes("application/pdf") || name.endsWith(".pdf")) {
      const data = await pdfParse(buf);
      return (data.text || "").replace(/\s+/g, " ").trim();
    }
    if (
      mime.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
      name.endsWith(".docx")
    ) {
      const { value } = await mammoth.extractRawText({ buffer: buf });
      return (value || "").replace(/\s+/g, " ").trim();
    }
    return buf.toString("utf8").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

export function chunkText(text: string, chunkSize = 1200, overlap = 200): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    chunks.push(clean.slice(start, end));
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return chunks;
}
