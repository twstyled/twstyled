import { StrictOptions } from '@linaria/babel-preset'
import { CorePluginOptions } from '../types'
import { getConfigPaths } from './babel-options-read-paths'

export default function getBabelOptions(
  options: Partial<StrictOptions & CorePluginOptions>
) {
  if (options.babelOptions) {
    return options
  }
  const { paths, baseUrl } = getConfigPaths()

  if (!paths) {
    return options
  }

  return {
    babelOptions: {
      plugins: [
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
        ],
        [
          'babel-plugin-module-resolver',
          {
            root: [baseUrl || './'],
            alias: Object.keys(paths).reduce((accum, key) => {
              accum[key.replace(/\/\*$/, '')] = paths[key].map((s) =>
                s.replace(/\/\*$/, '')
              )[0]
              return accum
            }, {} as Record<string, string>),
            extensions: ['.tsx', '.ts']
          }
        ]
      ]
    },
    ...options
  }
}
