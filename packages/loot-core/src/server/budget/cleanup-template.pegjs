// https://peggyjs.org

expr
  = source
  	{ return { group: null, type: 'source' }}
    /
  sink _? weight: weight?
    	{ return { type: 'sink', weight: +weight || 1, group: null } }
  /
  group: sourcegroup _? source
    	{return {group: group || null, type: 'source'}} 
    /
   	group: sinkgroup? _? sink _? weight: weight? 
    	{ return { type: 'sink', weight: +weight || 1, group: group || null } }
    /
    group: sourcegroup
    	{return {group: group, type: null}}

source = 'source'
sink = 'sink'

_ 'space' = ' '+
d 'digit' = [0-9]

weight 'weight' = weight: $(d+) { return +weight }
sourcegroup 'Name'= $(string:(!" source" .)*)
sinkgroup 'Name' = $(string:(!" sink" .)*)
