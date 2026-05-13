import { BaseEntity } from './BaseEntity.js'

export const GRADE_OPTIONS = [
  { code: '4', label: '4to (Bachillerato)' },
  { code: '5', label: '5to (Bachillerato)' },
  { code: '6', label: '6to (Bachillerato)' },
]

export const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F']

export const splitCourseCode = (code = '') => {
  const safeCode = String(code).trim()
  const section = safeCode.slice(-1)
  const gradeCode = safeCode.slice(0, -1)
  const validSection = SECTION_OPTIONS.includes(section) ? section : SECTION_OPTIONS[0]
  const validGrade = GRADE_OPTIONS.some(option => option.code === gradeCode)
    ? gradeCode
    : GRADE_OPTIONS[0].code

  return { gradeCode: validGrade, section: validSection }
}

export const buildCourseName = (gradeCode, section) => {
  const grade = GRADE_OPTIONS.find(option => option.code === gradeCode)
  return grade ? `${grade.label} - Seccion ${section}` : `${gradeCode}${section}`
}

export class CourseEntity extends BaseEntity {
  constructor(data = {}) {
    super({
      id: data.id ?? null,
      user_id: data.user_id ?? data.userId ?? null,
      c: data.c || data.code || '',
      n: data.n || data.name || '',
      gradeCode: data.gradeCode || GRADE_OPTIONS[0].code,
      section: data.section || SECTION_OPTIONS[0],
      s: Number(data.s ?? data.students ?? 0),
      sub: Number(data.sub ?? data.subjects ?? 0),
      teacher: data.teacher || '',
      status: data.status || 'active',
    })
  }

  static fromRow(row = {}) {
    const identity = splitCourseCode(row.code || row.c || '')
    return new CourseEntity({
      ...row,
      user_id: row.user_id ?? row.userId ?? null,
      c: row.code || row.c,
      n: row.name || row.n,
      gradeCode: identity.gradeCode,
      section: identity.section,
      s: row.students ?? row.s,
      sub: row.subjects ?? row.sub,
    })
  }

  static buildForm(overrides = {}) {
    const gradeCode = overrides.gradeCode || GRADE_OPTIONS[0].code
    const section = overrides.section || SECTION_OPTIONS[0]

    return {
      c: `${gradeCode}${section}`,
      n: buildCourseName(gradeCode, section),
      gradeCode,
      section,
      s: '',
      sub: '',
      teacher: '',
      status: 'active',
      ...overrides,
    }
  }

  static fromForm(form = {}) {
    return new CourseEntity({
      c: form.c,
      n: form.n,
      gradeCode: form.gradeCode,
      section: form.section,
      s: Number(form.s),
      sub: Number(form.sub),
      teacher: form.teacher,
      status: form.status,
    })
  }

  toRow() {
    return {
      code: this.c,
      name: this.n,
      students: Number(this.s),
      subjects: Number(this.sub),
      teacher: this.teacher,
      status: this.status,
    }
  }
}
