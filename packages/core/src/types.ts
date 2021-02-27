import { TailwindAttributes } from './types-tw'

export interface CSSProperties {
  [key: string]: string | number | CSSProperties
}

export interface StyledMeta {
  __linaria: {
    className: string
    extends: StyledMeta
  }
}

export type Interpolation =
  | undefined
  | null
  | boolean
  | string
  | number
  | TemplateStringsArray

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLAttributes<T> extends Partial<TailwindAttributes> {
    css?: Interpolation
    tw?: Interpolation
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface SVGProps<T> {
    css?: Interpolation
    tw?: Interpolation
  }
}

// Preact support
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface HTMLAttributes extends Partial<TailwindAttributes> {
      css?: Interpolation
      tw?: Interpolation
    }
    interface SVGProps {
      css?: Interpolation
      tw?: Interpolation
    }
  }
}
