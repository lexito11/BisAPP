'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { Visit, Sympathizer, User } from '@/types/database.types'

export default function SeguimientosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [visits, setVisits] = useState<(Visit & { sympathizers?: Sympathizer; users?: User })[]>([])
  const [completedVisits, setCompletedVisits] = useState<(Visit & { sympathizers?: Sympathizer; users?: User })[]>([])
  const [cancelledVisits, setCancelledVisits] = useState<(Visit & { sympathizers?: Sympathizer; users?: User })[]>([])
  const [noReturnSympathizers, setNoReturnSympathizers] = useState<(Sympathizer & { marked_date?: string; reason?: string; users?: User })[]>([])
  const [baptizedSympathizers, setBaptizedSympathizers] = useState<(Sympathizer & { baptism_date?: string; users?: User })[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [navigating, setNavigating] = useState<'back' | 'logout' | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
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

      // Cargar todas las visitas con información relacionada
      // Primero obtenemos los simpatizantes de la iglesia
      const { data: sympathizersData } = await supabase
        .from('sympathizers')
        .select('id')
        .eq('church_id', userData.church_id)

      const sympathizerIds = sympathizersData?.map(s => s.id) || []

      // Luego obtenemos las visitas de esos simpatizantes
      const { data: visitsData } = await supabase
        .from('visits')
        .select('*, sympathizers(*), users!visits_responsible_user_id_fkey(*)')
        .in('sympathizer_id', sympathizerIds)
        .order('visit_date', { ascending: false })

      if (visitsData) {
        const completed = visitsData.filter((v: any) => v.status === 'completed')
        const cancelled = visitsData.filter((v: any) => v.status === 'cancelled')
        setCompletedVisits(completed)
        setCancelledVisits(cancelled)
        setVisits(visitsData)
      }

      // Cargar simpatizantes que no volvieron
      const { data: noReturnData } = await supabase
        .from('sympathizers')
        .select('*, users!sympathizers_responsible_user_id_fkey(*)')
        .eq('church_id', userData.church_id)
        .eq('did_not_return', true)
        .order('did_not_return_date', { ascending: false })

      if (noReturnData) {
        setNoReturnSympathizers(noReturnData.map(s => ({
          ...s,
          marked_date: s.did_not_return_date,
          reason: s.no_return_reason
        })))
      }

      // Cargar simpatizantes bautizados
      const { data: baptizedData } = await supabase
        .from('sympathizers')
        .select('*, users!sympathizers_responsible_user_id_fkey(*)')
        .eq('church_id', userData.church_id)
        .eq('baptized', true)
        .order('baptism_date', { ascending: false })

      if (baptizedData) {
        setBaptizedSympathizers(baptizedData)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase()
  }

  if (loading || navigating) {
    const message = navigating === 'back' ? 'Saliendo...' : navigating === 'logout' ? 'Cerrando...' : 'Cargando datos...'
    return (
      <div className="loading-overlay-fixed" style={{ background: '#FFFFFF' }}>
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
          <p style={{ color: '#6B7280', fontSize: '20px' }}>{message}</p>
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
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      {/* Header */}
      <div className="bg-emerald-800 py-2 px-4 sm:px-6 lg:px-8 text-white shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 flex items-center gap-2 sm:gap-3">
                <img src="/icons/segumiento1.svg" alt="Seguimiento" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 flex-shrink-0" /> 
                <span>Seguimiento</span>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* 4 Columnas: Cada tarjeta de color arriba de su lista */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Columna 1: Visitas Completadas */}
          <div>
            <div className="card" style={{ padding: '20px', background: '#065F46', border: 'none', boxShadow: 'none', borderRadius: '12px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '4px', color: 'white' }}>✓</div>
              <p style={{ fontSize: '32px', fontWeight: '700', color: 'white', margin: 0 }}>
                {completedVisits.length}
              </p>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'white', margin: '4px 0 0 0' }}>Visitas completadas</p>
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-base sm:text-lg">📋✓</span> 
              <span className="hidden sm:inline">Visitas Realizadas Recientes</span>
              <span className="sm:hidden">Realizadas</span>
            </h2>
            <div className="flex flex-col gap-0">
              {completedVisits.length === 0 ? (
                <p className="text-center py-3 text-gray-400 text-sm sm:text-base">No hay visitas completadas</p>
              ) : (
                completedVisits.slice(0, 5).map((visit) => {
                  const sympathizerName = visit.sympathizers?.name || 'Simpatizante'
                  const responsibleName = visit.users?.name || 'Sin asignar'

                  return (
                    <div key={visit.id} className="py-2 flex items-center gap-2 border-b border-gray-200">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-400 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0">
                        {getInitials(sympathizerName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{sympathizerName}</p>
                        <p className="text-xs sm:text-sm text-gray-500 truncate hidden sm:block">{responsibleName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap hidden sm:inline">{formatDate(visit.visit_date)}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs sm:text-sm font-semibold">
                          ✓
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Columna 2: Visitas Canceladas */}
          <div>
            <div className="card" style={{ padding: '20px', background: '#DC2626', border: 'none', boxShadow: 'none', borderRadius: '12px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '4px', color: 'white' }}>✗</div>
              <p style={{ fontSize: '32px', fontWeight: '700', color: 'white', margin: 0 }}>
                {cancelledVisits.length}
              </p>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'white', margin: '4px 0 0 0' }}>Visitas canceladas</p>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📋✗</span> Visitas No Realizadas
            </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {cancelledVisits.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '12px', color: '#9CA3AF', fontSize: '15px' }}>No hay visitas canceladas</p>
                ) : (
                  cancelledVisits.slice(0, 5).map((visit) => {
                    const sympathizerName = visit.sympathizers?.name || 'Simpatizante'
                    const responsibleName = visit.users?.name || 'Sin asignar'

                    return (
                      <div key={visit.id} style={{ 
                        padding: '8px 0', 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderBottom: '1px solid #E5E7EB'
                      }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: '#FB923C',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: '700',
                          flexShrink: 0
                        }}>
                          {getInitials(sympathizerName)}
                        </div>
                        <span style={{ fontWeight: '600', color: '#1F2937', fontSize: '15px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sympathizerName}
                        </span>
                        <span style={{ fontSize: '14px', color: '#6B7280', flexShrink: 0 }}>
                          {responsibleName}
                        </span>
                        <span style={{ fontSize: '13px', color: '#6B7280', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {formatDate(visit.visit_date)}
                        </span>
                        <span style={{ 
                          padding: '3px 8px',
                          background: '#FEE2E2',
                          color: '#991B1B',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: '600',
                          flexShrink: 0
                        }}>
                          ✗
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
          </div>

          {/* Columna 3: No Volvieron */}
          <div>
            <div className="card" style={{ padding: '20px', background: '#fbbf24', border: 'none', boxShadow: 'none', borderRadius: '12px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '4px', filter: 'brightness(0) invert(1)' }}>👥</div>
              <p style={{ fontSize: '32px', fontWeight: '700', color: 'white', margin: 0 }}>
                {noReturnSympathizers.length}
              </p>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'white', margin: '4px 0 0 0' }}>Los que no volvieron</p>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>👥</span> Lista - No Volvieron
            </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {noReturnSympathizers.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '12px', color: '#9CA3AF', fontSize: '15px' }}>No hay simpatizantes marcados como "No Volvieron"</p>
                ) : (
                  noReturnSympathizers.map((sympathizer) => {
                    const responsibleName = sympathizer.users?.name || 'Sin asignar'

                    return (
                      <div key={sympathizer.id} style={{ 
                        padding: '8px 0', 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderBottom: '1px solid #E5E7EB'
                      }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: '#9CA3AF',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: '700',
                          flexShrink: 0
                        }}>
                          {getInitials(sympathizer.name)}
                        </div>
                        <span style={{ fontWeight: '600', color: '#1F2937', fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sympathizer.name}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6B7280', flexShrink: 0 }}>
                          {responsibleName}
                        </span>
                        <button
                          onClick={async () => {
                            if (confirm(`¿Estás seguro de marcar a "${sympathizer.name}" como "Volvió"?`)) {
                              try {
                                const { error } = await supabase
                                  .from('sympathizers')
                                  .update({ 
                                    did_not_return: false, 
                                    did_not_return_date: null,
                                    no_return_reason: null
                                  })
                                  .eq('id', sympathizer.id)
                                
                                if (error) throw error
                                await loadData()
                              } catch (error: any) {
                                console.error('Error:', error)
                              }
                            }
                          }}
                          style={{
                            padding: '3px 8px',
                            background: '#10B981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                        >
                          ✓ Volvió
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
          </div>

          {/* Columna 4: Bautizados */}
          <div>
            <div className="card" style={{ padding: '20px', background: '#2563EB', border: 'none', boxShadow: 'none', borderRadius: '12px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '4px', filter: 'brightness(0) invert(1)' }}>💧</div>
              <p style={{ fontSize: '32px', fontWeight: '700', color: 'white', margin: 0 }}>
                {baptizedSympathizers.length}
              </p>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'white', margin: '4px 0 0 0' }}>Los que se bautizaron</p>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>💧</span> Lista de Bautizados
            </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {baptizedSympathizers.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '12px', color: '#9CA3AF', fontSize: '15px' }}>No hay simpatizantes bautizados</p>
                ) : (
                  baptizedSympathizers.map((sympathizer) => {
                    const responsibleName = sympathizer.users?.name || 'Sin asignar'

                    return (
                      <div key={sympathizer.id} style={{ 
                        padding: '8px 0', 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderBottom: '1px solid #E5E7EB'
                      }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: '#2563EB',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: '700',
                          flexShrink: 0
                        }}>
                          {getInitials(sympathizer.name)}
                        </div>
                        <span style={{ fontWeight: '600', color: '#1F2937', fontSize: '15px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sympathizer.name}
                        </span>
                        <span style={{ fontSize: '14px', color: '#6B7280', flexShrink: 0 }}>
                          {responsibleName}
                        </span>
                        <span style={{ fontSize: '13px', color: '#6B7280', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {sympathizer.baptism_date ? formatDate(sympathizer.baptism_date) : ''}
                        </span>
                        <span style={{ 
                          padding: '3px 8px',
                          background: '#DBEAFE',
                          color: '#1E40AF',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: '600',
                          flexShrink: 0
                        }}>
                          💧
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
          </div>
        </div>

        {/* Información Cómo marcar No Volvió */}
        <div className="card" style={{ padding: '24px', marginTop: '24px', marginBottom: '12px', background: '#FEF3C7', border: 'none', boxShadow: 'none' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#92400E', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>❓</span> ¿Cómo marcar "No Volvió"?
          </h2>
          <p style={{ fontSize: '16px', color: '#92400E', lineHeight: '1.6', margin: 0 }}>
            Desde el detalle del simpatizante, el encargado puede presionar el botón "Marcar como No Volvió" para mover a esta sección. Esto ayuda a mantener un registro organizado.
          </p>
        </div>

        {/* Sección Inferior - Gestión de Seguimientos */}
        <div className="card" style={{ marginTop: '12px', padding: '24px', background: '#DBEAFE', border: 'none', boxShadow: 'none' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1E40AF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>ℹ️</span> Gestión de Seguimientos
          </h3>
          <div style={{ display: 'grid', gap: '12px', fontSize: '16px', color: '#1E40AF', lineHeight: '1.6' }}>
            <div>
              <strong>Visitas Realizadas:</strong> Se almacenan automáticamente en el historial del simpatizante cuando se marca como completada
            </div>
            <div>
              <strong>Visitas No Realizadas:</strong> Se registran con el motivo de cancelación para análisis y mejora del proceso
            </div>
            <div>
              <strong>Simpatizantes - No Volvieron:</strong> El encargado puede marcar desde el detalle del simpatizante con el botón "Marcar como No Volvió" para mantener un registro organizado
            </div>
            <div>
              <strong>Simpatizantes Bautizados:</strong> Los simpatizantes que han sido bautizados se registran automáticamente en esta sección con su fecha de bautismo
            </div>
            <div>
              <strong>Reportes:</strong> Toda esta información permite generar estadísticas y mejorar la estrategia de seguimiento
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
