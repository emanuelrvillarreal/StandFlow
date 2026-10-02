// Edge Function: manda el mail de "solicitud aprobada" cuando el admin aprueba
// una solicitud de stand. Requiere el secret RESEND_API_KEY configurado en
// Supabase (Edge Functions > Manage secrets).
//
// Para desplegarla sin instalar la CLI: Supabase Dashboard > Edge Functions >
// "Deploy a new function" > nombre "send-approval-email" > pegar este archivo.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'No autorizado' }, 401)

    // Se valida con el token del que llama (el admin logueado en el panel),
    // no con la service role: así solo un admin real puede disparar el mail.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return jsonResponse({ error: 'No autorizado' }, 401)

    const { data: profile } = await supabaseClient.from('profiles').select('role_id').eq('id', user.id).single()
    if (profile?.role_id !== 1) return jsonResponse({ error: 'Solo un admin puede enviar esta notificación' }, 403)

    const { to, businessName, userName, eventName, mapUrl } = await req.json()
    if (!to || !eventName) return jsonResponse({ error: 'Faltan datos (to, eventName)' }, 400)

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a2b;">
        <div style="background: #0b0b16; padding: 24px; border-radius: 16px 16px 0 0; text-align: center;">
          <span style="color: #2ee6d6; font-weight: 700; font-size: 20px; letter-spacing: 1px;">STANDS FLOW</span>
        </div>
        <div style="padding: 28px; border: 1px solid #eee; border-top: none; border-radius: 0 0 16px 16px;">
          <h2 style="margin-top:0;">¡Tu solicitud fue aprobada!</h2>
          <p>Hola${userName ? ` ${userName}` : ''},</p>
          <p>Tu solicitud para participar en <strong>${eventName}</strong> fue aprobada${businessName ? ` para <strong>${businessName}</strong>` : ''}. Ya podés ingresar a elegir tu stand.</p>
          ${mapUrl ? `<div style="text-align:center; margin: 28px 0;">
            <a href="${mapUrl}" style="background:#2ee6d6; color:#0b0b16; padding: 12px 28px; border-radius: 999px; text-decoration:none; font-weight:700; display:inline-block;">Elegir mi stand</a>
          </div>` : ''}
          <p style="color:#888; font-size:13px;">Si tenés algún problema para ingresar, contactá a la organización.</p>
        </div>
      </div>
    `

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Stands Flow <notificaciones@stands.deckaria.ar>',
        to: [to],
        subject: `Aprobamos tu solicitud para ${eventName}`,
        html,
      }),
    })

    if (!resendRes.ok) {
      const errText = await resendRes.text()
      return jsonResponse({ error: `No se pudo enviar con Resend: ${errText}` }, 502)
    }

    return jsonResponse({ ok: true })
  } catch (err) {
    return jsonResponse({ error: err.message }, 500)
  }
})
