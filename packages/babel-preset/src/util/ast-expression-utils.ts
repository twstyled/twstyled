import {
  TemplateElement,
  TaggedTemplateExpression,
  JSXExpressionContainer,
  JSXElement,
  JSXFragment,
  StringLiteral,
  Identifier,
  TemplateLiteral,
  Expression,
  SourceLocation,
  SpreadElement,
  Node
} from '@babel/types'
import type babelCore from '@babel/core'
import type { CorePluginState } from '../types'

const StarterRegExp = /^\s*(@tailwind)?\s*/
const EndingRegExp = /\s*;?\s*$/

export function asTemplateLiteral(
  { types: t }: { types: typeof babelCore.types },
  item:
    | JSXExpressionContainer
    | StringLiteral
    | TaggedTemplateExpression
    | JSXElement
    | JSXFragment
): TemplateLiteral {
  let css: TemplateLiteral

  if (t.isStringLiteral(item)) {
    css = t.templateLiteral(
      [
        withLoc(
          t.templateElement({ raw: item.value, cooked: item.value }, true),
          item.loc
        )
      ],
      []
    )
  } else if (t.isJSXExpressionContainer(item)) {
    if (t.isTemplateLiteral(item.expression)) {
      css = item.expression
    } else if (
      t.isTaggedTemplateExpression(item.expression) &&
      t.isIdentifier(item.expression.tag) &&
      item.expression.tag.name === 'css'
    ) {
      css = item.expression.quasi
    } else if (t.isObjectExpression(item.expression)) {
      throw new Error(
        'Not yet implemented -- object expression in css or tw attribute'
      )
    } else if (t.isJSXEmptyExpression(item.expression)) {
      css = t.templateLiteral(
        [withLoc(t.templateElement({ raw: '', cooked: '' }, true), item.loc)],
        []
      )
    } else if (
      t.isStringLiteral(item.expression) ||
      t.isNumericLiteral(item.expression)
    ) {
      css = t.templateLiteral(
        [
          withLoc(
            t.templateElement(
              {
                raw: `${item.expression.value}`,
                cooked: `${item.expression.value}`
              },
              false
            ),
            item.expression.loc
          )
        ],
        []
      )
    } else {
      css = t.templateLiteral(
        [
          withLoc(
            t.templateElement({ raw: '', cooked: '' }, false),
            item.expression.loc
          ),
          withLoc(
            t.templateElement({ raw: '', cooked: '' }, true),
            item.expression.loc
          )
        ],
        [item.expression]
      )
    }
  } else {
    throw new Error('unable to transcribe css')
  }
  return css
}

export function asTemplateLiteralFromArray(
  { types: t }: { types: typeof babelCore.types },
  prefix: string,
  items: Array<Expression | null | SpreadElement>
): TemplateLiteral {
  const quasis: TemplateElement[] = []
  const expressions: Array<Expression> = []

  items.forEach((item) => {
    if (item === null) {
      return
    }
    if (t.isSpreadElement(item)) {
      throw new Error('spread element not implemented')
    }

    quasis.push(
      withLoc(
        t.templateElement(
          {
            raw: prefix,
            cooked: prefix
          },
          false
        ),
        item.loc
      )
    )
    expressions.push(item)
  })
  quasis.push(
    withLoc(
      t.templateElement(
        {
          raw: prefix,
          cooked: prefix
        },
        false
      ),
      items[0]!.loc
    )
  )
  quasis[quasis.length - 1].tail = true

  return t.templateLiteral(quasis, expressions)
}

/**
 * Utility function to wrap a given expression that might appear in a JSX tag
 * <Component twstyled="bg-blue-500" /> or <Component twstyled="{`bg-blue-500 ${mixin}`}" />  etc.
 * The function returns a tagged template literal wrapped with the specified starting and ending strings
 * <Component className={css`bg-blue-500;`} /> or <Component className={css`bg-blue-500 ${mixin};`} />
 * @param param0 Babel
 * @param value The expression to wrap
 * @param tag  The target tag of the tagged template literal, e.g., css
 * @param startString  The string to insert at the beginning e.g. "@tailwind "
 * @param endString  The string to insert at the end e.g, ";"
 */
export function wrapExpression(
  { types: t }: { types: typeof babelCore.types },
  node: JSXExpressionContainer | StringLiteral | TaggedTemplateExpression,
  tag: string,
  startReplacement: string = '@tailwind ',
  endReplacement: string = ';'
): TaggedTemplateExpression | StringLiteral {
  let result: TaggedTemplateExpression | StringLiteral

  if (t.isTaggedTemplateExpression(node)) {
    result = asWrappedTaggedTemplateExpression(
      { types: t },
      node.quasi,
      tag,
      startReplacement,
      endReplacement
    )
  } else if (t.isStringLiteral(node)) {
    result = t.taggedTemplateExpression(
      t.identifier(tag),
      t.templateLiteral(
        [
          withLoc(
            t.templateElement(
              replaceQuasi(
                replaceQuasi(
                  { raw: node.value },
                  StarterRegExp,
                  startReplacement
                ),
                EndingRegExp,
                endReplacement
              ),
              true
            ),
            node.loc
          )
        ],
        []
      )
    )
  } else if (t.isJSXExpressionContainer(node)) {
    /** noop */
    const expression = node.expression

    if (t.isTemplateLiteral(expression)) {
      result = asWrappedTaggedTemplateExpression(
        { types: t },
        expression,
        tag,
        startReplacement,
        endReplacement
      )
    } else if (
      t.isTaggedTemplateExpression(expression) &&
      (expression.tag as Identifier).name === tag
    ) {
      result = asWrappedTaggedTemplateExpression(
        { types: t },
        expression.quasi,
        tag,
        startReplacement,
        endReplacement
      )
    } else if (t.isJSXEmptyExpression(expression)) {
      result = t.stringLiteral('')
    } /* t.isExpression(expression) */ else {
      /**
       * Emmbed original expression a new one
       * e.g, <Componenent classname={css`@tailwind ${anytag`bg-blue-500`};`} />
       *      * e.g, <Componenent classname={css`@tailwind ${anyfn('bg-blue-500')};`} />
       */
      result = t.taggedTemplateExpression(
        t.identifier(tag),
        t.templateLiteral(
          [
            withLoc(
              t.templateElement({
                raw: startReplacement,
                cooked: startReplacement
              }),
              expression.loc
            ),
            withLoc(
              t.templateElement({
                raw: endReplacement,
                cooked: endReplacement
              }),
              expression.loc
            )
          ],
          [expression]
        )
      )
    }
  } else {
    result = t.stringLiteral('')
  }
  return result
}

function replaceQuasi(
  value: TemplateElement['value'],
  pattern: RegExp,
  replacement: string
) {
  const raw = value.raw.replace(pattern, replacement)
  const cooked = value.cooked ? value.cooked.replace(pattern, replacement) : raw
  return { raw, cooked }
}

export function prefixTemplateLiteral(
  { types: t }: { types: typeof babelCore.types },
  templateLiteral: TemplateLiteral,
  startReplacement: string,
  endReplacement: string
) {
  const quasis = templateLiteral.quasis

  quasis[0] = withLoc(
    t.templateElement(
      replaceQuasi(quasis[0].value, StarterRegExp, startReplacement),
      quasis[0].tail
    ),
    quasis[0].loc
  )

  quasis[quasis.length - 1] = withLoc(
    t.templateElement(
      replaceQuasi(
        quasis[quasis.length - 1].value,
        EndingRegExp,
        endReplacement
      ),
      true
    ),
    quasis[quasis.length - 1].loc
  )

  return t.templateLiteral(quasis, templateLiteral.expressions)
}

function asWrappedTaggedTemplateExpression(
  { types: t }: { types: typeof babelCore.types },
  templateLiteral: TemplateLiteral,
  tag: string,
  startReplacement: string,
  endReplacement: string
) {
  return t.taggedTemplateExpression(
    t.identifier(tag),
    prefixTemplateLiteral(
      { types: t },
      templateLiteral,
      startReplacement,
      endReplacement
    )
  )
}
declare const window: any
/**
 * Utility function to wrap a given expression that might appear in a JSX tag
 * <Component twstyled="bg-blue-500" /> or <Component twstyled="{`bg-blue-500 ${mixin}`}" />  etc.
 * The function returns a tagged template literal wrapped with the specified starting and ending strings
 * <Component className={css`bg-blue-500;`} /> or <Component className={css`bg-blue-500 ${mixin};`} />
 * @param param0 Babel
 * @param value The expression to wrap
 * @param tag  The target tag of the tagged template literal, e.g., css
 * @param startString  The string to insert at the beginning e.g. "@tailwind "
 * @param endString  The string to insert at the end e.g, ";"
 */
export function combineExpressions(
  { types: t }: { types: typeof babelCore.types },
  leftExpression: TaggedTemplateExpression | StringLiteral,
  rightExpression: JSXExpressionContainer | StringLiteral
): StringLiteral | JSXExpressionContainer {
  if (t.isStringLiteral(leftExpression) && t.isStringLiteral(rightExpression)) {
    // 1. string - string
    return t.stringLiteral(`${leftExpression.value} ${rightExpression.value}`)
  } else if (t.isStringLiteral(leftExpression)) {
    if (t.isJSXEmptyExpression(rightExpression)) {
      // 2. string - empty
      return leftExpression
    } else {
      // 3. string - JSXexpression
      return t.jSXExpressionContainer(
        t.templateLiteral(
          [
            withLoc(
              t.templateElement(
                {
                  raw: `${leftExpression.value} `,
                  cooked: `${leftExpression.value} `
                },
                false
              ),
              leftExpression.loc
            ),
            withLoc(t.templateElement({ raw: '' }, true), rightExpression.loc)
          ],
          [(rightExpression as JSXExpressionContainer).expression as Expression]
        )
      )
    }
  } else {
    if (t.isStringLiteral(rightExpression)) {
      // 4. taggedtemplate - string
      const templateLiteral = t.templateLiteral(
        [
          withLoc(t.templateElement({ raw: '' }, false), leftExpression.loc),
          withLoc(
            t.templateElement(
              {
                raw: ` ${rightExpression.value}`,
                cooked: ` ${rightExpression.value}`
              },
              true
            ),
            rightExpression.loc
          )
        ],
        [leftExpression as TaggedTemplateExpression]
      )
      templateLiteral.loc = rightExpression.loc
      return t.jSXExpressionContainer(templateLiteral)
    } else if (t.isJSXEmptyExpression(rightExpression)) {
      // 5. taggedtemplate - empty
      return t.jSXExpressionContainer(leftExpression)
    } else {
      // 6. taggedtemplate - JSXExpressionContainer
      const templateLiteral = t.templateLiteral(
        [
          withLoc(t.templateElement({ raw: '' }, false), leftExpression.loc),
          withLoc(
            t.templateElement({ raw: ' ', cooked: ' ' }, false),
            leftExpression.loc
          ),
          withLoc(t.templateElement({ raw: '' }, true), rightExpression.loc)
        ],
        [
          leftExpression as TaggedTemplateExpression,
          rightExpression.expression as Expression
        ]
      )
      templateLiteral.loc = rightExpression.loc
      return t.jSXExpressionContainer(templateLiteral)
    }
  }
}

export function assureImport(
  { types: t }: { types: typeof babelCore.types },
  state: CorePluginState,
  importName: 'css' | 'styled',
  importSource: string
): Identifier {
  const program = state.file.path

  let localIdentifier: Identifier

  if (!state.importLocalNames[importName]) {
    localIdentifier =
      importName === 'css' || importName === 'styled'
        ? t.identifier(importName) // linaria disallows renaming of css tag
        : program.scope.generateUidIdentifier(importName)
    const styledImportSpecifier = t.importSpecifier(
      localIdentifier,
      t.identifier(importName)
    )

    if (!state.importDeclaration) {
      // no declaration at all
      program.unshiftContainer(
        'body',
        t.importDeclaration(
          [styledImportSpecifier],
          t.stringLiteral(importSource)
        )
      )
    } else {
      state.importDeclaration.node.specifiers.unshift(styledImportSpecifier)
    }
    state.importLocalNames[importName] = localIdentifier.name
  } else {
    localIdentifier = t.identifier(state.importLocalNames[importName])
  }
  return localIdentifier
}

export function withLoc<T extends Node>(
  element: T,
  loc: SourceLocation | null
) {
  element.loc = { start: loc?.start!, end: loc?.end! }
  return element
}
