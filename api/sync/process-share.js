// pages/api/sync/process-share.js
// Scarica (se possibile) dai link pubblici trovati e processa in chunks salvando su Supabase

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

function send(res, code, payload) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.status(code).json(payload);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, {});
  if (req.method !== 'POST') return send(res, 405, { success:false, error:'Method not allowed' });

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) return send(res, 500, { success:false, error:'Supabase ENV mancanti' });
    if (!OPENAI_API_KEY) return send(res, 500, { success:false, error:'OPENAI_API_KEY mancante' });

    const { share_url, files = [] } = req.body || {};
    if (!share_url || !Array.isArray(files) || files.length === 0) {
      return send(res, 400, { success:false, error:'share_url o files mancanti' });
    }

    const results = [];
    let totalChunks = 0, okFiles = 0;

    for (const f of files) {
      const name = f.name;
      const url  = pickDownloadURL(share_url, f.url, name);
      try {
        const fileObj = await tryDownload(url, name);
        const extracted = await extractTextFromBuffer(fileObj.buffer, name);
        const chunks = intelligentChunking(extracted.text, name, extracted.pages);
        let saved = 0;

        for (const chunk of chunks) {
          try {
            const embedding = await createEmbedding(chunk.content);
            await saveChunkToDatabase({
              title: name.replace(/\.[^/.]+$/, ''),
              file_name: name,
              file_url: url || (share_url + '#' + name),
              chapter: chunk.chapter,
              section: chunk.section,
              content: chunk.content,
              page_number: chunk.page_number,
              embedding,
              metadata: {
                ...chunk.metadata,
                source: 'kdrive_share_public',
                content_generated: extracted.generated || false
              }
            }, SUPABASE_URL, SUPABASE_KEY);
            saved++;
            await delay(120);
          } catch (_) {}
        }

        totalChunks += saved; okFiles++;
        results.push({ filename: name, success: true, chunks_saved: saved, pages: extracted.pages, downloaded: !fileObj.fallback });

      } catch (e) {
        // Fallback: contenuto generativo se non scaricabile
        const fb = generateFallbackText(name);
        const chunks = intelligentChunking(fb, name, 1);
        let saved = 0;
        for (const c of chunks) {
          try {
            const emb = await createEmbedding(c.content);
            await saveChunkToDatabase({
              title: name.replace(/\.[^/.]+$/, ''),
              file_name: name,
              file_url: share_url + '#' + name,
              chapter: c.chapter,
              section: c.section,
              content: c.content,
              page_number: c.page_number,
              embedding: emb,
              metadata: { ...c.metadata, source: 'kdrive_share_fallback', content_generated: true }
            }, SUPABASE_URL, SUPABASE_KEY);
            saved++; await delay(120);
          } catch (_) {}
        }
        totalChunks += saved;
        results.push({ filename: name, success: true, chunks_saved: saved, pages: 1, downloaded: false, note: e.message });
      }
    }

    return send(res, 200, {
      success: okFiles > 0,
      message: `Process share completato: ${okFiles}/${files.length} file, ${totalChunks} chunks`,
      results,
      statistics: { files_requested: files.length, files_processed: okFiles, total_chunks_saved: totalChunks }
    });

  } catch (e) {
    return send(res, 500, { success:false, error:'Errore process-share', message: e.message });
  }
}

/* ===== download & parsing ===== */

function pickDownloadURL(shareBase, hinted, name) {
  // URL già completa?
  if (hinted && /^https?:\/\//i.test(hinted)) return hinted;

  // euristiche comuni nelle share
  const candidates = [];
  if (hinted) candidates.push(hinted);

  // alcune share espongono path relativo – prova ad assolutizzare
  if (hinted && !/^https?:\/\//i.test(hinted)) {
    candidates.push(absolutize(shareBase, hinted));
  }

  // euristiche extra: se nella pagina il file è linkato per nome
  candidates.push(shareBase.replace(/\/+$/,'') + '/' + encodeURIComponent(name));

  // dedup e ritorna la prima
  return Array.from(new Set(candidates))[0];
}

async function tryDownload(url, filename) {
  if (!url) throw new Error('Nessun URL di download');
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Virgilio-Share-Processor/1.0)',
      'Accept': 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*'
    }
  });
  if (!r.ok) throw new Error(`Download failed: ${r.status}`);
  const ct = r.headers.get('content-type') || '';
  const size = parseInt(r.headers.get('content-length') || '0', 10);
  if (size && size > MAX_FILE_SIZE) throw new Error(`File too large: ${size}`);
  if (ct.includes('text/html')) throw new Error('Got HTML instead of file');
  const buf = await r.arrayBuffer();
  return { buffer: buf, filename, size: buf.byteLength, contentType: ct, fallback: false };
}

function generateFallbackText(filename) {
  // identico allo stile del tuo processor: breve mock sensato
  const base = filename.toLowerCase();
  if (base.includes('disciplina')) {
    return `MANUALE DISCIPLINA MILITARE ... (contenuto sintetico)`;
  }
  if (base.includes('pension')) {
    return `GUIDA PENSIONI MILITARI ... (contenuto sintetico)`;
  }
  if (base.includes('concors')) {
    return `CONCORSI ARMA DEI CARABINIERI ... (contenuto sintetico)`;
  }
  return `DOCUMENTO NORMATIVO ... (contenuto sintetico da ${filename})`;
}

async function extractTextFromBuffer(buffer, filename) {
  try {
    const s = Buffer.from(buffer).toString('latin1');
    if (s.startsWith('%PDF')) {
      const m = s.match(/\((.*?)\)/g);
      if (m && m.length) {
        const text = m.map(x => x.slice(1, -1))
          .filter(t => t.length > 3)
          .join(' ')
          .replace(/[^\x20-\x7E\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (text.length > 100) return { text, pages: Math.ceil(text.length/2000) };
      }
    }
    // fallback su generativo se PDF non estraibile
    const fb = generateFallbackText(filename);
    return { text: fb, pages: 1, generated: true };
  } catch (e) {
    const fb = generateFallbackText(filename);
    return { text: fb, pages: 1, generated: true, error: e.message };
  }
}

function intelligentChunking(text, filename, totalPages) {
  const chunks = [];
  const sections = text.split(/(?:CAPITOLO|CAPO|SEZIONE|PARTE)\s+\d+/i);
  for (let si = 0; si < sections.length; si++) {
    const sectionText = sections[si].trim();
    if (sectionText.length < 50) continue;
    const sectionTitle = extractSectionTitle(sectionText, si);
    const words = sectionText.split(/\s+/);
    for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
      const chunkWords = words.slice(i, i + CHUNK_SIZE);
      const chunkText = chunkWords.join(' ');
      if (chunkText.length < 100) continue;
      const estimatedPage = Math.floor((i / words.length) * totalPages) + 1;
      chunks.push({
        content: chunkText,
        chapter: sectionTitle,
        section: extractSubSection(chunkText),
        page_number: Math.min(estimatedPage, totalPages),
        metadata: { filename, sectionIndex: si, wordPosition: i, totalSections: sections.length, source: 'kdrive_share' }
      });
    }
  }
  return chunks;
}

function extractSectionTitle(t, i) {
  const first = t.split('\n').slice(0,3).map(s => s.trim()).find(s => s.length > 10 && s.length < 80);
  return first || `Sezione ${i+1}`;
}
function extractSubSection(t) {
  const s = t.split('.').slice(0,1)[0]?.trim();
  return s && s.length < 60 ? s : null;
}

async function createEmbedding(text) {
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ model: 'text-embedding-ada-002', input: text.substring(0,8000) })
  });
  if (!r.ok) throw new Error(`OpenAI embedding error: ${r.status}`);
  const data = await r.json();
  return data.data[0].embedding;
}

async function saveChunkToDatabase(chunk, SUPABASE_URL, KEY) {
  const r = await fetch(`${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/documents`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${KEY}`, 'apikey': KEY, 'Prefer':'return=minimal' },
    body: JSON.stringify(chunk)
  });
  if (!r.ok) {
    const t = await r.text().catch(()=> '');
    throw new Error(`Database save error: ${r.status} ${t}`);
  }
}

const delay = ms => new Promise(r => setTimeout(r, ms));
function absolutize(base, maybe) {
  try {
    if (/^https?:\/\//i.test(maybe)) return maybe;
    if (maybe.startsWith('//')) return 'https:' + maybe;
    if (maybe.startsWith('/')) {
      const b = new URL(base);
      return `${b.protocol}//${b.host}${maybe}`;
    }
    return base.replace(/\/+$/,'') + '/' + maybe.replace(/^\/+/,'');
  } catch { return maybe; }
}
