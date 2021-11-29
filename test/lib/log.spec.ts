import { PassThrough } from 'stream'
import { initLog, printErr, printInfo, printWarn } from '../../src/lib/log.js'

function mockStreams(res: {
  o: string
  e: string
}): [PassThrough, PassThrough] {
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  stdout.on('data', (d) => (res.o = `${res.o}${d}`))
  stderr.on('data', (d) => (res.e = `${res.e}${d}`))
  return [stdout, stderr]
}

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
})
