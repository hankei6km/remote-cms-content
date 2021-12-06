#!/usr/bin/env node
import yargs from 'yargs'

import { hideBin } from 'yargs/helpers'
import { cli } from './cli.js'
import { yargsArrayFromEnvVars } from './lib/util.js'
import { ClientKindValues } from './types/client.js'
;(async () => {
  const envVarsPrefix = process.env['RCC_ENV_VARS_PREFIX'] || 'RCC'
  const argv = await yargs(hideBin(process.argv))
    .scriptName('rcc')
    .env(envVarsPrefix)
    .command(
      'save <apiName> <dstContentDir> <dstImagesDir>',
      'save remote content to local directory',
      (yargs) => {
        return yargs
          .options({
            'static-root': {
              type: 'string',
              defult: 'static/',
              description: 'root of static path to trim image path'
            },
            skip: {
              type: 'number',
              defult: 0,
              description: 'offset to fetching content'
            },
            limit: {
              type: 'number',
              description: 'limit to fetching content'
            },
            'page-size': {
              type: 'number',
              description: 'page size to fetching content with paginate'
            },
            'position-start': {
              type: 'number',
              required: false,
              default: 1,
              description: 'the start value of position field'
            },
            'max-repeat': {
              type: 'number',
              required: false,
              default: 10,
              description: 'maximum number of repeate to save content'
            },
            filter: {
              type: 'string',
              array: true,
              required: false,
              description: 'filter operators',
              coerce: yargsArrayFromEnvVars
            },
            query: {
              type: 'string',
              array: true,
              required: false,
              description: 'query files',
              coerce: yargsArrayFromEnvVars
            },
            vars: {
              type: 'string',
              array: true,
              required: false,
              description: 'variables to GraphQL',
              coerce: yargsArrayFromEnvVars
            },
            'vars-str': {
              type: 'string',
              array: true,
              required: false,
              description: 'variables to GraphQL(force string)',
              coerce: yargsArrayFromEnvVars
            }
          })
          .positional('apiName', {
            describe: 'api name to get content',
            type: 'string'
          })
          .positional('dstContentDir', {
            describe: 'contens directory',
            type: 'string'
          })
          .positional('dstImagesDir', {
            describe: 'images directory',
            type: 'string'
          })
          .demandOption(['apiName'])
          .demandOption(['dstContentDir'])
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
        coerce: yargsArrayFromEnvVars
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
        dstContentDir: argv.dstContentDir,
        dstImagesDir: argv.dstImagesDir,
        staticRoot: argv['static-root'] || 'static/',
        skip: argv['skip'] !== undefined ? argv['skip'] : 0,
        limit: argv['limit'],
        pageSize: argv['page-size'],
        positioStart: argv['position-start'],
        maxRepeat: argv['max-repeat'],
        filter: argv['filter'] || [],
        query: argv['query'] || [],
        vars: argv['vars'] || [],
        varsStr: argv['vars-str'] || []
      }
    })
  )
})()
