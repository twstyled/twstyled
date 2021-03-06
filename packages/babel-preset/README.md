# Tailwind + CSS in JS

Full featured [Tailwind](https://tailwindcss.com/) compiler with CSS in JS support, with blazing fast build and runtime performance

## Why does this exist

You may have encountered some of these problems when using [Tailwind CSS](https://tailwindcss.com/).

- You have to use PurgeCSS to get the minimal CSS file, PurgeCSS relies on string matching
- No warnings when misspelling, refactoring or using a class that doesn't exist
- Inline classes can get very long and hard to read
- You have to specify the variants for utility classes in tailwind.config.js
- No escape hatch to CSS when needed
- No logic support to allow loops, conditionals, variables, state-based styling, and more
- No built in theming support
- No dedicated string support in React classes `<MyComponent tw="bg-blue-500" />`
- No dedicate properties in React classes `<MyComponent bg-blue-500- >`
- No styled-system-like shorthands `<MyComponent bg-="blue-500" >`
- No IDE support typeahead and hover hints for tailwind properties
- No easy pathway if coming from `styled-system`
- Adding a CSS in JS solution like Emotion or Style-Components brings runtime bloat and poorer performance
- Compile time CSS in JS solutions do not have simple inline support `<MyComponent css="line-height: 1.15;" /> and do not support Tailwind `<div tw="bg-blue-500" css="line-height: 1.15;" />`
- Custom Tailwind CSS in JS solutions reimplement Tailwind CSS and so do not keep up to date with Tailwind CSS releases or all the standard plugins
- Compile time solutions do not pre-evaluate template strings thus requiring a runtime in all but the simplest use cases 
- Require webpack loader or other bundler plugins to generate the CSS classes, requiring more complex build setups and often retraversing the 
- Hard to use the [built-in CSS support](https://nextjs.org/docs/basic-features/built-in-css-support) in in Next.js and other frameworks

## Features / Goals
- [x] Solves all of the above problems
- [x] No runtime impact all transformations happen during build time
- [x] Wraps Arthie's [@xwind/core](https://github.com/Arthie/xwind/tree/master/packages/core) low level API to provide new syntax to apply variants to multiple utility classes `md:hover[text-xs font-normal]` with zero runtime dependencies from Arthie
- [x] Uses vanilla Tailwind CSS package in static generation logic (thanks to Arthie's great low level API that has done this)
- [x] Wraps Callstack's [@linaria/](https://github.com/callstack/linaria) low level babel logic to provide zero runtime escape hatch to CSS with zero runtime dependencies from Callstack without requiring extra Babel plugins or presets
- [x] Pre-evaluates template strings for both CSS and Tailwind classes thanks to Linaria's comprehensive Shaker methodology and new API hooks added to Linaria core package by `twstyled` contributors
- [x] Extends [@linaria/](https://github.com/callstack/linaria) to extend zero runtime CSS in JS experience to Tailwind classes
- [x] Unopionated on whether tailwind is used in JSX attributes, using embedded `tw\`` helpers inside css, or as a simple CSS rule `@tailwind bg-blue-500 text-white-300`
- [x] Mix and match Tailwind classnames and regular CSS
- [x] When using React, adds new JSX properties `tw=` and `css=` to inline Tailwind directly in the component, with full variable / logic support
- [x] Zero runtime when using inline styles, and 1.59Kb runtime (GZip compressed) when using styled components with dynamic variables based on properties only known at runtime
- [x] Great developer experience with Typescript definitions for every Tailwind property
- [ ] Great developer experience with VS Code extension
- [x] No dependency on [xwind](https://github.com/Arthie/xwind/tree/master/packages/xwind) package
- [x] Encapsulates all build time logic into a single Babel plugin [@twstyled/babel-preset](https://www.npmjs.com/package/@twstyled/babel-preset)
- [x] Writes all Tailwind css to single twstyled.global.css with all potential styles needed as well as the Tailwind base and global classes, and to individual css files associated with each component that has other CSS in JS included beyond Tailwind
- [x] Writes generated css directly from the single Babel plugin with no webpack or bundler plugin required
- [x] Complementary Next.js plugin allows the CSS files to be included directly from each component without requiring changes to _app or _document for CSS in JS code and without requiring a slower webpack loader
- [x] Babel plugin contains no Next.js, React or other framework specific code and can be re-used in any module bundler or framework
- [x] Support Tailwind properties directly on React component with full typeahead and hover support
- [x] Plugin for Babel
- [x] Plugin for Rollup
- [x] Plugin for Next.js
- [x] Plugin for Vite

## Installation

```
npm install --save twstyled @twstyled/babel-preset
```

or

```
yarn add twstyled  @twstyled/babel-preset
```

### Use of linaria fork

Until our linaria enhancements to open the API to wrapper packages like this one are included in linaria upstream, please also add the follow resolutions to your `package.json` file in your workspace root  folder to point to our fork of linaria which is published on npm as [`@twstyled/linaria-babel-preset`](https://www.npmjs.com/package/@twstyled/babel-preset)

```json
// package.json
"resolutions": {
    "@linaria/babel-preset": "npm:@twstyled/linaria-babel-preset@3.0.0-beta.1",
    "@linaria/preeval": "npm:@twstyled/linaria-preeval@3.0.0-beta.1"
  },
```

## Usage: installing the Babel preset

Create a `babel.config.js` in your project

```js
// babel.config.js
"use strict";

module.exports = {
    presets: [
        '@twstyled/babel-preset',
        [
            'next/babel',
            {
                'preset-react': {
                    runtime: 'automatic',
                },
            }
        ],
    ],
    plugins: [],
}
```

### Usage: installing the Next.js plugin (optional)

In addition to the babel preset above, add a `next.config.js` file to your project:

```
npm install --save @twstyled/next next-compose-plugins
```

or

```
yarn add  @twstyled/next next-compose-plugins
```


``` js
const { withPlugins } = require('next-compose-plugins');

// next.config.js
module.exports = withPlugins(
  [
    require('@twstyled/next'),
  ],
  {}
)
```

This plugin does not change the bundling but allows any CSS generated by Linaria to be included as CSS modules in
each respective component;  this is optimal for code-splitting and HTTP delivery of code


## Example Code

### Simple react code with no extra imports required

```jsx
export const HeroHeading = (props) => (
  <h1
    tw="font-semibold text-3xl md:text-4xl lg:text-5xl not-italic"
    {...props}
  />
)
```

This is the recommended approach if you want to share your components with other developers, as the string format is 100% compatible with any Tailwind implementation. 

### Alternative react code, still with no extra imports required

If you find these strings long and hard to read, you might prefer to have Tailwind utilities directly on the React classes. Every Tailwind class can be used as a (boolean) property directly on the React component, with a suffix of `-` to keep
all Tailwind classes visually and logically distinct from your own properties.  Negative properties should use the JSX Expression format below as it would otherwise be hard to see all these minus signs.   Variants like `hover:`, `focus:` and screen hints are all supported using an array format and a suffix of `--` again just to keep these visually distinct.

``` tsx
export const HeroHeading = (props) => (
  <h1 font-semibold- text-3xl- md--={['text-4xl']} lg--={['text-5xl']} not-italic->
    {...props}
  />
)
```

### JSX Expression (Styled-system-like) react code, still with no extra imports required

Every Tailwind class can be used as a prefix and a value property directly on the React component, with a suffix of `-` to keep all Tailwind classes visually and logically distinct from your own properties.

``` tsx
export const HeroHeading = (props) => (
  <h1 m-={-2} px-={3} font-={theme.fonts.headings} text-="3xl" md--:{['text-4xl']} lg--:{['text-5xl']} not-italic- >
    {...props}
  />
)
```

Note how you can mix and match any of these formats together.

We recommend this option in all cases that you want to add a small number of style overrides for a given component.  One advantage in the IDE and in code excerpts in blogs, is that you can quickly distinguish the type of style override from the actual value of style override.  It is also useful if you are converting another library that has used styled system.

### Use standard styled syntax like any other CSS in JS library, mix and match CSS and Tailwind code with custom @tailwind rule

```jsx

import { styled } from '@twstyled/core'

export const HeroHeading styled.h1`
  @tailwind font-semibold text-3xl md:text-4xl lg:text-5xl not-italic;
  line-height: 1.15;
```

### Use advanced styled syntax like any other CSS in JS library
```jsx
import { styled } from '@twstyled/core'

export const HeroHeading styled.h1`
  @tailwind font-semibold text-3xl md:text-4xl lg:text-5xl not-italic;

  ${mediaqueries.desktop} {
    @tailwind p-1;
    line-height: ${props => props.theme.largeSpacing && 1.15};
  }
```

### Use standard css syntax like any other CSS in JS library, mix and match CSS and Tailwind code with custom @tailwind rule
```jsx
import { css } from '@twstyled/core'

export const styles = {
  heading1: css`@tailwind font-semibold text-3xl md:text-4xl lg:text-5xl not-italic;  /* standard CSS here */ line-height: 1.15;`
}

const HeroHeading = (props) => (
  <h1 className={styles.heading1}  />
)
```

### React code with deterministic template strings (zero runtime impact)

```js
import { tw } from '@twstyled/core'

const mixin = `font-semibold text-3xl`

const HeroHeading = (props) => (
  <h1 tw={`${mixin} md:text-4xl lg:text-5xl not-italic`}
    {...props}
  />
)
```

### React code with dynamic template strings (automatic conversion to CSS variables)

```js
import { tw } from '@twstyled/core'

const special = `font-semibold text-3xl`

const HeroHeading = (props) => (
  <h1 tw={`md:text-4xl lg:text-5xl ${props => props.isSpecial && special} not-italic`}
    {...props}
  />
)
```

### Advanced -- escape hatch to css when required (and still zero runtime)

```jsx
import { css } from '@linaria/css'

const HeroHeadingAdvanced = (props) => (
  <h1
    tw="font-semibold text-3xl md:text-4xl lg:text-5xl not-italic"
    css={`
      line-height: 1.15;
    `}
    {...props}
  />
)
```

### Advanced -- escape hatch to css when required (and still zero runtime)

Does not use the slower styles attributes behind the scenes but actually generates unique CSS classes 
and auto injects an import of the CSS file at build time for normal CSS handling by whatever bundler you use

```jsx
import { css } from '@linaria/css'

const HeroHeadingAdvanced = (props) => (
  <h1
    tw="font-semibold text-3xl md:text-4xl lg:text-5xl not-italic"
    css={`
      line-height: 1.15;
    `}
    {...props}
  />
)
```

### Advanced -- escape hatch to css with dynamic properties when required, no extra imports required

Converts to a twstyled component behind the scenes with tiny runtime to handle the dynamic property;
automatically recognizes the scope of expressions and if needed adds a property to the generated class
to handle locally scoped expressions and pre-evaluates globally scoped expressions.

```jsx
const isLarge = true

const HeroHeadingAdvanced = (props) => {
  const isItalic = true
  return (<h1
    tw=(`font-semibold ${isLarge ? "text-4xl" : "text-3xl"} ${isItalic ? "not-italic" : ""}`}
    css={`
      line-height: ${props => props.theme.linespacing};
    `}
    {...props}
  />)
}
```

is converted to the equivalent of 

```jsx
import { css, styled } from '@twstyled/core'

const TwCssH1 = styled.h1`
@tailwind font-semibold text-4xl ${props => props.$cssp1 ? "not-italic" : ""};
line-height: ${props => props.theme.linespacing};
`

const HeroHeadingAdvanced = (props) => (
  const isItalic = true
  <MyWrapperComponent>
  <TwCssH1 $cssp1={isItalic} {...props}/>
  </MyWrapperComponent>
)
```


### Markdown MDX code allows `class` instead of `className` for compatibility with common Tailwind example kits

```md
  <h1 class="font-semibold text-3xl md:text-4xl lg:text-5xl not-italic">Hello</h1>
```


## Prior Art

- [xwind](https://github.com/Arthie/xwind) The inspiration and embedded logic for the Tailwind CSS processing; chosen because it was the best build-time solution and relied on the standard Tailwind CSS packages instead of recreating it; we do not use the actual xwind package here but instead use the smaller and more focused [@xwind/core](https://github.com/Arthie/xwind/tree/master/packages/core) and [@xwind/class-utilities](https://github.com/Arthie/xwind/tree/master/packages/class-utilities) packages.  The xwind solution does not at time of development include a build time CSS in JS capabilty, does not support dedicated `tw=` JSX attribute and has not split out the import package, babel and webpack plugins
- [twind](https://github.com/tw-in-js/twind)  Was the smallest, fastest, most feature complete Tailwind-in-JS solution, but we now believe this solution `twstyled` is smaller (zero runtime in most cases), faster (no evaluation at runtime), and more feature complete (custom `tw` and `css` )
- [linaria](https://github.com/callstack/linaria) A build time CSS-in-JS solution that has one of the best pre-evaluation capabiltiies we've seen in a Babel plugin;   we re-use a lot of the Linaria logic, but provide a thin wrapper over it to handle Tailwind classes, and also provide a new `css` attribute similar to emotion and styled-components but missing in Linaria, and to allow all the CSS generation to happen in the Babel plugin instead of reparsing each source file in a separate Webpack loader.  We had to expose the API of Linaria a bit to accomplish this and have added our contributions to the core linaria package
- [Tailwind CSS](https://tailwindcss.com/) The inspiration for `twstyled` and the actual source of the CSS used for each class;  the vanilla implementation requires PostCSS purge processing which is less efficient as it uses string parsing and does not make use of the AST parsing that all bundlers include anyway 
- [Windi CSS](https://github.com/windicss/windicss) Windi CSS is a well-written, well-documented rewrite of Tailwind CSS that generates CSS dynamically.   It's a good alternative to twstyled but is focused on scanning HTML and CSS files and has rewritten the generation from scratch, whereas twstyled is scans the abstract syntax tree of your components and generates the exact same CSS that tailwindcss does, thus avoiding the risk of upstream sync issues, and additionally brings all the benefits of a CSS in JS solution.    We are React-ready out of the box and use a highly efficient Babel parser that plugs right into rollup, webpack, Next.js vite, esbuild and many other build pipelines.

## License

The MIT License (MIT)