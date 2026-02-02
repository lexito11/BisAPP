'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { Sympathizer, User, ColorConfiguration } from '@/types/database.types'

export default function SympathizerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sympathizer, setSympathizer] = useState<Sympathizer | null>(null)
  const [responsible, setResponsible] = useState<User | null>(null)
  const [config, setConfig] = useState<ColorConfiguration | null>(null)
  const [currentTime] = useState(new Date())
  const [navigating, setNavigating] = useState<'back' | 'logout' | null>(null)

  useEffect(() => {
    loadSympathizerData()
  }, [params.id])

  const loadSympathizerData = async () => {
    try {
      setLoading(true)
      
      // Cargar datos del simpatizante
      const { data: sympathizerData, error: sympathizerError } = await supabase
        .from('sympathizers')
        .select('*')
        .eq('id', params.id)
        .single()

      if (sympathizerError) {
        console.error('Error cargando simpatizante:', sympathizerError)
        router.push('/dashboard')
        return
      }

      setSympathizer(sympathizerData)

      // Cargar responsable si existe
      if (sympathizerData.responsible_user_id) {
        const { data: responsibleData } = await supabase
          .from('users')
          .select('*')
          .eq('id', sympathizerData.responsible_user_id)
          .single()

        if (responsibleData) {
          setResponsible(responsibleData)
        }
      }

      // Cargar configuración de colores
      if (sympathizerData.church_id) {
        const { data: configData } = await supabase
          .from('color_configuration')
          .select('*')
          .eq('church_id', sympathizerData.church_id)
          .single()

        if (configData) {
          setConfig(configData)
        }
      }

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysSinceContact = (lastContactDate: string) => {
    const today = new Date(currentTime)
    today.setHours(0, 0, 0, 0)
    const contactDate = new Date(lastContactDate)
    contactDate.setHours(0, 0, 0, 0)
    const diffTime = today.getTime() - contactDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays < 0 ? 0 : diffDays
  }

  const getContactStatus = (lastContactDate: string) => {
    const days = getDaysSinceContact(lastContactDate)
    if (days <= (config?.green_days || 7)) return 'green'
    if (days <= (config?.yellow_days || 14)) return 'yellow'
    return 'red'
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const statusColors = {
    green: { bg: '#10B981', text: 'Al día', emoji: '🟢' },
    yellow: { bg: '#F59E0B', text: 'Atención', emoji: '🟡' },
    red: { bg: '#EF4444', text: 'Urgente', emoji: '🔴' }
  }

  if (loading || navigating) {
    const message = navigating === 'back' ? 'Saliendo...' : navigating === 'logout' ? 'Cerrando...' : 'Cargando datos...'
    return (
      <div className="loading-overlay-fixed" style={{ background: '#F9FAFB' }}>
        <div style={{ textAlign: 'center' }}>
          <img 
            src="/icons/iconocargar1.svg" 
            alt="Cargando" 
            style={{ 
              width: '64px', 
              height: '64px', 
              marginBottom: '16px',
              animation: 'spin 0.7s linear infinite'
            }} 
          />
          <p style={{ color: '#6B7280', fontSize: '18px' }}>{message}</p>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!sympathizer) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#F9FAFB'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <p style={{ color: '#6B7280', fontSize: '18px' }}>Simpatizante no encontrado</p>
          <button 
            onClick={() => {
              setNavigating('back')
              router.push('/dashboard')
            }}
            style={{ 
              marginTop: '16px', 
              padding: '12px 24px', 
              background: '#2563EB', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              fontSize: '16px',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <img src="/icons/iconoatras-blanco.svg" alt="Volver" style={{ width: '28px', height: '28px', marginRight: '8px' }} /> Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  const status = getContactStatus(sympathizer.last_contact_date)

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {/* Header */}
      <div className="bg-emerald-800 py-2 px-4 sm:px-6 lg:px-8 text-white shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 flex items-center gap-2">
                <span>👤</span> 
                <span className="hidden sm:inline">Detalle de Simpatizante</span>
                <span className="sm:hidden">Detalle</span>
              </h1>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button 
                onClick={() => {
                  setNavigating('back')
                  router.push('/dashboard')
                }}
                className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
              >
                <img src="/icons/iconoatras-blanco.svg" alt="Volver" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 mr-2 flex-shrink-0" /> 
                <span className="hidden sm:inline">Volver</span>
                <span className="sm:hidden">Volver</span>
              </button>
              <button 
                onClick={() => {
                  setNavigating('logout')
                  handleLogout()
                }}
                className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
              >
                <img src="/icons/salir1.svg" alt="Salir" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 mr-2 flex-shrink-0" /> 
                <span className="hidden sm:inline">Salir</span>
                <span className="sm:hidden">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Contenido sin bordes ni fondos */}
        <div>
          {/* Avatar, Nombre y Estado en horizontal */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Avatar */}
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full text-white flex items-center justify-center text-2xl sm:text-3xl font-bold flex-shrink-0`} style={{ background: statusColors[status].bg }}>
              {sympathizer.name.substring(0, 2).toUpperCase()}
            </div>
            
            {/* Nombre y Estado */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2 sm:mb-3">
                {sympathizer.name}
              </h2>
              
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${
                status === 'green' ? 'bg-emerald-50 text-emerald-800' : 
                status === 'yellow' ? 'bg-amber-50 text-amber-800' : 
                'bg-red-50 text-red-800'
              }`}>
                {statusColors[status].emoji} {getDaysSinceContact(sympathizer.last_contact_date) === 0 
                  ? 'Contactado hoy' 
                  : getDaysSinceContact(sympathizer.last_contact_date) === 1 
                    ? 'Hace 1 día' 
                    : `Hace ${getDaysSinceContact(sympathizer.last_contact_date)} días`}
              </div>
            </div>
          </div>

          {/* Información en lista vertical ordenada */}
          <div className="text-left space-y-4 sm:space-y-5">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-400 mb-1 sm:mb-2 uppercase tracking-wider">Teléfono</p>
              <p className="text-sm sm:text-base lg:text-lg text-gray-800 font-medium">
                {sympathizer.phone || 'No registrado'}
              </p>
            </div>
            
            <div>
              <p className="text-[10px] sm:text-xs text-gray-400 mb-1 sm:mb-2 uppercase tracking-wider">Email</p>
              <p className="text-sm sm:text-base lg:text-lg text-gray-800 font-medium break-all">
                {sympathizer.email || 'No registrado'}
              </p>
            </div>
            
            <div>
              <p className="text-[10px] sm:text-xs text-gray-400 mb-1 sm:mb-2 uppercase tracking-wider">Ciudad</p>
              <p className="text-sm sm:text-base lg:text-lg text-gray-800 font-medium">
                {sympathizer.city || 'No registrada'}
              </p>
            </div>
            
            <div>
              <p className="text-[10px] sm:text-xs text-gray-400 mb-1 sm:mb-2 uppercase tracking-wider">Último Contacto</p>
              <p className="text-sm sm:text-base lg:text-lg text-gray-800 font-medium">
                {new Date(sympathizer.last_contact_date).toLocaleDateString('es-ES', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            
            <div>
              <p className="text-[10px] sm:text-xs text-gray-400 mb-1 sm:mb-2 uppercase tracking-wider">Responsable Asignado</p>
              <p className="text-sm sm:text-base lg:text-lg text-gray-800 font-medium">
                {responsible ? responsible.name : 'Sin asignar'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
