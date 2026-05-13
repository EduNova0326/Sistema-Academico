import { BaseEntity } from './BaseEntity.js'

export class RubricEntity extends BaseEntity {
  constructor(data = {}) {
    super({
      id: data.id ?? null,
      n: data.n || '',
      criteria: Array.isArray(data.criteria) ? data.criteria : [],
      created_at: data.created_at || null,
    })
  }

  static fromRow(row = {}) {
    return new RubricEntity({
      id: row.id,
      n: row.name || '',
      criteria: (row.rubric_criteria || [])
        .sort((a, b) => Number(a.order_idx || 0) - Number(b.order_idx || 0))
        .map((criterion) => ({
          id: criterion.id,
          c: criterion.name,
          vals: [
            criterion.val_4 || '',
            criterion.val_3 || '',
            criterion.val_2 || '',
            criterion.val_1 || '',
          ],
        })),
      created_at: row.created_at || null,
    })
  }

  static fromForm(data = {}) {
    return new RubricEntity({
      id: data.id ?? null,
      n: String(data.name || data.n || '').trim(),
      criteria: Array.isArray(data.criteria)
        ? data.criteria.map((criterion) => ({
            c: String(criterion.c || '').trim(),
            vals: Array.isArray(criterion.vals) ? criterion.vals.map((value) => String(value || '').trim()) : ['', '', '', ''],
          })).filter((criterion) => criterion.c)
        : [],
    })
  }

  toRow() {
    return {
      name: this.n,
    }
  }
}
