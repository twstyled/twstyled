import clsx from 'clsx'
import { TwClasses } from '@xwind/class-utilities'
import type { CSSProperties, StyledMeta } from './types'

export { default } from './styled'
export { default as styled } from './styled'
export * from './types'

type StaticPlaceholder = string | number | CSSProperties | StyledMeta

export function css<TAdditionalProps = {}>(
  strings: TemplateStringsArray,
  ...exprs: Array<
    | StaticPlaceholder
    | ((
        // Without Omit here TS tries to infer TAdditionalProps
        // from a component passed for interpolation
        props: Omit<TAdditionalProps, never>
      ) => string | number)
  >
): any {
  throw new Error(
    'twstyled - Configure the babel plugin correctly to handle css template strings'
  )
}

export const tw = (
  ...args: [arg1: TemplateStringsArray | TwClasses, ...rest: TwClasses[]]
): any => {
  throw new Error(
    'twstyled - Configure the babel plugin correctly to handle tw template strings'
  )
}

export const cx = clsx
