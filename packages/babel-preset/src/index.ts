/**
 * The main entry point: Babel preset for `twstyled` based on Linaria and xwind
 *
 * A preset is used to force the plugin order for Babel and to set default plugin options
 */
import type { ConfigAPI, TransformCaller } from '@babel/core'
import plugin from './plugin'
import { CorePluginOptions } from './types'
import { getBabelOptions } from './config-options'

function isEnabled(caller?: TransformCaller & { evaluate?: true }) {
  return caller?.name !== 'linaria' || !caller.evaluate
}

export default function (babel: ConfigAPI, options: CorePluginOptions) {
  if (!babel.caller(isEnabled)) {
    return {}
  }

  return {
    plugins: [
      [
        plugin,
        {
          outputPath: options.outputPath || './pages/global.twstyled.css',
          configPath: options.configPath || './tailwind.config.js',
          includeBase: options.includeBase !== false,
          includeGlobal: options.includeGlobal !== false,
          displayName: process.env.NODE_ENV === 'production' ? false : true,
          sourceMap: process.env.NODE_ENV !== 'production',
          evaluate: true,
          importMap: {
            styled: ['twstyled', '@linaria/react', 'linaria/react'],
            css: ['twstyled', '@linaria/core', 'linaria'],
            tw: ['twstyled']
          },
          rules: [
            {
              action: require('@linaria/shaker').default
            }
          ],
          ...getBabelOptions(options)
        }
      ]
    ]
  }
}
