#!/usr/bin/env node
import yargs from 'yargs'

import { hideBin } from 'yargs/helpers'
import cli from './cli.js'
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
            'image-info': {
              type: 'boolean',
              defult: 'false',
              description: 'extract information of image(size, meta)'
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
      'app-id': {
        type: 'string',
        required: false,
        description: 'app id to API endpoint'
      },
      'map-config': {
        type: 'string',
        required: true,
        description: 'json file name that contain mapping fields etc.'
      },
      'access-key': {
        type: 'string',
        require: true,
        description: 'access key to get contents'
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
      appId: argv['app-id']||'',
      mapConfig: argv['map-config'],
      accessKey: argv['access-key'],
      saveOpts: {
        apiName: argv.apiName,
        dstContentsDir: argv.dstContentsDir,
        dstImagesDir: argv.dstImagesDir,
        staticRoot: argv['static-root'] || 'static/',
        imageInfo: argv['image-info'] || false
      }
    })
  )
})()
