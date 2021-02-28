import { types } from '@babel/core'
import {
  Identifier,
  JSXAttribute,
  TaggedTemplateExpression
} from '@babel/types'
import type babelCore from '@babel/core'
import type {
  ImportDeclaration,
  ImportSpecifier,
  TemplateLiteral
} from '@babel/types'
import type { NodePath } from '@babel/traverse'
import type { CorePluginOptions, CorePluginState } from './types'
import {
  wrapExpression,
  assureImport,
  asTemplateLiteral,
  prefixTemplateLiteral,
  asTemplateLiteralFromArray
} from './util'
import visitorPreprocessToCss from './visitors-preprocess-to-css'
import visitorPreprocessToStyled from './visitors-preprocess-to-styled'

export default function getVisitorsPreprocess(
  { types: t }: typeof babelCore,
  options: CorePluginOptions
) {
  return {
    visitor: {
      Program: {
        enter(path: NodePath<types.Program>, state: CorePluginState) {
          const twqueue: Array<
            NodePath<TaggedTemplateExpression> | NodePath<JSXAttribute>
          > = []

          const jsxKeysToQueue = Object.keys(options.jsxPreprocessors)

          // We need this transforms to run before anything else
          // So we traverse here instead of a in a visitor
          path.traverse({
            ImportDeclaration: (p) => {
              visitorImportDeclaration({ types: t }, p, state)
            },
            TaggedTemplateExpression: (path) => {
              const { tag } = path.node
              if (
                //  hasImport(t, path.scope, state.file.opts.filename, 'tw', options) &&
                t.isIdentifier(tag) &&
                tag.name === 'tw'
              ) {
                twqueue.push(path)
              }
            },
            JSXAttribute: (path) => {
              const { node } = path
              if (
                t.isJSXAttribute(node) &&
                t.isJSXIdentifier(node.name) &&
                jsxKeysToQueue.indexOf(node.name.name) !== -1 &&
                t.isJSXOpeningElement(path.parent)
              ) {
                twqueue.push(path)
              }
            }
          })

          twqueue.forEach((item) => {
            if (t.isTaggedTemplateExpression(item.node)) {
              const cssIdentifier = assureImport(
                { types: t },
                state,
                'css',
                '@twstyled/core'
              )

              item.replaceWith(
                wrapExpression({ types: t }, item.node, cssIdentifier.name)
              )
            } else {
              const tag = item.node!.name!.name! as string

              const processJSX = options.jsxPreprocessors[tag]

              processJSX(item as NodePath<JSXAttribute>, state)
            }
          })
          if (twqueue.length > 0) {
            path.scope.crawl()
          }
        },
        exit(nodePath: NodePath<types.Program>, state: CorePluginState) {
          /** noop */
        }
      }
    }
  }
}

function visitorImportDeclaration(
  { types: t }: { types: typeof babelCore.types },
  path: NodePath<ImportDeclaration>,
  state: CorePluginState
) {
  if (!t.isLiteral(path.node.source, { value: '@twstyled/core' })) {
    return
  }

  state.importDeclaration = path
  state.importLocalNames = {}

  let twImported: ImportSpecifier | undefined
  path.node.specifiers.forEach((specifier) => {
    // do not support default import
    if (!t.isImportSpecifier(specifier)) {
      return
    }
    const importedName = (specifier.imported as Identifier).name
    state.importLocalNames[importedName] = specifier.local.name
    if (importedName === 'tw') {
      twImported = specifier
    }
  })

  if (twImported && !state.importLocalNames.css) {
    path.node.specifiers.push(
      t.importSpecifier(t.identifier('css'), t.identifier('css'))
    )
    state.importLocalNames.css = 'css'
  }
}

export function getVisitorsPreprocessorJsx(
  { types: t }: { types: typeof babelCore.types },
  options: CorePluginOptions
) {
  return (item: NodePath<JSXAttribute>, state: CorePluginState) => {
    const tag = item.node.name.name

    if (tag !== 'tw' && tag !== 'css') {
      return
    }

    if (!item.node.value) {
      return
    }

    const css: TemplateLiteral = prefixTemplateLiteral(
      { types: t },
      asTemplateLiteral({ types: t }, item.node.value),
      tag === 'tw' ? '@tailwind ' : '',
      tag === 'tw' ? ';' : ''
    )

    const requiresComponent =
      css.expressions.length > 0 &&
      css.expressions.some(
        (value) =>
          t.isArrowFunctionExpression(value) || t.isFunctionExpression(value)
      )

    if (requiresComponent) {
      return visitorPreprocessToStyled({ types: t }, item, state, css)
    } else {
      return visitorPreprocessToCss({ types: t }, item, state, css)
    }
  }
}

export function getVisitorsPreprocessorTw$(
  { types: t }: { types: typeof babelCore.types },
  options: CorePluginOptions
) {
  return (item: NodePath<JSXAttribute>, state: CorePluginState) => {
    const tag: string = (item.node.name.name as string).replace(/[-\$]$/, '')
    let css: TemplateLiteral

    if (!item.node.value) {
      css = asTemplateLiteral(
        { types: t },
        t.stringLiteral(`@tailwind ${tag};`)
      )
    } else if (
      t.isJSXExpressionContainer(item.node.value) &&
      t.isUnaryExpression(item.node.value.expression) &&
      item.node.value.expression.operator === '-' &&
      t.isNumericLiteral(item.node.value.expression.argument)
    ) {
      css = asTemplateLiteral(
        { types: t },
        t.stringLiteral(
          `@tailwind -${tag}-${item.node.value.expression.argument.value};`
        )
      )
    } else {
      css = prefixTemplateLiteral(
        { types: t },
        asTemplateLiteral({ types: t }, item.node.value),
        `@tailwind ${tag}-`,
        ';'
      )
    }

    return visitorPreprocessToCss({ types: t }, item, state, css)
  }
}

export function getVisitorsPreprocessorTwVariant$(
  { types: t }: { types: typeof babelCore.types },
  options: CorePluginOptions
) {
  return (item: NodePath<JSXAttribute>, state: CorePluginState) => {
    const tag: string = (item.node.name.name as string).replace(/[-\$]*$/, '')
    let css: TemplateLiteral

    if (
      item.node.value &&
      t.isJSXExpressionContainer(item.node.value) &&
      item.node.value.expression &&
      t.isArrayExpression(item.node.value.expression)
    ) {
      css = asTemplateLiteralFromArray(
        { types: t },
        tag === 'tw' ? ' ' : ` ${tag}:`,
        [...item.node.value.expression.elements]
      )
      css.quasis[0].value.raw = `@tailwind${css.quasis[0].value.raw}`
      css.quasis[0].value.cooked = css.quasis[0].value.raw
      css.quasis[css.quasis.length - 1].value.raw = `${
        css.quasis[css.quasis.length - 1].value.raw
      };`
      css.quasis[css.quasis.length - 1].value.cooked =
        css.quasis[css.quasis.length - 1].value.raw
    } else {
      throw new Error(
        `inline Tailwind variant ${tag} must be an array expression`
      )
    }

    return visitorPreprocessToCss({ types: t }, item, state, css)
  }
}
