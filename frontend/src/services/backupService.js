import { supabase } from './supabaseClient.js'

export const BACKUP_TYPE_OPTIONS = [
  { value: 'full', label: 'Respaldo completo' },
  { value: 'grades', label: 'Solo evaluacion y reportes' },
  { value: 'planning', label: 'Solo planificacion y recursos' },
  { value: 'users', label: 'Solo usuarios y estructura academica' },
]

export const BACKUP_TABLE_GROUPS = {
  full: [
    'profiles',
    'teachers',
    'courses',
    'students',
    'annual_plans',
    'ra_items',
    'weekly_planning',
    'templates',
    'resources',
    'events',
    'activities',
    'grades',
    'reports',
    'rubrics',
    'rubric_criteria',
    'tests',
    'checklists',
    'checklist_items',
    'attendance',
  ],
  grades: [
    'activities',
    'grades',
    'reports',
    'rubrics',
    'rubric_criteria',
    'tests',
    'checklists',
    'checklist_items',
  ],
  planning: [
    'annual_plans',
    'ra_items',
    'weekly_planning',
    'templates',
    'resources',
    'events',
  ],
  users: [
    'profiles',
    'teachers',
    'courses',
    'students',
  ],
}

export const resolveBackupTables = (type) => BACKUP_TABLE_GROUPS[type] || BACKUP_TABLE_GROUPS.full

export const getBackupTypeLabel = (type) => {
  return BACKUP_TYPE_OPTIONS.find((option) => option.value === type)?.label || 'Respaldo completo'
}

export const formatBackupSize = (sizeBytes = 0) => {
  if (!sizeBytes) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = sizeBytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const decimals = unitIndex === 0 ? 0 : 1
  return `${value.toFixed(decimals)} ${units[unitIndex]}`
}

export const buildBackupLabel = (type) => {
  const timestamp = new Date().toLocaleString('es-BO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return `${getBackupTypeLabel(type)} - ${timestamp}`
}

export const fetchSystemBackups = async () => {
  const { data, error } = await supabase
    .from('system_backups')
    .select(`
      id,
      label,
      description,
      backup_type,
      included_tables,
      summary,
      total_records,
      size_bytes,
      is_active,
      created_at,
      created_by,
      created_by_name,
      created_by_email,
      restored_at,
      restored_by,
      restored_by_email
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const fetchSystemBackupDetail = async (backupId) => {
  const { data, error } = await supabase
    .from('system_backups')
    .select('*')
    .eq('id', backupId)
    .single()

  if (error) throw error
  return data
}

export const createSystemBackup = async ({ type, label, description, user, profile }) => {
  const fallbackLabel = label || buildBackupLabel(type)

  const { data: backupId, error } = await supabase.rpc('create_system_backup', {
    p_label: fallbackLabel,
    p_description: description || null,
    p_backup_type: type,
  })

  if (error) throw error
  return fetchSystemBackupDetail(backupId)
}

export const restoreSystemBackup = async (backupId) => {
  const { data, error } = await supabase.rpc('restore_system_backup', {
    p_backup_id: backupId,
  })

  if (error) throw error
  return data
}

export const deleteSystemBackup = async (backupId) => {
  const { error } = await supabase
    .from('system_backups')
    .delete()
    .eq('id', backupId)

  if (error) throw error
}

export const downloadBackupFile = (backup) => {
  const payload = backup?.payload
  if (!payload) throw new Error('El respaldo no contiene un archivo descargable')

  const fileName = `${String(backup.label || 'respaldo')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'respaldo'}-${backup.id}.json`

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })

  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}
