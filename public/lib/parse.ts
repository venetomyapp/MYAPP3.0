import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function parseBufferToText(buf: Buffer, mime: string, filename: string): Promise<string> {
  try {
    if (mime === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      const data = await pdfParse(buf);
      return data.text || '';
    }
    if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filename.toLowerCase().endsWith('.docx')
    ) {
      const { value } = await mammoth.extractRawText({ buffer: buf });
      return value || '';
    }
    // fallback TXT
    return buf.toString('utf8');
  } catch (e) {
    return '';
  }
}

export function chunkText(text: string, chunkSize = 1200, overlap = 200) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const chunks: { content: string; index: number }[] = [];
  let i = 0, start = 0;
  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    const slice = clean.slice(start, end);
    chunks.push({ content: slice, index: i++ });
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return chunks;
}
