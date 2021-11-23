import { jest } from '@jest/globals'

import {
  ClientBase,
  ClientKind,
  FetchParams,
  FetchResult,
  RawRecord,
  ResRecord
} from '../../src/types/client.js'

export class ClientTest extends ClientBase {
  _total: number = 10
  _idx: number = 0
  _record: RawRecord[] = []
  genRecord(total: number) {
    this._record = []
    this._total = total
    for (let i = 0; i < this._total; i++) {
      this._record.push({
        id: `id${i}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        test: this._idx++
      })
    }
    return this
  }
  setRecord(record: RawRecord[]) {
    this._record.push(...record)
    this._total = this._record.length
    return this
  }
  kind(): ClientKind {
    return 'appsheet'
  }
  _fetch = jest.fn(
    (async ({ skip, pageSize }: FetchParams): Promise<FetchResult> => {
      const recs: RawRecord[] = []
      const lim = pageSize !== undefined ? pageSize : this._total
      for (let i = 0; i < lim; i++) {
        const r = this._record[i + skip]
        if (r) {
          recs.push(r)
        }
      }
      return new Promise((resolve, reject) => {
        process.nextTick(() => {
          try {
            const content = this._execTransform(recs).map(
              (v) => new ResRecord(v)
            )
            resolve({
              fetch: { count: recs.length, total: this._total },
              content
            })
          } catch (err) {
            reject(err)
          }
        })
      })
    }).bind(this) as ClientBase['_fetch']
  )
}
