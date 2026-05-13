export const ROLE_LABELS = {
  Director: 'Director',
  Coordinador: 'Coordinador',
  Docente: 'Docente',
  pending: 'Pendiente',
}

export const ROLE_SECTION_ACCESS = {
  Director: [
    'dashboard',
    'calendar',
    'teachers',
    'courses',
    'students',
    'annual-planning',
    'weekly-planning',
    'templates',
    'resources',
    'instruments',
    'grades',
    'reports',
    'attendance',
    'users',
    'audit',
    'backup',
    'settings',
  ],
  Coordinador: [
    'dashboard',
    'calendar',
    'teachers',
    'courses',
    'students',
    'annual-planning',
    'weekly-planning',
    'templates',
    'resources',
    'instruments',
    'grades',
    'reports',
    'attendance',
    'audit',
  ],
  Docente: [
    'dashboard',
    'calendar',
    'annual-planning',
    'weekly-planning',
    'templates',
    'resources',
    'instruments',
    'grades',
    'reports',
    'attendance',
  ],
}

export const normalizeRole = (role) => {
  if (!role || role === 'pending') return 'pending'
  return ROLE_LABELS[role] ? role : 'pending'
}

export const isPendingProfile = (profile) => {
  const role = normalizeRole(profile?.role)
  return !profile || role === 'pending' || profile?.status === 'pending'
}

export const isInactiveProfile = (profile) => {
  return !!profile && profile.status === 'inactive'
}

export const isDirector = (profile) => normalizeRole(profile?.role) === 'Director'

export const canAccessSection = (profile, section) => {
  const role = normalizeRole(profile?.role)
  if (role === 'pending' || isInactiveProfile(profile)) return false
  return (ROLE_SECTION_ACCESS[role] || []).includes(section)
}

export const getAllowedSections = (profile) => {
  const role = normalizeRole(profile?.role)
  return ROLE_SECTION_ACCESS[role] || []
}

export const getDefaultSection = (profile) => {
  const allowed = getAllowedSections(profile)
  return allowed[0] || 'dashboard'
}
