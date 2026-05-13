import { BaseEntity } from './BaseEntity.js'

export class ChecklistEntity extends BaseEntity {
  constructor(data = {}) {
    super({
      id: data.id ?? null,
      n: data.n || '',
      items: Array.isArray(data.items) ? data.items : [],
      created_at: data.created_at || null,
    })
  }

  static fromRow(row = {}) {
    return new ChecklistEntity({
      id: row.id,
      n: row.name || '',
      items: (row.checklist_items || [])
        .sort((a, b) => Number(a.order_idx || 0) - Number(b.order_idx || 0))
        .map((item) => ({
          id: item.id,
          label: item.label,
          checked: !!item.checked,
        })),
      created_at: row.created_at || null,
    })
  }

  static fromForm(data = {}) {
    return new ChecklistEntity({
      id: data.id ?? null,
      n: String(data.name || data.n || '').trim(),
      items: Array.isArray(data.items)
        ? data.items.map((item) => ({
            label: String(item.label || '').trim(),
            checked: !!item.checked,
          })).filter((item) => item.label)
        : [],
    })
  }

  toRow() {
    return {
      name: this.n,
    }
  }
}
