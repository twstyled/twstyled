import type core from '@babel/core'

import { compile, serialize, middleware, stringify, Middleware } from 'stylis'
import type { Element } from 'stylis'
import type { TemplateCssProcessor } from '@linaria/babel-preset'
import type {
  CorePluginOptions,
  CorePluginState,
  TemplateItemProps,
  TemplateStateBase
} from './types'

type Core = typeof core

export default function (babel: Core, options: CorePluginOptions) {
  return function processCssText(
    state: CorePluginState,
    index: number,
    item: TemplateItemProps
  ): { cssText: string; className: string } {
    const { selector, cssText: rawCss } = item

    const templateState: TemplateStateBase = {
      cssText: rawCss || '',
      className: item.className,
      index,
      item
    }

    options.stylisMiddleware.forEach((middleware) => {
      middleware.enter(state, templateState)
    })

    templateState.cssText = serialize(
      compile(`${selector}{${rawCss}}`),
      middleware(
        options.stylisMiddleware
          .map(
            (middleware) => (
              element: Element,
              index: number,
              children: Array<Element | string>,
              callback: Middleware
            ) => {
              middleware.stylis(state, templateState, element)
            }
          )
          .concat([stringify])
      )
    )

    options.stylisMiddleware.forEach((middleware) => {
      middleware.exit(state, templateState)
    })

    state.cssText += `${templateState.cssText}\n`
    return {
      cssText: templateState.cssText,
      className: templateState.className
    }
  } as TemplateCssProcessor
}
