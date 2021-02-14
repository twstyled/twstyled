export type ColorMode = 'light' | 'dark'

export interface Colors {
  accent: string
  brand: string
  articleText: string
  bg: string
  brandBg: string
  button: string
  buttonBg: string
  buttonHover: string
  buttonHoverBg: string
  card: string
  error: string
  errorBg: string
  gradient: string
  grey: string
  horizontalRule: string
  hover: string
  inputBg: string
  primary: string
  prism: any
  progress: string
  secondary: string
  success: string
  track: string
}

export interface Theme {
  colors: Colors & {
    modes: {
      dark: Colors
    }
  }
  useColorSchemeMediaQuery: boolean
  useLocalStorage: boolean
  initialColorModeName: ColorMode
}
