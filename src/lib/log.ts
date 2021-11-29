import { Writable } from 'stream'
let _out: Writable
let _err: Writable

export function initLog(o: Writable, e: Writable) {
  _out = o
  _err = e
}

export function printInfo(s: string) {
  _out.write(s)
  _out.write('\n')
}

export function printWarn(s: string) {
  _out.write(s)
  _out.write('\n')
}

export function printErr(s: string) {
  _err.write(s)
  _err.write('\n')
}
