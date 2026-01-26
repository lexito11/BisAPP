// Supabase Edge Function para monitorear cambios de estado y enviar notificaciones
// Esta función debe ejecutarse periódicamente (cron job)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente de Supabase con service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Obtener todas las iglesias activas
    const { data: churches, error: churchesError } = await supabase
      .from('churches')
      .select('id')

    if (churchesError) throw churchesError

    let totalChanges = 0
    let totalNotifications = 0

    // Procesar cada iglesia
    for (const church of churches || []) {
      // Obtener configuración de colores
      const { data: colorConfig } = await supabase
        .from('color_configuration')
        .select('green_days, yellow_days, red_days')
        .eq('church_id', church.id)
        .single()

      const greenDays = colorConfig?.green_days || 7
      const yellowDays = colorConfig?.yellow_days || 14
      const redDays = colorConfig?.red_days || 21

      // Obtener simpatizantes activos
      const { data: sympathizers } = await supabase
        .from('sympathizers')
        .select('id, name, last_contact_date, church_id, did_not_return')
        .eq('church_id', church.id)
        .or('did_not_return.is.null,did_not_return.eq.false')

      if (!sympathizers || sympathizers.length === 0) continue

      // Función para calcular estado
      const calculateStatus = (lastContactDate: string): 'green' | 'yellow' | 'red' => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const contactDate = new Date(lastContactDate)
        contactDate.setHours(0, 0, 0, 0)
        
        const diffTime = today.getTime() - contactDate.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        
        if (diffDays < 0) return 'green'
        if (diffDays <= greenDays) return 'green'
        if (diffDays <= yellowDays) return 'yellow'
        return 'red'
      }

      // Obtener último estado registrado
      const { data: lastStatusChanges } = await supabase
        .from('status_changes')
        .select('sympathizer_id, new_status')
        .in('sympathizer_id', sympathizers.map(s => s.id))
        .order('change_date', { ascending: false })

      const lastStatusMap = new Map<string, 'green' | 'yellow' | 'red'>()
      lastStatusChanges?.forEach(change => {
        if (!lastStatusMap.has(change.sympathizer_id)) {
          lastStatusMap.set(change.sympathizer_id, change.new_status as 'green' | 'yellow' | 'red')
        }
      })

      // Detectar cambios
      const changes: Array<{
        sympathizer_id: string
        sympathizer_name: string
        previous_status: 'green' | 'yellow' | 'red' | null
        new_status: 'green' | 'yellow' | 'red'
        days_since_contact: number
      }> = []

      sympathizers.forEach(sympathizer => {
        const currentStatus = calculateStatus(sympathizer.last_contact_date)
        const previousStatus = lastStatusMap.get(sympathizer.id) || null

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const contactDate = new Date(sympathizer.last_contact_date)
        contactDate.setHours(0, 0, 0, 0)
        const diffTime = today.getTime() - contactDate.getTime()
        const daysSinceContact = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

        if (previousStatus !== currentStatus) {
          changes.push({
            sympathizer_id: sympathizer.id,
            sympathizer_name: sympathizer.name,
            previous_status: previousStatus,
            new_status: currentStatus,
            days_since_contact: daysSinceContact
          })
        }
      })

      // Registrar cambios
      if (changes.length > 0) {
        const statusChangesToInsert = changes.map(change => ({
          sympathizer_id: change.sympathizer_id,
          church_id: church.id,
          previous_status: change.previous_status,
          new_status: change.new_status,
          days_since_contact: change.days_since_contact,
          notification_sent: false
        }))

        await supabase
          .from('status_changes')
          .insert(statusChangesToInsert)

        totalChanges += changes.length

        // Obtener configuración de notificaciones
        const { data: notifConfig } = await supabase
          .from('notifications_config')
          .select('*')
          .eq('church_id', church.id)
          .single()

        // Obtener usuarios de la iglesia con tokens de push
        const { data: users } = await supabase
          .from('users')
          .select('id, name, email, role')
          .eq('church_id', church.id)
          .eq('is_active', true)

        // Obtener tokens de push para estos usuarios
        const userIds = users?.map(u => u.id) || []
        const { data: pushTokens } = await supabase
          .from('push_tokens')
          .select('user_id, token, device_type')
          .in('user_id', userIds)

        // Enviar notificaciones para cada cambio
        for (const change of changes) {
          // Solo notificar cambios a amarillo o rojo (no a verde)
          if (change.new_status === 'green') continue

          const statusLabels = {
            yellow: 'Atención',
            red: 'Urgente'
          }

          const title = `🔄 Cambio de Estado: ${statusLabels[change.new_status]}`
          const body = `${change.sympathizer_name} cambió a estado ${statusLabels[change.new_status]} (${change.days_since_contact} días sin contacto)`

          // Enviar notificación push a todos los usuarios de la iglesia
          for (const token of pushTokens || []) {
            try {
              // Aquí integrarías con tu servicio de push (FCM, OneSignal, etc.)
              // Por ahora, solo registramos en el log
              await supabase
                .from('notifications_log')
                .insert({
                  church_id: church.id,
                  user_id: token.user_id,
                  notification_type: 'status_change',
                  sympathizer_id: change.sympathizer_id,
                  title,
                  body,
                  sent_via: ['push'],
                  success: true
                })

              totalNotifications++
            } catch (error) {
              console.error('Error enviando notificación:', error)
              await supabase
                .from('notifications_log')
                .insert({
                  church_id: church.id,
                  user_id: token.user_id,
                  notification_type: 'status_change',
                  sympathizer_id: change.sympathizer_id,
                  title,
                  body,
                  sent_via: ['push'],
                  success: false,
                  error_message: error.message
                })
            }
          }

          // Marcar como enviado
          await supabase
            .from('status_changes')
            .update({ notification_sent: true, notification_sent_at: new Date().toISOString() })
            .eq('sympathizer_id', change.sympathizer_id)
            .eq('notification_sent', false)
            .order('change_date', { ascending: false })
            .limit(1)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalChanges,
        totalNotifications,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
