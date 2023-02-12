// https://pegjs.org

expr
  = percent: percent _ of _ category: $([^\n] *)
    { return { type: 'percentage', percent: +percent, category } }
  / amount: amount _ repeatEvery _ weeks: weekCount _ starting _ starting: date limit: limit?
    { return { type: 'week', amount, weeks, starting, limit } }
  / amount: amount _ by _ month: month from: spendFrom? repeat: (_ repeatEvery _ repeat)?
    { return {
      type: from ? 'spend' : 'by',
      amount,
      month,
      ...(repeat ? repeat[3] : {}),
      from
    } }
  / monthly: amount limit: limit?
    { return { type: 'simple', monthly, limit } }
  / upTo _ limit: amount
    { return { type: 'simple', limit } }

repeat 'repeat interval'
  = 'month' { return { annual: false } }
  / months: d _ 'months' { return { annual: false, repeat: +months } }
  / 'year' { return { annual: true } }
  / years: d _ 'years' { return { annual: true, repeat: +years } }

limit = _ upTo? _ amount: amount { return amount }

weekCount
  = week { return null }
  / n: number _ weeks { return +n }

spendFrom = _ 'spend' _ 'from' _ month: month { return month }

week = 'week'
weeks = 'weeks'
by = 'by'
of = 'of'
repeatEvery = 'repeat' _ 'every'
starting = 'starting'
upTo = 'up' _ 'to'

_ 'space' = ' '+
d 'digit' = [0-9]
number 'number' = $(d+)
amount 'amount' = currencySymbol? _? amount: $(d+ ('.' d d)?) { return +amount }
percent 'percentage' = percent: $(d+) _? '%' { return +percent }
year 'year' = $(d d d d)
month 'month' = $(year '-' d d)
day 'day' = $(d d)
date = $(month '-' day)
currencySymbol 'currency symbol' = symbol: . & { return /\p{Sc}/u.test(symbol) }
