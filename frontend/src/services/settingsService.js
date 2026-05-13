import { supabase } from './supabaseClient.js'
import { DEFAULT_GRADE_SCALES, ensureDefaultGradeScale } from './gradingScaleUtils.js'

export const YEAR_OPTIONS = ['2025-2026', '2026-2027', '2027-2028', '2028-2029']

export const TIMEZONE_OPTIONS = [
  'America/La_Paz (GMT-4)',
  'America/Panama (GMT-5)',
  'America/Bogota (GMT-5)',
  'America/Lima (GMT-5)',
]

export const LANGUAGE_OPTIONS = ['Espanol', 'English']

export const DEFAULT_GENERAL_SETTINGS = {
  institution_name: 'Colegio San Jose',
  academic_year: '2025-2026',
  timezone: 'America/La_Paz (GMT-4)',
  language: 'Espanol',
}

export const DEFAULT_GRADING_SCALES = DEFAULT_GRADE_SCALES

export const DEFAULT_PERIODS = [
  {
    id: 'period_1',
    name: 'Periodo 1',
    start_date: '2026-01-06',
    end_date: '2026-02-28',
    weight: 25,
    is_active: true,
  },
  {
    id: 'period_2',
    name: 'Periodo 2',
    start_date: '2026-03-03',
    end_date: '2026-05-29',
    weight: 25,
    is_active: false,
  },
  {
    id: 'period_3',
    name: 'Periodo 3',
    start_date: '2026-06-01',
    end_date: '2026-08-28',
    weight: 25,
    is_active: false,
  },
  {
    id: 'period_4',
    name: 'Periodo 4',
    start_date: '2026-08-31',
    end_date: '2026-11-27',
    weight: 25,
    is_active: false,
  },
]

export const DEFAULT_NOTIFICATION_PREFERENCES = [
  {
    id: 'low_performance_alerts',
    label: 'Alertas de bajo rendimiento (promedio < 60)',
    enabled: true,
  },
  {
    id: 'grade_deadline_reminders',
    label: 'Recordatorio de entrega de notas',
    enabled: true,
  },
  {
    id: 'automatic_backup_notifications',
    label: 'Notificaciones de respaldos automaticos',
    enabled: true,
  },
  {
    id: 'weekly_summary_email',
    label: 'Correo de resumen semanal',
    enabled: false,
  },
  {
    id: 'attendance_alerts',
    label: 'Alertas de inasistencia (> 20%)',
    enabled: true,
  },
]

const ensureActivePeriod = (periods) => {
  const nextPeriods = Array.isArray(periods) && periods.length > 0
    ? periods.map((period) => ({
        ...period,
        weight: Number(period.weight || 0),
        is_active: !!period.is_active,
      }))
    : DEFAULT_PERIODS.map((period) => ({ ...period }))

  if (!nextPeriods.some((period) => period.is_active)) {
    nextPeriods[0] = { ...nextPeriods[0], is_active: true }
  }

  return nextPeriods
}

const sanitizeGeneral = (general = {}) => ({
  institution_name: general.institution_name || DEFAULT_GENERAL_SETTINGS.institution_name,
  academic_year: general.academic_year || DEFAULT_GENERAL_SETTINGS.academic_year,
  timezone: general.timezone || DEFAULT_GENERAL_SETTINGS.timezone,
  language: general.language || DEFAULT_GENERAL_SETTINGS.language,
})

const sanitizeSettings = (row = {}) => ({
  id: row.id || 1,
  general: sanitizeGeneral({
    institution_name: row.institution_name,
    academic_year: row.academic_year,
    timezone: row.timezone,
    language: row.language,
  }),
  grading_scales: ensureDefaultGradeScale(row.grading_scales),
  academic_periods: ensureActivePeriod(row.academic_periods),
  notification_preferences: Array.isArray(row.notification_preferences) && row.notification_preferences.length > 0
    ? row.notification_preferences.map((item) => ({ ...item, enabled: !!item.enabled }))
    : DEFAULT_NOTIFICATION_PREFERENCES.map((item) => ({ ...item })),
  updated_at: row.updated_at || null,
  updated_by_name: row.updated_by_name || '',
  updated_by_email: row.updated_by_email || '',
})

export const fetchSystemSettings = async () => {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error
  return sanitizeSettings(data || {})
}

const updateSettingsRow = async (payload, user, profile) => {
  const actorName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Director'
  const actorEmail = user?.email || null

  const { data, error } = await supabase
    .from('system_settings')
    .upsert([{
      id: 1,
      ...payload,
      updated_at: new Date().toISOString(),
      updated_by: user?.id || null,
      updated_by_name: actorName,
      updated_by_email: actorEmail,
    }], { onConflict: 'id' })
    .select('*')
    .single()

  if (error) throw error
  return sanitizeSettings(data)
}

export const saveGeneralSettings = async ({ general, user, profile }) => {
  return updateSettingsRow(sanitizeGeneral(general), user, profile)
}

export const saveGradingScales = async ({ grading_scales, user, profile }) => {
  return updateSettingsRow({
    grading_scales: ensureDefaultGradeScale(grading_scales),
  }, user, profile)
}

export const saveAcademicPeriods = async ({ academic_periods, user, profile }) => {
  return updateSettingsRow({
    academic_periods: ensureActivePeriod(academic_periods),
  }, user, profile)
}

export const saveNotificationPreferences = async ({ notification_preferences, user, profile }) => {
  return updateSettingsRow({
    notification_preferences,
  }, user, profile)
}

export const formatSettingsDate = (value) => {
  if (!value) return 'Sin cambios registrados'
  return new Date(value).toLocaleString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
