let unpack = require('caniuse-lite').feature

function browsersSort(a, b) {
  a = a.split(' ')
  b = b.split(' ')
  if (a[0] > b[0]) {
    return 1
  } else if (a[0] < b[0]) {
    return -1
  } else {
    return Math.sign(parseFloat(a[1]) - parseFloat(b[1]))
  }
}

// Convert Can I Use data
function f(data, opts, callback) {
  data = unpack(data)

  if (!callback) {
    ;[callback, opts] = [opts, {}]
  }

  let match = opts.match || /\sx($|\s)/
  let need = []

  for (let browser in data.stats) {
    let versions = data.stats[browser]
    for (let version in versions) {
      let support = versions[version]
      if (support.match(match)) {
        need.push(browser + ' ' + version)
      }
    }
  }

  callback(need.sort(browsersSort))
}

// Add data for all properties
let result = {}

function prefix(names, data) {
  for (let name of names) {
    result[name] = Object.assign({}, data)
  }
}

function add(names, data) {
  for (let name of names) {
    result[name].browsers = result[name].browsers
      .concat(data.browsers)
      .sort(browsersSort)
  }
}

module.exports = result

// Border Radius
let prefixBorderRadius = require('caniuse-lite/data/features/border-radius')

f(prefixBorderRadius, browsers =>
  prefix(
    [
      'border-radius',
      'border-top-left-radius',
      'border-top-right-radius',
      'border-bottom-right-radius',
      'border-bottom-left-radius'
    ],
    {
      mistakes: ['-khtml-', '-ms-', '-o-'],
      feature: 'border-radius',
      browsers
    }
  )
)

// Box Shadow
let prefixBoxshadow = require('caniuse-lite/data/features/css-boxshadow')

f(prefixBoxshadow, browsers =>
  prefix(['box-shadow'], {
    mistakes: ['-khtml-'],
    feature: 'css-boxshadow',
    browsers
  })
)

// Animation
let prefixAnimation = require('caniuse-lite/data/features/css-animation')

f(prefixAnimation, browsers =>
  prefix(
    [
      'animation',
      'animation-name',
      'animation-duration',
      'animation-delay',
      'animation-direction',
      'animation-fill-mode',
      'animation-iteration-count',
      'animation-play-state',
      'animation-timing-function',
      '@keyframes'
    ],
    {
      mistakes: ['-khtml-', '-ms-'],
      feature: 'css-animation',
      browsers
    }
  )
)

// Transition
let prefixTransition = require('caniuse-lite/data/features/css-transitions')

f(prefixTransition, browsers =>
  prefix(
    [
      'transition',
      'transition-property',
      'transition-duration',
      'transition-delay',
      'transition-timing-function'
    ],
    {
      mistakes: ['-khtml-', '-ms-'],
      browsers,
      feature: 'css-transitions'
    }
  )
)

// Transform 2D
let prefixTransform2d = require('caniuse-lite/data/features/transforms2d')

f(prefixTransform2d, browsers =>
  prefix(['transform', 'transform-origin'], {
    feature: 'transforms2d',
    browsers
  })
)

// Transform 3D
let prefixTransforms3d = require('caniuse-lite/data/features/transforms3d')

f(prefixTransforms3d, browsers => {
  prefix(['perspective', 'perspective-origin'], {
    feature: 'transforms3d',
    browsers
  })
  return prefix(['transform-style'], {
    mistakes: ['-ms-', '-o-'],
    browsers,
    feature: 'transforms3d'
  })
})

f(prefixTransforms3d, { match: /y\sx|y\s#2/ }, browsers =>
  prefix(['backface-visibility'], {
    mistakes: ['-ms-', '-o-'],
    feature: 'transforms3d',
    browsers
  })
)

// Gradients
let prefixGradients = require('caniuse-lite/data/features/css-gradients')

f(prefixGradients, { match: /y\sx/ }, browsers =>
  prefix(
    [
      'linear-gradient',
      'repeating-linear-gradient',
      'radial-gradient',
      'repeating-radial-gradient'
    ],
    {
      props: [
        'background',
        'background-image',
        'border-image',
        'mask',
        'list-style',
        'list-style-image',
        'content',
        'mask-image'
      ],
      mistakes: ['-ms-'],
      feature: 'css-gradients',
      browsers
    }
  )
)

f(prefixGradients, { match: /a\sx/ }, browsers => {
  browsers = browsers.map(i => {
    if (/firefox|op/.test(i)) {
      return i
    } else {
      return `${i} old`
    }
  })
  return add(
    [
      'linear-gradient',
      'repeating-linear-gradient',
      'radial-gradient',
      'repeating-radial-gradient'
    ],
    {
      feature: 'css-gradients',
      browsers
    }
  )
})

// Box sizing
let prefixBoxsizing = require('caniuse-lite/data/features/css3-boxsizing')

f(prefixBoxsizing, browsers =>
  prefix(['box-sizing'], {
    feature: 'css3-boxsizing',
    browsers
  })
)

// Filter Effects
let prefixFilters = require('caniuse-lite/data/features/css-filters')

f(prefixFilters, browsers =>
  prefix(['filter'], {
    feature: 'css-filters',
    browsers
  })
)

// filter() function
let prefixFilterFunction = require('caniuse-lite/data/features/css-filter-function')

f(prefixFilterFunction, browsers =>
  prefix(['filter-function'], {
    props: [
      'background',
      'background-image',
      'border-image',
      'mask',
      'list-style',
      'list-style-image',
      'content',
      'mask-image'
    ],
    feature: 'css-filter-function',
    browsers
  })
)

// Backdrop-filter
let prefixBackdrop = require('caniuse-lite/data/features/css-backdrop-filter')

f(prefixBackdrop, { match: /y\sx|y\s#2/ }, browsers =>
  prefix(['backdrop-filter'], {
    feature: 'css-backdrop-filter',
    browsers
  })
)

// element() function
let prefixElementFunction = require('caniuse-lite/data/features/css-element-function')

f(prefixElementFunction, browsers =>
  prefix(['element'], {
    props: [
      'background',
      'background-image',
      'border-image',
      'mask',
      'list-style',
      'list-style-image',
      'content',
      'mask-image'
    ],
    feature: 'css-element-function',
    browsers
  })
)

// Multicolumns
let prefixMulticolumns = require('caniuse-lite/data/features/multicolumn')

f(prefixMulticolumns, browsers => {
  prefix(
    [
      'columns',
      'column-width',
      'column-gap',
      'column-rule',
      'column-rule-color',
      'column-rule-width',
      'column-count',
      'column-rule-style',
      'column-span',
      'column-fill'
    ],
    {
      feature: 'multicolumn',
      browsers
    }
  )

  let noff = browsers.filter(i => !/firefox/.test(i))
  prefix(['break-before', 'break-after', 'break-inside'], {
    feature: 'multicolumn',
    browsers: noff
  })
})

// User select
let prefixUserSelect = require('caniuse-lite/data/features/user-select-none')

f(prefixUserSelect, browsers =>
  prefix(['user-select'], {
    mistakes: ['-khtml-'],
    feature: 'user-select-none',
    browsers
  })
)

// Flexible Box Layout
let prefixFlexbox = require('caniuse-lite/data/features/flexbox')

f(prefixFlexbox, { match: /a\sx/ }, browsers => {
  browsers = browsers.map(i => {
    if (/ie|firefox/.test(i)) {
      return i
    } else {
      return `${i} 2009`
    }
  })
  prefix(['display-flex', 'inline-flex'], {
    props: ['display'],
    feature: 'flexbox',
    browsers
  })
  prefix(['flex', 'flex-grow', 'flex-shrink', 'flex-basis'], {
    feature: 'flexbox',
    browsers
  })
  prefix(
    [
      'flex-direction',
      'flex-wrap',
      'flex-flow',
      'justify-content',
      'order',
      'align-items',
      'align-self',
      'align-content'
    ],
    {
      feature: 'flexbox',
      browsers
    }
  )
})

f(prefixFlexbox, { match: /y\sx/ }, browsers => {
  add(['display-flex', 'inline-flex'], {
    feature: 'flexbox',
    browsers
  })
  add(['flex', 'flex-grow', 'flex-shrink', 'flex-basis'], {
    feature: 'flexbox',
    browsers
  })
  add(
    [
      'flex-direction',
      'flex-wrap',
      'flex-flow',
      'justify-content',
      'order',
      'align-items',
      'align-self',
      'align-content'
    ],
    {
      feature: 'flexbox',
      browsers
    }
  )
})

// calc() unit
let prefixCalc = require('caniuse-lite/data/features/calc')

f(prefixCalc, browsers =>
  prefix(['calc'], {
    props: ['*'],
    feature: 'calc',
    browsers
  })
)

// Background options
let prefixBackgroundOptions = require('caniuse-lite/data/features/background-img-opts')

f(prefixBackgroundOptions, browsers =>
  prefix(['background-origin', 'background-size'], {
    feature: 'background-img-opts',
    browsers
  })
)

// background-clip: text
let prefixBackgroundClipText = require('caniuse-lite/data/features/background-clip-text')

f(prefixBackgroundClipText, browsers =>
  prefix(['background-clip'], {
    feature: 'background-clip-text',
    browsers
  })
)

// Font feature settings
let prefixFontFeature = require('caniuse-lite/data/features/font-feature')

f(prefixFontFeature, browsers =>
  prefix(
    [
      'font-feature-settings',
      'font-variant-ligatures',
      'font-language-override'
    ],
    {
      feature: 'font-feature',
      browsers
    }
  )
)

// CSS font-kerning property
let prefixFontKerning = require('caniuse-lite/data/features/font-kerning')

f(prefixFontKerning, browsers =>
  prefix(['font-kerning'], {
    feature: 'font-kerning',
    browsers
  })
)

// Border image
let prefixBorderImage = require('caniuse-lite/data/features/border-image')

f(prefixBorderImage, browsers =>
  prefix(['border-image'], {
    feature: 'border-image',
    browsers
  })
)

// Selection selector
let prefixSelection = require('caniuse-lite/data/features/css-selection')

f(prefixSelection, browsers =>
  prefix(['::selection'], {
    selector: true,
    feature: 'css-selection',
    browsers
  })
)

// Placeholder selector
let prefixPlaceholder = require('caniuse-lite/data/features/css-placeholder')

f(prefixPlaceholder, browsers => {
  prefix(['::placeholder'], {
    selector: true,
    feature: 'css-placeholder',
    browsers: browsers.concat(['ie 10 old', 'ie 11 old', 'firefox 18 old'])
  })
})

// Placeholder-shown selector
let prefixPlaceholderShown = require('caniuse-lite/data/features/css-placeholder-shown')

f(prefixPlaceholderShown, browsers => {
  prefix([':placeholder-shown'], {
    selector: true,
    feature: 'css-placeholder-shown',
    browsers
  })
})

// Hyphenation
let prefixHyphens = require('caniuse-lite/data/features/css-hyphens')

f(prefixHyphens, browsers =>
  prefix(['hyphens'], {
    feature: 'css-hyphens',
    browsers
  })
)

// Fullscreen selector
let prefixFullscreen = require('caniuse-lite/data/features/fullscreen')

f(prefixFullscreen, browsers =>
  prefix([':fullscreen'], {
    selector: true,
    feature: 'fullscreen',
    browsers
  })
)

f(prefixFullscreen, { match: /x(\s#2|$)/ }, browsers =>
  prefix(['::backdrop'], {
    selector: true,
    feature: 'fullscreen',
    browsers
  })
)

// File selector button
let prefixFileSelectorButton = require('caniuse-lite/data/features/css-file-selector-button')

f(prefixFileSelectorButton, browsers =>
  prefix(['::file-selector-button'], {
    selector: true,
    feature: 'file-selector-button',
    browsers
  })
)

// :autofill
let prefixAutofill = require('caniuse-lite/data/features/css-autofill')

f(prefixAutofill, browsers =>
  prefix([':autofill'], {
    selector: true,
    feature: 'css-autofill',
    browsers
  })
)

// Tab size
let prefixTabsize = require('caniuse-lite/data/features/css3-tabsize')

f(prefixTabsize, browsers =>
  prefix(['tab-size'], {
    feature: 'css3-tabsize',
    browsers
  })
)

// Intrinsic & extrinsic sizing
let prefixIntrinsic = require('caniuse-lite/data/features/intrinsic-width')

let sizeProps = [
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'inline-size',
  'min-inline-size',
  'max-inline-size',
  'block-size',
  'min-block-size',
  'max-block-size',
  'grid',
  'grid-template',
  'grid-template-rows',
  'grid-template-columns',
  'grid-auto-columns',
  'grid-auto-rows'
]

f(prefixIntrinsic, browsers =>
  prefix(['max-content', 'min-content'], {
    props: sizeProps,
    feature: 'intrinsic-width',
    browsers
  })
)

f(prefixIntrinsic, { match: /x|\s#4/ }, browsers =>
  prefix(['fill', 'fill-available'], {
    props: sizeProps,
    feature: 'intrinsic-width',
    browsers
  })
)

f(prefixIntrinsic, { match: /x|\s#5/ }, browsers =>
  prefix(['fit-content'], {
    props: sizeProps,
    feature: 'intrinsic-width',
    browsers
  })
)

// Stretch value

let prefixStretch = require('caniuse-lite/data/features/css-width-stretch')

f(prefixStretch, browsers =>
  prefix(['stretch'], {
    props: sizeProps,
    feature: 'css-width-stretch',
    browsers
  })
)

// Zoom cursors
let prefixCursorsNewer = require('caniuse-lite/data/features/css3-cursors-newer')

f(prefixCursorsNewer, browsers =>
  prefix(['zoom-in', 'zoom-out'], {
    props: ['cursor'],
    feature: 'css3-cursors-newer',
    browsers
  })
)

// Grab cursors
let prefixCursorsGrab = require('caniuse-lite/data/features/css3-cursors-grab')

f(prefixCursorsGrab, browsers =>
  prefix(['grab', 'grabbing'], {
    props: ['cursor'],
    feature: 'css3-cursors-grab',
    browsers
  })
)

// Sticky position
let prefixSticky = require('caniuse-lite/data/features/css-sticky')

f(prefixSticky, browsers =>
  prefix(['sticky'], {
    props: ['position'],
    feature: 'css-sticky',
    browsers
  })
)

// Pointer Events
let prefixPointer = require('caniuse-lite/data/features/pointer')

f(prefixPointer, browsers =>
  prefix(['touch-action'], {
    feature: 'pointer',
    browsers
  })
)

// Text decoration
let prefixDecoration = require('caniuse-lite/data/features/text-decoration')

f(prefixDecoration, { match: /x.*#[235]/ }, browsers =>
  prefix(['text-decoration-skip', 'text-decoration-skip-ink'], {
    feature: 'text-decoration',
    browsers
  })
)

let prefixDecorationShorthand = require('caniuse-lite/data/features/mdn-text-decoration-shorthand')

f(prefixDecorationShorthand, browsers =>
  prefix(['text-decoration'], {
    feature: 'text-decoration',
    browsers
  })
)

let prefixDecorationColor = require('caniuse-lite/data/features/mdn-text-decoration-color')

f(prefixDecorationColor, browsers =>
  prefix(['text-decoration-color'], {
    feature: 'text-decoration',
    browsers
  })
)

let prefixDecorationLine = require('caniuse-lite/data/features/mdn-text-decoration-line')

f(prefixDecorationLine, browsers =>
  prefix(['text-decoration-line'], {
    feature: 'text-decoration',
    browsers
  })
)

let prefixDecorationStyle = require('caniuse-lite/data/features/mdn-text-decoration-style')

f(prefixDecorationStyle, browsers =>
  prefix(['text-decoration-style'], {
    feature: 'text-decoration',
    browsers
  })
)

// Text Size Adjust
let prefixTextSizeAdjust = require('caniuse-lite/data/features/text-size-adjust')

f(prefixTextSizeAdjust, browsers =>
  prefix(['text-size-adjust'], {
    feature: 'text-size-adjust',
    browsers
  })
)

// CSS Masks
let prefixCssMasks = require('caniuse-lite/data/features/css-masks')

f(prefixCssMasks, browsers => {
  prefix(
    [
      'mask-clip',
      'mask-composite',
      'mask-image',
      'mask-origin',
      'mask-repeat',
      'mask-border-repeat',
      'mask-border-source'
    ],
    {
      feature: 'css-masks',
      browsers
    }
  )
  prefix(
    [
      'mask',
      'mask-position',
      'mask-size',
      'mask-border',
      'mask-border-outset',
      'mask-border-width',
      'mask-border-slice'
    ],
    {
      feature: 'css-masks',
      browsers
    }
  )
})

// CSS clip-path property
let prefixClipPath = require('caniuse-lite/data/features/css-clip-path')

f(prefixClipPath, browsers =>
  prefix(['clip-path'], {
    feature: 'css-clip-path',
    browsers
  })
)

// Fragmented Borders and Backgrounds
let prefixBoxdecoration = require('caniuse-lite/data/features/css-boxdecorationbreak')

f(prefixBoxdecoration, browsers =>
  prefix(['box-decoration-break'], {
    feature: 'css-boxdecorationbreak',
    browsers
  })
)

// CSS3 object-fit/object-position
let prefixObjectFit = require('caniuse-lite/data/features/object-fit')

f(prefixObjectFit, browsers =>
  prefix(['object-fit', 'object-position'], {
    feature: 'object-fit',
    browsers
  })
)

// CSS Shapes
let prefixShapes = require('caniuse-lite/data/features/css-shapes')

f(prefixShapes, browsers =>
  prefix(['shape-margin', 'shape-outside', 'shape-image-threshold'], {
    feature: 'css-shapes',
    browsers
  })
)

// CSS3 text-overflow
let prefixTextOverflow = require('caniuse-lite/data/features/text-overflow')

f(prefixTextOverflow, browsers =>
  prefix(['text-overflow'], {
    feature: 'text-overflow',
    browsers
  })
)

// Viewport at-rule
let prefixDeviceadaptation = require('caniuse-lite/data/features/css-deviceadaptation')

f(prefixDeviceadaptation, browsers =>
  prefix(['@viewport'], {
    feature: 'css-deviceadaptation',
    browsers
  })
)

// Resolution Media Queries
let prefixResolut = require('caniuse-lite/data/features/css-media-resolution')

f(prefixResolut, { match: /( x($| )|a #2)/ }, browsers =>
  prefix(['@resolution'], {
    feature: 'css-media-resolution',
    browsers
  })
)

// CSS text-align-last
let prefixTextAlignLast = require('caniuse-lite/data/features/css-text-align-last')

f(prefixTextAlignLast, browsers =>
  prefix(['text-align-last'], {
    feature: 'css-text-align-last',
    browsers
  })
)

// Crisp Edges Image Rendering Algorithm
let prefixCrispedges = require('caniuse-lite/data/features/css-crisp-edges')

f(prefixCrispedges, { match: /y x|a x #1/ }, browsers =>
  prefix(['pixelated'], {
    props: ['image-rendering'],
    feature: 'css-crisp-edges',
    browsers
  })
)

f(prefixCrispedges, { match: /a x #2/ }, browsers =>
  prefix(['image-rendering'], {
    feature: 'css-crisp-edges',
    browsers
  })
)

// Logical Properties
let prefixLogicalProps = require('caniuse-lite/data/features/css-logical-props')

f(prefixLogicalProps, browsers =>
  prefix(
    [
      'border-inline-start',
      'border-inline-end',
      'margin-inline-start',
      'margin-inline-end',
      'padding-inline-start',
      'padding-inline-end'
    ],
    {
      feature: 'css-logical-props',
      browsers
    }
  )
)

f(prefixLogicalProps, { match: /x\s#2/ }, browsers =>
  prefix(
    [
      'border-block-start',
      'border-block-end',
      'margin-block-start',
      'margin-block-end',
      'padding-block-start',
      'padding-block-end'
    ],
    {
      feature: 'css-logical-props',
      browsers
    }
  )
)

// CSS appearance
let prefixAppearance = require('caniuse-lite/data/features/css-appearance')

f(prefixAppearance, { match: /#2|x/ }, browsers =>
  prefix(['appearance'], {
    feature: 'css-appearance',
    browsers
  })
)

// CSS Scroll snap points
let prefixSnappoints = require('caniuse-lite/data/features/css-snappoints')

f(prefixSnappoints, browsers =>
  prefix(
    [
      'scroll-snap-type',
      'scroll-snap-coordinate',
      'scroll-snap-destination',
      'scroll-snap-points-x',
      'scroll-snap-points-y'
    ],
    {
      feature: 'css-snappoints',
      browsers
    }
  )
)

// CSS Regions
let prefixRegions = require('caniuse-lite/data/features/css-regions')

f(prefixRegions, browsers =>
  prefix(['flow-into', 'flow-from', 'region-fragment'], {
    feature: 'css-regions',
    browsers
  })
)

// CSS image-set
let prefixImageSet = require('caniuse-lite/data/features/css-image-set')

f(prefixImageSet, browsers =>
  prefix(['image-set'], {
    props: [
      'background',
      'background-image',
      'border-image',
      'cursor',
      'mask',
      'mask-image',
      'list-style',
      'list-style-image',
      'content'
    ],
    feature: 'css-image-set',
    browsers
  })
)

// Writing Mode
let prefixWritingMode = require('caniuse-lite/data/features/css-writing-mode')

f(prefixWritingMode, { match: /a|x/ }, browsers =>
  prefix(['writing-mode'], {
    feature: 'css-writing-mode',
    browsers
  })
)

// Cross-Fade Function
let prefixCrossFade = require('caniuse-lite/data/features/css-cross-fade')

f(prefixCrossFade, browsers =>
  prefix(['cross-fade'], {
    props: [
      'background',
      'background-image',
      'border-image',
      'mask',
      'list-style',
      'list-style-image',
      'content',
      'mask-image'
    ],
    feature: 'css-cross-fade',
    browsers
  })
)

// Read Only selector
let prefixReadOnly = require('caniuse-lite/data/features/css-read-only-write')

f(prefixReadOnly, browsers =>
  prefix([':read-only', ':read-write'], {
    selector: true,
    feature: 'css-read-only-write',
    browsers
  })
)

// Text Emphasize
let prefixTextEmphasis = require('caniuse-lite/data/features/text-emphasis')

f(prefixTextEmphasis, browsers =>
  prefix(
    [
      'text-emphasis',
      'text-emphasis-position',
      'text-emphasis-style',
      'text-emphasis-color'
    ],
    {
      feature: 'text-emphasis',
      browsers
    }
  )
)

// CSS Grid Layout
let prefixGrid = require('caniuse-lite/data/features/css-grid')

f(prefixGrid, browsers => {
  prefix(['display-grid', 'inline-grid'], {
    props: ['display'],
    feature: 'css-grid',
    browsers
  })
  prefix(
    [
      'grid-template-columns',
      'grid-template-rows',
      'grid-row-start',
      'grid-column-start',
      'grid-row-end',
      'grid-column-end',
      'grid-row',
      'grid-column',
      'grid-area',
      'grid-template',
      'grid-template-areas',
      'place-self'
    ],
    {
      feature: 'css-grid',
      browsers
    }
  )
})

f(prefixGrid, { match: /a x/ }, browsers =>
  prefix(['grid-column-align', 'grid-row-align'], {
    feature: 'css-grid',
    browsers
  })
)

// CSS text-spacing
let prefixTextSpacing = require('caniuse-lite/data/features/css-text-spacing')

f(prefixTextSpacing, browsers =>
  prefix(['text-spacing'], {
    feature: 'css-text-spacing',
    browsers
  })
)

// :any-link selector
let prefixAnyLink = require('caniuse-lite/data/features/css-any-link')

f(prefixAnyLink, browsers =>
  prefix([':any-link'], {
    selector: true,
    feature: 'css-any-link',
    browsers
  })
)

// unicode-bidi

let bidiIsolate = require('caniuse-lite/data/features/mdn-css-unicode-bidi-isolate')

f(bidiIsolate, browsers =>
  prefix(['isolate'], {
    props: ['unicode-bidi'],
    feature: 'css-unicode-bidi',
    browsers
  })
)

let bidiPlaintext = require('caniuse-lite/data/features/mdn-css-unicode-bidi-plaintext')

f(bidiPlaintext, browsers =>
  prefix(['plaintext'], {
    props: ['unicode-bidi'],
    feature: 'css-unicode-bidi',
    browsers
  })
)

let bidiOverride = require('caniuse-lite/data/features/mdn-css-unicode-bidi-isolate-override')

f(bidiOverride, { match: /y x/ }, browsers =>
  prefix(['isolate-override'], {
    props: ['unicode-bidi'],
    feature: 'css-unicode-bidi',
    browsers
  })
)

// overscroll-behavior selector
let prefixOverscroll = require('caniuse-lite/data/features/css-overscroll-behavior')

f(prefixOverscroll, { match: /a #1/ }, browsers =>
  prefix(['overscroll-behavior'], {
    feature: 'css-overscroll-behavior',
    browsers
  })
)

// text-orientation
let prefixTextOrientation = require('caniuse-lite/data/features/css-text-orientation')

f(prefixTextOrientation, browsers =>
  prefix(['text-orientation'], {
    feature: 'css-text-orientation',
    browsers
  })
)

// print-color-adjust
let prefixPrintAdjust = require('caniuse-lite/data/features/css-print-color-adjust')

f(prefixPrintAdjust, browsers =>
  prefix(['print-color-adjust', 'color-adjust'], {
    feature: 'css-print-color-adjust',
    browsers
  })
)
