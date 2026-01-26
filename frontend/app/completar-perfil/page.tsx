'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CompletarPerfil() {
  const router = useRouter()
  const [churchName, setChurchName] = useState('')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/')
      return
    }

    // Pre-llenar con datos de Google
    setUserEmail(user.email || '')
    setUserName(user.user_metadata?.full_name || user.user_metadata?.name || '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('No hay sesión activa')

      // 1. Crear la iglesia
      const { data: churchData, error: churchError } = await supabase
        .from('churches')
        .insert({
          name: churchName,
          green_days: 7,
          yellow_days: 14,
          red_days: 21,
        })
        .select()
        .single()

      if (churchError) throw churchError

      // 2. Crear el perfil del usuario
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: userEmail,
          name: userName,
          church_id: churchData.id,
          role: 'admin',
          is_real_admin: true,
        })

      if (userError) throw userError

      // Redirigir al dashboard
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al crear el perfil')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            background: '#EEF2FF', 
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{ marginBottom: '8px', color: '#1F2937', fontSize: '24px' }}>
            Crear Cuenta de Iglesia
          </h1>
          <p style={{ color: '#6B7280', fontSize: '14px' }}>
            Completa la información para comenzar
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ fontSize: '14px' }}>Nombre de la Iglesia</label>
            <input
              type="text"
              className="input"
              value={churchName}
              onChange={(e) => setChurchName(e.target.value)}
              placeholder="Iglesia Central"
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '14px' }}>Nombre del Administrador</label>
            <input
              type="text"
              className="input"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Pastor Juan Pérez"
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '14px' }}>Correo del Administrador</label>
            <input
              type="email"
              className="input"
              value={userEmail}
              disabled
              style={{ background: '#F3F4F6', cursor: 'not-allowed' }}
            />
          </div>

          {error && <p className="error" style={{ fontSize: '14px' }}>{error}</p>}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              width: '100%', 
              marginTop: '24px',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '600'
            }}
            disabled={loading}
          >
            {loading ? '⏳ Creando Cuenta...' : '✓ Crear Cuenta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', color: '#6B7280', fontSize: '14px' }}>
          ¿Ya tienes cuenta?{' '}
          <a 
            href="/" 
            style={{ color: '#4F46E5', textDecoration: 'none', fontWeight: '500' }}
          >
            Iniciar Sesión
          </a>
        </p>
      </div>
    </div>
  )
}
