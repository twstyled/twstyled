/* eslint-disable @rushstack/security/no-unsafe-regexp */
import * as babel from '@babel/core'
// eslint-disable-next-line import/no-duplicates
import type babelCore from '@babel/core'
// eslint-disable-next-line import/no-duplicates
import type { TransformOptions, PartialConfig } from '@babel/core'
import { createFilter } from '@rollup/pluginutils'
import type { Plugin } from 'rollup'
import type { FilterPattern, CreateFilter } from '@rollup/pluginutils'
import preflightCheck from './babel-preflight-check'

const BUNDLED = 'bundled'

export interface PluginOptions
  extends Omit<babelCore.TransformOptions, 'include' | 'exclude'> {
  /**
   * A minimatch pattern, or array of patterns, which specifies the files in the build the plugin should operate on. When relying on Babel configuration files you cannot include files already excluded there.
   * @default undefined;
   */
  include?: FilterPattern
  /**
   * A minimatch pattern, or array of patterns, which specifies the files in the build the plugin should ignore. When relaying on Babel configuration files you can only exclude additional files with this option, you cannot override what you have configured for Babel itself.
   * @default undefined;
   */
  exclude?: FilterPattern
  /**
   * Custom filter function can be used to determine whether or not certain modules should be operated upon.
   * Example:
   *   import { createFilter } from '@rollup/pluginutils';
   *   const include = 'include/**.js';
   *   const exclude = 'exclude/**.js';
   *   const filter = createFilter(include, exclude, {});
   * @default undefined;
   */
  filter?: ReturnType<CreateFilter>
  /**
   * An array of file extensions that Babel should transpile. If you want to transpile TypeScript files with this plugin it's essential to include .ts and .tsx in this option.
   * @default ['.js', '.jsx', '.es6', '.es', '.mjs']
   */
  extensions?: string[]
  /**
   * It is recommended to configure this option explicitly (even if with its default value) so an informed decision is taken on how those babel helpers are inserted into the code.
   * @default 'bundled'
   */
  babelHelpers?: 'bundled' | 'runtime' | 'inline' | 'external'
  /**
   * Before transpiling your input files this plugin also transpile a short piece of code for each input file. This is used to validate some misconfiguration errors, but for sufficiently big projects it can slow your build times so if you are confident about your configuration then you might disable those checks with this option.
   * @default false
   */
  skipPreflightCheck?: boolean
}

export default function RollupPluginFactory(
  pluginOptions: PluginOptions
): Plugin {
  let filter: (id: string) => boolean

  const {
    exclude,
    extensions,
    babelHelpers,
    include,
    filter: customFilter,
    skipPreflightCheck,
    ...babelOptions
  } = {
    extensions: babel.DEFAULT_EXTENSIONS as string[],
    plugins: [],
    sourceMaps: true,
    ...pluginOptions,
    presets: [],
    skipPreflightCheck: false,
    babelHelpers: pluginOptions.babelHelpers || BUNDLED,
    caller: {
      name: 'rollup-plugin-twstyled',
      supportsStaticESM: true,
      supportsDynamicImport: true,
      supportsTopLevelAwait: true,
      supportsExportNamespaceFrom: false,
      ...pluginOptions.caller
    }
  }
  const preset = pluginOptions.presets![0] as Function
  const { plugins } = preset(
    { caller: () => babelOptions.caller },
    {
      outputPath: './src/index.twstyled.css',
      extension: '.twstyled.css'
    }
  )

  babelOptions.plugins = [
    [
      '@babel/plugin-transform-react-jsx',
      {
        runtime: 'automatic'
      }
    ],
    [
      '@babel/plugin-transform-typescript',
      {
        allowNamespaces: true,
        isTSX: true
      }
    ]
  ].concat(plugins)
  delete pluginOptions.presets

  const babelConfig = babel.loadPartialConfig(babelOptions)!

  const plugin: Plugin = {
    name: 'babel',

    options(this: any) {
      const extensionRegExp = new RegExp(
        `(${extensions.map(escapeRegExpCharacters).join('|')})$`
      )
      if (customFilter && (include || exclude)) {
        console.error(
          'Could not handle include or exclude with custom filter together'
        )
        throw new Error(
          'Could not handle include or exclude with custom filter together'
        )
      }
      const userDefinedFilter =
        typeof customFilter === 'function'
          ? customFilter
          : createFilter(include, exclude)
      filter = (id) =>
        extensionRegExp.test(stripQuery(id).bareId) && userDefinedFilter(id)

      return null
    },

    resolveId(id: string) {
      return null
    },

    load(id: string) {
      return null
    },

    transform(code: string, filename: string) {
      if (!filter(filename)) return { code }

      return transformCode(
        code,
        filename,
        babelConfig,
        async (transformOptions: TransformOptions) => {
          if (!skipPreflightCheck) {
            await preflightCheck(this, babelHelpers, transformOptions)
          }
          return transformOptions
        }
      )
    }
  }
  return plugin
}

//
// MAIN CODE TRANSFORM
//

async function transformCode(
  inputCode: string,
  filename: string,
  babelConfig: PartialConfig,
  finalizeOptions?: (TransformOptions) => Promise<TransformOptions>
): Promise<{
  code?: string
  map:
    | {
        version: number
        sources: string[]
        names: string[]
        sourceRoot?: string | undefined
        sourcesContent?: string[] | undefined
        mappings: string
        file: string
      }
    | null
    | undefined
} | null> {
  // file is ignored by babel
  if (!babelConfig) {
    return null
  }

  let transformOptions = babelConfig.options

  transformOptions.filename = filename

  if (finalizeOptions) {
    transformOptions = await finalizeOptions(transformOptions)
  }

  const result = await babel.transformAsync(inputCode, {
    ...transformOptions,
    filename,
    sourceMaps: true,
    sourceFileName: filename
  })

  const { code, map } = result!

  return {
    code,
    map
  } as any
}

//
// UTILITY FUNCTIONS
//

const regExpCharactersRegExp = /[\\^$.*+?()[\]{}|]/g

const escapeRegExpCharacters = (str) =>
  str.replace(regExpCharactersRegExp, '\\$&')

function stripQuery(id: string) {
  // strip query params from import
  const [bareId, query] = id.split('?')
  const suffix = `${query ? `?${query}` : ''}`
  return {
    bareId,
    query,
    suffix
  }
}
