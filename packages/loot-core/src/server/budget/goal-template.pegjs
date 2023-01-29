// https://pegjs.org

expr
  = percent: $d+ '%' _ of _ category: $([^\n] *)
    { return { type: 'percentage', percent: +percent, category } }
  / amount: amount _ repeatEvery _ weeks: weeks _ starting _ starting: day limit: limit?
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

weeks 'number of weeks'
  = 'week' { return null }
  / n: d+ _ 'weeks' { return +n }

spendFrom = _ 'spend' _ 'from' _ month: month { return month }

by "'by'" = 'by'
of "'of'" = 'of'
repeatEvery "'repeat every'" = 'repeat' _ 'every'
starting "'starting'" = 'starting'
upTo "'up to'" = 'up' _ 'to'

_ 'space' = ' '+
d 'digit' = [0-9]
amount 'amount' = currencySymbol? amount: $(d+ ('.' d d)?) { return +amount }
percent 'percentage' = percent: $(d+) '%' { return +percent }
year 'year' = $(d d d d)
month 'month' = $(year '-' d d)
day 'date' = $(month '-' d d)
currencySymbol 'currency symbol' = . & { return /\p{Sc}/u.test(_) }
