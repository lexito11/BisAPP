import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token, deviceType, deviceInfo } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token es requerido' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Registrar o actualizar el token
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: session.user.id,
        token,
        device_type: deviceType || 'web',
        device_info: deviceInfo || {},
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,token'
      })

    if (error) {
      console.error('Error registrando push token:', error)
      return NextResponse.json({ error: 'Error al registrar token' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message || 'Error desconocido' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { token } = await request.json()

    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Eliminar el token
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', session.user.id)
      .eq('token', token)

    if (error) {
      console.error('Error eliminando push token:', error)
      return NextResponse.json({ error: 'Error al eliminar token' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message || 'Error desconocido' }, { status: 500 })
  }
}
