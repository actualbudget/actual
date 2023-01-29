// https://peggyjs.org

expr
  = percent: $d+ '%' _ of _ category: $([^\n] *)
    { return { type: 'percentage', percent: +percent, category } }
  / amount: amount _ repeatEvery _ weeks: weeks _ starting _ starting: day limit: limit?
    { return { type: 'week', amount, weeks, starting, limit } }
  / amount: amount _ by _ month: month from: spendFrom? repeat: (_ repeatEvery _ @repeat)?
    { return {
      type: (from ? 'spend' : 'by') + (repeat ? repeat.type : ''),
      amount,
      month,
      repeat: repeat && repeat.repeat,
      from
    } }
  / monthly: amount limit: limit?
    { return { type: 'simple', monthly, limit } }
  / upTo _ limit: amount
    { return { type: 'simple', limit } }

repeat 'repeat interval'
  = 'month' { return { type: '' } }
  / months: d _ 'months' { return { type: '', repeat: +months } }
  / 'year' { return { type: '_annual' } }
  / years: d _ 'years' { return { type: '_annual', repeat: +years } }

limit = _ upTo? _ @amount

weeks 'number of weeks'
  = 'week' { return null }
  / n: d+ _ 'weeks' { return +n }

spendFrom = _ 'spend' _ 'from' _ @month

by "'by'" = 'by'
of "'of'" = 'of'
repeatEvery "'repeat every'" = 'repeat' _ 'every'
starting "'starting'" = 'starting'
upTo "'up to'" = 'up' _ 'to'

_ 'space' = ' '+
d 'digit' = [0-9]
amount 'amount' = '$'? amount: $(d+ ('.' d d)?) { return +amount }
percent 'percentage' = percent: $(d+) '%' { return +percent }
year 'year' = $(d d d d)
month 'month' = $(year '-' d d)
day 'date' = $(month '-' d d)
currencySymbol 'currency symbol' = . & { return /\p{Sc}/u.test(_) }
