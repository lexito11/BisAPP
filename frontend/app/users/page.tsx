'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@/types/database.types'

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPhone, setNewUserPhone] = useState('')
  const [newUserRole, setNewUserRole] = useState<'admin' | 'leader'>('leader')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [navigating, setNavigating] = useState<'back' | 'logout' | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingRole, setUpdatingRole] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as HTMLElement).closest('[data-menu-container]')) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuId])

  const loadUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/')
        return
      }

      // Obtener usuario actual
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      setCurrentUser(userData)

      if (!userData) {
        setLoading(false)
        return
      }

      // Obtener todos los usuarios de la misma iglesia
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('church_id', userData.church_id)
        .order('created_at', { ascending: true })

      if (usersError) {
        console.error('Error loading users:', usersError)
      } else {
        setUsers(usersData || [])
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

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    // Verificar que solo el administrador real puede activar/desactivar usuarios
    if (!currentUser || !currentUser.is_real_admin) {
      alert('⚠️ Solo el administrador real puede activar o desactivar usuarios.')
      return
    }

    setUpdatingStatus(true)
    setOpenMenuId(null)
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) {
        console.error('Error detallado:', error)
        // Si el error es que la columna no existe, dar instrucciones
        if (error.message?.includes('column') && error.message?.includes('is_active')) {
          alert('⚠️ Error: La columna is_active no existe en la base de datos.\n\nPor favor, ejecuta este SQL en Supabase:\n\nALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;\nUPDATE users SET is_active = true WHERE is_active IS NULL;')
        } else {
          throw error
        }
        return
      }

      // Recargar lista de usuarios
      await loadUsers()
    } catch (err: any) {
      console.error('Error:', err)
      alert(`Error al actualizar el estado del usuario: ${err.message || 'Error desconocido'}`)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleGrantAdminPermission = async (userId: string) => {
    // Verificar que solo el administrador real puede otorgar permisos de admin
    if (!currentUser || !currentUser.is_real_admin) {
      alert('⚠️ Solo el administrador real puede otorgar permisos de administrador.')
      return
    }

    setUpdatingRole(true)
    setOpenMenuId(null)
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'admin', is_real_admin: false })
        .eq('id', userId)

      if (error) throw error
      await loadUsers()
      alert('✓ Permiso de administrador otorgado.')
    } catch (err: any) {
      console.error('Error:', err)
      alert(`Error al otorgar permiso: ${err.message || 'Error desconocido'}`)
    } finally {
      setUpdatingRole(false)
    }
  }

  const handleRevokeAdminPermission = async (userId: string) => {
    // Verificar que solo el administrador real puede quitar permisos de admin
    if (!currentUser || !currentUser.is_real_admin) {
      alert('⚠️ Solo el administrador real puede quitar permisos de administrador.')
      return
    }

    // No permitir quitar el permiso al administrador real
    const userToRevoke = users.find(u => u.id === userId)
    if (userToRevoke?.is_real_admin) {
      alert('⚠️ No se puede quitar el permiso al administrador real.')
      return
    }

    setUpdatingRole(true)
    setOpenMenuId(null)
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'leader' })
        .eq('id', userId)

      if (error) throw error
      await loadUsers()
      alert('✓ Permiso de administrador quitado.')
    } catch (err: any) {
      console.error('Error:', err)
      alert(`Error al quitar permiso: ${err.message || 'Error desconocido'}`)
    } finally {
      setUpdatingRole(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCreating(true)

    try {
      if (!currentUser) throw new Error('No hay usuario actual')

      // Validar campos obligatorios
      if (!newUserName || newUserName.trim() === '') {
        setError('El nombre completo es obligatorio')
        setCreating(false)
        return
      }

      if (!newUserEmail || newUserEmail.trim() === '') {
        setError('El correo electrónico es obligatorio')
        setCreating(false)
        return
      }

      // Llamar a la API route para crear usuario
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserEmail,
          name: newUserName,
          phone: newUserPhone,
          churchId: currentUser.church_id,
          role: newUserRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuario')
      }

      // Recargar lista de usuarios
      await loadUsers()
      
      // Cerrar modal y limpiar
      setShowModal(false)
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPhone('')
      setNewUserRole('leader')
      
      alert('✓ Usuario creado exitosamente. Se ha enviado un email de confirmación.')
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al crear usuario')
    } finally {
      setCreating(false)
    }
  }

  if (loading || navigating) {
    const message = navigating === 'back' ? 'Saliendo...' : navigating === 'logout' ? 'Cerrando...' : 'Cargando datos...'
    return (
      <div className="loading-overlay-fixed bg-gray-50">
        <div>
          <img 
            src="/icons/iconocargar1.svg" 
            alt="Cargando" 
            className="w-12 h-12 md:w-16 md:h-16 mb-4 animate-spin" 
          />
          <p className="text-gray-500 text-lg md:text-xl">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#047858] text-white shadow-md py-2 px-4 md:px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 flex items-center gap-2 md:gap-3">
                <img src="/icons/dosusuarios1.svg" alt="Roles" className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 flex-shrink-0" /> 
                <span className="hidden sm:inline">Gestión de Usuarios</span>
                <span className="sm:hidden">Usuarios</span>
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full sm:w-auto">
              <button 
                onClick={() => {
                  setNavigating('back')
                  router.push('/dashboard')
                }}
                className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 md:px-4 md:py-2 text-base md:text-lg rounded-lg transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
              >
                <img src="/icons/iconoatras-blanco.svg" alt="Volver" className="w-5 h-5 md:w-7 md:h-7 mr-2" /> 
                <span className="hidden sm:inline">Volver</span>
                <span className="sm:hidden">Volver</span>
              </button>
              <button 
                onClick={() => {
                  setNavigating('logout')
                  handleLogout()
                }}
                className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white px-3 py-2 md:px-4 md:py-2 text-sm md:text-base rounded-lg transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
              >
                <img src="/icons/salir1.svg" alt="Salir" className="w-5 h-5 md:w-7 md:h-7 mr-2" /> 
                <span className="hidden sm:inline">Salir</span>
                <span className="sm:hidden">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
        {/* Usuarios de la iglesia */}
        <div className="card" style={{ marginBottom: '24px', padding: '24px', boxShadow: 'none', border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#1F2937' }}>
              Usuarios de la Iglesia
            </h2>
            {currentUser?.is_real_admin && (
              <button 
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
                style={{ 
                  background: '#2563EB',
                  padding: '10px 20px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                Nuevo Usuario
              </button>
            )}
          </div>
          {!currentUser?.is_real_admin && (
            <div style={{ 
              padding: '12px 16px', 
              background: '#DBEAFE', 
              borderRadius: '8px', 
              marginBottom: '20px',
              fontSize: '16px',
              color: '#1E40AF'
            }}>
              En esta sección (Roles) solo puedes ver. El administrador con login es el que tiene todo el control: crear usuarios, desactivarlos y otorgar o quitar permiso de administrador.
            </div>
          )}

          <div style={{ display: 'grid', gap: '16px' }}>
            {users.map((user) => (
              <div key={user.id} className="users-row" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '16px',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px'
              }}>
                <div className="users-row-main" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  opacity: user.is_active === false ? 0.5 : 1,
                  filter: user.is_active === false ? 'grayscale(0.5)' : 'none',
                  transition: 'opacity 0.3s, filter 0.3s',
                  flex: 1
                }}>
                  <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    borderRadius: '50%', 
                    background: user.role === 'admin' ? '#FEF3C7' : '#DBEAFE',
                    color: user.role === 'admin' ? '#92400E' : '#1E40AF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '600'
                  }}>
                    {user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: '600', color: '#1F2937', fontSize: '18px', marginBottom: '4px' }}>
                      {user.name}
                    </p>
                    <p style={{ fontSize: '16px', color: '#6B7280' }}>
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="users-row-actions" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  opacity: 1,
                  filter: 'none'
                }}>
                  <span className="users-role-pill" style={{ 
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: user.role === 'admin' ? '#FEF3C7' : '#DBEAFE',
                    color: user.role === 'admin' ? '#92400E' : '#1E40AF'
                  }}>
                    {user.role === 'admin' ? 'Administrador' : 'Líder'}
                  </span>
                  {user.is_active === false && (
                    <span style={{ 
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      background: '#FEE2E2',
                      color: '#991B1B',
                      marginRight: '8px'
                    }}>
                      Desactivado
                    </span>
                  )}
                  {currentUser?.is_real_admin && currentUser?.id !== user.id && (
                  <div style={{ position: 'relative', opacity: 1, filter: 'none' }} data-menu-container>
                      <button 
                        className="btn"
                        onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                        style={{ 
                          padding: '6px 12px',
                          background: '#F3F4F6',
                          color: '#374151',
                          border: 'none',
                          fontSize: '18px',
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                        disabled={updatingStatus || updatingRole}
                      >
                        ⋮
                      </button>
                      {openMenuId === user.id && (
                        <div 
                          data-menu-container
                          style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: '4px',
                          background: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 100,
                          minWidth: '260px',
                          overflow: 'hidden'
                        }}>
                          {user.role === 'leader' && (
                            <button
                              onClick={() => handleGrantAdminPermission(user.id)}
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                fontSize: '14px',
                                color: '#92400E',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#F9FAFB'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                              }}
                              disabled={updatingRole || updatingStatus}
                            >
                              <span>👑</span>
                              <span>Permiso como administrador</span>
                            </button>
                          )}
                          {user.role === 'admin' && !user.is_real_admin && (
                            <button
                              onClick={() => handleRevokeAdminPermission(user.id)}
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                fontSize: '16px',
                                color: '#6B7280',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#F9FAFB'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                              }}
                              disabled={updatingRole || updatingStatus}
                            >
                              <span>👤</span>
                              <span>Quitar permiso de administrador</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleUserStatus(user.id, user.is_active ?? true)}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              background: 'transparent',
                              border: 'none',
                              textAlign: 'left',
                              fontSize: '14px',
                              color: user.is_active === false ? '#059669' : '#DC2626',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#F9FAFB'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                            disabled={updatingStatus || updatingRole}
                          >
                            {user.is_active === false ? (
                              <>
                                <span>✓</span>
                                <span>Activar Usuario</span>
                              </>
                            ) : (
                              <>
                                <span>✗</span>
                                <span>Desactivar Usuario</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permisos por Rol */}
        <div className="card" style={{ padding: '24px', boxShadow: 'none', border: 'none' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
            ℹ️ Permisos por Rol
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '16px', background: '#FEF3C7', borderRadius: '8px', border: 'none' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#92400E', marginBottom: '8px' }}>
                Administrador con login (todo el control)
              </h3>
              <p style={{ fontSize: '16px', color: '#92400E' }}>
                Es el que inició sesión y creó la iglesia. Tiene todo el control: en Roles puede crear usuarios, desactivarlos y otorgar o quitar permiso de administrador. Además, configurar tiempos, marcar visitas realizadas/no realizadas, agregar observaciones y todo lo demás.
              </p>
            </div>
            <div style={{ padding: '16px', background: '#E0E7FF', borderRadius: '8px', border: 'none' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#3730A3', marginBottom: '8px' }}>
                Administrador (permiso otorgado)
              </h3>
              <p style={{ fontSize: '14px', color: '#3730A3' }}>
                Puede hacer todo menos en Roles. En la sección Roles solo puede ver; no puede crear usuarios, desactivarlos ni otorgar permisos. Sí puede marcar visitas realizadas/no realizadas, configurar tiempos, agregar observaciones, etc.
              </p>
            </div>
            <div style={{ padding: '16px', background: '#DBEAFE', borderRadius: '8px', border: 'none' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1E40AF', marginBottom: '8px' }}>
                Líder
              </h3>
              <p style={{ fontSize: '16px', color: '#1E40AF' }}>
                Ver y contactar simpatizantes, agregar observaciones. No puede crear usuarios, desactivar usuarios, otorgar permisos ni marcar visitas como realizadas/no realizadas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Crear Usuario */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/icons/unusuario1.svg" alt="Usuario" style={{ width: '32px', height: '32px' }} />
              Crear Nuevo Usuario
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
              El usuario recibirá un email para activar su cuenta
            </p>

            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label style={{ fontSize: '16px', fontWeight: '500', color: '#374151' }}>
                  Nombre Completo <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ej: Ana María López"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '16px', fontWeight: '500', color: '#374151' }}>
                  Correo Electrónico <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="email"
                  className="input"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="ana@iglesia.com"
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  className="input"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '16px', fontWeight: '500', color: '#374151' }}>
                  Rol
                </label>
                <select 
                  className="input"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'leader')}
                >
                  <option value="leader">Líder</option>
                  <option value="admin">Administrador</option>
                </select>
                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {newUserRole === 'admin' 
                    ? '👑 Tendrá acceso completo al sistema' 
                    : (
                      <>
                        <img src="/icons/unusuario1.svg" alt="Usuario" style={{ width: '16px', height: '16px' }} />
                        Podrá ver y contactar simpatizantes
                      </>
                    )}
                </p>
              </div>

              {error && (
                <div style={{ 
                  padding: '12px', 
                  background: '#FEE2E2', 
                  color: '#991B1B', 
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '16px'
                }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setError('')
                    setNewUserName('')
                    setNewUserEmail('')
                    setNewUserPhone('')
                    setNewUserRole('leader')
                  }}
                  className="btn"
                  style={{ 
                    flex: 1,
                    background: 'rgba(37, 99, 235, 0.1)',
                    color: '#2563EB',
                    padding: '12px',
                    fontSize: '17px',
                    fontWeight: '600'
                  }}
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  style={{ 
                    flex: 1,
                    background: '#2563EB',
                    padding: '12px',
                    fontSize: '17px',
                    fontWeight: '600'
                  }}
                  disabled={creating}
                >
                  {creating ? '⏳ Creando...' : '✓ Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
