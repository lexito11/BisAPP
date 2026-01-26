'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { requestNotificationPermission, registerPushToken, getServiceWorkerToken } from '@/lib/notifications'

/**
 * Componente para manejar notificaciones push automáticas
 * Se debe incluir en el layout principal
 */
export default function NotificationManager() {
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)

  useEffect(() => {
    initializeNotifications()
    
    // Verificar cambios de estado periódicamente (cada 5 minutos)
    const interval = setInterval(() => {
      checkStatusChanges()
    }, 5 * 60 * 1000) // 5 minutos

    return () => clearInterval(interval)
  }, [])

  const initializeNotifications = async () => {
    try {
      // NO solicitar permisos automáticamente - solo verificar si ya están otorgados
      // Las notificaciones son opcionales y se pueden activar desde la configuración
      if (!('Notification' in window)) {
        return // Navegador no soporta notificaciones
      }

      // Si ya tiene permisos otorgados, inicializar
      if (Notification.permission === 'granted') {
        setPermissionGranted(true)
        
        // Obtener token
        const token = await getServiceWorkerToken()
        
        if (token) {
          // Registrar token en el servidor
          const registered = await registerPushToken(token, 'web')
          setIsRegistered(registered)
        }
      }
      // Si el permiso es 'default' o 'denied', simplemente continuar sin bloquear
      // El usuario puede activar notificaciones desde la página de configuración
    } catch (error) {
      console.error('Error inicializando notificaciones:', error)
    }
  }

  const checkStatusChanges = async () => {
    try {
      // Verificar si hay cambios de estado pendientes
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) return

      // Obtener cambios de estado recientes no notificados
      const { data: statusChanges } = await supabase
        .from('status_changes')
        .select(`
          *,
          sympathizers (
            id,
            name,
            church_id
          )
        `)
        .eq('notification_sent', false)
        .order('change_date', { ascending: false })
        .limit(10)

      if (statusChanges && statusChanges.length > 0) {
        // Obtener usuario actual para filtrar por iglesia
        const { data: userData } = await supabase
          .from('users')
          .select('church_id')
          .eq('id', session.user.id)
          .single()

        if (userData) {
          // Filtrar cambios de la iglesia del usuario
          const relevantChanges = statusChanges.filter(
            change => change.sympathizers?.church_id === userData.church_id
          )

          // Mostrar notificaciones locales
          relevantChanges.forEach(change => {
            const statusLabels = {
              yellow: 'Atención',
              red: 'Urgente'
            }

            const title = `🔄 Cambio de Estado: ${statusLabels[change.new_status as 'yellow' | 'red']}`
            const body = `${change.sympathizers?.name || 'Simpatizante'} cambió a estado ${statusLabels[change.new_status as 'yellow' | 'red']} (${change.days_since_contact} días sin contacto)`

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(title, {
                body,
                icon: '/icons/notificacion2-rojo.svg',
                badge: '/icons/notificacion2-rojo.svg',
                tag: `status-change-${change.id}`,
                requireInteraction: change.new_status === 'red'
              })
            }
          })
        }
      }
    } catch (error) {
      console.error('Error verificando cambios de estado:', error)
    }
  }

  // Escuchar notificaciones en tiempo real usando Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel('status_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'status_changes',
          filter: 'notification_sent=eq.false'
        },
        (payload) => {
          // Cuando se detecta un nuevo cambio de estado
          const change = payload.new as any
          
          // Obtener información del simpatizante
          supabase
            .from('sympathizers')
            .select('name, church_id')
            .eq('id', change.sympathizer_id)
            .single()
            .then(({ data: sympathizer }) => {
              if (sympathizer) {
                // Verificar que sea de la iglesia del usuario actual
                supabase.auth.getSession().then(({ data: { session } }) => {
                  if (session) {
                    supabase
                      .from('users')
                      .select('church_id')
                      .eq('id', session.user.id)
                      .single()
                      .then(({ data: userData }) => {
                        if (userData && userData.church_id === sympathizer.church_id) {
                          const statusLabels = {
                            yellow: 'Atención',
                            red: 'Urgente'
                          }

                          const title = `🔄 Cambio de Estado: ${statusLabels[change.new_status as 'yellow' | 'red']}`
                          const body = `${sympathizer.name} cambió a estado ${statusLabels[change.new_status as 'yellow' | 'red']} (${change.days_since_contact} días sin contacto)`

                          if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification(title, {
                              body,
                              icon: '/icons/notificacion2-rojo.svg',
                              badge: '/icons/notificacion2-rojo.svg',
                              tag: `status-change-${change.id}`,
                              requireInteraction: change.new_status === 'red'
                            })
                          }
                        }
                      })
                  }
                })
              }
            })
        }
      )
      .subscribe()

    return () => {
      if (channel?.unsubscribe) channel.unsubscribe()
    }
  }, [])

  return null // Este componente no renderiza nada
}
