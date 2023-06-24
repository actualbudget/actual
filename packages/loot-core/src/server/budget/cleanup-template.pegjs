// https://peggyjs.org

expr
  = source
    { return { type: 'source' } }
  / sink _? weight: weight?
    { return { type: 'sink', weight: +weight || 1 } }

source = 'source'
sink = 'sink'

_ 'space' = ' '+
d 'digit' = [0-9]

weight 'weight' = weight: $(d+) { return +weight }