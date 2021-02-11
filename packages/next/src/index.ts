import {
  Context,
  CSSConfiguration,
  CssLoaderRule,
  LocalIdentName,
  Options
} from './types'

const LINARIA_EXTENSION = '.linaria.module.css'

/**
 * This is a Next.js plugin that updates webpack postcss options
 * and configures babel
 * @param {PluginProps} nextConfig
 */
export default function nextLinaria(nextConfig: any = {}) {
  mergeDefaults(nextConfig, {
    linaria: {
      extension: LINARIA_EXTENSION
    }
  })

  return Object.assign({}, nextConfig, {
    webpack: (config: CSSConfiguration, ...rest: any[]) => {
      traverse(config.module.rules)
      return nextConfig.webpack(config, ...rest)
    }
  })
}

module.exports = nextLinaria

const mergeDefaults = function (opts: any, defaults: any) {
  for (const i in defaults) {
    if (!(i in opts)) {
      opts[i] = defaults[i]
    }
  }
  return opts
}

function traverse(rules: CssLoaderRule[]) {
  for (const rule of rules) {
    if (typeof rule.loader === 'string' && rule.loader.includes('css-loader')) {
      if (
        rule.options &&
        rule.options.modules &&
        typeof rule.options.modules.getLocalIdent === 'function'
      ) {
        const nextGetLocalIdent = rule.options.modules.getLocalIdent
        rule.options.modules.getLocalIdent = (
          context: Context,
          localIdentName: LocalIdentName,
          localName: string,
          options: Options
        ) => {
          if (context.resourcePath.includes(LINARIA_EXTENSION)) {
            return localName
          }
          return nextGetLocalIdent(context, localIdentName, localName, options)
        }
      }
    }
    if (typeof rule.use === 'object') {
      traverse(Array.isArray(rule.use) ? rule.use : [rule.use])
    }
    if (Array.isArray(rule.oneOf)) {
      traverse(rule.oneOf)
    }
  }
}
