'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BellRing } from 'lucide-react'
import type { User, Church, Sympathizer, ColorConfiguration } from '@/types/database.types'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [church, setChurch] = useState<Church | null>(null)
  const [config, setConfig] = useState<ColorConfiguration | null>(null)
  const [sympathizers, setSympathizers] = useState<Sympathizer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateChurchModal, setShowCreateChurchModal] = useState(false)
  const [churchName, setChurchName] = useState('')
  const [creatingChurch, setCreatingChurch] = useState(false)
  const [error, setError] = useState('')
  
  // Estados para agregar simpatizante
  const [showAddSympathizerModal, setShowAddSympathizerModal] = useState(false)
  const [newSympName, setNewSympName] = useState('')
  const [newSympPhone, setNewSympPhone] = useState('')
  const [newSympEmail, setNewSympEmail] = useState('')
  const [newSympCity, setNewSympCity] = useState('')
  const [newSympResponsible, setNewSympResponsible] = useState('')
  const [addingSympathizer, setAddingSympathizer] = useState(false)
  const [sympathizerError, setSympathizerError] = useState('')
  const [churchUsers, setChurchUsers] = useState<User[]>([])
  const [currentTime, setCurrentTime] = useState(new Date()) // Para actualizar los días en tiempo real
  const [editingDateId, setEditingDateId] = useState<string | null>(null) // ID del simpatizante cuyo último contacto se está editando
  const [updatingDate, setUpdatingDate] = useState(false) // Estado de carga al actualizar fecha
  const [editingResponsibleId, setEditingResponsibleId] = useState<string | null>(null) // ID del simpatizante cuyo responsable se está editando
  const [updatingResponsible, setUpdatingResponsible] = useState(false) // Estado de carga al actualizar responsable
  
  // Estados para modal de bautismo
  const [showBaptismModal, setShowBaptismModal] = useState(false)
  const [baptismSympathizer, setBaptismSympathizer] = useState<Sympathizer | null>(null)
  const [baptismDate, setBaptismDate] = useState('')
  const [savingBaptism, setSavingBaptism] = useState(false)
  
  // Estados para imagen de perfil de la iglesia
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [navigating, setNavigating] = useState<'logout' | null>(null)

  useEffect(() => {
    loadUserData()
  }, [])

  // Actualizar el tiempo cada minuto para recalcular los días
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Actualizar cada minuto

    return () => clearInterval(interval)
  }, [])

  const loadUserData = async () => {
    try {
      console.log('=== Iniciando loadUserData ===')
      // Verificar sesión
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.log('No hay sesión, redirigiendo...')
        window.location.href = '/'
        return
      }

      console.log('Sesión OK, auth_user_id:', session.user.id)

      // Obtener datos del usuario
      const { data: userRows, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .limit(1)

      if (userError) {
        console.error('❌ Error loading user:', userError)
        setShowCreateChurchModal(true)
        setLoading(false)
        return
      }

      console.log('User query OK, rows:', userRows?.length)

      const userData = userRows && userRows.length > 0 ? userRows[0] : null

      // Si no tiene perfil, mostrar modal para crear iglesia
      if (!userData) {
        console.log('No hay userData, mostrar modal crear iglesia')
        setShowCreateChurchModal(true)
        setLoading(false)
        return
      }

      // Verificar si el usuario está activo
      if (userData.is_active === false) {
        console.log('Usuario desactivado, cerrando sesión...')
        await supabase.auth.signOut()
        alert('Tu cuenta ha sido desactivada. Por favor, contacta al administrador.')
        window.location.href = '/'
        return
      }

      console.log('User data OK:', userData.name)
      setUser(userData)

      // Obtener datos de la iglesia
      console.log('Cargando church_id:', userData.church_id)
      const { data: churchData, error: churchError } = await supabase
        .from('churches')
        .select('*')
        .eq('id', userData.church_id)
        .single()

      if (churchError) {
        console.error('❌ Error loading church:', churchError)
        // Si no tiene iglesia, mostrar modal para crear
        setShowCreateChurchModal(true)
        setLoading(false)
        return
      }

      console.log('Church OK:', churchData.name)
      setChurch(churchData)

      // Obtener configuración de colores
      console.log('Cargando configuración...')
      const { data: configData, error: configError } = await supabase
        .from('color_configuration')
        .select('*')
        .eq('church_id', userData.church_id)
        .single()

      if (configError) {
        console.error('⚠️ Error config:', configError)
      } else {
        console.log('✅ Config OK')
      }

      setConfig(configData)

      // Obtener usuarios de la iglesia (para dropdown de responsables)
      console.log('Cargando usuarios de la iglesia...')
      const { data: usersData, error: usersLoadError } = await supabase
        .from('users')
        .select('*')
        .eq('church_id', userData.church_id)
        .order('name', { ascending: true })

      if (usersLoadError) {
        console.error('❌ RECURSIÓN o Error loading church users:', usersLoadError)
        setChurchUsers([]) // Continuar sin usuarios
      } else {
        console.log('✅ Usuarios cargados:', usersData?.length || 0)
        setChurchUsers(usersData || [])
      }

      // Obtener simpatizantes de la iglesia (excluir los que están marcados como "No Volvió")
      console.log('Cargando simpatizantes...')
      const { data: sympathizersData, error: sympathizersError } = await supabase
        .from('sympathizers')
        .select('*')
        .eq('church_id', userData.church_id)
        .or('did_not_return.is.null,did_not_return.eq.false')
        .order('last_contact_date', { ascending: true })

      if (sympathizersError) {
        console.error('⚠️ Error simpatizantes:', sympathizersError)
        setSympathizers([])
      } else {
        console.log('✅ Simpatizantes cargados:', sympathizersData?.length || 0)
        setSympathizers(sympathizersData || [])
      }

      console.log('=== ✅ CARGA COMPLETA ===')
    } catch (error) {
      console.error('💥 Error CRÍTICO cargando datos:', error)
      setLoading(false) // Asegurar que salga del loading
    } finally {
      console.log('Setting loading = false')
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // Función para subir imagen de perfil de la iglesia
  const handleUploadProfileImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !church) return

    setUploadingImage(true)
    try {
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${church.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Subir imagen a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('church-profiles')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('church-profiles')
        .getPublicUrl(filePath)

      // Actualizar la iglesia con la URL de la imagen
      const { error: updateError } = await supabase
        .from('churches')
        .update({ profile_image: publicUrl })
        .eq('id', church.id)

      if (updateError) throw updateError

      // Actualizar estado local
      setChurch({ ...church, profile_image: publicUrl })
      setShowProfileMenu(false)
    } catch (error) {
      console.error('Error subiendo imagen:', error)
      alert('Error al subir la imagen')
    } finally {
      setUploadingImage(false)
    }
  }

  // Función para eliminar imagen de perfil de la iglesia
  const handleDeleteProfileImage = async () => {
    if (!church?.profile_image) return
    
    if (!confirm('¿Estás seguro de que quieres eliminar la foto de perfil?')) return

    setUploadingImage(true)
    try {
      // Extraer el nombre del archivo de la URL
      const urlParts = church.profile_image.split('/')
      const fileName = urlParts[urlParts.length - 1]

      // Eliminar de Supabase Storage
      await supabase.storage
        .from('church-profiles')
        .remove([fileName])

      // Actualizar la iglesia quitando la URL de la imagen
      const { error: updateError } = await supabase
        .from('churches')
        .update({ profile_image: null })
        .eq('id', church.id)

      if (updateError) throw updateError

      // Actualizar estado local
      setChurch({ ...church, profile_image: undefined })
      setShowProfileMenu(false)
    } catch (error) {
      console.error('Error eliminando imagen:', error)
      alert('Error al eliminar la imagen')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleAddSympathizer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSympathizerError('')
    setAddingSympathizer(true)

    try {
      if (!user) throw new Error('No hay usuario activo')

      // Validar que el nombre sea obligatorio
      if (!newSympName || newSympName.trim() === '') {
        setSympathizerError('El nombre completo es obligatorio')
        setAddingSympathizer(false)
        return
      }

      const { error } = await supabase
        .from('sympathizers')
        .insert({
          church_id: user.church_id,
          name: newSympName,
          phone: newSympPhone || null,
          email: newSympEmail || null,
          city: newSympCity || null,
          responsible_user_id: newSympResponsible || null,
          last_contact_date: new Date().toISOString().split('T')[0],
        })

      if (error) throw error

      // Recargar simpatizantes
      const { data: sympathizersData } = await supabase
        .from('sympathizers')
        .select('*')
        .eq('church_id', user.church_id)
        .order('last_contact_date', { ascending: true })

      if (sympathizersData) {
        setSympathizers(sympathizersData)
      }

      // Cerrar modal y limpiar
      setShowAddSympathizerModal(false)
      setNewSympName('')
      setNewSympPhone('')
      setNewSympEmail('')
      setNewSympCity('')
      setNewSympResponsible('')
      
    } catch (err: any) {
      console.error('Error:', err)
      setSympathizerError(err.message || 'Error al agregar simpatizante')
    } finally {
      setAddingSympathizer(false)
    }
  }

  const handleCreateChurch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    setCreatingChurch(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No hay sesión activa')

      // Evitar crear otra iglesia si ya existe perfil
      const { data: existingUsers, error: existingUserError } = await supabase
        .from('users')
        .select('id, church_id')
        .eq('id', session.user.id)
        .limit(1)

      if (existingUserError) throw existingUserError

      if (existingUsers && existingUsers.length > 0) {
        // Ya existe perfil, recargar datos
        await loadUserData()
        setShowCreateChurchModal(false)
        return
      }

      // 1. Crear la iglesia
      const { data: churchData, error: churchError } = await supabase
        .from('churches')
        .insert({
          name: churchName,
        })
        .select()
        .single()

      if (churchError) throw churchError

      // 2. Crear configuración de colores para la iglesia
      const { error: configError } = await supabase
        .from('color_configuration')
        .insert({
          church_id: churchData.id,
          green_days: 7,
          yellow_days: 14,
          red_days: 21,
        })

      if (configError) throw configError

      // 3. Obtener nombre del usuario (de email o Google)
      const userName = session.user.user_metadata?.full_name || 
                      session.user.user_metadata?.name || 
                      session.user.email?.split('@')[0] || 
                      'Usuario'

      // 4. Crear el perfil del usuario admin
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: session.user.id,
          email: session.user.email!,
          name: userName,
          church_id: churchData.id,
          role: 'admin',
          is_real_admin: true,
        })

      if (userError) throw userError

      // Recargar datos
      await loadUserData()
      setShowCreateChurchModal(false)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al crear la iglesia')
    } finally {
      setCreatingChurch(false)
    }
  }

  const getDaysSinceContact = (lastContactDate: string) => {
    const today = currentTime // Usar el tiempo actual que se actualiza
    today.setHours(0, 0, 0, 0) // Normalizar a medianoche para comparación precisa
    const contactDate = new Date(lastContactDate)
    contactDate.setHours(0, 0, 0, 0) // Normalizar a medianoche
    
    // Calcular diferencia en días (solo días transcurridos, no absoluto)
    const diffTime = today.getTime() - contactDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    // Si la fecha es futura, retornar 0 (contactado hoy)
    return diffDays < 0 ? 0 : diffDays
  }

  // Función para formatear el texto de días de manera amigable
  const formatDaysAgo = (days: number) => {
    if (days === 0) return 'Hoy'
    if (days === 1) return 'Hace 1 día'
    return `Hace ${days} días`
  }

  const getContactStatus = (lastContactDate: string) => {
    const days = getDaysSinceContact(lastContactDate)
    if (days <= (config?.green_days || 7)) return 'green'
    if (days <= (config?.yellow_days || 14)) return 'yellow'
    return 'red'
  }

  const getStats = () => {
    const green = sympathizers.filter(s => getContactStatus(s.last_contact_date) === 'green').length
    const yellow = sympathizers.filter(s => getContactStatus(s.last_contact_date) === 'yellow').length
    const red = sympathizers.filter(s => getContactStatus(s.last_contact_date) === 'red').length
    return { green, yellow, red, total: sympathizers.length }
  }

  const filteredSympathizers = sympathizers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.includes(searchTerm) ||
    s.email?.includes(searchTerm)
  )

  const stats = getStats()

  const getResponsibleName = (userId?: string) => {
    if (!userId) return 'Sin asignar'
    const responsible = churchUsers.find(u => u.id === userId)
    return responsible?.name || 'Sin asignar'
  }

  // Función para actualizar la fecha de último contacto
  const handleUpdateLastContactDate = async (sympathizerId: string, newDate: string) => {
    setUpdatingDate(true)
    try {
      const { error } = await supabase
        .from('sympathizers')
        .update({ last_contact_date: newDate })
        .eq('id', sympathizerId)

      if (error) throw error

      // Recargar simpatizantes para actualizar colores y contadores
      if (user) {
        const { data: sympathizersData } = await supabase
          .from('sympathizers')
          .select('*')
          .eq('church_id', user.church_id)
          .order('last_contact_date', { ascending: true })

        if (sympathizersData) {
          setSympathizers(sympathizersData)
        }
      }

      setEditingDateId(null)
    } catch (err: any) {
      console.error('Error actualizando fecha:', err)
      alert('Error al actualizar la fecha de último contacto')
    } finally {
      setUpdatingDate(false)
    }
  }

  // Función para actualizar el responsable de un simpatizante
  const handleUpdateResponsible = async (sympathizerId: string, newResponsibleId: string | null) => {
    setUpdatingResponsible(true)
    try {
      const { error } = await supabase
        .from('sympathizers')
        .update({ responsible_user_id: newResponsibleId || null })
        .eq('id', sympathizerId)

      if (error) throw error

      // Recargar simpatizantes para actualizar la UI
      if (user) {
        const { data: sympathizersData } = await supabase
          .from('sympathizers')
          .select('*')
          .eq('church_id', user.church_id)
          .or('did_not_return.is.null,did_not_return.eq.false')
          .order('last_contact_date', { ascending: true })

        if (sympathizersData) {
          setSympathizers(sympathizersData)
        }
      }

      setEditingResponsibleId(null)
    } catch (err: any) {
      console.error('Error actualizando responsable:', err)
      alert('Error al actualizar el responsable')
    } finally {
      setUpdatingResponsible(false)
    }
  }

  // Mostrar loading
  if (loading || navigating) {
    const message = navigating === 'logout' ? 'Cerrando...' : 'Cargando datos...'
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <img 
            src="/icons/iconocargar1.svg" 
            alt="Cargando" 
            className="w-12 h-12 sm:w-16 sm:h-16 mb-4 animate-spin mx-auto" 
          />
          <p className="text-gray-500 text-lg sm:text-xl">{message}</p>
        </div>
      </div>
    )
  }

  // Mostrar modal para crear iglesia si no tiene
  if (showCreateChurchModal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-5">
        <div className="card max-w-md w-full">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl sm:text-4xl">
              🏛️
            </div>
            <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-gray-800">
              Crear tu Iglesia
            </h1>
            <p className="text-base sm:text-lg text-gray-600">
              Para comenzar, necesitamos el nombre de tu iglesia
            </p>
          </div>

          <form onSubmit={handleCreateChurch}>
            <div className="form-group">
              <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                Nombre de la Iglesia
              </label>
              <input
                type="text"
                className="input text-base sm:text-lg"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                placeholder="Ej: Iglesia Central"
                autoFocus
                required
              />
            </div>

            {error && <p className="error text-base sm:text-lg mb-4">{error}</p>}

            <button 
              type="submit" 
              className="w-full btn btn-primary mt-6 py-3.5 text-base sm:text-lg font-semibold disabled:opacity-50"
              disabled={creatingChurch}
            >
              {creatingChurch ? '⏳ Creando...' : '✓ Crear Iglesia'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={handleLogout}
              className="bg-transparent border-none text-gray-600 text-base sm:text-lg cursor-pointer underline hover:text-gray-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  // No mostrar dashboard si no hay usuario o iglesia
  if (!user || !church) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-emerald-800 text-white shadow-md py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 flex items-center gap-2 sm:gap-3">
                <img src="/icons/logoiglesia1.svg" alt="Iglesia" className="w-12 h-12 sm:w-12 sm:h-12 lg:w-14 lg:h-14 flex-shrink-0" /> 
                <span className="hidden sm:inline">BisAPP</span>
                <span className="sm:hidden">BisAPP</span>
              </h1>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <button 
                onClick={() => router.push('/users')}
                className="flex items-center justify-center bg-white/20 hover:bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 text-base sm:text-base lg:text-lg rounded-lg transition-all hover:scale-105 active:scale-95"
              >
                <img src="/icons/dosusuarios1.svg" alt="Roles" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Roles</span>
                <span className="sm:hidden">Roles</span>
              </button>
              <button 
                onClick={() => router.push('/seguimientos')}
                className="flex items-center justify-center bg-white/20 hover:bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 text-base sm:text-base lg:text-lg rounded-lg transition-all hover:scale-105 active:scale-95"
              >
                <img src="/icons/segumiento1.svg" alt="Seguimiento" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 mr-1 sm:mr-2 flex-shrink-0" /> 
                <span className="hidden lg:inline">Seguimiento</span>
                <span className="lg:hidden">Seguim.</span>
              </button>
              <button 
                onClick={() => router.push('/notifications')}
                className="flex items-center justify-center bg-white/20 hover:bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 text-base sm:text-base lg:text-lg rounded-lg transition-all hover:scale-105 active:scale-95"
              >
                <img src="/icons/notificacion2-rojo.svg" alt="Notificaciones" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="hidden lg:inline">Visitas y Notificaciones</span>
                <span className="lg:hidden hidden sm:inline">Visitas</span>
                <span className="sm:hidden">Visitas</span>
              </button>
              <button 
                onClick={() => router.push('/config')}
                className="flex items-center justify-center bg-white/20 hover:bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 text-base sm:text-base lg:text-lg rounded-lg transition-all hover:scale-105 active:scale-95"
                onMouseEnter={(e) => {
                  const img = e.currentTarget.querySelector('img')
                  if (img) img.src = '/icons/ajustes2-azul.svg'
                }}
                onMouseLeave={(e) => {
                  const img = e.currentTarget.querySelector('img')
                  if (img) img.src = '/icons/ajustes2-verde.svg'
                }}
              >
                <img src="/icons/ajustes2-verde.svg" alt="Configurar" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="hidden lg:inline">Configurar Tiempo</span>
                <span className="lg:hidden">Config</span>
              </button>
              <button 
                onClick={() => {
                  setNavigating('logout')
                  handleLogout()
                }}
                className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-sm lg:text-base rounded-lg transition-all hover:scale-105 active:scale-95"
              >
                <img src="/icons/salir1.svg" alt="Salir" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 mr-1 sm:mr-2 flex-shrink-0" /> 
                <span className="hidden sm:inline">Salir</span>
                <span className="sm:hidden">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-6">
        {/* Info Card */}
        <div className="card mb-1 sm:mb-4 p-4 sm:p-5 shadow-none border-none" style={{ boxShadow: 'none' }}>
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4">
            <div className="relative flex-shrink-0">
              <div 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-36 h-36 sm:w-28 sm:h-28 lg:w-28 lg:h-28 xl:w-32 xl:h-32 bg-indigo-50 rounded-full flex flex-col items-center justify-center cursor-pointer overflow-hidden relative border-3 border-blue-600 transition-transform hover:scale-105"
              >
                {church?.profile_image ? (
                  <img 
                    src={church.profile_image} 
                    alt="Perfil Iglesia" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <>
                    <span className="text-[10px] sm:text-[10px] text-blue-600 font-semibold mb-0.5">Cambiar</span>
                    <img src="/icons/unusuario1.svg" alt="Usuario" className="w-14 h-14 sm:w-12 sm:h-12 lg:w-12 lg:h-12 xl:w-14 xl:h-14" />
                  </>
                )}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-8 h-8 sm:w-6 sm:h-6 xl:w-7 xl:h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              
              {/* Menú de opciones */}
              {showProfileMenu && (
                <>
                  {/* Overlay para cerrar el menú al hacer clic fuera */}
                  <div 
                    onClick={() => setShowProfileMenu(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 99
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    left: '0',
                    background: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    overflow: 'hidden',
                    minWidth: '150px'
                  }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#1F2937'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <img src="/icons/iconocamara1-colores.svg" alt="Cambiar" style={{ width: '22px', height: '22px', marginRight: '8px' }} />Cambiar foto
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleUploadProfileImage}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {church?.profile_image && (
                    <div 
                      onClick={handleDeleteProfileImage}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#EF4444'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <img src="/icons/iconobasura1-rojo.svg" alt="Eliminar" style={{ width: '22px', height: '22px', marginRight: '8px' }} />Eliminar foto
                    </div>
                  )}
                  </div>
                </>
              )}
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 mb-1 truncate">
                {church?.name}
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                {user?.name} - {user?.role === 'admin' ? 'Administrador' : 'Líder'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-2 sm:mb-3">
          <div className="card p-4 sm:p-5 border-none shadow-none" style={{ background: '#065F46', boxShadow: 'none' }}>
            <div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Al Día</p>
              <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">{stats.green}</p>
              <p className="text-xs sm:text-sm text-white/90 mt-1">Contactado recientemente</p>
            </div>
          </div>

          <div className="card p-4 sm:p-5 border-none shadow-none" style={{ background: '#DC2626', boxShadow: 'none' }}>
            <div>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Atención</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{stats.yellow}</p>
              <p className="text-[10px] sm:text-xs text-white/90 mt-1">Requiere seguimiento</p>
            </div>
          </div>

          <div className="card p-4 sm:p-5 border-none shadow-none" style={{ background: '#fbbf24', boxShadow: 'none' }}>
            <div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Urgente</p>
              <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">{stats.red}</p>
              <p className="text-xs sm:text-sm text-white/90 mt-1">Contacto urgente</p>
            </div>
          </div>

          <div className="card p-4 sm:p-5 border-none shadow-none" style={{ background: '#2563EB', boxShadow: 'none' }}>
            <div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">Total</p>
              <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">{stats.total}</p>
              <p className="text-xs sm:text-sm text-white/90 mt-1">Simpatizantes registrados</p>
            </div>
          </div>
        </div>

        {/* Search and Add */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 mb-1 sm:mb-1">
          <div className="flex-1 relative">
            <img 
              src="/icons/iconobuscar1-invertido.svg" 
              alt="Buscar" 
              className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 opacity-50 pointer-events-none" 
            />
            <input
              type="text"
              placeholder="Buscar simpatizante..."
              className="input pl-10 sm:pl-12 h-11 sm:h-12 text-base sm:text-lg bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowAddSympathizerModal(true)}
            className="btn px-4 sm:px-6 py-3 whitespace-nowrap font-semibold h-11 sm:h-12 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 text-base sm:text-lg border border-gray-300"
            style={{ backgroundColor: '#2563EB', color: 'white' }}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 5V11M18 8H24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="hidden sm:inline">Agregar Simpatizante</span>
            <span className="sm:hidden">Agregar</span>
          </button>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden shadow-none border-none min-h-[400px]" style={{ boxShadow: 'none' }}>
          <div className="px-2 sm:px-3 py-1 sm:py-2 border-b-2 border-gray-300 bg-white">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Lista de simpatizantes</h2>
          </div>
          <div className="overflow-x-auto w-full max-h-[500px] overflow-y-auto">
            <div className="w-full">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="bg-gray-50 border-b border-gray-300">
                    <th className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-left text-sm sm:text-base font-semibold text-gray-700 whitespace-nowrap">ESTADO</th>
                    <th className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-left text-sm sm:text-base font-semibold text-gray-700 whitespace-nowrap">NOMBRE</th>
                    <th className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-left text-sm sm:text-base font-semibold text-gray-700 whitespace-nowrap hidden md:table-cell">TELÉFONO</th>
                    <th className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-left text-sm sm:text-base font-semibold text-gray-700 whitespace-nowrap">ÚLTIMO CONTACTO</th>
                    <th className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-left text-sm sm:text-base font-semibold text-gray-700 whitespace-nowrap hidden lg:table-cell">RESPONSABLE</th>
                    <th className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-left text-sm sm:text-base font-semibold text-gray-700 whitespace-nowrap">ACCIONES</th>
                    <th className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-left text-sm sm:text-base font-semibold text-gray-700 whitespace-nowrap hidden xl:table-cell">OTRAS ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSympathizers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 sm:px-10 py-10 sm:py-16 text-center text-gray-400">
                        <div className="text-4xl sm:text-6xl mb-4">👥</div>
                        <p className="text-base sm:text-lg mb-2">No hay simpatizantes registrados</p>
                        <p className="text-sm sm:text-base">Comienza agregando tu primer simpatizante</p>
                      </td>
                    </tr>
                  ) : (
                  filteredSympathizers.map((sympathizer) => {
                    const status = getContactStatus(sympathizer.last_contact_date)
                    const statusColors = {
                      green: { bg: '#10B981', text: 'Al día' },
                      yellow: { bg: '#F59E0B', text: 'Atención' },
                      red: { bg: '#EF4444', text: 'Urgente' }
                    }
                    const days = getDaysSinceContact(sympathizer.last_contact_date)
                    const handleMarkNoReturn = async () => {
                      if (confirm(`¿Estás seguro de marcar a "${sympathizer.name}" como "No Volvió"?`)) {
                        try {
                          const reason = prompt('¿Cuál es el motivo por el que no volvió? (opcional):') || null

                          const { error } = await supabase
                            .from('sympathizers')
                            .update({ 
                              did_not_return: true,
                              did_not_return_date: new Date().toISOString().split('T')[0],
                              no_return_reason: reason
                            })
                            .eq('id', sympathizer.id)

                          if (error) throw error

                          // Recargar simpatizantes
                          await loadUserData()
                          alert(`✓ "${sympathizer.name}" ha sido marcado como "No Volvió"`)
                        } catch (error: any) {
                          console.error('Error:', error)
                          alert('Error al marcar como "No Volvió": ' + (error.message || 'Error desconocido'))
                        }
                      }
                    }

                    const handleOpenBaptism = () => {
                      setBaptismSympathizer(sympathizer)
                      setBaptismDate('')
                      setShowBaptismModal(true)
                    }

                    return (
                      <tr key={sympathizer.id} className="hover:bg-gray-50 transition-colors border-b border-gray-200">
                        <td className="px-1.5 sm:px-3 py-1.5 sm:py-2">
                          <div className={`w-3 h-3 rounded-full`} style={{ background: statusColors[status].bg }}></div>
                        </td>
                        <td className="px-1.5 sm:px-3 py-1.5 sm:py-2">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full text-white flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0`} style={{ background: statusColors[status].bg }}>
                              {sympathizer.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-800 text-base sm:text-lg truncate">{sympathizer.name}</p>
                              <p className="text-sm sm:text-base text-gray-500">{formatDaysAgo(days)}</p>
                              <p className="text-sm text-gray-500 md:hidden mt-0.5">{sympathizer.phone || 'Sin teléfono'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-gray-700 text-base sm:text-lg hidden md:table-cell">{sympathizer.phone || '-'}</td>
                        <td className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-gray-700">
                          {editingDateId === sympathizer.id ? (
                            <div className="flex gap-1.5 sm:gap-2 items-center">
                              <input
                                type="date"
                                defaultValue={sympathizer.last_contact_date}
                                onBlur={(e) => {
                                  if (e.target.value && e.target.value !== sympathizer.last_contact_date) {
                                    handleUpdateLastContactDate(sympathizer.id, e.target.value)
                                  } else {
                                    setEditingDateId(null)
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const target = e.target as HTMLInputElement
                                    if (target.value && target.value !== sympathizer.last_contact_date) {
                                      handleUpdateLastContactDate(sympathizer.id, target.value)
                                    } else {
                                      setEditingDateId(null)
                                    }
                                  } else if (e.key === 'Escape') {
                                    setEditingDateId(null)
                                  }
                                }}
                                autoFocus
                                className="px-1.5 sm:px-3 py-1 sm:py-2 border-none rounded-md text-xs sm:text-sm w-28 sm:w-40 disabled:opacity-50 bg-transparent"
                                disabled={updatingDate}
                              />
                              {updatingDate && (
                                <span className="text-xs text-gray-500">⏳</span>
                              )}
                            </div>
                          ) : (
                            <div 
                              className="flex items-center gap-1.5 sm:gap-2 cursor-pointer px-1 py-0.5 sm:px-2 sm:py-1 rounded-md transition-transform hover:scale-105"
                              onClick={() => setEditingDateId(sympathizer.id)}
                              title="Haz clic para editar la fecha"
                            >
                              <span className="text-sm sm:text-base">
                                {new Date(sympathizer.last_contact_date).toLocaleDateString('es-ES', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  year: 'numeric' 
                                })}
                              </span>
                              <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white text-xs sm:text-sm cursor-pointer">
                                ✏️
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-1.5 sm:px-3 py-1.5 sm:py-2 relative hidden lg:table-cell">
                          {editingResponsibleId === sympathizer.id ? (
                            <div className="absolute top-1/2 left-4 -translate-y-1/2 z-[100] bg-white rounded-lg shadow-lg min-w-[200px] overflow-hidden">
                              <div className="px-3.5 py-2.5 bg-gray-100 text-xs font-semibold text-gray-700">
                                Seleccionar responsable
                              </div>
                              <div className="max-h-[200px] overflow-y-auto">
                                <div
                                  onClick={() => handleUpdateResponsible(sympathizer.id, null)}
                                  className="px-3.5 py-2.5 cursor-pointer text-sm text-gray-500 transition-colors hover:bg-gray-50"
                                >
                                  Sin asignar
                                </div>
                                {churchUsers.map(u => (
                                  <div
                                    key={u.id}
                                    onClick={() => handleUpdateResponsible(sympathizer.id, u.id)}
                                    className={`px-3.5 py-2.5 cursor-pointer text-sm transition-colors ${
                                      sympathizer.responsible_user_id === u.id 
                                        ? 'bg-indigo-50 text-gray-800' 
                                        : 'text-gray-800 hover:bg-indigo-50'
                                    }`}
                                  >
                                    {u.name}
                                  </div>
                                ))}
                              </div>
                              {updatingResponsible && (
                                <div className="px-3.5 py-2.5 text-center text-xs text-gray-500">
                                  ⏳ Guardando...
                                </div>
                              )}
                            </div>
                          ) : null}
                          <span 
                            onClick={() => setEditingResponsibleId(editingResponsibleId === sympathizer.id ? null : sympathizer.id)}
                            className={`inline-flex items-center gap-1 px-3 sm:px-3.5 py-1.5 sm:py-1.5 rounded-xl text-sm sm:text-base font-medium cursor-pointer transition-all hover:scale-105 hover:shadow-md ${
                              sympathizer.responsible_user_id 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'bg-slate-500 text-white'
                            }`}
                            title="Haz clic para cambiar el responsable"
                          >
                            {getResponsibleName(sympathizer.responsible_user_id)}
                            {!sympathizer.responsible_user_id && (
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </span>
                        </td>
                        <td className="px-1.5 sm:px-3 py-1.5 sm:py-2">
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                            <button 
                              onClick={() => router.push(`/sympathizer/${sympathizer.id}`)}
                              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-indigo-50 text-indigo-600 border-none text-sm sm:text-base rounded-md cursor-pointer transition-transform hover:scale-105 active:scale-95 font-medium"
                              title="Ver detalle"
                            >
                              <span className="hidden sm:inline">👁️ Detalle</span>
                              <span className="sm:hidden">👁️</span>
                            </button>
                            <button 
                              onClick={() => {
                                if (sympathizer.phone) {
                                  window.location.href = `tel:${sympathizer.phone}`
                                } else {
                                  alert('Este simpatizante no tiene número de teléfono registrado')
                                }
                              }}
                              className="btn btn-phone-vibrate px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-50 text-blue-600 border-none text-sm sm:text-base rounded-md cursor-pointer"
                              title="Llamar"
                            >
                              📞
                            </button>
                          </div>
                          {/* En móviles/tablet: mostrar también "No volvió" y "Bautizado" aquí */}
                          <div className="mt-2 flex flex-col gap-2 xl:hidden">
                            <button 
                              onClick={handleMarkNoReturn}
                              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-50 text-blue-600 border-none text-sm sm:text-base rounded-md cursor-pointer transition-transform hover:scale-105 active:scale-95 font-medium"
                              title="Marcar como No Volvió"
                            >
                              No Volvió
                            </button>
                            <button 
                              onClick={handleOpenBaptism}
                              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-50 text-blue-600 border-none text-sm sm:text-base rounded-md cursor-pointer transition-transform hover:scale-105 active:scale-95 font-medium"
                              title="Marcar como Bautizado"
                            >
                              Bautizado
                            </button>
                          </div>
                        </td>
                        <td className="px-1.5 sm:px-3 py-1.5 sm:py-2 hidden xl:table-cell">
                          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                            <button 
                              onClick={handleMarkNoReturn}
                              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-50 text-blue-600 border-none text-sm sm:text-base rounded-md cursor-pointer transition-transform hover:scale-105 active:scale-95 font-medium"
                              title="Marcar como No Volvió"
                            >
                              No Volvió
                            </button>
                            <button 
                              onClick={handleOpenBaptism}
                              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-50 text-blue-600 border-none text-sm sm:text-base rounded-md cursor-pointer transition-transform hover:scale-105 active:scale-95 font-medium"
                              title="Marcar como Bautizado"
                            >
                              Bautizado
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="card mt-3 sm:mt-4 p-4 sm:p-5 backdrop-blur-sm shadow-none" style={{ boxShadow: 'none', backgroundColor: 'rgba(6, 95, 70, 0.15)' }}>
          <p className="text-base sm:text-lg font-semibold mb-3 text-gray-700">
            🎨 Sistema de Colores Automático
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
              <span className="text-emerald-800"><strong>Verde:</strong> Contactado en los últimos {config?.green_days || 7} días</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0"></div>
              <span className="text-amber-800"><strong>Amarillo:</strong> Entre {(config?.green_days || 7) + 1} y {config?.yellow_days || 14} días sin contacto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
              <span className="text-red-800"><strong>Rojo:</strong> Más de {config?.yellow_days || 21} días sin contacto (urgente)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Agregar Simpatizante */}
      {showAddSympathizerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 sm:p-5">
          <div className="card max-w-lg sm:max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="#2563EB" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" fill="#2563EB" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 5V11M18 8H24" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Agregar Simpatizante
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">
              Registra un nuevo simpatizante para hacer seguimiento
            </p>

            <form onSubmit={handleAddSympathizer}>
              <div className="form-group">
                <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                  Nombre Completo <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  className="input text-base sm:text-lg"
                  value={newSympName}
                  onChange={(e) => setNewSympName(e.target.value)}
                  placeholder="Ej: María Álvarez"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  className="input text-base sm:text-lg"
                  value={newSympPhone}
                  onChange={(e) => setNewSympPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                />
              </div>

              <div className="form-group">
                <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  className="input text-base sm:text-lg"
                  value={newSympEmail}
                  onChange={(e) => setNewSympEmail(e.target.value)}
                  placeholder="maria@example.com"
                />
              </div>

              <div className="form-group">
                <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                  Ciudad
                </label>
                <input
                  type="text"
                  className="input text-base sm:text-lg"
                  value={newSympCity}
                  onChange={(e) => setNewSympCity(e.target.value)}
                  placeholder="Ej: Bogotá, Colombia"
                />
              </div>

              <div className="form-group">
                <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                  Responsable
                </label>
                <select
                  className="input text-base sm:text-lg"
                  value={newSympResponsible}
                  onChange={(e) => setNewSympResponsible(e.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {churchUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {sympathizerError && (
                <div className="p-3 bg-red-50 text-red-800 rounded-lg mb-4 text-base sm:text-lg">
                  ⚠️ {sympathizerError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
                <button 
                  type="button"
                  onClick={() => {
                    setShowAddSympathizerModal(false)
                    setSympathizerError('')
                    setNewSympName('')
                    setNewSympPhone('')
                    setNewSympEmail('')
                    setNewSympCity('')
                    setNewSympResponsible('')
                  }}
                  className="flex-1 btn bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-3 text-base sm:text-lg font-semibold disabled:opacity-50"
                  disabled={addingSympathizer}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 btn btn-primary bg-emerald-600 hover:bg-emerald-700 py-3 text-base sm:text-lg font-semibold disabled:opacity-50"
                  disabled={addingSympathizer}
                >
                  {addingSympathizer ? '⏳ Agregando...' : '✓ Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bautismo */}
      {showBaptismModal && baptismSympathizer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 sm:p-5">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
            {/* Header azul */}
            <div className="bg-blue-600 px-5 py-5 sm:px-6 sm:py-6 text-white">
              <h2 className="text-lg sm:text-xl font-semibold m-0">
                💧 Registrar Bautismo
              </h2>
              <p className="text-base sm:text-lg mt-2 opacity-90">
                {baptismSympathizer.name}
              </p>
            </div>
            
            {/* Contenido */}
            <div className="p-5 sm:p-6">
              <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                Fecha de Bautismo
              </label>
              <input
                type="date"
                value={baptismDate}
                onChange={(e) => setBaptismDate(e.target.value)}
                className="w-full px-3.5 py-3 border-none rounded-lg text-base sm:text-lg outline-none transition-colors bg-transparent"
                autoFocus
              />
              
              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowBaptismModal(false)
                    setBaptismSympathizer(null)
                    setBaptismDate('')
                  }}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border-none rounded-lg text-base sm:text-lg font-semibold cursor-pointer transition-colors disabled:opacity-50"
                  disabled={savingBaptism}
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!baptismDate) {
                      alert('Por favor selecciona una fecha')
                      return
                    }
                    
                    setSavingBaptism(true)
                    try {
                      const { error } = await supabase
                        .from('sympathizers')
                        .update({ 
                          baptized: true,
                          baptism_date: baptismDate
                        })
                        .eq('id', baptismSympathizer.id)

                      if (error) throw error

                      // Recargar simpatizantes
                      await loadUserData()
                      
                      // Cerrar modal
                      setShowBaptismModal(false)
                      setBaptismSympathizer(null)
                      setBaptismDate('')
                      
                      alert(`✓ "${baptismSympathizer.name}" ha sido marcado como bautizado`)
                    } catch (error: any) {
                      console.error('Error:', error)
                      alert('Error al marcar como bautizado: ' + (error.message || 'Error desconocido'))
                    } finally {
                      setSavingBaptism(false)
                    }
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg text-base sm:text-lg font-semibold cursor-pointer transition-colors disabled:opacity-50"
                  disabled={savingBaptism}
                >
                  {savingBaptism ? '⏳ Guardando...' : '✓ Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
