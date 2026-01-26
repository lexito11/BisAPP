import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(request: Request) {
  try {
    const { email, name, phone, churchId, role } = await request.json()

    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado. Inicia sesión.' }, { status: 401 })
    }
    const { data: currentUser } = await supabase
      .from('users')
      .select('role, is_real_admin')
      .eq('id', session.user.id)
      .single()
    if (!currentUser || currentUser.role !== 'admin' || !currentUser.is_real_admin) {
      return NextResponse.json({ error: 'Solo el administrador real puede crear usuarios.' }, { status: 403 })
    }

    // Crear cliente de Supabase con service_role key (solo en servidor)
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

    // 1. Crear usuario en auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false, // Requiere confirmación
      user_metadata: {
        full_name: name,
        church_name: 'Iglesia'
      }
    })

    if (authError) throw authError

    // 2. Crear perfil en tabla users
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        phone: phone || null,
        church_id: churchId,
        role,
        is_active: true,
        is_real_admin: role === 'admin' ? false : undefined,
      })

    if (userError) throw userError

    // 3. Enviar email de invitación con link para establecer contraseña
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
    
    if (inviteError) {
      console.error('Error sending invite:', inviteError)
      // No fallar si el email no se envía, el usuario ya está creado
    }

    return NextResponse.json({ 
      success: true, 
      user: authData.user,
      emailSent: !inviteError 
    })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear usuario' },
      { status: 400 }
    )
  }
}
