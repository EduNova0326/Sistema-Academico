import { BaseEntity } from './BaseEntity.js'

export class StudentEntity extends BaseEntity {
  constructor(data = {}) {
    super({
      id: data.id ?? null,
      code: data.code || '',
      name: data.name || '',
      course: data.course || '',
      avg: Number(data.avg ?? 0),
      att: Number(data.att ?? 0),
      status: data.status || 'danger',
      created_at: data.created_at || null,
    })
  }

  static fromRow(row = {}) {
    return new StudentEntity({
      ...row,
      avg: Number(row.avg ?? 0),
      att: Number(row.att ?? 0),
    })
  }

  static buildCodeFromIndex(index) {
    const safeIndex = Math.max(1, Number(index) || 1)
    return `EST-${String(safeIndex).padStart(3, '0')}`
  }

  static parseCodeIndex(code = '') {
    const match = /^EST-(\d+)$/.exec(String(code).trim())
    if (!match) return null
    const n = Number(match[1])
    return Number.isFinite(n) ? n : null
  }

  static normalizeMetrics({ avg, att }) {
    const safeAvg = Math.max(0, Math.min(100, parseFloat(avg) || 0))
    const safeAtt = Math.max(0, Math.min(100, parseFloat(att) || 0))
    return { avg: safeAvg, att: safeAtt }
  }

  static resolveStatus(avg) {
    if (avg >= 70) return 'active'
    if (avg >= 60) return 'warning'
    return 'danger'
  }

  static fromForm(data = {}, { fallbackCourse = '', forcedCode } = {}) {
    const metrics = StudentEntity.normalizeMetrics(data)
    return new StudentEntity({
      code: forcedCode || data.code || '',
      name: String(data.name || '').trim(),
      course: data.course || fallbackCourse,
      avg: metrics.avg,
      att: metrics.att,
      status: StudentEntity.resolveStatus(metrics.avg),
    })
  }

  static normalizeImportedRow(row = {}, fallbackCourse = '') {
    const normalized = {}
    Object.entries(row || {}).forEach(([key, value]) => {
      normalized[String(key).trim().toLowerCase()] = value
    })

    return {
      name: String(normalized.nombre || normalized.name || normalized.estudiante || '').trim(),
      course: String(normalized.curso || normalized.course || '').trim() || fallbackCourse,
      avg: normalized.promedio || normalized.avg || normalized.nota || 0,
      att: normalized.asistencia || normalized.att || 0,
    }
  }

  get statusLabel() {
    return this.status === 'active' ? 'Normal' : this.status === 'warning' ? 'En riesgo' : 'Critico'
  }

  toRow() {
    return {
      code: this.code,
      name: this.name,
      course: this.course,
      avg: this.avg,
      att: this.att,
      status: this.status,
    }
  }

  toExportRow() {
    return [
      this.code,
      this.name,
      this.course,
      this.avg,
      `${this.att}%`,
      this.statusLabel,
    ]
  }
}
