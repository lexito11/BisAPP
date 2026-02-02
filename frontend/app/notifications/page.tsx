'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { NotificationsConfig } from '@/types/database.types'

export default function NotificationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Configuración de notificaciones
  const [yellowEnabled, setYellowEnabled] = useState(true)
  const [yellowTime, setYellowTime] = useState('09:00')
  const [yellowEmail, setYellowEmail] = useState(true)
  const [yellowDays, setYellowDays] = useState<string[]>(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])
  
  const [redEnabled, setRedEnabled] = useState(true)
  // Horarios fijos obligatorios para Estado Urgente: 8:00 AM, 1:00 PM, 5:00 PM
  const [redTime1, setRedTime1] = useState('08:00')
  const [redTime2, setRedTime2] = useState('13:00')
  const [redTime3, setRedTime3] = useState('17:00')
  const [redEmail, setRedEmail] = useState(true)
  const [redPush, setRedPush] = useState(true)
  const [redDays, setRedDays] = useState<string[]>(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])
  
  // Estado para colapsable
  const [showNotifConfig, setShowNotifConfig] = useState(false)
  
  // Datos reales de la BD
  const [sympathizers, setSympathizers] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [visits, setVisits] = useState<any[]>([])
  const [pastVisits, setPastVisits] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [configId, setConfigId] = useState<string | null>(null)

  // Formulario programar visita
  const [selectedSympathizer, setSelectedSympathizer] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [visitTime, setVisitTime] = useState('')
  const [visitResponsible, setVisitResponsible] = useState('')
  const [visitNotes, setVisitNotes] = useState('')
  const [programmingVisit, setProgrammingVisit] = useState(false)
  const [visitError, setVisitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [navigating, setNavigating] = useState<'back' | 'logout' | null>(null)
  const [pastVisitsFilter, setPastVisitsFilter] = useState<'all' | 'completed' | 'cancelled' | 'alphabetical'>('all')
  const [visitsProgramadasSearch, setVisitsProgramadasSearch] = useState('')
  const visitsProgramadasSearchRef = useRef<HTMLInputElement>(null)

  const daysOfWeek = [
    { value: 'monday', label: 'Lunes' },
    { value: 'tuesday', label: 'Martes' },
    { value: 'wednesday', label: 'Miércoles' },
    { value: 'thursday', label: 'Jueves' },
    { value: 'friday', label: 'Viernes' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' },
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }

      // Cargar usuario actual
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      setCurrentUser(userData)

      if (!userData) return

      // Cargar configuración de notificaciones
      const { data: notifConfig } = await supabase
        .from('notifications_config')
        .select('*')
        .eq('church_id', userData.church_id)
        .single()

      if (notifConfig) {
        setConfigId(notifConfig.id)
        setYellowEnabled(notifConfig.yellow_enabled)
        setYellowTime(notifConfig.yellow_time)
        setYellowEmail(notifConfig.yellow_email)
        setYellowDays(notifConfig.yellow_days || ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])
        setRedEnabled(notifConfig.red_enabled)
        setRedTime1(notifConfig.red_time1 || '08:00')
        setRedTime2(notifConfig.red_time2 || '13:00')
        setRedTime3(notifConfig.red_time3 || '17:00')
        setRedEmail(notifConfig.red_email)
        setRedPush(notifConfig.red_push)
        setRedDays(notifConfig.red_days || ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])
      }

      // Cargar simpatizantes
      const { data: sympathizersData } = await supabase
        .from('sympathizers')
        .select('*')
        .eq('church_id', userData.church_id)
        .order('name', { ascending: true })

      setSympathizers(sympathizersData || [])

      // Cargar usuarios
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('church_id', userData.church_id)
        .order('name', { ascending: true })

      setUsers(usersData || [])

      // Cargar visitas programadas (pendientes)
      const { data: visitsData } = await supabase
        .from('visits')
        .select('*, sympathizers(id, name), users(id, name)')
        .eq('status', 'pending')
        .order('visit_date', { ascending: true })

      // Separar: vigentes vs pasadas (solo las pendientes)
      const now = new Date()
      const vigentes: any[] = []
      const pasadasPendientes: any[] = []

      if (visitsData) {
        for (const visit of visitsData) {
          const fechaHoraVisita = new Date(visit.visit_date + 'T' + (visit.visit_time || '23:59'))
          if (fechaHoraVisita < now) {
            pasadasPendientes.push(visit)
          } else {
            vigentes.push(visit)
          }
        }
        vigentes.sort((a, b) => {
          const da = new Date(a.visit_date + 'T' + (a.visit_time || '00:00')).getTime()
          const db = new Date(b.visit_date + 'T' + (b.visit_time || '00:00')).getTime()
          return da - db
        })
      }

      // Cargar visitas pasadas (completed y cancelled) para mostrarlas con su estado
      const { data: pastVisitsData } = await supabase
        .from('visits')
        .select('*, sympathizers(id, name), users(id, name)')
        .in('status', ['completed', 'cancelled'])
        .order('visit_date', { ascending: false })
        .limit(20)

      // Combinar pasadas pendientes + pasadas con estado
      const todasPasadas = [...pasadasPendientes, ...(pastVisitsData || [])]

      setVisits(vigentes)
      setPastVisits(todasPasadas)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const toggleDay = (day: string, type: 'yellow' | 'red') => {
    if (type === 'yellow') {
      if (yellowDays.includes(day)) {
        setYellowDays(yellowDays.filter(d => d !== day))
      } else {
        setYellowDays([...yellowDays, day])
      }
    } else {
      if (redDays.includes(day)) {
        setRedDays(redDays.filter(d => d !== day))
      } else {
        setRedDays([...redDays, day])
      }
    }
  }

  const handleProgramVisit = async (e: React.FormEvent) => {
    e.preventDefault()
    setVisitError('')
    setProgrammingVisit(true)

    try {
      if (!currentUser) throw new Error('No hay usuario activo')
      if (!selectedSympathizer) throw new Error('Selecciona un simpatizante')
      if (!visitResponsible) throw new Error('Selecciona un responsable')
      
      // Validar que la fecha y hora no sean pasadas
      const now = new Date()
      const selectedDateTime = new Date(`${visitDate}T${visitTime}`)
      
      if (selectedDateTime < now) {
        throw new Error('No puedes programar una visita en una fecha u hora que ya pasó')
      }

      const { error } = await supabase
        .from('visits')
        .insert({
          sympathizer_id: selectedSympathizer,
          responsible_user_id: visitResponsible,
          visit_date: visitDate,
          visit_time: visitTime,
          notes: visitNotes || null,
          status: 'pending',
        })

      if (error) throw error

      // Limpiar formulario
      setSelectedSympathizer('')
      setVisitDate('')
      setVisitTime('')
      setVisitResponsible('')
      setVisitNotes('')

      // Recargar visitas
      await loadData()

      // Mostrar mensaje de éxito
      setSuccessMessage('✓ Visita programada exitosamente')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      console.error('Error:', err)
      setVisitError(err.message || 'Error al programar visita')
    } finally {
      setProgrammingVisit(false)
    }
  }

  const handleSaveConfig = async () => {
    setLoading(true)

    try {
      if (!currentUser) throw new Error('No hay usuario activo')

      const configData = {
        church_id: currentUser.church_id,
        yellow_enabled: yellowEnabled,
        yellow_time: yellowTime,
        yellow_email: yellowEmail,
        yellow_days: yellowDays,
        red_enabled: redEnabled,
        red_time1: redTime1, // 08:00 AM - obligatorio
        red_time2: redTime2, // 1:00 PM - obligatorio
        red_time3: redTime3, // 5:00 PM - obligatorio
        red_email: redEmail,
        red_push: redPush,
        red_days: redDays,
      }

      if (configId) {
        // Actualizar existente
        const { error } = await supabase
          .from('notifications_config')
          .update(configData)
          .eq('id', configId)

        if (error) throw error
      } else {
        // Crear nueva
        const { data, error } = await supabase
          .from('notifications_config')
          .insert(configData)
          .select()
          .single()

        if (error) throw error
        setConfigId(data.id)
      }

      // Mostrar mensaje de éxito
      setSuccessMessage('✓ Configuración de notificaciones guardada')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      console.error('Error:', error)
      setSuccessMessage('✗ Error al guardar configuración')
      setTimeout(() => setSuccessMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (navigating) {
    const message = navigating === 'back' ? 'Saliendo...' : 'Cerrando...'
    return (
      <div className="loading-overlay-fixed" style={{ background: '#F9FAFB' }}>
        <div>
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

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {/* Header */}
      <div className="bg-emerald-800 py-2 px-4 sm:px-6 lg:px-8 text-white shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="w-full sm:w-auto">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 flex items-center gap-2 sm:gap-3">
                  <img src="/icons/notificacion2-rojo.svg" alt="Notificaciones" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 flex-shrink-0" />
                  <span className="hidden sm:inline">Gestión de Notificaciones<br className="hidden md:inline"/>y Visitas</span>
                  <span className="sm:hidden">Notificaciones y Visitas</span>
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
                  className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                  <img src="/icons/salir1.svg" alt="Salir" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 mr-2 flex-shrink-0" /> 
                  <span className="hidden sm:inline">Salir</span>
                  <span className="sm:hidden">Salir</span>
                </button>
              </div>
            </div>
            
            {/* Botón de configuración centrado */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowNotifConfig(!showNotifConfig)}
                className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base rounded-lg transition-all hover:scale-105 active:scale-95"
              >
                <img src="/icons/ajustesvisitas-blanco.svg" alt="Configuración" className="w-5 h-5 sm:w-6 sm:h-6 mr-2 flex-shrink-0" /> 
                <span className="hidden sm:inline">Configuración de Notificaciones</span>
                <span className="sm:hidden">Config Notificaciones</span>
                <span className="ml-2">{showNotifConfig ? '▲' : '▼'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* Notificación de éxito */}
        {successMessage && (
          <div style={{
            position: 'fixed',
            top: '90px',
            right: '24px',
            background: successMessage.includes('✓') ? '#ECFDF5' : '#FEE2E2',
            color: successMessage.includes('✓') ? '#065F46' : '#991B1B',
            padding: '16px 24px',
            borderRadius: '12px',
            border: `2px solid ${successMessage.includes('✓') ? '#10B981' : '#DC2626'}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            fontSize: '15px',
            fontWeight: '600',
            animation: 'slideIn 0.3s ease-out'
          }}>
            {successMessage}
          </div>
        )}
        
        {/* Configuración de Notificaciones (colapsable) */}
        {showNotifConfig && (
          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '20px' }}>
              🔕 Configuración de Notificaciones
            </h2>

            {/* Estado Urgente */}
            <div style={{ padding: '20px', background: '#FEE2E2', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '24px' }}>🔴</span>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#991B1B' }}>Estado Urgente</h3>
                    <p style={{ fontSize: '13px', color: '#DC2626' }}>Simpatizantes en rojo - PRIORIDAD</p>
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={redEnabled}
                    onChange={(e) => setRedEnabled(e.target.checked)}
                    style={{ width: '48px', height: '24px' }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '13px', color: '#991B1B', fontWeight: '600', marginBottom: '8px' }}>
                  Notificaciones obligatorias (3 horarios diarios):
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '16px' }}>🕐</span>
                    <input
                      type="time"
                      className="input"
                      value={redTime1}
                      onChange={(e) => setRedTime1(e.target.value)}
                      style={{ 
                        width: '140px',
                        padding: '8px 12px',
                        border: '2px solid #DC2626',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#991B1B'
                      }}
                    />
                  </div>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '16px' }}>🕐</span>
                    <input
                      type="time"
                      className="input"
                      value={redTime2}
                      onChange={(e) => setRedTime2(e.target.value)}
                      style={{ 
                        width: '140px',
                        padding: '8px 12px',
                        border: '2px solid #DC2626',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#991B1B'
                      }}
                    />
                  </div>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '16px' }}>🕐</span>
                    <input
                      type="time"
                      className="input"
                      value={redTime3}
                      onChange={(e) => setRedTime3(e.target.value)}
                      style={{ 
                        width: '140px',
                        padding: '8px 12px',
                        border: '2px solid #DC2626',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#991B1B'
                      }}
                    />
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" checked={redEmail} onChange={(e) => setRedEmail(e.target.checked)} />
                  Notificación por correo
                </label>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '14px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" checked={redPush} onChange={(e) => setRedPush(e.target.checked)} />
                  Notificación push (móvil)
                </label>
              </div>
              <div>
                <p style={{ fontSize: '13px', color: '#991B1B', fontWeight: '600', marginBottom: '8px' }}>
                  Días de la semana:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {daysOfWeek.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value, 'red')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '2px solid',
                        borderColor: redDays.includes(day.value) ? '#DC2626' : '#E5E7EB',
                        background: redDays.includes(day.value) ? '#FEE2E2' : '#FFFFFF',
                        color: redDays.includes(day.value) ? '#991B1B' : '#6B7280',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Estado Atención */}
            <div style={{ padding: '20px', background: '#FEF3C7', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '24px' }}>🟡</span>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#92400E' }}>Estado Atención</h3>
                    <p style={{ fontSize: '13px', color: '#D97706' }}>Simpatizantes en amarillo</p>
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={yellowEnabled}
                    onChange={(e) => setYellowEnabled(e.target.checked)}
                    style={{ width: '48px', height: '24px' }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <input 
                  type="time" 
                  className="input"
                  value={yellowTime}
                  onChange={(e) => setYellowTime(e.target.value)}
                  style={{ width: '150px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '14px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" checked={yellowEmail} onChange={(e) => setYellowEmail(e.target.checked)} />
                  Notificación por correo
                </label>
              </div>
              <div>
                <p style={{ fontSize: '13px', color: '#92400E', fontWeight: '600', marginBottom: '8px' }}>
                  Días de la semana:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {daysOfWeek.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value, 'yellow')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '2px solid',
                        borderColor: yellowDays.includes(day.value) ? '#F59E0B' : '#E5E7EB',
                        background: yellowDays.includes(day.value) ? '#FEF3C7' : '#FFFFFF',
                        color: yellowDays.includes(day.value) ? '#92400E' : '#6B7280',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={handleSaveConfig}
              className="btn btn-primary"
              style={{ 
                width: '100%',
                background: '#C026D3',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              disabled={loading}
            >
              {loading ? '⏳ Guardando...' : '💾 Guardar Configuración'}
            </button>

            {/* Nota sobre notificación obligatoria */}
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: '#DBEAFE', 
              borderRadius: '8px',
              border: '1px solid #BFDBFE'
            }}>
              <p style={{ fontSize: '13px', color: '#1E40AF', fontWeight: '500' }}>
                ℹ️ <strong>Notificación obligatoria:</strong> 1 hora antes de cada visita programada se enviará automáticamente email, SMS y notificación en la app.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Visitas programadas */}
          <div>
            <div className="card" style={{ padding: '24px', background: '#2563EB', border: 'none', boxShadow: 'none', outline: 'none', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: '600', color: 'white', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  <img src="/icons/iconocalendario2-verde.svg" alt="Visitas programadas" style={{ width: '32px', height: '32px' }} /> Visitas programadas
                </h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'default',
                      background: '#047858',
                      color: 'white'
                    }}
                  >
                    Por fecha
                  </button>
                  <button
                    type="button"
                    onClick={() => visitsProgramadasSearchRef.current?.focus()}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      background: visitsProgramadasSearch.trim() ? '#047858' : 'rgba(255,255,255,0.2)',
                      color: 'white',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!visitsProgramadasSearch.trim()) {
                        e.currentTarget.style.background = '#047858'
                      }
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }}
                    onMouseLeave={(e) => {
                      if (!visitsProgramadasSearch.trim()) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                      }
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    Por nombre
                  </button>
                  <input
                    ref={visitsProgramadasSearchRef}
                    type="text"
                    placeholder="Buscar..."
                    value={visitsProgramadasSearch}
                    onChange={(e) => setVisitsProgramadasSearch(e.target.value)}
                    style={{
                      width: '140px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.4)',
                      background: 'rgba(255,255,255,0.15)',
                      color: 'white',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
                {(() => {
                  const q = visitsProgramadasSearch.trim().toLowerCase()
                  const filtered = q
                    ? visits.filter((v) => {
                        const sym = (v.sympathizers?.name || '').toLowerCase()
                        const lead = (v.responsible?.name || v.users?.name || '').toLowerCase()
                        return sym.includes(q) || lead.includes(q)
                      })
                    : visits
                  if (filtered.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                        <p>{q ? 'No hay resultados para la búsqueda' : 'No hay visitas programadas'}</p>
                      </div>
                    )
                  }
                  return filtered.map((visit) => {
                    const sympathizerName = visit.sympathizers?.name || 'Simpatizante'
                    const responsibleName = visit.responsible?.name || visit.users?.name || 'Sin asignar'
                    
                    // Calcular días restantes hasta la visita
                    const today = new Date()
                    const visitDate = new Date(visit.visit_date)
                    const diffTime = visitDate.getTime() - today.getTime()
                    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                    
                    // Determinar prioridad según días restantes
                    let statusLabel = 'Puede esperar'
                    let borderColor = '#059669'
                    let bgColor = '#ECFDF5'
                    let textColor = '#065F46'
                    
                    if (daysRemaining <= 3) {
                      statusLabel = 'Urgente'
                      borderColor = '#DC2626'
                      bgColor = '#FEE2E2'
                      textColor = '#991B1B'
                    } else if (daysRemaining <= 7) {
                      statusLabel = 'Requiere seguimiento'
                      borderColor = '#F59E0B'
                      bgColor = '#FEF3C7'
                      textColor = '#92400E'
                    }

                    // Colores vibrantes para avatar (rotar entre diferentes colores)
                    const avatarColors = ['#4F46E5', '#BE185D', '#059669', '#26D99C', '#EC4899', '#8B5CF6', '#F59E0B', '#10B981']
                    const avatarIndex = visit.id ? parseInt(visit.id.slice(-1)) % avatarColors.length : Math.floor(Math.random() * avatarColors.length)
                    
                    // Formatear fecha para mostrar
                    const visitDateObj = new Date(visit.visit_date)
                    const formattedDate = visitDateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                    const visitTimeFormatted = visit.visit_time || '12:00 PM'
                    
                    // Determinar texto y color del tag según días restantes usando colores del sistema
                    let tagText = statusLabel
                    let tagBgColor = bgColor
                    let tagTextColor = textColor
                    
                    if (daysRemaining === 1) {
                      tagText = 'Mañana'
                      tagBgColor = '#DBEAFE' // Azul claro
                      tagTextColor = '#1E40AF' // Azul oscuro
                    } else if (daysRemaining === 0) {
                      tagText = 'Hoy'
                      tagBgColor = '#FEF3C7' // Amarillo claro
                      tagTextColor = '#92400E' // Amarillo oscuro
                    } else if (daysRemaining <= 3) {
                      tagText = 'Urgente'
                      tagBgColor = '#FEE2E2' // Rojo claro (del sistema)
                      tagTextColor = '#991B1B' // Rojo oscuro (del sistema)
                    } else if (daysRemaining > 7) {
                      tagText = formattedDate.split(' ')[0] + ' ' + formattedDate.split(' ')[1]
                      tagBgColor = '#F3F4F6' // Gris claro
                      tagTextColor = '#374151' // Gris oscuro
                    }

                    return (
                      <div key={visit.id} style={{ 
                        padding: '10px 12px', 
                        background: '#FFFFFF',
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: 'none',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}>
                        <div style={{ 
                          width: '44px', 
                          height: '44px', 
                          borderRadius: '50%', 
                          background: '#2DD4BF',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '15px',
                          fontWeight: '700',
                          flexShrink: 0
                        }}>
                          {sympathizerName.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <p style={{ fontWeight: '700', color: '#1F2937', fontSize: '16px', margin: 0 }}>
                              {sympathizerName}
                            </p>
                          </div>
                          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '4px', marginTop: '0' }}>
                            Líder: {responsibleName}
                          </p>
                          <div style={{ fontSize: '14px', color: '#374151', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                              <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            <span>{formattedDate.split(' ')[0]} {formattedDate.split(' ')[1]} {formattedDate.split(' ')[2]} - {visitTimeFormatted}</span>
                          </div>
                          {visit.notes && (
                            <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '2px' }}>
                              {visit.notes}
                            </div>
                          )}
                        </div>
                        <span style={{ 
                          padding: '6px 12px',
                          background: daysRemaining >= 0 ? 'rgba(37, 99, 235, 0.35)' : '#E5E7EB',
                          color: '#374151',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          border: 'none',
                          alignSelf: 'flex-start'
                        }}>
                          {formattedDate.split(' ')[0]} {formattedDate.split(' ')[1]}
                        </span>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>

            {/* Visitas Pasadas */}
            <div className="card" style={{ padding: '24px', background: '#2563EB', border: 'none', boxShadow: 'none', outline: 'none', marginTop: '16px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: '600', color: 'white', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  <img src="/icons/alarmavisitas-colores.svg" alt="Visitas Pasadas" style={{ width: '32px', height: '32px' }} /> Visitas Pasadas
                </h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setPastVisitsFilter('completed')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '15px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      background: pastVisitsFilter === 'completed' ? '#047858' : 'rgba(255,255,255,0.2)',
                      color: 'white',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (pastVisitsFilter !== 'completed') {
                        e.currentTarget.style.background = '#047858'
                      }
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }}
                    onMouseLeave={(e) => {
                      if (pastVisitsFilter !== 'completed') {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                      }
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    Realizadas
                  </button>
                  <button
                    onClick={() => setPastVisitsFilter('cancelled')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '15px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      background: pastVisitsFilter === 'cancelled' ? '#047858' : 'rgba(255,255,255,0.2)',
                      color: 'white',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (pastVisitsFilter !== 'cancelled') {
                        e.currentTarget.style.background = '#047858'
                      }
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }}
                    onMouseLeave={(e) => {
                      if (pastVisitsFilter !== 'cancelled') {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                      }
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    No realizadas
                  </button>
                  <button
                    onClick={() => setPastVisitsFilter('alphabetical')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '15px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      background: pastVisitsFilter === 'alphabetical' ? '#047858' : 'rgba(255,255,255,0.2)',
                      color: 'white',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (pastVisitsFilter !== 'alphabetical') {
                        e.currentTarget.style.background = '#047858'
                      }
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }}
                    onMouseLeave={(e) => {
                      if (pastVisitsFilter !== 'alphabetical') {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                      }
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    Abecedario
                  </button>
                  {pastVisitsFilter !== 'all' && (
                    <button
                      onClick={() => setPastVisitsFilter('all')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '15px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        background: '#DC2626',
                        color: 'white',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      ✕ Limpiar
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
                {(() => {
                  // Filtrar y ordenar las visitas pasadas
                  let filteredVisits = [...pastVisits]
                  
                  if (pastVisitsFilter === 'completed') {
                    filteredVisits = filteredVisits.filter(v => v.status === 'completed')
                  } else if (pastVisitsFilter === 'cancelled') {
                    filteredVisits = filteredVisits.filter(v => v.status === 'cancelled')
                  } else if (pastVisitsFilter === 'alphabetical') {
                    filteredVisits = filteredVisits.sort((a, b) => {
                      // 1. Primero ordenar por nombre (A-Z)
                      const nameA = (a.sympathizers?.name || '').toLowerCase()
                      const nameB = (b.sympathizers?.name || '').toLowerCase()
                      const nameCompare = nameA.localeCompare(nameB)
                      if (nameCompare !== 0) return nameCompare
                      
                      // 2. Dentro del mismo nombre, primero las realizadas
                      const statusOrder = { completed: 0, cancelled: 1, pending: 2 }
                      const statusA = statusOrder[a.status as keyof typeof statusOrder] ?? 2
                      const statusB = statusOrder[b.status as keyof typeof statusOrder] ?? 2
                      if (statusA !== statusB) return statusA - statusB
                      
                      // 3. Dentro del mismo estado, ordenar por fecha (más reciente primero)
                      const dateA = new Date(a.visit_date).getTime()
                      const dateB = new Date(b.visit_date).getTime()
                      return dateB - dateA
                    })
                  }
                  
                  return filteredVisits.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.7)' }}>
                      <p>{pastVisitsFilter === 'all' ? 'No hay visitas pasadas' : `No hay visitas ${pastVisitsFilter === 'completed' ? 'realizadas' : 'no realizadas'}`}</p>
                    </div>
                  ) : (
                    filteredVisits.map((visit) => {
                    const sympathizerName = visit.sympathizers?.name || 'Simpatizante'
                    const responsibleName = visit.responsible?.name || visit.users?.name || 'Sin asignar'
                    const visitDateObj = new Date(visit.visit_date)
                    const formattedDate = visitDateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                    const visitTimeFormatted = visit.visit_time || '12:00'
                    
                    // Determinar color de fondo según estado
                    let bgColor = '#FFFFFF' // pendiente
                    let avatarColor = '#EF4444'
                    let textColor = '#1F2937'
                    if (visit.status === 'completed') {
                      bgColor = '#FFFFFF' // blanco
                      avatarColor = '#10B981'
                      textColor = '#1F2937'
                    } else if (visit.status === 'cancelled') {
                      bgColor = '#1F2937' // negro/gris oscuro
                      avatarColor = '#EF4444'
                      textColor = '#FFFFFF'
                    }

                    return (
                      <div key={visit.id} style={{ 
                        padding: '12px', 
                        background: bgColor,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%', 
                          background: avatarColor,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: '700',
                          flexShrink: 0
                        }}>
                          {sympathizerName.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: '600', color: textColor, fontSize: '15px', marginBottom: '2px', margin: 0 }}>
                            {sympathizerName}
                            {visit.status === 'completed' && <span style={{ marginLeft: '8px', color: '#059669', fontSize: '12px' }}>✓ Realizada</span>}
                            {visit.status === 'cancelled' && <span style={{ marginLeft: '8px', color: '#EF4444', fontSize: '12px' }}>✗ No se hizo</span>}
                          </p>
                          <p style={{ fontSize: '13px', color: visit.status === 'cancelled' ? '#9CA3AF' : '#6B7280', marginBottom: '4px', marginTop: '2px' }}>
                            Líder: {responsibleName}
                          </p>
                          <p style={{ fontSize: '12px', color: visit.status === 'cancelled' ? '#9CA3AF' : '#6B7280' }}>
                            {formattedDate} - {visitTimeFormatted}
                          </p>
                        </div>
                        {currentUser?.role === 'admin' && (visit.click_count || 0) < 2 && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={async () => {
                                try {
                                  const newCount = (visit.click_count || 0) + 1
                                  await supabase.from('visits').update({ status: 'completed', click_count: newCount }).eq('id', visit.id)
                                  await loadData()
                                } catch (err) {
                                  console.error(err)
                                }
                              }}
                              style={{
                                padding: '4px 10px',
                                background: visit.status === 'completed' ? '#059669' : '#10B981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                opacity: visit.status === 'completed' ? 0.7 : 1
                              }}
                            >
                              ✓ Realizada
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const newCount = (visit.click_count || 0) + 1
                                  await supabase.from('visits').update({ status: 'cancelled', click_count: newCount }).eq('id', visit.id)
                                  await loadData()
                                } catch (err) {
                                  console.error(err)
                                }
                              }}
                              style={{
                                padding: '4px 10px',
                                background: visit.status === 'cancelled' ? '#DC2626' : '#6B7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                opacity: visit.status === 'cancelled' ? 0.7 : 1
                              }}
                            >
                              ✗ No se hizo
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Programar Nueva Visita */}
          <div>
            <div className="card" style={{ padding: '24px', border: 'none', boxShadow: 'none', outline: 'none' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#1F2937', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/icons/iconocalendario3-azul.svg" alt="Programar Visita" style={{ width: '32px', height: '32px' }} /> Programar Nueva Visita
              </h2>

              <form onSubmit={handleProgramVisit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                    Simpatizante *
                  </label>
                  <select 
                    className="input" 
                    style={{ width: '100%', padding: '8px 12px', marginBottom: 0 }}
                    value={selectedSympathizer}
                    onChange={(e) => setSelectedSympathizer(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar simpatizante...</option>
                    {sympathizers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                    Fecha de la Visita *
                  </label>
                  <input 
                    type="date" 
                    className="input" 
                    style={{ width: '100%', padding: '8px 12px', marginBottom: 0 }}
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                    Hora de la Visita *
                  </label>
                  <input 
                    type="time" 
                    className="input" 
                    style={{ width: '100%', padding: '8px 12px', marginBottom: 0 }}
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                    Responsable *
                  </label>
                  <select 
                    className="input" 
                    style={{ width: '100%', padding: '8px 12px', marginBottom: 0 }}
                    value={visitResponsible}
                    onChange={(e) => setVisitResponsible(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar líder...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                    Notas de la visita, temas a tratar...
                  </label>
                  <textarea 
                    className="input" 
                    rows={3} 
                    style={{ width: '100%', resize: 'vertical', padding: '8px 12px', marginBottom: 0, minHeight: '120px' }}
                    placeholder="Escribir aquí los detalles del contacto o cualquier observación importante..."
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                  />
                </div>

                {visitError && (
                  <div style={{ 
                    padding: '12px', 
                    background: '#FEE2E2', 
                    color: '#991B1B', 
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '14px'
                  }}>
                    ⚠️ {visitError}
                  </div>
                )}

                <button 
                  type="submit"
                  className="btn btn-primary"
                  style={{ 
                    width: '100%',
                    background: '#2563EB',
                    padding: '14px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  disabled={programmingVisit}
                >
                  {programmingVisit ? '⏳ Programando...' : '📅 Programar Visita'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Sistema de Notificaciones Inteligente */}
        <div className="card" style={{ marginTop: '24px', padding: '24px', background: '#FEF3C7', border: '1px solid #FDE68A' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#92400E', marginBottom: '12px' }}>
            ⚡ Sistema de Notificaciones Inteligente
          </h3>
          <ul style={{ fontSize: '14px', color: '#92400E', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li><strong>Estado Atención (Amarillo):</strong> Notificación diaria para recordar seguimiento</li>
            <li><strong>Estado Urgente (Rojo):</strong> Múltiples notificaciones diarias - PRIORIDAD MÁXIMA</li>
            <li><strong>Visitas Programadas:</strong> Recordatorios automáticos el día anterior y día del evento</li>
            <li><strong>Notificación obligatoria:</strong> 1 hora antes de cada visita → Email, SMS y App</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
