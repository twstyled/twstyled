/**
 * The main processing logic: the `twstyled` babel plugin
 *
 * This plugin includes:
 *   - *prepare-tw* -- converts tw="..." attributes in JSX and tw\`...\` template strings to css template strings
 *   - *linaria* -- uses linaria to pre-evaluate css and styled template strings and react helpers
 *   - *template processor* -- collates all embedded tailwind css in extended format and uses xwind to convert to standard tailwind
 *   - *write-css* -- writes all generated non-tailwind css to output files
 *   - *write-tw-css* -- generates exactly the minimum tailwind css needed and writes a global tailwind css file
 */
import type { Program } from '@babel/types'
import type { NodePath, Visitor } from '@babel/traverse'
import {
  plugin as pluginBase,
  getTemplateProcessor,
  State
} from '@linaria/babel-preset'
import type core from '@babel/core'

import { getTailwindAttributes } from '@twstyled/util'
import getVisitorsPrepareTw, {
  getVisitorsPreprocessorJsx,
  getVisitorsPreprocessorTw$,
  getVisitorsPreprocessorTwVariant$
} from './visitors-preprocess'
import getVisitorsWriteCss from './visitors-write-css'
import getVisitorsWriteTwCss from './visitors-write-css-tailwind'
import getProcessor from './template-processor'
import getStylisTransformTailwind from './stylis-transform-css-tailwind'
import getStylisTransformCss from './stylis-transform-css'

import { CorePluginOptions, CorePluginState } from './types'

type Core = typeof core

interface LinariaPlugin<S> {
  visitor: {
    Program: {
      enter(path: NodePath<Program>, state: S): void
      exit(path: NodePath<Program>, state: S): void
    }
  }
}

export default function (
  babel: Core,
  options: CorePluginOptions
): { visitor: Visitor<CorePluginState> } {
  options.templateProcessor =
    options.templateProcessor ||
    getTemplateProcessor(babel, options, getProcessor(babel, options))

  options.stylisMiddleware = (options.stylisMiddleware || []).concat([
    getStylisTransformTailwind(babel, options),
    getStylisTransformCss(babel, options)
  ])

  const [twAttributes, twVariants] = getTailwindAttributes(options)
  const Tw$ = getVisitorsPreprocessorTw$(babel, options)
  const twAttributeProcessors = twAttributes.reduce((accum, key) => {
    accum[`${key}-`] = Tw$
    return accum
  }, {} as any)

  const TwVariant$ = getVisitorsPreprocessorTwVariant$(babel, options)
  const twVariantProcessors = twVariants.reduce((accum, key) => {
    accum[`${key}--`] = TwVariant$
    return accum
  }, {} as any)

  options.jsxPreprocessors = {
    css: getVisitorsPreprocessorJsx(babel, options),
    tw: getVisitorsPreprocessorJsx(babel, options),
    ...twAttributeProcessors,
    ...twVariantProcessors,
    ...(options.jsxPreprocessors || {})
  }

  const { visitor: visitorLinaria } = (pluginBase(
    babel,
    options
  ) as unknown) as LinariaPlugin<State>
  const { visitor: visitorsPrepareTw } = getVisitorsPrepareTw(babel, options)
  const { visitor: visitorWriteCss } = getVisitorsWriteCss(babel, options)
  const { visitor: visitorWriteTwCss } = getVisitorsWriteTwCss(babel, options)

  return {
    visitor: {
      Program: {
        enter(path: NodePath<Program>, state: CorePluginState) {
          state.cssText = ''
          state.importLocalNames = {}
          visitorsPrepareTw.Program.enter(path, state)
          visitorWriteTwCss.Program.enter(path, state)
          visitorWriteCss.Program.enter(path, state)
          visitorLinaria.Program.enter(path, state)
        },
        exit(path: any, state: CorePluginState) {
          visitorLinaria.Program.exit(path, state)
          visitorWriteCss.Program.exit(path, state)
          visitorWriteTwCss.Program.exit(path, state)
          visitorsPrepareTw.Program.exit(path, state)
        }
      }
    }
  }
}
