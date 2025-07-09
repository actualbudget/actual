// https://peggyjs.org

expr
  = template: template _ percentOf:percentOf category: name
    { return { type: 'percentage', percent: +percentOf.percent, previous: percentOf.prev, category, priority: template.priority, directive: template.directive }}
  / template: template _ amount: amount _ repeatEvery _ period: periodCount _ starting _ starting: date limit: limit?
    { return { type: 'periodic', amount, period, starting, limit, priority: template.priority, directive: template.directive }}
  / template: template _ amount: amount _ by _ month: month from: spendFrom? repeat: (_ repeatEvery _ repeat)?
    { return {
      type: from ? 'spend' : 'by',
      amount,
      month,
      ...(repeat ? repeat[3] : {}),
      from,
      priority: template.priority, directive: template.directive
    }}
  / template: template _ monthly: amount limit: limit?
    { return { type: 'simple', monthly, limit, priority: template.priority, directive: template.directive }}
  / template: template _ limit: limit
    { return { type: 'simple', monthly: null, limit, priority: template.priority, directive: template.directive }}
  / template: template _ schedule:schedule _ full:full? name:rawScheduleName modifiers:modifiers?
    { return { type: 'schedule', name: name.trim(), priority: template.priority, directive: template.directive, full, adjustment: modifiers?.adjustment }}
  / template: template _ remainder: remainder limit: limit?
    { return { type: 'remainder', priority: null, directive: template.directive, weight: remainder, limit }}
  / template: template _ 'average'i _ amount: positive _ 'months'i?
    { return { type: 'average', numMonths: +amount, priority: template.priority, directive: template.directive }}
  / template: template _ 'copy from'i _ lookBack: positive _ 'months ago'i limit:limit?
    { return { type: 'copy', priority: template.priority, directive: template.directive, lookBack: +lookBack, limit }}
  / goal: goal amount: amount { return {type: 'goal', amount: amount, priority: null, directive: goal }}

modifiers = _ '[' modifier:modifier ']' { return modifier }

modifier
  = op:('increase'i / 'decrease'i) _ value:percent { 
      const multiplier = op.toLowerCase() === 'increase' ? 1 : -1;
      return { adjustment: multiplier * +value }
    }

repeat 'repeat interval'
  = 'month'i { return { annual: false }}
  / months: positive _ 'months'i { return { annual: false, repeat: +months }}
  / 'year'i { return { annual: true }}
  / years: positive _ 'years'i { return { annual: true, repeat: +years }}

limit =  _? upTo _ amount: amount _ 'per week starting'i _ start:date _? hold:hold?
          { return {amount: amount, hold: hold, period: 'weekly', start: start }}
        / _? upTo _ amount: amount _ 'per day'i _? hold: hold?
          { return {amount: amount, hold: hold, period: 'daily', start:null }}
        / _? upTo _ amount: amount _? hold: hold?
          { return {amount: amount, hold: hold, period: 'monthly', start:null }}

percentOf = percent:percent _ of _ 'previous'i _ { return { percent: percent, prev: true}}
		/ percent:percent _ of _ { return { percent: percent, prev: false}}

periodCount = 'day'i { return {period: 'day', amount: 1 }}
           / n: number _ 'days'i _ { return { period: 'day', amount: +n }} 
           / week _ { return {period: 'week', amount: 1 }}
           / n: number _ weeks { return {period: 'week', amount: +n }}
           / n: number _ 'months'i _ {return {period: 'month', amount: +n }}
           / 'year'i _ { return {period: 'year', amount: 1 }}
           / n: number _ 'years'i _ { return { period: 'year', amount: +n }}

spendFrom = _ 'spend'i _ 'from'i _ month: month { return month }

week = 'week'i
weeks = 'weeks'i
by = 'by'i
of = 'of'i
repeatEvery = 'repeat'i _ 'every'i
starting = 'starting'i
upTo = 'up'i _ 'to'i
hold = 'hold'i {return true}
schedule = 'schedule'i { return text() }
full = 'full'i _ {return true}
priority = '-'i number: number {return number}
remainder = 'remainder'i _? weight: positive? { return +weight || 1 }
template = '#template' priority: priority? {return {priority: +priority, directive: 'template'}}
goal = '#goal'i { return 'goal'}

_ "whitespace" = [ \t]* { return text() }
__ "mandatory whitespace" = [ \t]+ { return text() }

d 'digit' = [0-9]
number 'number' = $(d+)
positive = $([1-9][0-9]*)
amount 'amount' = currencySymbol? _? amount: $('-'?d+ ('.' (d d?)?)?) { return +amount }
percent 'percentage' = percent: $(d+ ('.' (d+)?)?) _? '%' { return percent }
year 'year' = $(d d d d)
month 'month' = $(year '-' d d)
day 'day' = $(d d)
date = $(month '-' day)
currencySymbol 'currency symbol' = symbol: . & { return /\p{Sc}/u.test(symbol) }

// Match schedule name including spaces and brackets, but stop before percentage modifiers
rawScheduleName = $(
  (
    !('['('increase'i/'decrease'i)) // Don't start with [increase/decrease
    [^ \t\r\n]                     // First character can't be whitespace
    (
      !(_ '['('increase'i/'decrease'i)) // Don't match if followed by [increase/decrease modifier
      [^\r\n]                       // Any character except newlines
    )*
  )
) { return text().trim() }

name 'Name' = $([^\r\n\t]+) { return text() }