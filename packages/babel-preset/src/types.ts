import type { BabelFile } from '@babel/core'
import type {
  Replacement as LinariaReplacement,
  State as LinariaState,
  TemplateExpression as LinariaTemplateExpression,
  PluginOptions as LinariaOptions
} from '@linaria/babel-preset'
import { Mapping } from 'source-map'

import type {
  ObjectProperty,
  Expression,
  JSXAttribute,
  ImportDeclaration
} from '@babel/types'
import type { Scope, NodePath } from '@babel/traverse'
import { Element } from 'stylis'

export interface StyledMeta {
  __linaria: {
    className: string
    extends: StyledMeta
  }
}

export type PreprocessorFn = (selector: string, cssText: string) => string
export type Preprocessor = 'none' | 'stylis' | PreprocessorFn | void

export interface CorePluginOptions extends LinariaOptions {
  sourceMap: boolean
  cacheDirectory: string
  preprocessor: Preprocessor
  stylisMiddleware: StylisMiddleware<TemplateStateBase>[]
  jsxPreprocessors: Record<string, JSXAttributePreprocessor>
  extension: string
  includeBase: boolean
  includeGlobal: boolean
  outputPath: string
  configPath: string
}

interface LinariaRules {
  [selector: string]: {
    className: string
    displayName: string
    cssText: string
    start:
      | {
          line: number
          column: number
        }
      | null
      | undefined
  }
}

export interface CorePluginState extends LinariaState {
  queue: LinariaTemplateExpression[]
  rules: LinariaRules
  replacements: LinariaReplacement[]
  index: number
  dependencies: string[]
  // EXTENDED STATE
  hash: string
  outputFilename: string
  resourceFileName: string
  mappings: Mapping[]
  cssText: string
  twcache: Map<string, string[]>
  importDeclaration: NodePath<ImportDeclaration>
  importLocalNames: Record<string, string>
  // END EXTENDED STATE
  file: BabelFile & {
    opts: {
      cwd: string
      root: string
      filename: string
    }
    metadata: babel.BabelFileMetadata & {
      localName: string
      linaria: {
        rules: LinariaRules
        replacements: LinariaReplacement[]
        dependencies: string[]
      }
      // EXTENDED STATE
      cssFilename: string
      twclasses: string[]
      // END EXTENDED STATE
    }
  }
}

export interface TemplateItemProps {
  interpolations: {
    id: string
    node: Expression
    scope: Scope
    source: string
    unit: string
  }[]
  start: { line: number; column: number } | null
  selector: string
  className: string
  cssText: string
  isReferenced: boolean
  props?: ObjectProperty[]
}

export interface TemplateStateBase {
  cssText: string
  className: string
  index: number
  item: Omit<TemplateItemProps, 'className' | 'cssText'>
}

export interface StylisMiddleware<T extends TemplateStateBase> {
  enter: (state: CorePluginState, templateState: T) => void
  stylis: (
    state: CorePluginState,
    templateState: T,
    element: Element
  ) => string | void
  exit: (state: CorePluginState, templateState: T) => void
}

export type JSXAttributePreprocessor = (
  item: NodePath<JSXAttribute>,
  state: CorePluginState
) => void
