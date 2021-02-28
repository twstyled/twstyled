import tailwindData, { createTwClassDictionary } from '@xwind/core'
import { getTwConfigCache, getTwConfigPath } from '.'

function splitAtLastOccurence(src: string, char: string) {
  const pos = src.lastIndexOf(char)
  return [src.substring(0, pos), src.substring(pos + 1)]
}

function splitAtLastTwoOccurences(src: string, char: string) {
  const pos2 = src.lastIndexOf(char)
  const pos1 = src.substring(0, pos2 - 1).lastIndexOf(char)
  return [
    src.substring(0, pos1),
    src.substring(pos1 + 1, pos2),
    src.substring(pos2 + 1)
  ]
}

let $twAttributes: string[]
let $twVariants: string[]

export default function getTailwindAttributesAndVariants(options: {
  configPath: string
}): [string[], string[]] {
  const twConfigPath = getTwConfigPath(options.configPath)
  const { twConfig, isNewTwConfig } = getTwConfigCache(twConfigPath)

  if (!$twAttributes || isNewTwConfig) {
    const { utilitiesRoot, componentsRoot, screens, variants } = tailwindData(
      twConfig
    )
    const twObjectMap = createTwClassDictionary(utilitiesRoot, componentsRoot)

    const TW_COLORS = /^(divide|bg|from|via|to|border|placeholder|ring-offset|ring|text)\-/

    const tw: Record<string, true> = Object.keys(twObjectMap)
      .filter((key) => !key.startsWith('-') && !key.startsWith('XWIND'))
      .sort()
      .reduce((accum, el) => {
        accum[el] = true
        if (TW_COLORS.test(el)) {
          const components = splitAtLastTwoOccurences(el, '-')
          if (components[0]) {
            accum[components[0]] = accum[components[0]] || true
          } else {
            accum[components[1]] = accum[components[1]] || true
          }
        } else {
          const components = splitAtLastOccurence(el, '-')
          if (components[0]) {
            accum[components[0]] = accum[components[0]] || true
          } else {
            accum[components[1]] = accum[components[1]] || true
          }
        }
        return accum
      }, {} as any)

    $twAttributes = Object.keys(tw)
    $twVariants = ([] as string[]).concat(...screens, ...variants, 'tw')
  }

  return [$twAttributes, $twVariants]
}
