// https://peggyjs.org

expr
  = template: template _ percentOf:percentOf category: name starting: startingDate? until:until?
    { return { type: 'percentage', percent: +percentOf.percent, previous: percentOf.prev, category, starting, until, priority: template.priority, directive: template.directive }}
  / template: template _ amount: amount _ repeatEvery _ period: periodCount _ starting: startingDate limit: limit? until: until?
    { return {
      type: 'periodic',
      amount,
      period,
      // Wenn repeat every week/day und starting ist YYYY-MM (7 Zeichen), ergänze -01
      starting: (period.period === 'week' || period.period === 'day') && starting?.length === 7 ? starting + '-01' : starting,
      limit,
      until,
      priority: template.priority,
      directive: template.directive
    }}
  / template: template _ amount: amount _ by _ month: month from: spendFrom? repeat: (_ repeatEvery _ repeat)? starting: startingDate? until: until?
    { return {
      type: from ? 'spend' : 'by',
      amount,
      month,
      ...(repeat ? repeat[3] : {}),
      from,
      starting,
      until,
      priority: template.priority, directive: template.directive
    }}
  / template: template _ monthly: amount limit: limit? starting: startingDate? until: until?
    { return { type: 'simple', monthly, limit, starting, until, priority: template.priority, directive: template.directive }}
  / template: template _ limit: limit starting: startingDate? until: until?
    { return { type: 'simple', monthly: null, limit, starting, until, priority: template.priority, directive: template.directive }}
  / template: template _ schedule:schedule _ full:full? name:rawScheduleName modifiers:modifiers? starting: startingDate? until: until?
    { return { type: 'schedule', name: name.trim(), priority: template.priority, directive: template.directive, full, adjustment: modifiers?.adjustment, adjustmentType: modifiers?.adjustmentType, starting, until  }}
  / template: template _ remainder: remainder limit: limit? starting: startingDate? until: until?
    { return { type: 'remainder', priority: null, directive: template.directive, weight: remainder, limit, starting, until }}
  / template: template _ 'average'i _ amount: positive _ 'months'i? modifiers:modifiers? starting: startingDate? until: until?
    { return { type: 'average', numMonths: +amount, priority: template.priority, directive: template.directive, adjustment: modifiers?.adjustment, adjustmentType: modifiers?.adjustmentType, starting, until  }}
  / template: template _ 'copy from'i _ lookBack: positive _ 'months ago'i limit:limit? starting: startingDate? until: until?
    { return { type: 'copy', priority: template.priority, directive: template.directive, lookBack: +lookBack, limit, starting, until }}
  / goal: goal amount: amount { return {type: 'goal', amount: amount, priority: null, directive: goal }}

modifiers = _ '[' modifier:modifier ']' { return modifier }

modifier
  = op:('increase'i / 'decrease'i) _ value:percentOrNumber {
      const multiplier = op.toLowerCase() === 'increase' ? 1 : -1;
      return { adjustment: multiplier * +value.value, adjustmentType: value.type }
    }

percentOrNumber
  = value:$(d+ ('.' (d+)?)?) _? '%' { return { value: value, type: 'percent' } }
  / value:$(d+ ('.' (d+)?)?) { return { value: value, type: 'fixed' } }

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
startingDate = _ 'starting'i _ val: $(year '-' d d ('-' d d)?) { return val }
upTo = 'up'i _ 'to'i
hold = 'hold'i {return true}
until = _ 'until'i _ val: $(year '-' d d ('-' d d)?) { return val }
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
// Also stop before 'starting' and 'until' keywords
rawScheduleName = $(
  (
    !('['('increase'i/'decrease'i))
    !(__ 'starting'i (__ / !.))
    !(__ 'until'i (__ / !.))
    [^ \t\r\n]
    (
      !(_ '['('increase'i/'decrease'i))
      !(__ 'starting'i (__ / !.))
      !(__ 'until'i (__ / !.))
      [^\r\n]
    )*
  )
) { return text().trim() }

// Match name but stop before 'starting' and 'until' keywords
name 'Name' = $(
  (
    !('starting'i _)
    !('until'i _)
    [^\r\n\t]
  )+
) { return text().trim() }