import initClassUtilities from '@xwind/class-utilities'
import core from '@xwind/core'
import { getTwConfigCache, getTwConfigPath } from '../config-options'
import type { CorePluginOptions, CorePluginState } from '../types'

export type TransformerTwCss = (
  twDeclarations: string | string[],
  state: CorePluginState
) => string

let $transformer: TransformerTwCss

export default function getTailwindTransformer(
  options: CorePluginOptions
): TransformerTwCss {
  const twConfigPath = getTwConfigPath(options.configPath)
  const { twConfig, isNewTwConfig } = getTwConfigCache(twConfigPath)
  if (!$transformer || isNewTwConfig) {
    const { screens, variants } = core(twConfig)

    const twClassesUtils = initClassUtilities(twConfig.separator, [
      ...screens,
      ...variants
    ])

    $transformer = function transformClasses(
      twDeclarations: string | string[],
      state: CorePluginState
    ): string {
      const serializedTwClasses = twClassesUtils.serializer(twDeclarations)

      state.file.metadata.twclasses = twClassesUtils.composer(
        serializedTwClasses,
        state.file.metadata.twclasses || []
      )

      return serializedTwClasses
    }
  }

  return $transformer
}
