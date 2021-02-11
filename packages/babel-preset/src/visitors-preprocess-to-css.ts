import {
  JSXAttribute,
  JSXOpeningElement,
  StringLiteral,
  JSXExpressionContainer,
  TemplateLiteral
} from '@babel/types'
import type babelCore from '@babel/core'
import type { NodePath } from '@babel/traverse'
import type { CorePluginState } from './types'
import { wrapTemplateLiteral, combineExpressions, assureImport } from './util'

export default function visitorPreprocessToCss(
  { types: t }: { types: typeof babelCore.types },
  item: NodePath<JSXAttribute>,
  state: CorePluginState,
  css: TemplateLiteral
) {
  const tag = item.node.name.name

  const cssIdentifier = assureImport({ types: t }, state, 'css', 'twstyled')

  const cxClassNameExpression = wrapTemplateLiteral(
    { types: t },
    css,
    cssIdentifier.name,
    tag === 'tw' ? '@tailwind ' : '',
    tag === 'tw' ? ';' : ''
  )

  // Check if a className props already exists
  const classNameAttribute:
    | JSXAttribute
    | undefined = (item.parent as JSXOpeningElement).attributes.find(
    (a) =>
      t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name: 'className' })
  ) as JSXAttribute | undefined

  const rightExpression =
    (classNameAttribute?.value as StringLiteral | JSXExpressionContainer) ||
    t.stringLiteral('')

  const result = combineExpressions(
    { types: t },
    cxClassNameExpression,
    rightExpression
  )

  item.remove()

  if (t.isJSXAttribute(classNameAttribute)) {
    classNameAttribute.value = result
  } else {
    /* Handle the case where no className exists yet */
    ;(item.parent as JSXOpeningElement).attributes.unshift(
      t.jsxAttribute(
        t.jsxIdentifier('className'),
        t.isStringLiteral(result) ? result : result
      )
    )
  }
}
