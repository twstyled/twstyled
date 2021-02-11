import * as path from 'path'
import * as fs from 'fs'
import { NodePath, types, template } from '@babel/core'
import { SourceMapGenerator } from 'source-map'
import mkdirp from 'mkdirp'
import { EvalCache } from '@linaria/babel-preset'
import type { CorePluginState, CorePluginOptions } from './types'
import { getHash } from './util'

const cache = new Map<string, { hash: string; cssFilename?: string }>()

export default function babelPluginWriteCss(
  babel: {
    types: typeof types
  },
  options: CorePluginOptions
) {
  return {
    name: 'babel-plugin-write-css',
    visitor: {
      Program: {
        enter(nodePath: NodePath<types.Program>, state: CorePluginState) {
          const filename = state.file.opts.filename
          const hash = getHash(state.file.code)
          state.mappings = []
          const cached = cache.get(filename)
          if (cached && cached.hash === hash) {
            if (cached.cssFilename) {
              const importUseStyling = template.ast`require('${cached.cssFilename}')`
              nodePath.unshiftContainer('body', importUseStyling)
            }
            return
          }
          cache.set(filename, { hash })
          state.hash = hash
          state.cssText = ''
          EvalCache.clearForFile(filename)
        },
        exit(nodePath: NodePath<types.Program>, state: CorePluginState) {
          if (!state.cssText) {
            return
          }
          writeCss(state, options)
          if (state.file.metadata.cssFilename) {
            cache.set(state.file.opts.filename, {
              hash: state.hash,
              cssFilename: state.file.metadata.cssFilename
            })
            const importUseStyling = template.ast`require('${state.file.metadata.cssFilename}')`
            nodePath.unshiftContainer('body', importUseStyling)
          }
        }
      }
    }
  }
}

/**
 * Write all linaria-generated CSS to the linaria cache folder, with source maps
 */
function writeCss(state: CorePluginState, options: CorePluginOptions) {
  if (state.outputFilename) {
    let { cssText } = state

    const { outputFilename } = state

    if (options.sourceMap) {
      cssText += `/*# sourceMappingURL=data:application/json;base64,${Buffer.from(
        getMappingText(state)
      ).toString('base64')}*/`
    }

    // Read the file first to compare the content
    // Write the new content only if it's changed
    // This will prevent unnecessary WDS reloads
    let currentCssText

    try {
      mkdirp.sync(path.dirname(outputFilename))
      currentCssText = fs.readFileSync(outputFilename, 'utf-8')
    } catch (e) {
      // Ignore error
    }

    if (currentCssText !== cssText) {
      fs.writeFileSync(outputFilename, cssText)
    }
  }
}

function getMappingText(state: CorePluginState) {
  const { mappings } = state

  if (mappings?.length) {
    const generator = new SourceMapGenerator({
      file: `./${state.resourceFileName!.replace(/\.(js|jsx|ts|tsx)$/, '.css')}`
    })

    mappings.forEach((mapping) => generator.addMapping(Object.assign(mapping)))
    generator.setSourceContent(`./${state.resourceFileName}`, state.file.code)

    return generator.toString()
  }

  return ''
}
