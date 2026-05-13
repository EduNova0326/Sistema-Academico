import { BaseEntity } from './BaseEntity.js'
import { normalizePlanningTemplate } from '../../services/planningTemplateService.js'

export class TemplateEntity extends BaseEntity {
  constructor(data = {}) {
    super(normalizePlanningTemplate(data))
  }

  static fromRow(row = {}) {
    return new TemplateEntity(row)
  }

  static fromForm(data = {}, { defaultStructure = null } = {}) {
    return new TemplateEntity({
      id: data.id ?? null,
      n: String(data.name || data.n || '').trim(),
      d: String(data.description || data.d || '').trim(),
      content: String(data.content || '').trim(),
      i: data.icon || data.i || 'fa-file-alt',
      c: data.color || data.c || 'var(--primary)',
      uses: Number(data.uses || 0),
      type: data.type || 'weekly',
      structure_json: data.type === 'annual_ra' ? (data.structure_json || defaultStructure) : null,
      is_system_template: !!data.is_system_template,
    })
  }

  toRow() {
    return {
      name: this.n,
      description: this.d,
      content: this.content,
      icon: this.i,
      color: this.c,
      uses: Number(this.uses || 0),
      template_type: this.type,
      structure_json: this.type === 'annual_ra' ? (this.structure_json || null) : null,
      is_system_template: !!this.is_system_template,
    }
  }
}
