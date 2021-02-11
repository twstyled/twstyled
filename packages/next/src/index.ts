import {
  Context,
  CssLoaderRule,
  LocalIdentName,
  NextConfiguration,
  Options
} from './types'

const TWSTYLED_MODULE_EXTENSION = '.twstyled.module.css'

/**
 * This is a Next.js plugin that updates webpack postcss options
 * and configures babel
 * @param {PluginProps} nextConfig
 */
export default function nextLinaria(nextConfig: any = {}) {
  mergeDefaults(nextConfig, {
    twstyled: {
      extension: TWSTYLED_MODULE_EXTENSION
    }
  })

  return Object.assign({}, nextConfig, {
    webpack: (config: NextConfiguration, ...rest: any[]) => {
      traverse(config.module.rules, config)
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

function traverse(rules: CssLoaderRule[], pluginOptions: NextConfiguration) {
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
          if (context.resourcePath.includes(pluginOptions.twstyled.extension)) {
            return localName
          }
          return nextGetLocalIdent(context, localIdentName, localName, options)
        }
      }
    }
    if (typeof rule.use === 'object') {
      traverse(Array.isArray(rule.use) ? rule.use : [rule.use], pluginOptions)
    }
    if (Array.isArray(rule.oneOf)) {
      traverse(rule.oneOf, pluginOptions)
    }
  }
}
