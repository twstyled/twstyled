import { TransformOptions } from '@babel/core'
import twstyledBabelPreset from '@twstyled/babel-preset'

import babelRollup from './babel-rollup'
import type { PluginOptions as RollupPluginOptions } from './babel-rollup'

interface PluginOptions {
  babel?: TransformOptions
}

export default function Plugin(options?: PluginOptions) {
  const babel = options?.babel ?? {}
  const { plugins, presets, ...babelOptions } = babel
  const babelPlugins = [...(plugins || [])]
  const babelPresets = [twstyledBabelPreset, ...(presets || [])]
  return {
    ...babelRollup({
      extensions: ['tsx', 'ts'],
      presets: babelPresets,
      plugins: babelPlugins,
      babelrc: false,
      babelHelpers: 'bundled',
      ...(babelOptions || options)
    } as RollupPluginOptions),

    config(config) {
      return {
        // only apply esbuild to non tsx files
        // since we are handling tsx now
        esbuild: {
          include: /\.(js|jsx|ts)$/
        },
        define: {
          ...config.define
        }
      }
    },
    name: require('../package.json').name
  }
}
