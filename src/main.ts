#!/usr/bin/env node
import yargs from 'yargs'

import { hideBin } from 'yargs/helpers'
import { cli } from './cli.js'
import { ClientKindValues } from './types/client.js'
;(async () => {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('rcc')
    .env('RCC')
    .command(
      'save <apiName> <dstContentsDir> <dstImagesDir>',
      'save remote contents to local directory',
      (yargs) => {
        return yargs
          .options({
            'static-root': {
              type: 'string',
              defult: 'static/',
              description: 'root of static path to trim image path'
            },
            filter: {
              type: 'string',
              array: true,
              required: false,
              description: 'filter operators',
              coerce: (arg: any) => {
                // https://github.com/yargs/yargs/issues/821
                if (typeof arg === 'object' && !Array.isArray(arg)) {
                  const arr: any[] = []
                  for (const [key, value] of Object.entries(arg)) {
                    const idx = Number.parseInt(key, 10)
                    if (!Number.isNaN(idx)) {
                      arr[idx] = value
                    } else {
                      throw new Error(
                        `filter: index of filter is not number: ${key}`
                      )
                    }
                  }
                  return arr
                }
                return arg
              }
            }
          })
          .positional('apiName', {
            describe: 'api name to get contents',
            type: 'string'
          })
          .positional('dstContentsDir', {
            describe: 'contens directory',
            type: 'string'
          })
          .positional('dstImagesDir', {
            describe: 'images directory',
            type: 'string'
          })
          .demandOption(['apiName'])
          .demandOption(['dstContentsDir'])
          .demandOption(['dstImagesDir'])
      }
    )
    .options({
      'client-kind': {
        choices: ClientKindValues,
        required: true,
        description: 'choise client kind'
      },
      'api-base-url': {
        type: 'string',
        required: true,
        description: 'Base URL to API endpoint'
      },
      credential: {
        type: 'string',
        array: true,
        required: false,
        description: 'credential to API endpoint',
        coerce: (arg: any) => {
          // https://github.com/yargs/yargs/issues/821
          if (!Array.isArray(arg)) {
            const arr: any[] = []
            for (const [key, value] of Object.entries(arg)) {
              const idx = Number.parseInt(key, 10)
              if (!Number.isNaN(idx)) {
                arr[idx] = value
              } else {
                throw new Error(
                  `credential: index of credential is not number: ${key}`
                )
              }
            }
            return arr
          }
          return arg
        }
      },
      'map-config': {
        type: 'string',
        required: true,
        description: 'json file name that contain mapping fields etc.'
      }
    })
    .help().argv
  process.exit(
    await cli({
      command: `${argv._[0]}`,
      stdout: process.stdout,
      stderr: process.stderr,
      clientKind: argv['client-kind'],
      apiBaseURL: argv['api-base-url'],
      credential: argv['credential'] || [],
      mapConfig: argv['map-config'],
      saveOpts: {
        apiName: argv.apiName,
        dstContentsDir: argv.dstContentsDir,
        dstImagesDir: argv.dstImagesDir,
        staticRoot: argv['static-root'] || 'static/',
        filter: argv['filter'] || []
      }
    })
  )
})()
