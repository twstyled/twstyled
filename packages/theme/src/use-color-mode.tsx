import * as React from 'react'
import { SetStateAction, useState, useEffect, useRef } from 'react'
import { get, merge } from './util'
import type { Theme, ColorMode } from './types'

const STORAGE_KEY = 'twstyled-color-mode'

export interface ContextValue {
  colorMode?: string
  setColorMode?: (colorMode: SetStateAction<string>) => void
}

const storage = {
  get: (init?: ColorMode) => {
    try {
      return (window.localStorage.getItem(STORAGE_KEY) as ColorMode) || init
    } catch (e) {
      console.warn(
        'localStorage is disabled and color mode might not work as expected.',
        'Please check your Site Settings.',
        e
      )
      return init
    }
  },
  set: (value: ColorMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
    } catch (e) {
      console.warn(
        'localStorage is disabled and color mode might not work as expected.',
        'Please check your Site Settings.',
        e
      )
    }
  }
}

const getPreferredColorScheme = (): 'dark' | 'light' | null => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light'
    }
  }
  return null
}

function usePrevious<T>(value: T) {
  const ref = useRef<T>()
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

export const useColorModeState = (theme: Theme = {} as Theme) => {
  const [mode, setMode] = useState<ColorMode>(() => {
    const preferredMode =
      theme.useColorSchemeMediaQuery !== false && getPreferredColorScheme()

    return preferredMode || theme.initialColorModeName || 'light'
  })

  const prevMode = usePrevious(mode)

  // read color mode from local storage
  useEffect(() => {
    const stored: ColorMode =
      (theme.useLocalStorage !== false && storage.get()) || 'light'
    document.documentElement.classList.remove('theme-tw-' + stored)
    document.body.classList.remove('theme-tw-' + stored)

    if (stored && stored !== mode) {
      setMode(stored)
    }
  }, [])

  useEffect(() => {
    if (prevMode) {
      document.body.classList.remove('theme-tw-' + prevMode)
    }
    document.body.classList.add('theme-tw-' + mode)
    if (mode && theme.useLocalStorage !== false) {
      storage.set(mode)
    }
  }, [mode])

  if (process.env.NODE_ENV !== 'production') {
    if (
      theme.colors &&
      theme.colors.modes &&
      theme.initialColorModeName &&
      Object.keys(theme.colors.modes).indexOf(theme.initialColorModeName) > -1
    ) {
      console.warn(
        'The `initialColorModeName` value should be a unique name' +
          ' and cannot reference a key in `theme.colors.modes`.'
      )
    }
  }

  return [mode, setMode] as const
}

export const applyColorMode = (theme: Theme, mode: string): Theme => {
  if (!mode) return theme
  const modes = get(theme, 'colors.modes', {})
  return merge.all({}, theme, {
    colors: get(modes, mode, {})
  })
}

const noflash = `(function() { try {
  var mode = localStorage.getItem(\"theme-tw-color-mode\");
  if (!mode) return
  document.documentElement.classList.add('theme-tw-' + mode);
  document.body.classList.add('theme-tw-' + mode);
} catch (e) {} })();`

export const InitializeColorMode = () => (
  <script
    key="theme-tw-no-flash"
    dangerouslySetInnerHTML={{
      __html: noflash
    }}
  />
)

const toVarName = (key: string) => `--theme-tw-${key}`
const toVarValue = (key: string, value: string | number) =>
  `var(${toVarName(key)}, ${value})`

const join = (...args: (string | undefined)[]) => args.filter(Boolean).join('-')

const numberScales = {
  fontWeights: true,
  lineHeights: true
}
const reservedKeys = {
  useCustomProperties: true,
  initialColorModeName: true,
  printColorModeName: true,
  initialColorMode: true,
  useLocalStorage: true
}

const toPixel = (key: string, value: string | number) => {
  if (typeof value !== 'number') return value
  if (numberScales[key as keyof typeof numberScales]) return value
  return value + 'px'
}

// convert theme values to custom properties
export const toCustomProperties = (
  obj: Record<string, any> | undefined,
  parent?: string,
  themeKey?: string
) => {
  const next: Record<string, any> = Array.isArray(obj) ? [] : {}

  // eslint-disable-next-line guard-for-in
  for (const key in obj) {
    const value = obj[key]
    const name = join(parent, key)
    if (value && typeof value === 'object') {
      next[key] = toCustomProperties(value, name, key)
      continue
    }
    if (reservedKeys[key as keyof typeof reservedKeys]) {
      next[key] = value
      continue
    }
    const val = toPixel(themeKey || key, value)
    next[key] = toVarValue(name, val)
  }

  return next
}

export const objectToVars = (parent: string, obj: Record<string, any>) => {
  let vars: Record<string, object> = {}
  for (const key in obj) {
    if (key === 'modes') continue
    const name = join(parent, key)
    const value = obj[key]
    if (value && typeof value === 'object') {
      vars = {
        ...vars,
        ...objectToVars(name, value)
      }
    } else {
      vars[toVarName(name)] = value
    }
  }
  return vars
}
