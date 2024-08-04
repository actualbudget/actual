// https://peggyjs.org

expr
  = template: template _ percentOf:percentOf category: name
    { return { type: 'percentage', percent: +percentOf.percent, previous: percentOf.prev, category, priority: template.priority, directive: template.directive }}
  / template: template _ amount: amount _ repeatEvery _ weeks: weekCount _ starting _ starting: date limit: limit?
    { return { type: 'week', amount, weeks, starting, limit, priority: template.priority, directive: template.directive }}
  / template: template _ amount: amount _ by _ month: month from: spendFrom? repeat: (_ repeatEvery _ repeat)?
    { return {
      type: from ? 'spend' : 'by',
      amount,
      month,
      ...(repeat ? repeat[3] : {}),
      from,
      priority: template.priority, directive: template.directive
    } }
  / template: template _ monthly: amount limit: limit?
    { return { type: 'simple', monthly, limit, priority: template.priority, directive: template.directive } }
  / template: template _ limit: limit
    { return { type: 'simple', limit , priority: template.priority, directive: template.directive } }
  / template: template _ schedule _ full:full? name: name
    { return { type: 'schedule', name, priority: template.priority, directive: template.directive, full } }
  / template: template _ remainder: remainder limit: limit?
    { return { type: 'remainder', priority: null, directive: template.directive, weight: remainder, limit } }
  / template: template _ 'average'i _ amount: positive _ 'months'i?
    { return { type: 'average', amount: +amount, priority: template.priority, directive: template.directive }}
  / goal: goal amount: amount { return {type: 'simple', amount: amount, priority: null, directive: 'goal' }}


repeat 'repeat interval'
  = 'month'i { return { annual: false } }
  / months: positive _ 'months'i { return { annual: false, repeat: +months } }
  / 'year'i { return { annual: true } }
  / years: positive _ 'years'i { return { annual: true, repeat: +years } }

limit =  _? upTo _ amount: amount _ 'hold'i { return {amount: amount, hold: true } }
        / _? upTo _ amount: amount { return {amount: amount, hold: false } }

percentOf = percent:percent _ of _ 'previous'i _ { return { percent: percent, prev: true} }
		/ percent:percent _ of _ { return { percent: percent, prev: false} }

weekCount
  = week { return null }
  / n: number _ weeks { return +n }

spendFrom = _ 'spend'i _ 'from'i _ month: month { return month }

week = 'week'i
weeks = 'weeks'i
by = 'by'i
of = 'of'i
repeatEvery = 'repeat'i _ 'every'i
starting = 'starting'i
upTo = 'up'i _ 'to'i
schedule = 'schedule'i
full = 'full'i _ {return true}
priority = '-'i number: number {return number}
remainder = 'remainder'i _? weight: positive? { return +weight || 1 }
template = '#template' priority: priority? {return {priority: +priority, directive: 'template'}}
goal = '#goal'

_ 'space' = ' '+
d 'digit' = [0-9]
number 'number' = $(d+)
positive = $([1-9][0-9]*)
amount 'amount' = currencySymbol? _? amount: $(d+ ('.' (d d?)?)?) { return +amount }
percent 'percentage' = percent: $(d+ ('.' (d+)?)?) _? '%' { return +percent }
year 'year' = $(d d d d)
month 'month' = $(year '-' d d)
day 'day' = $(d d)
date = $(month '-' day)
currencySymbol 'currency symbol' = symbol: . & { return /\p{Sc}/u.test(symbol) }

name 'Name' = $([^\r\n\t]+)

