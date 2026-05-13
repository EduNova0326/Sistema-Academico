import { BaseEntity } from './BaseEntity.js'

export class TestEntity extends BaseEntity {
  constructor(data = {}) {
    super({
      id: data.id ?? null,
      n: data.n || '',
      sub: data.sub || '',
      q: Number(data.q ?? 0),
      status: data.status || 'pending',
      label: data.label || (data.status === 'active' ? 'Aplicada' : 'Borrador'),
      created_at: data.created_at || null,
    })
  }

  static fromRow(row = {}) {
    return new TestEntity({
      id: row.id,
      n: row.name || '',
      sub: row.subject || '',
      q: Number(row.questions ?? 0),
      status: row.status || 'pending',
      label: row.status === 'active' ? 'Aplicada' : 'Borrador',
      created_at: row.created_at || null,
    })
  }

  static fromForm(data = {}) {
    return new TestEntity({
      id: data.id ?? null,
      n: String(data.name || data.n || '').trim(),
      sub: data.subject || data.sub || '',
      q: Number(data.questions ?? data.q ?? 0),
      status: data.status || 'pending',
    })
  }

  toRow() {
    return {
      name: this.n,
      subject: this.sub,
      questions: Number(this.q || 0),
      status: this.status,
    }
  }
}
