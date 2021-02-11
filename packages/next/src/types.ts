export interface Context {
  context: string
  resourcePath: string
}

export interface LocalIdentName {
  template: string
  interpolatedName: string
}

export interface Options {
  markup: string
  style: string
}

export interface GetLocalIdent {
  (
    context: Context,
    localIdentName: LocalIdentName,
    localName: string,
    options: Options
  ): string
}

export interface CssLoaderRule {
  loader: string
  use: CssLoaderRule
  oneOf: CssLoaderRule[]
  options: {
    modules: {
      getLocalIdent: GetLocalIdent
    }
  }
}
export interface CSSConfiguration {
  module: {
    rules: CssLoaderRule[]
  }
}
