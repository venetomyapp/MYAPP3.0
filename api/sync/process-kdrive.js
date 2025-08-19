import { createClient } from 'webdav';
import { createClient as createSupabase } from '@supabase/supabase-js';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { JSDOM } from 'jsdom';

const supa = createSupabase(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function webdavClient() {
  return createClient(process.env.KDRIVE_WEBDAV_URL, {
    username: process.env.KDRIVE_EMAIL,
    password: process.env.KDRIVE_PASSWORD,
  });
}

function stripHtml(html) {
  const dom = new JSDOM(html);
  return dom.window.document.body.textContent || '';
}

async function bufferToText(filename, mime, buffer) {
  const lower = (filename || '').toLowerCase();
  if (mime?.includes('pdf') || lower.endsWith('.pdf')) {
    const data = await pdf(buffer);
    return data.text || '';
  }
  if (lower.endsWith('.docx')) {
    const { value } = await mammoth.convertToHtml({ buffer });
    return stripHtml(value);
  }
  if (mime?.includes('html') || lower.endsWith('.html') || lower.endsWith('.htm')) {
    return stripHtml(buffer.toString('utf8'));
  }
  // txt, md, csv, ecc.
  return buffer.toString('utf8');
}

function chunkText(text, chunkSize = 1000, overlap = 150) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + chunkSize);
    const piece = text.slice(i, end).trim();
    if (piece) chunks.push(piece);
    i += chunkSize - overlap;
  }
  return chunks;
}

export default async function handler(req, res) {
  try {
    const client = webdavClient();

    // prendi documenti da processare (primi 20 alla volta)
    const { data: docs, error } = await supa
      .from('documents')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    let processed = 0;

    for (const d of docs) {
      // scarica file
      const fileBuffer = Buffer.from(await client.getFileContents(d.path));
      const text = await bufferToText(d.path, d.mime, fileBuffer);
      if (!text || text.trim().length < 10) continue;

      // cancella vecchi chunk del doc
      await supa.from('chunks').delete().eq('doc_id', d.id);

      // crea chunk ed embedding
      const chunks = chunkText(text);
      // OpenAI batch embedding
      const emb = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunks,
      });

      for (let idx = 0; idx < chunks.length; idx++) {
        const content = chunks[idx];
        const embedding = emb.data[idx].embedding;
        await supa.from('chunks').insert({
          doc_id: d.id,
          chunk_index: idx,
          content,
          embedding, // Supabase accetta array float per la colonna vector
          token_count: content.length, // semplice stima
        });
      }
      processed++;
    }

    res.status(200).json({ ok: true, processed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
}
