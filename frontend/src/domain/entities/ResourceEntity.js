import { BaseEntity } from './BaseEntity.js'

export class ResourceEntity extends BaseEntity {
  constructor(data = {}) {
    super({
      id: data.id ?? null,
      n: data.n || '',
      tipo: data.tipo || 'Enlace',
      m: data.m || data.tipo || 'Enlace',
      url: data.url || '',
      size: data.size || '',
      desc: data.desc || '',
      created_at: data.created_at || null,
    })
  }

  static fromRow(row = {}) {
    return new ResourceEntity({
      id: row.id,
      n: row.name || '',
      tipo: row.type || 'Enlace',
      m: row.type || 'Enlace',
      url: row.url || '',
      size: row.size || '',
      desc: row.description || '',
      created_at: row.created_at || null,
    })
  }

  static fromForm(data = {}) {
    return new ResourceEntity({
      n: String(data.name || data.n || '').trim(),
      tipo: data.type || data.tipo || 'Enlace',
      m: data.type || data.tipo || 'Enlace',
      url: String(data.url || '').trim(),
      size: String(data.size || '').trim(),
      desc: String(data.description || data.desc || '').trim(),
    })
  }

  toRow() {
    return {
      name: this.n,
      type: this.tipo,
      url: this.url || null,
      size: this.size || null,
      description: this.desc || null,
    }
  }
}
