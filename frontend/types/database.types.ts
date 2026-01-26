export interface Church {
  id: string
  name: string
  profile_image?: string
  created_at: string
}

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  church_id: string
  role: 'admin' | 'leader'
  is_active?: boolean
  is_real_admin?: boolean
  created_at: string
}

export interface ColorConfiguration {
  id: string
  church_id: string
  green_days: number
  yellow_days: number
  red_days: number
  created_at: string
}

export interface Sympathizer {
  id: string
  church_id: string
  name: string
  phone?: string
  email?: string
  city?: string
  last_contact_date: string
  responsible_user_id?: string
  notes?: string
  created_at: string
}

export interface Contact {
  id: string
  sympathizer_id: string
  user_id: string
  contact_type: 'phone' | 'whatsapp' | 'visit' | 'email'
  notes: string
  contact_date: string
}

export interface Visit {
  id: string
  sympathizer_id: string
  responsible_user_id: string
  visit_date: string
  visit_time: string
  notes?: string
  status: 'pending' | 'completed' | 'cancelled'
  created_at: string
}

export interface NotificationsConfig {
  id: string
  church_id: string
  yellow_enabled: boolean
  yellow_time: string
  yellow_email: boolean
  yellow_days: string[]
  red_enabled: boolean
  red_time1: string
  red_time2: string
  red_time3: string
  red_email: boolean
  red_push: boolean
  red_days: string[]
  visits_enabled: boolean
  visits_reminder_1day: boolean
  visits_reminder_2hours: boolean
  created_at: string
}

export interface PushToken {
  id: string
  user_id: string
  token: string
  device_type: 'web' | 'ios' | 'android'
  device_info?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface StatusChange {
  id: string
  sympathizer_id: string
  church_id: string
  previous_status: 'green' | 'yellow' | 'red' | null
  new_status: 'green' | 'yellow' | 'red'
  change_date: string
  days_since_contact: number
  notification_sent: boolean
  notification_sent_at?: string
  created_at: string
}

export interface NotificationLog {
  id: string
  church_id: string
  user_id?: string
  notification_type: 'status_change' | 'yellow_reminder' | 'red_reminder' | 'visit_reminder'
  sympathizer_id?: string
  visit_id?: string
  title: string
  body: string
  sent_via: string[]
  success: boolean
  error_message?: string
  created_at: string
}
