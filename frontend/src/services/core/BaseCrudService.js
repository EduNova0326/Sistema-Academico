export class BaseCrudService {
  constructor({ client, tableName, entityClass }) {
    this.client = client
    this.tableName = tableName
    this.entityClass = entityClass
  }

  query() {
    return this.client.from(this.tableName)
  }

  mapRows(rows = []) {
    return rows.map(row => this.entityClass.fromRow(row))
  }

  async list({ orderBy = 'created_at', ascending = false, select = '*' } = {}) {
    const { data, error } = await this.query()
      .select(select)
      .order(orderBy, { ascending })
    if (error) throw error
    return this.mapRows(data || [])
  }

  async create(entity) {
    const { data, error } = await this.query()
      .insert([entity.toRow()])
      .select()
      .single()
    if (error) throw error
    return this.entityClass.fromRow(data)
  }

  async createMany(rows = []) {
    const { data, error } = await this.query()
      .insert(rows)
      .select()
    if (error) throw error
    return this.mapRows(data || [])
  }

  async update(id, entity) {
    const { data, error } = await this.query()
      .update(entity.toRow())
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return this.entityClass.fromRow(data)
  }

  async delete(id) {
    const { error } = await this.query().delete().eq('id', id)
    if (error) throw error
    return true
  }
}
