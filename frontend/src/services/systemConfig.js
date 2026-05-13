const normalizeEmail = (value = '') => String(value).trim().toLowerCase()

export const PRIMARY_DIRECTOR_EMAILS = [
  'yo@gmail.com',
].map(normalizeEmail)

export const isPrimaryDirectorEmail = (email) => {
  return PRIMARY_DIRECTOR_EMAILS.includes(normalizeEmail(email))
}

export const buildPrimaryDirectorProfile = (authUser) => ({
  id: authUser.id,
  email: authUser.email,
  full_name: authUser.user_metadata?.full_name || authUser.email || 'Director',
  role: 'Director',
  status: 'active',
})
