// https://peggyjs.org

expr
  = source _? group: group?
    { return { type: 'source', group: group } }
  / sink _? weight: weight? _? group: group?
    { return { type: 'sink', weight: +weight || 1, group: group } }

source = 'source'
sink = 'sink'

_ 'space' = ' '+
d 'digit' = [0-9]

weight 'weight' = weight: $(d+) { return +weight }
group 'Name' = $([^\r\n\t]+)