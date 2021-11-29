import { Writable } from 'stream'
let _out: Writable | undefined
let _err: Writable | undefined

export function initLog(o: Writable | undefined, e: Writable | undefined) {
  _out = o
  _err = e
}

export function printInfo(s: string) {
  if (_out) {
    _out.write(s)
    _out.write('\n')
  }
}

export function printWarn(s: string) {
  if (_out) {
    _out.write(s)
    _out.write('\n')
  }
}

export function printErr(s: string) {
  if (_err) {
    _err.write(s)
    _err.write('\n')
  }
}
