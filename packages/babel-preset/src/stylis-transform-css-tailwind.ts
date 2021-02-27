import type core from '@babel/core'
import type { StringLiteral } from '@babel/types'
import type { NodePath } from '@babel/traverse'
import type { Element } from 'stylis'
import cx from 'clsx'
import { getTailwindTransformer } from './util'
import type {
  CorePluginOptions,
  CorePluginState,
  StylisMiddleware,
  TemplateStateBase
} from './types'

type Core = typeof core

const CSSVAR_REGEXP = new RegExp(/var\(--([^)]*)\)/)

interface TemplateState extends TemplateStateBase {
  twDeclarations: string[]
}

export default function getStylisTransformTailwind(
  { types: t }: Core,
  options: CorePluginOptions
) {
  const transform = getTailwindTransformer(options)
  return {
    enter: (state: CorePluginState, templateState: TemplateState) => {
      templateState.twDeclarations = []
    },
    stylis: (
      state: CorePluginState,
      templateState: TemplateState,
      element: Element
    ) => {
      if (
        element.children &&
        (element.type === '@tailwind' || element.type === '@apply')
      ) {
        let result: string
        if (typeof element.children === 'string') {
          result = element.children
        } else if (element.children.length === 0) {
          result = element.value
            .replace(/^@(tailwind|apply)\s*/, '')
            .replace(/;$/, '')
        } else {
          result = element.children
            .map((c) => c.value.replace(/;$/, ''))
            .join(' ')
        }

        const twvars: string[] = []
        result = result.replace(CSSVAR_REGEXP, (match, $1) => {
          const { scope } = templateState.item.interpolations.find(
            (i) => i.id === $1
          )!
          const replacements: Array<{
            nodePath: NodePath<StringLiteral>
            value: string
          }> = []
          scope.path.traverse({
            StringLiteral: function (nodePath: NodePath<StringLiteral>) {
              const twvalue = transform(nodePath.node.value, state)
              replacements.push({ nodePath, value: twvalue })
            }
          })
          replacements.forEach(({ nodePath, value }) => {
            nodePath.replaceWith(t.stringLiteral(value))
          })
          twvars.push($1)
          return ''
        })
        if (templateState.item.props && twvars.length > 0) {
          templateState.item.props.push(
            t.objectProperty(
              t.identifier('twvars'),
              t.arrayExpression(twvars.map((twvar) => t.stringLiteral(twvar)))
            )
          )
        }
        element.value = ''
        element.children = []
        templateState.twDeclarations.push(result)
      }
    },
    exit: (state: CorePluginState, templateState: TemplateState) => {
      if (
        templateState.twDeclarations.length > 0 &&
        templateState.item.isReferenced
      ) {
        const twclasses = transform(templateState.twDeclarations, state)

        templateState.className =
          templateState.cssText.length > 0
            ? cx(templateState.className, twclasses)
            : cx(twclasses)
      }
    }
  } as StylisMiddleware<TemplateStateBase>
}
