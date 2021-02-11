// Most of this code was taken from @satya164's babel-plugin-css-prop
// and styled-components babel plugin
// @see https://github.com/satya164/babel-plugin-css-prop
// @see https://github.com/styled-components/babel-plugin-styled-components

import type babelCore from '@babel/core'
import type { NodePath } from '@babel/traverse'
import type {
  CallExpression,
  JSXAttribute,
  JSXElement,
  JSXOpeningElement,
  JSXIdentifier,
  JSXNamespacedName,
  JSXMemberExpression,
  MemberExpression,
  Identifier,
  VariableDeclaration,
  Expression,
  TemplateLiteral,
  TSType
} from '@babel/types'
import { CorePluginState } from './types'
import { assureImport } from './util'

const TAG_NAME_REGEXP = /^[a-z][a-z\d]*(\-[a-z][a-z\d]*)?$/

type TemplateExpression = Expression | TSType

export default function visitorPreprocessToStyled(
  { types: t }: { types: typeof babelCore.types },
  path: NodePath<JSXAttribute>,
  state: CorePluginState,
  css: TemplateLiteral
) {
  const styledIdentifier = assureImport(
    { types: t },
    state,
    'styled',
    'twstyled'
  )

  //
  // Derive name of replacement Component tag
  // div => first unique version of TwCssDiv...
  //

  const elem = path.parentPath as NodePath<JSXOpeningElement>
  const name = getName(elem.node.name, t)
  const nameExpression = getNameExpression(elem.node.name, t)
  const id = path.scope.generateUidIdentifier(
    'TwCss' + name.replace(/^([a-z])/, (match, p1) => p1.toUpperCase())
  )

  //
  // Keep all attributes on JSX element except for the css attribute being processed here
  // and rename opening and closing
  //

  elem.node.attributes = elem.node.attributes.filter(
    (attr: any) => attr !== path.node
  )

  elem.node.name = t.jSXIdentifier(id.name)

  if ((elem.parentPath.node as JSXElement).closingElement) {
    ;(elem.parentPath
      .node as JSXElement).closingElement!.name = t.jSXIdentifier(id.name)
  }

  //
  // Setup new styled function to inject with original name
  // If a React component is used that is not imported, then set up injection
  // point immediately after its definition
  //

  const program = state.file.path
  const { bindings } = program.scope

  let styled: CallExpression
  let injector: ((nodeToInsert: VariableDeclaration) => void) | undefined

  if (TAG_NAME_REGEXP.test(name)) {
    // is a generic html element
    styled = t.callExpression(styledIdentifier, [t.stringLiteral(name)])
  } else {
    // is a React component
    styled = t.callExpression(styledIdentifier, [nameExpression])

    if (bindings[name] && !t.isImportDeclaration(bindings[name].path.parent)) {
      injector = (nodeToInsert: VariableDeclaration) =>
        (t.isVariableDeclaration(bindings[name].path.parent)
          ? bindings[name].path.parentPath
          : bindings[name].path
        ).insertAfter(nodeToInsert)
    }
  }

  //
  // Make sure that any embedded expressions can be transferred to new component scope
  //

  if (t.isObjectExpression(css)) {
    // object syntax
    throw new Error('object syntax is not yet supported in css attributes')
  } else {
    // tagged template literal
    css.expressions = css.expressions.reduce(
      (acc: TemplateExpression[], expression: TemplateExpression) => {
        const target = t.isMemberExpression(expression)
          ? expression.object
          : expression

        if (
          Object.keys(bindings).some((key) =>
            bindings[key].referencePaths.find((p) => p.node === target)
          ) ||
          t.isFunctionExpression(expression) ||
          t.isArrowFunctionExpression(expression)
        ) {
          // expression used is in outer scope so can just be transferred as is
          acc.push(expression)
        } else {
          // expression used needs to be transferred via a new property
          const name = path.scope.generateUidIdentifier('_$p_')

          elem.node.attributes.push(
            t.jSXAttribute(
              t.jSXIdentifier(name.name),
              t.jSXExpressionContainer(expression as Expression)
            )
          )

          const p = t.identifier('p')
          const fn = t.arrowFunctionExpression([p], t.memberExpression(p, name))
          fn.loc = path.node.loc

          acc.push(fn)
        }

        return acc
      },
      [] as TemplateExpression[]
    )
  }

  if (!injector) {
    injector = (nodeToInsert: any) => program.node.body.push(nodeToInsert)
  }

  path.remove()

  injector(
    t.variableDeclaration('var', [
      t.variableDeclarator(
        id,
        t.isObjectExpression(css)
          ? t.callExpression(styled, [css])
          : t.taggedTemplateExpression(styled, css)
      )
    ])
  )
}

function getName(
  node: JSXIdentifier | JSXNamespacedName | JSXMemberExpression,
  t: typeof babelCore.types
): string {
  if (t.isJSXMemberExpression(node)) {
    return `${getName(node.object, t)}.${node.property.name}`
  }
  if (typeof node.name === 'string') {
    return node.name
  }
  throw new Error(`Cannot infer name from node with type "${node.type}". `)
}

function getNameExpression(
  node: JSXIdentifier | JSXNamespacedName | JSXMemberExpression,
  t: typeof babelCore.types
): MemberExpression | Identifier {
  if (t.isJSXMemberExpression(node)) {
    return t.memberExpression(
      getNameExpression(node.object, t),
      t.identifier(node.property.name)
    )
  }
  if (typeof node.name === 'string') {
    return t.identifier(node.name)
  }
  throw new Error(
    `Cannot infer name expression from node with type "${node.type}". `
  )
}
