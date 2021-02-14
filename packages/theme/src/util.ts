import deepmerge from 'deepmerge'
import { Theme } from './types'

/**
 * Allows for nested scales with shorthand values
 * @example
 * {
 *   colors: {
 *     primary: { __default: '#00f', light: '#33f' }
 *   }
 * }
 * css({ color: 'primary' }); // { color: '#00f' }
 * css({ color: 'primary.light' }) // { color: '#33f' }
 */
export const THEME_TW_DEFAULT_KEY = '__default'

const hasDefault = (
  x: unknown
): x is { [THEME_TW_DEFAULT_KEY]: string | number } => {
  return typeof x === 'object' && x !== null && THEME_TW_DEFAULT_KEY in x
}

/**
 * Extracts value under path from a deeply nested object.
 * Used for Themes, variants and Theme UI style objects.
 * Given a path to object with `__default` key, returns the value under that key.
 *
 * @param obj a theme, variant or style object
 * @param path path separated with dots (`.`)
 * @param fallback default value returned if get(obj, path) is not found
 */
export function get(
  obj: object,
  path: string | number | undefined,
  fallback?: unknown,
  p?: number,
  undef?: unknown
): any {
  const pathArray = path && typeof path === 'string' ? path.split('.') : [path]
  for (p = 0; p < pathArray.length; p++) {
    obj = obj ? (obj as any)[pathArray[p]!] : undef
  }

  if (obj === undef) return fallback

  return hasDefault(obj) ? obj[THEME_TW_DEFAULT_KEY] : obj
}

//
// Merge Utilities
//

const canUseSymbol = typeof Symbol === 'function' && Symbol.for

const REACT_ELEMENT = canUseSymbol ? Symbol.for('react.element') : 0xeac7
const FORWARD_REF = canUseSymbol ? Symbol.for('react.forward_ref') : 0xeac7

const deepmergeOptions: deepmerge.Options = {
  isMergeableObject: (n) => {
    return (
      !!n &&
      typeof n === 'object' &&
      (n as React.ExoticComponent).$$typeof !== REACT_ELEMENT &&
      (n as React.ExoticComponent).$$typeof !== FORWARD_REF
    )
  },
  arrayMerge: (target, rightArray) => rightArray
}

const merge = (a: Theme, b: Theme): Theme => deepmerge(a, b, deepmergeOptions)

function mergeAll<A, B>(a: A, b: B): A & B
function mergeAll<A, B, C>(a: A, b: B, c: C): A & B & C
function mergeAll<A, B, C, D>(a: A, b: B, c: C, d: D): A & B & C & D
function mergeAll<T = Theme>(...args: Partial<T>[]) {
  return deepmerge.all<T>(args, deepmergeOptions)
}

merge.all = mergeAll

export { merge }
