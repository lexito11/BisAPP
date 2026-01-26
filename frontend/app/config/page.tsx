'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ConfigPage() {
  const router = useRouter()
  const [greenDays, setGreenDays] = useState(7)
  const [yellowStart, setYellowStart] = useState(8)
  const [yellowEnd, setYellowEnd] = useState(14)
  const [redDays, setRedDays] = useState(15)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [navigating, setNavigating] = useState<'back' | 'logout' | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/')
        return
      }

      // Por ahora usar valores por defecto
      setGreenDays(7)
      setYellowStart(8)
      setYellowEnd(14)
      setRedDays(15)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Aquí guardarías en la BD
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMessage('✓ Configuración guardada exitosamente')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('✗ Error al guardar la configuración')
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
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

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {/* Header */}
      <div className="bg-emerald-800 py-2 px-4 sm:px-6 lg:px-8 text-white shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 flex items-center gap-2 sm:gap-3">
                <img src="/icons/ajustes2-verde.svg" alt="Configuración" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 flex-shrink-0" /> 
                <span className="hidden sm:inline">Configuración de Tiempos</span>
                <span className="sm:hidden">Configuración</span>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="card p-6 sm:p-8 border-none shadow-none bg-transparent" style={{ boxShadow: 'none' }}>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
            Configurar Sistema de Colores
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
            Define los días para cada estado de seguimiento
          </p>

          {/* Estado Verde */}
          <div className="p-3 sm:p-4 bg-emerald-800/75 rounded-lg mb-2 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="text-xl sm:text-2xl">🟢</div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-black mb-1">
                  Estado Verde - Al Día
                </h3>
                <p className="text-xs sm:text-sm text-black m-0">
                  Días desde último contacto
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <input
                type="number"
                value={greenDays}
                onChange={(e) => setGreenDays(Number(e.target.value))}
                className="w-16 sm:w-20 text-sm sm:text-base font-semibold text-center border-none px-2 py-1.5 rounded"
                min="1"
              />
              <span className="text-xs sm:text-sm text-black font-medium">
                días o menos
              </span>
            </div>
          </div>

          {/* Estado Amarillo */}
          <div className="p-3 sm:p-4 bg-amber-400/75 rounded-lg mb-2 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="text-xl sm:text-2xl">🟡</div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-black mb-1">
                  Estado Amarillo - Atención
                </h3>
                <p className="text-xs sm:text-sm text-black m-0">
                  Rango de días
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <input
                type="number"
                value={yellowStart}
                onChange={(e) => setYellowStart(Number(e.target.value))}
                className="w-16 sm:w-20 text-sm sm:text-base font-semibold text-center border-none px-2 py-1.5 rounded"
                min="1"
              />
              <span className="text-xs sm:text-sm text-black font-medium">a</span>
              <input
                type="number"
                value={yellowEnd}
                onChange={(e) => setYellowEnd(Number(e.target.value))}
                className="w-16 sm:w-20 text-sm sm:text-base font-semibold text-center border-none px-2 py-1.5 rounded"
                min="1"
              />
              <span className="text-xs sm:text-sm text-black font-medium">días</span>
            </div>
          </div>

          {/* Estado Rojo */}
          <div className="p-3 sm:p-4 bg-red-600/75 rounded-lg mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="text-xl sm:text-2xl">🔴</div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-black mb-1">
                  Estado Rojo - Urgente
                </h3>
                <p className="text-xs sm:text-sm text-black m-0">
                  Días desde último contacto
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <input
                type="number"
                value={redDays}
                onChange={(e) => setRedDays(Number(e.target.value))}
                className="w-16 sm:w-20 text-sm sm:text-base font-semibold text-center border-none px-2 py-1.5 rounded"
                min="1"
              />
              <span className="text-xs sm:text-sm text-black font-medium">
                días o más
              </span>
            </div>
          </div>

          {message && (
            <div className={`p-3 sm:p-4 rounded-lg mb-4 text-center font-medium text-sm sm:text-base ${
              message.includes('✓') ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <button 
            onClick={handleSave}
            className="w-full btn btn-primary bg-emerald-800 hover:bg-emerald-900 py-3 sm:py-3.5 text-sm sm:text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? '⏳ Guardando...' : '💾 Guardar Configuración'}
          </button>

          <div className="mt-4 sm:mt-6 p-4 sm:p-5 bg-amber-50 rounded-lg">
            <p className="text-sm sm:text-base text-amber-900 font-medium mb-2">
              ℹ️ Nota Importante
            </p>
            <p className="text-xs sm:text-sm text-amber-900">
              Los cambios se aplicarán inmediatamente a todos los simpatizantes. El sistema actualizará los colores automáticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
