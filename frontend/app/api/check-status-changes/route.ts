import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API Route para verificar cambios de estado de simpatizantes
 * Esta función calcula el estado actual de cada simpatizante y registra cambios
 * 
 * Se debe llamar periódicamente (cron job o desde el frontend)
 */
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener usuario actual
    const { data: userData } = await supabase
      .from('users')
      .select('church_id, role')
      .eq('id', session.user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Solo admins pueden ejecutar esta verificación manualmente
    // (normalmente se ejecuta automáticamente desde un cron)
    if (userData.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden ejecutar esta acción' }, { status: 403 })
    }

    // Usar service role para operaciones administrativas
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Obtener todos los simpatizantes activos de la iglesia
    const { data: sympathizers, error: sympError } = await supabaseAdmin
      .from('sympathizers')
      .select('id, name, last_contact_date, church_id, did_not_return')
      .eq('church_id', userData.church_id)
      .or('did_not_return.is.null,did_not_return.eq.false')

    if (sympError) {
      throw sympError
    }

    // Obtener configuración de colores
    const { data: colorConfig } = await supabaseAdmin
      .from('color_configuration')
      .select('green_days, yellow_days, red_days')
      .eq('church_id', userData.church_id)
      .single()

    const greenDays = colorConfig?.green_days || 7
    const yellowDays = colorConfig?.yellow_days || 14
    const redDays = colorConfig?.red_days || 21

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

    // Obtener último estado registrado para cada simpatizante
    const { data: lastStatusChanges } = await supabaseAdmin
      .from('status_changes')
      .select('sympathizer_id, new_status, change_date')
      .in('sympathizer_id', sympathizers?.map(s => s.id) || [])
      .order('change_date', { ascending: false })

    // Crear mapa de último estado conocido
    const lastStatusMap = new Map<string, 'green' | 'yellow' | 'red'>()
    lastStatusChanges?.forEach(change => {
      if (!lastStatusMap.has(change.sympathizer_id)) {
        lastStatusMap.set(change.sympathizer_id, change.new_status as 'green' | 'yellow' | 'red')
      }
    })

    // Detectar cambios
    const changes: Array<{
      sympathizer_id: string
      previous_status: 'green' | 'yellow' | 'red' | null
      new_status: 'green' | 'yellow' | 'red'
      days_since_contact: number
    }> = []

    sympathizers?.forEach(sympathizer => {
      const currentStatus = calculateStatus(sympathizer.last_contact_date)
      const previousStatus = lastStatusMap.get(sympathizer.id) || null

      // Calcular días desde contacto
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const contactDate = new Date(sympathizer.last_contact_date)
      contactDate.setHours(0, 0, 0, 0)
      const diffTime = today.getTime() - contactDate.getTime()
      const daysSinceContact = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

      // Si el estado cambió, registrar el cambio
      if (previousStatus !== currentStatus) {
        changes.push({
          sympathizer_id: sympathizer.id,
          previous_status: previousStatus,
          new_status: currentStatus,
          days_since_contact: daysSinceContact
        })
      }
    })

    // Registrar cambios en la base de datos
    if (changes.length > 0) {
      const statusChangesToInsert = changes.map(change => ({
        sympathizer_id: change.sympathizer_id,
        church_id: userData.church_id,
        previous_status: change.previous_status,
        new_status: change.new_status,
        days_since_contact: change.days_since_contact,
        notification_sent: false
      }))

      const { error: insertError } = await supabaseAdmin
        .from('status_changes')
        .insert(statusChangesToInsert)

      if (insertError) {
        console.error('Error insertando cambios de estado:', insertError)
      }
    }

    return NextResponse.json({
      success: true,
      changesDetected: changes.length,
      changes: changes.map(c => ({
        sympathizer_id: c.sympathizer_id,
        from: c.previous_status,
        to: c.new_status,
        days: c.days_since_contact
      }))
    })
  } catch (error: any) {
    console.error('Error verificando cambios de estado:', error)
    return NextResponse.json(
      { error: error.message || 'Error desconocido' },
      { status: 500 }
    )
  }
}
