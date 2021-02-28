import * as fs from 'fs'
import * as path from 'path'
import tailwindData, {
  createTwClassDictionary,
  resolveConfig
} from '@xwind/core'
import DESCRIPTIONS, { VARIANTS } from './descriptions'

const FractionRegExp = /^[0-9]+\/[0-9]+$/

const twConfig = resolveConfig({})
const { utilitiesRoot, componentsRoot, screens, variants } = tailwindData(
  twConfig
)

const twObjectMap = createTwClassDictionary(utilitiesRoot, componentsRoot)

const TW_COLORS = /^(divide|bg|from|via|to|border|placeholder|ring-offset|ring|text)\-/

const twClassList: string[] = []

const jsx = Object.keys(twObjectMap)
  .filter((key) => !key.startsWith('XWIND'))
  .sort()
  .reduce((accum, twClass) => {
    const jsxClass = withSuffix(twClass)
    const baseClass = removePrefix(twClass)
    twClassList.push(baseClass)
    const description =
      DESCRIPTIONS[baseClass] ||
      DESCRIPTIONS[
        Object.keys(DESCRIPTIONS).find((d) => baseClass.startsWith(d))!
      ]

    if (!description) {
      console.log(`${baseClass} MISSING DESCRIPTION`)
    }

    const cssCode = `/** 
 * Tailwind CSS **\`${baseClass}\`**
 * 
 * *${description}*
 * \`\`\` css 
 * ${twObjectMap[twClass]
   .toString()
   .replace(/[^{]*\{/, '{')
   .trim()
   .replace(/\\./g, '.')
   .replace(/\//g, '\\/')
   .replace(/\n\s*/g, ' ')}
 * \`\`\` 
 * Docs: [tailwindcss](https://tailwindcss.com/docs/container) Source: [twstyled](https://github/twstyled/twstyled)
 **/\r\n`

    let twClassPrefix: string, twClassValue: string | true | number

    if (baseClass in DESCRIPTIONS) {
      twClassPrefix = baseClass
      twClassValue = true
    } else if (TW_COLORS.test(baseClass)) {
      const twClassParts = splitAtLastTwoOccurences(twClass, '-')
      if (twClassParts[0]) {
        twClassPrefix = twClassParts[0]
        twClassValue = `${twClassParts[1]}-${twClassParts[2]}`
      } else {
        twClassPrefix = twClassParts[1]
        twClassValue = toNumberOrString(twClassParts[2])
      }
    } else {
      const twClassParts = splitAtLastOccurence(twClass, '-')
      if (twClassParts[0]) {
        twClassPrefix = twClassParts[0]
        twClassValue = toNumberOrString(twClassParts[1])
      } else {
        twClassPrefix = twClassParts[1]
        twClassValue = true
      }
    }

    const jsxClassPrefix = withSuffixPartial(twClassPrefix)
    const jsxClassValue = twClassPrefix.startsWith('-')
      ? toNegative(twClassValue)
      : twClassValue

    const categoryCode = `/** 
    * Tailwind CSS Prefix **\`${jsxClassPrefix}\`**
    * 
    * *${description}*
    **/\r\n`

    accum[jsxClass] = accum[jsxClass] || { description: cssCode, values: [] }
    if (accum[jsxClass].values.indexOf(true) === -1) {
      accum[jsxClass].values.push(true)
    }
    if (jsxClassValue !== null && jsxClassValue !== true) {
      accum[jsxClassPrefix] = accum[jsxClassPrefix] || {
        description: categoryCode,
        values: []
      }
      accum[jsxClassPrefix].values.push(jsxClassValue)
    }

    return accum
  }, {} as Record<string, { description: string; values: Array<number | true | string> }>)

Object.keys(jsx).forEach((jsxClass) => {
  if (jsx[jsxClass].values.length > 1 || jsx[jsxClass].values[0] !== true) {
    const additionalDescription = jsx[jsxClass].values
      .sort(sortNumberOrString)
      .map((suffix) => {
        const twClass = toTwclass(jsxClass, suffix)

        const css = twObjectMap[twClass]
          .toString()
          .replace(/[^{]*\{/, '{')
          .trim()
          .replace(/\\./g, '.')
          .replace(/\//g, '\\/')
          .replace(/\n\s*/g, ' ')

        return `* ${suffix !== true ? `${suffix}` : jsxClass}: ${css}`
      })
      .join('\r\n')

    jsx[jsxClass].description = jsx[jsxClass].description.replace(
      /\*\*\/\r\n$/,
      `
\`\`\` css
${additionalDescription}
\`\`\`
**/\r\n`
    )
  }
})

const result = `/* eslint-disable max-lines */
/* eslint-disable prettier/prettier */

type TailwindClasses = |
${twClassList
  .map((twClass) => {
    return `'${twClass}'`
  })
  .join('| \r\n')};

export interface TailwindAttributes {
  ${Object.keys(jsx)
    .sort()
    .map((jsxClass) => {
      return `${jsx[jsxClass].description}  ${JSON.stringify(jsxClass)}: ${jsx[
        jsxClass
      ].values
        .sort(sortNumberOrString)
        .map((v) => (typeof v === 'string' ? `'${v}'` : `${v}`))
        .join(' | ')}`
    })
    .join('\r\n')}
${([] as string[])
  .concat(...screens, ...variants, 'tw')
  .map((variant) => {
    return `  /** 
     * Tailwind ${variant === 'tw' ? 'Styles' : `Variant **\`${variant}:\`**`}
     * 
     * ${VARIANTS[variant] || ''}
     * 
     * Docs: [tailwindcss](https://tailwindcss.com/docs/hover-focus-and-other-states#${variant}) Source: [twstyled](https://github/twstyled/twstyled)
     **/
  "${variant}--": Array<TailwindClasses>`
  })
  .join('\r\n')}
}`

fs.writeFileSync(path.resolve(__dirname, '../../../src/types-tw.ts'), result)

/** HELPER FUNCTIONS */

function splitAtLastOccurence(src: string, char: string): [string, string] {
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

function toNumberOrString(src: string) {
  if (FractionRegExp.test(src)) {
    //const split = src.split('/')
    return `${src}` // `parseInt(split[0], 10) / parseInt(split[1], 10)} | '${src}'`
  }
  const asNumber = Number(src)
  if (Number.isNaN(asNumber)) {
    return `${src}`
  } else {
    return asNumber
  }
}

function sortNumberOrString(
  a: string | number | true,
  b: string | number | true
) {
  if (typeof a === 'string') {
    if (typeof b === 'string') {
      return b > a ? 1 : b === a ? 0 : -1
    } else {
      return -1
    }
  } else {
    if (typeof b === 'string') {
      return 1
    } else if (typeof a === 'boolean' || typeof b === 'boolean') {
      return 0
    } else {
      return a - b
    }
  }
}

function withSuffix(key: string) {
  if (key.startsWith('-')) {
    return `${key.substr(1)}-`
  }
  return `${key}-`
}

function withSuffixPartial(key: string) {
  if (key.startsWith('-')) {
    return `${key.substr(1)}-`
  }
  return `${key}-`
}

function removeSuffix(key: string) {
  return key.substr(0, key.length - 1)
}

function removePrefix(key: string) {
  if (key.startsWith('-')) {
    return key.substr(1)
  }
  return key
}

function toTwclass(jsxPrefix: string, suffix: string | number | true) {
  const twPrefix = removeSuffix(jsxPrefix)
  if (suffix === true) {
    return twPrefix
  } else if (typeof suffix === 'string' || suffix >= 0) {
    return `${twPrefix}-${suffix}`
  } else {
    return `-${twPrefix}${suffix}`
  }
}

function toNegative(key: string | number | true) {
  if (typeof key === 'string' || key === 0) {
    return null
  }
  return -1 * (key as number)
}
