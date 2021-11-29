import { mockStreams } from '../util.js'
import { initLog, printErr, printInfo, printWarn } from '../../src/lib/log.js'

beforeAll(() => {
  initLog(undefined, undefined)
})

afterAll(() => {
  initLog(undefined, undefined)
})

describe('initLog()', () => {
  it('should print string to stdout(info)', () => {
    const res = { o: '', e: '' }
    initLog(...mockStreams(res))
    printInfo('test')
    expect(res).toEqual({ o: 'test\n', e: '' })
  })
  it('should print string to stdout(warn)', () => {
    const res = { o: '', e: '' }
    initLog(...mockStreams(res))
    printWarn('test')
    expect(res).toEqual({ o: 'test\n', e: '' })
  })
  it('should print string to stderr(err)', () => {
    const res = { o: '', e: '' }
    initLog(...mockStreams(res))
    printErr('test')
    expect(res).toEqual({ o: '', e: 'test\n' })
  })
  it('should no print string to stdout(info)', () => {
    const res = { o: '', e: '' }
    initLog(undefined, undefined)
    printInfo('test')
    expect(res).toEqual({ o: '', e: '' })
  })
  it('should not print string to stdout(warn)', () => {
    const res = { o: '', e: '' }
    initLog(undefined, undefined)
    printWarn('test')
    expect(res).toEqual({ o: '', e: '' })
  })
  it('should noty print string to stderr(err)', () => {
    const res = { o: '', e: '' }
    initLog(undefined, undefined)
    printErr('test')
    expect(res).toEqual({ o: '', e: '' })
  })
})
