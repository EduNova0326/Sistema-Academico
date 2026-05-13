import { supabase } from './supabaseClient.js'
import { BaseCrudService } from './core/BaseCrudService.js'
import { ResourceEntity } from '../domain/entities/ResourceEntity.js'
import { TemplateEntity } from '../domain/entities/TemplateEntity.js'
import { TestEntity } from '../domain/entities/TestEntity.js'
import { ChecklistEntity } from '../domain/entities/ChecklistEntity.js'
import { RubricEntity } from '../domain/entities/RubricEntity.js'

class ResourcesService extends BaseCrudService {
  constructor() {
    super({ client: supabase, tableName: 'resources', entityClass: ResourceEntity })
  }

  async createFromForm(form, userId) {
    const entity = ResourceEntity.fromForm(form)
    const row = { ...entity.toRow(), user_id: userId || null }
    const { data, error } = await this.query().insert([row]).select().single()
    if (error) throw error
    return ResourceEntity.fromRow(data)
  }

  async updateFromForm(id, form) {
    const entity = ResourceEntity.fromForm(form)
    const { data, error } = await this.query().update(entity.toRow()).eq('id', id).select().single()
    if (error) throw error
    return ResourceEntity.fromRow(data)
  }
}

class TemplatesService extends BaseCrudService {
  constructor() {
    super({ client: supabase, tableName: 'templates', entityClass: TemplateEntity })
  }

  async createFromForm(form, userId, structureJson = null) {
    const entity = TemplateEntity.fromForm(form, { defaultStructure: structureJson })
    const row = { ...entity.toRow(), user_id: userId || null }
    const { data, error } = await this.query().insert([row]).select().single()
    if (error) throw error
    return TemplateEntity.fromRow(data)
  }

  async updateFromForm(id, form, structureJson = null) {
    const entity = TemplateEntity.fromForm(form, { defaultStructure: structureJson })
    const { data, error } = await this.query()
      .update({ ...entity.toRow(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return TemplateEntity.fromRow(data)
  }

  async incrementUses(id, uses) {
    const { error } = await this.query().update({ uses }).eq('id', id)
    if (error) throw error
    return true
  }
}

class TestsService extends BaseCrudService {
  constructor() {
    super({ client: supabase, tableName: 'tests', entityClass: TestEntity })
  }

  async createFromForm(form, userId) {
    const entity = TestEntity.fromForm(form)
    const { data, error } = await this.query()
      .insert([{ ...entity.toRow(), user_id: userId || null }])
      .select()
      .single()
    if (error) throw error
    return TestEntity.fromRow(data)
  }

  async updateFromForm(id, form) {
    const entity = TestEntity.fromForm(form)
    const { data, error } = await this.query()
      .update(entity.toRow())
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return TestEntity.fromRow(data)
  }

  async markApplied(id) {
    const { data, error } = await this.query()
      .update({ status: 'active' })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return TestEntity.fromRow(data)
  }
}

class ChecklistsService extends BaseCrudService {
  constructor() {
    super({ client: supabase, tableName: 'checklists', entityClass: ChecklistEntity })
  }

  async listDetailed() {
    const { data, error } = await this.query()
      .select('*, checklist_items(*)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((row) => ChecklistEntity.fromRow(row))
  }

  async createWithItems(form, userId) {
    const entity = ChecklistEntity.fromForm(form)
    const { data, error } = await this.query()
      .insert([{ ...entity.toRow(), user_id: userId || null }])
      .select()
      .single()
    if (error) throw error

    if (entity.items.length > 0) {
      const { error: itemsError } = await supabase.from('checklist_items').insert(
        entity.items.map((item, index) => ({
          checklist_id: data.id,
          label: item.label,
          checked: !!item.checked,
          order_idx: index,
        }))
      )
      if (itemsError) throw itemsError
    }

    const { data: fullRow, error: fullError } = await this.query()
      .select('*, checklist_items(*)')
      .eq('id', data.id)
      .single()
    if (fullError) throw fullError
    return ChecklistEntity.fromRow(fullRow)
  }

  async updateWithItems(id, form) {
    const entity = ChecklistEntity.fromForm(form)
    const { error: checklistError } = await this.query()
      .update(entity.toRow())
      .eq('id', id)
    if (checklistError) throw checklistError

    const { error: deleteError } = await supabase.from('checklist_items').delete().eq('checklist_id', id)
    if (deleteError) throw deleteError

    if (entity.items.length > 0) {
      const { error: itemsError } = await supabase.from('checklist_items').insert(
        entity.items.map((item, index) => ({
          checklist_id: id,
          label: item.label,
          checked: !!item.checked,
          order_idx: index,
        }))
      )
      if (itemsError) throw itemsError
    }

    const { data: fullRow, error: fullError } = await this.query()
      .select('*, checklist_items(*)')
      .eq('id', id)
      .single()
    if (fullError) throw fullError
    return ChecklistEntity.fromRow(fullRow)
  }
}

class RubricsService extends BaseCrudService {
  constructor() {
    super({ client: supabase, tableName: 'rubrics', entityClass: RubricEntity })
  }

  async listDetailed() {
    const { data, error } = await this.query()
      .select('*, rubric_criteria(*)')
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map((row) => RubricEntity.fromRow(row))
  }

  async createWithCriteria(form, userId) {
    const entity = RubricEntity.fromForm(form)
    const { data, error } = await this.query()
      .insert([{ ...entity.toRow(), user_id: userId || null }])
      .select()
      .single()
    if (error) throw error

    if (entity.criteria.length > 0) {
      const { error: criteriaError } = await supabase.from('rubric_criteria').insert(
        entity.criteria.map((criterion, index) => ({
          rubric_id: data.id,
          name: criterion.c,
          val_4: criterion.vals[0] || '',
          val_3: criterion.vals[1] || '',
          val_2: criterion.vals[2] || '',
          val_1: criterion.vals[3] || '',
          order_idx: index,
        }))
      )
      if (criteriaError) throw criteriaError
    }

    const { data: fullRow, error: fullError } = await this.query()
      .select('*, rubric_criteria(*)')
      .eq('id', data.id)
      .single()
    if (fullError) throw fullError
    return RubricEntity.fromRow(fullRow)
  }

  async updateWithCriteria(id, form) {
    const entity = RubricEntity.fromForm(form)
    const { error: rubricError } = await this.query().update(entity.toRow()).eq('id', id)
    if (rubricError) throw rubricError

    const { error: deleteError } = await supabase.from('rubric_criteria').delete().eq('rubric_id', id)
    if (deleteError) throw deleteError

    if (entity.criteria.length > 0) {
      const { error: criteriaError } = await supabase.from('rubric_criteria').insert(
        entity.criteria.map((criterion, index) => ({
          rubric_id: id,
          name: criterion.c,
          val_4: criterion.vals[0] || '',
          val_3: criterion.vals[1] || '',
          val_2: criterion.vals[2] || '',
          val_1: criterion.vals[3] || '',
          order_idx: index,
        }))
      )
      if (criteriaError) throw criteriaError
    }

    const { data: fullRow, error: fullError } = await this.query()
      .select('*, rubric_criteria(*)')
      .eq('id', id)
      .single()
    if (fullError) throw fullError
    return RubricEntity.fromRow(fullRow)
  }
}

export const resourcesService = new ResourcesService()
export const templatesService = new TemplatesService()
export const testsService = new TestsService()
export const checklistsService = new ChecklistsService()
export const rubricsService = new RubricsService()
