if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
if (!folderId) throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID");

const files = await listFolderFiles(folderId);
let importedCount = 0;

for (const file of files) {
  const buffer = await downloadFile(file.id);
  const text = await parseBufferToText(buffer, file.mimeType);
  if (!text) continue;

  const chunks = chunkText(text, 1000);

  const { data: doc, error: docErr } = await supabase
    .from("knowledge_documents")
    .insert({
      name: file.name,
      source: `drive://${file.id}`,
      type: file.mimeType,
    })
    .select()
    .single();
  if (docErr) throw docErr;

  const chunksToInsert = chunks.map((chunk, idx) => ({
    document_id: doc.id,
    content: chunk,
    embedding: null,
    chunk_index: idx,
  }));

  const { error: chunkErr } = await supabase
    .from("knowledge_chunks")
    .insert(chunksToInsert);
  if (chunkErr) throw chunkErr;

  importedCount++;
}

return NextResponse.json({ success: true, importedCount });
