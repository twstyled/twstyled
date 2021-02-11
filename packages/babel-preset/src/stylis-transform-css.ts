import path from 'path'
import core from '@babel/core'
import normalize from 'normalize-path'
import type { Element } from 'stylis'
import { DECLARATION } from 'stylis'
import type {
  CorePluginOptions,
  CorePluginState,
  StylisMiddleware,
  TemplateStateBase
} from './types'

type Core = typeof core

interface TemplateState extends TemplateStateBase {
  outputFilename: string
  resourceFileName: string
}

export default function getStylisTransformUrl(
  { types: t }: Core,
  options: CorePluginOptions
) {
  return {
    enter: (state: CorePluginState, templateState: TemplateState) => {
      const { outputFilename, resourceFileName } = getOutputNames(
        state as CorePluginState,
        options
      )
      templateState.outputFilename = outputFilename
      templateState.resourceFileName = resourceFileName
    },
    stylis: (
      state: CorePluginState,
      templateState: TemplateState,
      element: Element
    ) => {
      if (element.type === DECLARATION && templateState.outputFilename) {
        // When writing to a file, we need to adjust the relative paths inside url(..) expressions
        // It'll allow css-loader to resolve an imported asset properly
        element.return = element.value.replace(
          /\b(url\((["']?))(\.[^)]+?)(\2\))/g,
          (match, p1, p2, p3, p4) =>
            p1 +
            transformUrl(
              p3,
              templateState.outputFilename,
              templateState.resourceFileName
            ) +
            p4
        )
      }
    },
    exit: (state: CorePluginState, templateState: TemplateState) => {
      if (templateState.cssText) {
        state.outputFilename = templateState.outputFilename
        state.resourceFileName = templateState.resourceFileName
        state.file.metadata.cssFilename = path.relative(
          path.dirname(state.file.opts.filename),
          templateState.outputFilename
        )
      }

      if (templateState.item.start) {
        state.mappings.push({
          generated: {
            line: templateState.index + 1,
            column: 0
          },
          original: templateState.item.start!,
          name: templateState.item.selector,
          source: `./${state.resourceFileName}`
        })
      }
    }
  } as StylisMiddleware<TemplateStateBase>
}

const posixSep = path.posix.sep

function transformUrl(
  url: string,
  outputFilename: string,
  sourceFilename: string,
  platformPath: typeof path = path
) {
  // Replace asset path with new path relative to the output CSS
  const relative = platformPath.relative(
    platformPath.dirname(outputFilename),
    // Get the absolute path to the asset from the path relative to the JS file
    platformPath.resolve(platformPath.dirname(sourceFilename), url)
  )

  if (platformPath.sep === posixSep) {
    return relative
  }

  return relative.split(platformPath.sep).join(posixSep)
}

function getOutputNames(state: CorePluginState, options: CorePluginOptions) {
  const {
    cacheDirectory = './.linaria-cache',
    extension = '.linaria.module.css'
  } = options || {}

  const root = process.cwd()
  const resourcePath = state.file.opts.filename
  const baseOutputFileName = resourcePath.replace(/\.[^.]+$/, extension)
  const outputFilename = normalize(
    path.join(
      path.isAbsolute(cacheDirectory)
        ? cacheDirectory
        : path.join(process.cwd(), cacheDirectory),
      resourcePath.includes(root)
        ? path.relative(root, baseOutputFileName)
        : baseOutputFileName
    )
  )

  return {
    outputFilename,
    resourceFileName: path.relative(process.cwd(), resourcePath)
  } as const
}
