// Shared academic options for selectors across the app.
// Notes:
// - Course/section options must come from Supabase `courses` (no hardcoded fallbacks),
//   so the UI only shows real catalog items created in "Cursos y Secciones".
// - Subjects are static (schools usually have a fixed list).

export const ACADEMIC_SUBJECT_OPTIONS = [
  'Matemáticas',
  'Lengua Española',
  'Ciencias Naturales',
  'Ciencias Sociales',
  'Inglés',
  'Educación Física',
  'Formación Humana',
  'Arte',
  'Tecnología',
  'Física',
  'Química',
  'Biología',
  'Historia',
  'Geografía',
]

export const FALLBACK_SUBJECT_OPTIONS = [...ACADEMIC_SUBJECT_OPTIONS]

export const TEACHER_ROLE_OPTIONS = ['Docente', 'Coordinador', 'Director']

export const EXTRA_WEEKLY_ACTIVITY_OPTIONS = [
  'Evaluación',
  'Asesoría Académica',
  'Reunión de Área',
  'Coordinación Curricular',
]

export const buildAcademicCourse = (subject, courseCode) => {
  return subject && courseCode ? `${subject} - ${courseCode}` : ''
}

export const splitAcademicCourse = (value = '') => {
  const [subject, courseCode] = String(value).split(' - ')
  const safeSubject = subject || ACADEMIC_SUBJECT_OPTIONS[0] || ''
  return { subject: safeSubject, section: courseCode || '' }
}

const uniqueSorted = (items) =>
  Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'))

export const buildSubjectOptions = ({ courses = [], teachers = [] } = {}) => {
  const teacherSubjects = (teachers || [])
    .flatMap(teacher => String(teacher.subjects || '').split(','))
    .map(subject => subject.trim())

  // Courses table stores grade/section catalog, not subject names.
  return uniqueSorted([...FALLBACK_SUBJECT_OPTIONS, ...teacherSubjects])
}

export const buildTeacherOptions = (teachers = []) => {
  return uniqueSorted((teachers || []).map(teacher => teacher.name))
}
