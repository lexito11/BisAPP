/**
 * Utilidades para manejar notificaciones push en el navegador
 */

export interface NotificationPermission {
  granted: boolean
  denied: boolean
  default: boolean
}

/**
 * Solicita permisos para notificaciones push
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones')
    return { granted: false, denied: false, default: false }
  }

  if (Notification.permission === 'granted') {
    return { granted: true, denied: false, default: false }
  }

  if (Notification.permission === 'denied') {
    return { granted: false, denied: true, default: false }
  }

  const permission = await Notification.requestPermission()
  
  return {
    granted: permission === 'granted',
    denied: permission === 'denied',
    default: permission === 'default'
  }
}

/**
 * Registra el token de notificaciones push del dispositivo
 */
export async function registerPushToken(token: string, deviceType: 'web' | 'ios' | 'android' = 'web'): Promise<boolean> {
  try {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timestamp: new Date().toISOString()
    }

    const response = await fetch('/api/register-push-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        deviceType,
        deviceInfo
      })
    })

    if (!response.ok) {
      throw new Error('Error al registrar token')
    }

    return true
  } catch (error) {
    console.error('Error registrando push token:', error)
    return false
  }
}

/**
 * Elimina el token de notificaciones push
 */
export async function unregisterPushToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/register-push-token', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token })
    })

    if (!response.ok) {
      throw new Error('Error al eliminar token')
    }

    return true
  } catch (error) {
    console.error('Error eliminando push token:', error)
    return false
  }
}

/**
 * Obtiene el token de Service Worker para notificaciones push
 * Nota: Requiere que el Service Worker esté registrado
 */
export async function getServiceWorkerToken(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers no están soportados')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    
    // Para Web Push, necesitarías configurar Firebase Cloud Messaging o similar
    // Por ahora, usamos un identificador único del navegador
    const token = await generateBrowserToken()
    
    return token
  } catch (error) {
    console.error('Error obteniendo token:', error)
    return null
  }
}

/**
 * Genera un token único para el navegador
 */
async function generateBrowserToken(): Promise<string> {
  // Usar localStorage para mantener un ID persistente
  const storageKey = 'bisapp_push_token'
  let token = localStorage.getItem(storageKey)
  
  if (!token) {
    // Generar un token único
    token = `web_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem(storageKey, token)
  }
  
  return token
}

/**
 * Muestra una notificación local en el navegador
 */
export function showLocalNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.warn('No se pueden mostrar notificaciones: permisos no otorgados')
    return null
  }

  try {
    return new Notification(title, {
      icon: '/icons/notificacion2-rojo.svg',
      badge: '/icons/notificacion2-rojo.svg',
      ...options
    })
  } catch (error) {
    console.error('Error mostrando notificación:', error)
    return null
  }
}
