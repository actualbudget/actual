let Declaration = require('../declaration')
let {
  parseGridAreas,
  warnMissedAreas,
  prefixTrackProp,
  prefixTrackValue,
  getGridGap,
  warnGridGap,
  inheritGridGap
} = require('./grid-utils')

function getGridRows(tpl) {
  return tpl
    .trim()
    .slice(1, -1)
    .split(/["']\s*["']?/g)
}

class GridTemplateAreas extends Declaration {
  /**
   * Translate grid-template-areas to separate -ms- prefixed properties
   */
  insert(decl, prefix, prefixes, result) {
    if (prefix !== '-ms-') return super.insert(decl, prefix, prefixes)

    let hasColumns = false
    let hasRows = false
    let parent = decl.parent
    let gap = getGridGap(decl)
    gap = inheritGridGap(decl, gap) || gap

    // remove already prefixed rows
    // to prevent doubling prefixes
    parent.walkDecls(/-ms-grid-rows/, i => i.remove())

    // add empty tracks to rows
    parent.walkDecls(/grid-template-(rows|columns)/, trackDecl => {
      if (trackDecl.prop === 'grid-template-rows') {
        hasRows = true
        let { prop, value } = trackDecl
        trackDecl.cloneBefore({
          prop: prefixTrackProp({ prop, prefix }),
          value: prefixTrackValue({ value, gap: gap.row })
        })
      } else {
        hasColumns = true
      }
    })

    let gridRows = getGridRows(decl.value)

    if (hasColumns && !hasRows && gap.row && gridRows.length > 1) {
      decl.cloneBefore({
        prop: '-ms-grid-rows',
        value: prefixTrackValue({
          value: `repeat(${gridRows.length}, auto)`,
          gap: gap.row
        }),
        raws: {}
      })
    }

    // warnings
    warnGridGap({
      gap,
      hasColumns,
      decl,
      result
    })

    let areas = parseGridAreas({
      rows: gridRows,
      gap
    })

    warnMissedAreas(areas, decl, result)

    return decl
  }
}

GridTemplateAreas.names = ['grid-template-areas']

module.exports = GridTemplateAreas
