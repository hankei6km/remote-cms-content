import { PassThrough } from 'stream'
export function mockStreams(res: {
  o: string
  e: string
}): [PassThrough, PassThrough] {
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  stdout.on('data', (d) => (res.o = `${res.o}${d}`))
  stderr.on('data', (d) => (res.e = `${res.e}${d}`))
  return [stdout, stderr]
}
