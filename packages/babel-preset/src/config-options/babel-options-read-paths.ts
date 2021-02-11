import { readFileSync, existsSync } from 'fs'
import * as path from 'path'
import * as os from 'os'
import chalk from 'chalk'
import { parse as parseJson } from 'json5'

import { codeFrameColumns } from '@babel/code-frame'

export class FatalTypeScriptError extends Error {}

export function getConfigPaths() {
  const dir = process.cwd()

  let typeScriptPath: string | undefined
  try {
    typeScriptPath = require.resolve('typescript', { paths: [dir] })
  } catch (_) {
    /** noop */
  }

  const tsConfigPath = path.join(dir, 'tsconfig.json')
  const useTypeScript = Boolean(typeScriptPath && existsSync(tsConfigPath))
  let jsConfig
  if (useTypeScript) {
    const ts = require(typeScriptPath!) as typeof import('typescript')
    const tsConfig = getTypescriptConfig(ts, tsConfigPath)
    jsConfig = { compilerOptions: tsConfig.options }
  } else {
    const jsConfigPath = path.join(dir, 'jsconfig.json')
    if (existsSync(jsConfigPath)) {
      jsConfig = parseJsonFile(jsConfigPath)
    }
  }

  let baseUrl, paths
  if (jsConfig?.compilerOptions?.baseUrl) {
    baseUrl = jsConfig.compilerOptions.baseUrl
  }

  if (jsConfig?.compilerOptions?.paths) {
    paths = jsConfig.compilerOptions.paths as Record<string, Array<string>>
  }

  return {
    baseUrl: path.isAbsolute(baseUrl) ? path.relative(dir, baseUrl) : baseUrl,
    paths
  }
}

function parseJsonFile(filePath: string) {
  const contents = readFileSync(filePath, 'utf8')

  // Special case an empty file
  if (contents.trim() === '') {
    return {}
  }

  try {
    return parseJson(contents)
  } catch (err) {
    const codeFrame = codeFrameColumns(
      String(contents),
      { start: { line: err.lineNumber, column: err.columnNumber } },
      { message: err.message, highlightCode: true }
    )
    throw new Error(`Failed to parse "${filePath}":\n${codeFrame}`)
  }
}

function getTypescriptConfig(
  ts: typeof import('typescript'),
  tsConfigPath: string
) {
  try {
    const formatDiagnosticsHost: import('typescript').FormatDiagnosticsHost = {
      getCanonicalFileName: (fileName: string) => fileName,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => os.EOL
    }

    const { config, error } = ts.readConfigFile(tsConfigPath, ts.sys.readFile)

    if (error) {
      throw new FatalTypeScriptError(
        ts.formatDiagnostic(error, formatDiagnosticsHost)
      )
    }

    const result = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      path.dirname(tsConfigPath)
    )

    if (result.errors) {
      result.errors = result.errors.filter(
        ({ code }) =>
          // No inputs were found in config file
          code !== 18003
      )
    }

    if (result.errors?.length) {
      throw new FatalTypeScriptError(
        ts.formatDiagnostic(result.errors[0], formatDiagnosticsHost)
      )
    }

    return result
  } catch (err) {
    if (err?.name === 'SyntaxError') {
      const reason = '\n' + (err?.message ?? '')
      throw new FatalTypeScriptError(
        chalk.red.bold(
          'Could not parse',
          chalk.cyan('tsconfig.json') +
            '.' +
            ' Please make sure it contains syntactically correct JSON.'
        ) + reason
      )
    }
    throw err
  }
}
