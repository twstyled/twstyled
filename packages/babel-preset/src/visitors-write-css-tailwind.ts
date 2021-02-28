import * as path from 'path'
import * as fs from 'fs'
import { NodePath, types } from '@babel/core'
import mkdirp from 'mkdirp'
import { composer } from '@xwind/class-utilities'
import { getTwConfigCache, getTwConfigPath } from './config-options'
import { getHash, getTailwindCssGenerator } from './util'
import type { CorePluginOptions, CorePluginState } from './types'

let $hash: string = ''
let doneMkdir = false
let $cssFileName: string

const cache = new Map<string, string[]>()

let $generate: ReturnType<typeof getTailwindCssGenerator>

export default function getVisitorsWriteTwCss(
  babel: {
    types: typeof types
  },
  options: CorePluginOptions
) {
  return {
    visitor: {
      Program: {
        enter(nodePath: NodePath<types.Program>, state: CorePluginState) {
          cache.delete(state.file.opts.filename)
          state.twcache = cache
        },
        exit(nodePath: NodePath<types.Program>, state: CorePluginState) {
          if (
            state.file.metadata.twclasses &&
            state.file.metadata.twclasses.length > 0
          ) {
            cache.set(state.file.opts.filename, state.file.metadata.twclasses)
            writeCss(state, options)
          }
        }
      }
    }
  }
}

/**
 * Get Css for tailwind classes and write to twstyled cache (usually in node_modules to allow global
 * import using Next.js
 */
function writeCss(state: CorePluginState, options: CorePluginOptions) {
  const twConfigPath = getTwConfigPath(options.configPath)
  const { twConfig, isNewTwConfig } = getTwConfigCache(twConfigPath)

  if (!$generate || isNewTwConfig) {
    $generate = getTailwindCssGenerator(options, twConfig)
  }

  const classes = composer(
    Array.from(state.twcache.values()),
    twConfig.separator
  ).sort((a, b) => (a > b ? 0 : -1))

  const newHash = getHash(classes.join())

  if (newHash === $hash) {
    return
  }

  $hash = newHash

  $cssFileName = $cssFileName || path.resolve(process.cwd(), options.outputPath)

  const cssText = $generate(classes)
  if (!doneMkdir) {
    mkdirp.sync(path.dirname($cssFileName))
    doneMkdir = true
  }
  console.log(`Writing to ${$cssFileName}`)
  fs.writeFileSync($cssFileName, cssText)
}
