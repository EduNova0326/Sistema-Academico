export class BaseEntity {
  constructor(data = {}) {
    Object.assign(this, data)
  }

  static fromRow(row = {}) {
    return new this(row)
  }

  toJSON() {
    return { ...this }
  }
}
