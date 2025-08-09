// api/jotform-webhook.js
// Webhook endpoint per JotForm - MyApp Sistema Richieste
// Deploy: https://myapp31.vercel.app/api/jotform-webhook

import { createClient } from '@supabase/supabase-js'

// Configurazione Supabase
const SUPABASE_URL = 'https://pvzdilkozpspsnepedqc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2emRpbGtvenBzcHNuZXBlZHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDY1NDUsImV4cCI6MjA3MDA4MjU0NX0.JimqeUkyOGcOw-pt-yJUVevSP3n6ikBPDR3N8y_7YIk'

// Inizializza Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export default async function handler(req, res) {
    // Configurazione CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    
    // Gestione preflight CORS
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    // Verifica metodo POST
    if (req.method !== 'POST') {
        console.log('❌ Metodo non permesso:', req.method)
        return res.status(405).json({ 
            error: 'Method not allowed',
            method: req.method 
        })
    }

    try {
        console.log('📥 Webhook JotForm ricevuto:')
        console.log('Headers:', req.headers)
        console.log('Body:', JSON.stringify(req.body, null, 2))
        
        const submissionData = req.body
        
        // Verifica dati submission
        if (!submissionData || (!submissionData.submissionID && !submissionData.id)) {
            console.log('❌ Dati submission non validi')
            return res.status(400).json({ 
                error: 'Invalid submission data',
                received: submissionData 
            })
        }

        // Estrai ID submission
        const submissionId = submissionData.submissionID || submissionData.id || 'unknown'
        console.log('📋 Processing submission ID:', submissionId)

        // Estrai dati dal form
        const answers = submissionData.rawRequest || submissionData.answers || submissionData
        console.log('📝 Answers ricevute:', answers)

        // Mappa i campi della form (adatta secondo la tua form JotForm)
        const formData = {
            jotform_id: submissionId,
            email: extractFieldValue(answers, 'email') || 
                   extractFieldValue(answers, '4') ||
                   extractFieldValue(answers, 'q4_email'),
            titolo: extractFieldValue(answers, 'titolo') || 
                    extractFieldValue(answers, '5') ||
                    extractFieldValue(answers, 'q5_titolo') ||
                    'Richiesta senza titolo',
            categoria: extractFieldValue(answers, 'categoria') || 
                       extractFieldValue(answers, '6') ||
                       extractFieldValue(answers, 'q6_categoria') ||
                       'GENERALE',
            descrizione: extractFieldValue(answers, 'descrizione') || 
                         extractFieldValue(answers, '7') ||
                         extractFieldValue(answers, 'q7_descrizione') ||
                         '',
            telefono: extractFieldValue(answers, 'telefono') || 
                      extractFieldValue(answers, '8') ||
                      extractFieldValue(answers, 'q8_telefono') ||
                      '',
            priorita: extractFieldValue(answers, 'priorita') || 
                      extractFieldValue(answers, '9') ||
                      extractFieldValue(answers, 'q9_priorita') ||
                      'NORMALE'
        }

        console.log('📊 Dati estratti dal form:', formData)

        // Validazione email
        if (!formData.email || !isValidEmail(formData.email)) {
            console.log('❌ Email non valida:', formData.email)
            return res.status(400).json({ 
                error: 'Email non valida o mancante',
                email: formData.email 
            })
        }

        // Cerca utente nel database
        console.log('🔍 Ricerca utente con email:', formData.email)
        const { data: userProfile, error: userError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('email', formData.email.toLowerCase().trim())
            .single()

        if (userError || !userProfile) {
            console.log('❌ Utente non trovato:', formData.email, userError)
            return res.status(404).json({ 
                error: 'Utente non trovato. Registrati prima nell\'app MyApp.',
                email: formData.email,
                suggestion: 'Vai su https://myapp31.vercel.app per registrarti'
            })
        }

        console.log('✅ Utente trovato:', userProfile.nome, userProfile.user_id)

        // Prepara dati richiesta
        const richiestaData = {
            user_id: userProfile.user_id,
            jotform_submission_id: formData.jotform_id,
            titolo: formData.titolo,
            categoria: formData.categoria,
            priorita: formData.priorita,
            descrizione: formData.descrizione,
            nome_richiedente: userProfile.nome || 'Nome non disponibile',
            email_richiedente: userProfile.email,
            telefono_richiedente: formData.telefono || userProfile.telefono || '',
            stato: 'RICEVUTA',
            comunicazioni: JSON.stringify([{
                data: new Date().toISOString(),
                tipo: 'CREAZIONE',
                messaggio: 'Richiesta creata tramite modulo online JotForm',
                mittente: 'Sistema'
            }])
        }

        console.log('💾 Inserimento richiesta nel database:', richiestaData)

        // Inserisci richiesta nel database
        const { data: richiesta, error: insertError } = await supabase
            .from('richieste_personali')
            .insert([richiestaData])
            .select()
            .single()

        if (insertError) {
            console.error('❌ Errore inserimento richiesta:', insertError)
            return res.status(500).json({
                error: 'Errore inserimento nel database',
                details: insertError.message
            })
        }

        console.log('✅ Richiesta creata con ID:', richiesta.id)

        // Notifica dirigenti
        try {
            console.log('🔔 Invio notifiche ai dirigenti...')
            const { data: dirigenti, error: dirigentiError } = await supabase
                .from('user_profiles')
                .select('user_id, nome')
                .in('role', ['DIRIGENTE', 'ADMIN'])

            if (!dirigentiError && dirigenti && dirigenti.length > 0) {
                const notifications = dirigenti.map(dirigente => ({
                    user_id: dirigente.user_id,
                    title: `Nuova richiesta: ${richiesta.titolo}`,
                    message: `${richiesta.nome_richiedente} ha inviato una nuova richiesta di categoria ${richiesta.categoria}`,
                    link: `/dirigenti/richieste-gestione.html?id=${richiesta.id}`,
                    read: false
                }))

                await supabase
                    .from('notifications')
                    .insert(notifications)

                console.log(`✅ Notifiche inviate a ${dirigenti.length} dirigenti`)
            } else {
                console.log('⚠️ Nessun dirigente trovato per le notifiche')
            }
        } catch (notifError) {
            console.error('⚠️ Errore invio notifiche (non critico):', notifError)
        }

        // Log dell'azione
        try {
            await supabase
                .from('richieste_log')
                .insert([{
                    richiesta_id: richiesta.id,
                    user_id: userProfile.user_id,
                    user_nome: userProfile.nome || 'Sistema',
                    user_role: userProfile.role || 'USER',
                    azione: 'CREATA',
                    dettagli: JSON.stringify({
                        jotform_id: formData.jotform_id,
                        titolo: formData.titolo,
                        categoria: formData.categoria,
                        metodo: 'webhook_jotform'
                    })
                }])
            console.log('📝 Log azione salvato')
        } catch (logError) {
            console.error('⚠️ Errore log (non critico):', logError)
        }

        // Risposta di successo
        const response = {
            success: true,
            message: 'Richiesta creata con successo!',
            data: {
                richiesta_id: richiesta.id,
                titolo: richiesta.titolo,
                stato: richiesta.stato,
                created_at: richiesta.created_at
            }
        }

        console.log('🎉 Webhook processato con successo:', response)
        return res.status(200).json(response)
        
    } catch (error) {
        console.error('💥 Errore critico webhook JotForm:', error)
        
        return res.status(500).json({
            success: false,
            error: 'Errore interno del server',
            message: error.message,
            timestamp: new Date().toISOString()
        })
    }
}

// Funzioni helper
function extractFieldValue(answers, fieldKey) {
    if (!answers || typeof answers !== 'object') return null
    
    const field = answers[fieldKey]
    if (!field) return null
    
    // Se è una stringa diretta
    if (typeof field === 'string') return field.trim()
    
    // Se ha proprietà answer
    if (field.answer) {
        if (typeof field.answer === 'string') return field.answer.trim()
        if (Array.isArray(field.answer)) return field.answer.join(', ')
    }
    
    // Se ha proprietà value  
    if (field.value) {
        if (typeof field.value === 'string') return field.value.trim()
        if (Array.isArray(field.value)) return field.value.join(', ')
    }
    
    return null
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

// Log di avvio
console.log('🚀 JotForm Webhook Handler inizializzato')
console.log('🌐 Endpoint: https://myapp31.vercel.app/api/jotform-webhook')
console.log('📊 Supabase URL:', SUPABASE_URL)
