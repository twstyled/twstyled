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
import { wrapExpression, assureImport, asTemplateLiteral } from './util'
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

    const css: TemplateLiteral | undefined = asTemplateLiteral(
      { types: t },
      item.node.value
    )

    if (!css) return

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
