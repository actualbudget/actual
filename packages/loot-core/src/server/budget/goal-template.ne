@builtin "whitespace.ne"

Expression -> (SimpleExpression | SpendByExpression | PercentageExpression | WeeksExpression)
  {% ([[expr]]) => expr %}

@{%
const str = arr => arr.flat(Infinity).map(s => s || "").join("")
const num = arr => +str(arr)
%}

SimpleExpression ->
    Limit {% ([limit]) => ({ type: 'simple', limit }) %}
  | Amount (__ Limit):? {% ([monthly, limit]) => ({type: 'simple', monthly, limit: limit?.[1] }) %}

SpendByExpression ->
  Amount __ by __ Month (__ spend_from __ Month):? (__ repeat_every __ RepeatInterval):?
  {% ([amount, , , , month, from, repeat]) => ({
    type: from?.[3] ? "spend" : "by",
    amount,
    month,
    from: from?.[3],
    ...(repeat?.[3] ?? {})
  }) %}

RepeatInterval ->
    "month"i             {% () => ({ annual: false }) %}
  | Digit:+ __ "months"i {% ([months]) => ({ annual: false, repeat: num(months) }) %}
  | "year"i              {% () => ({ annual: true }) %}
  | Digit:+ __ "years"i  {% ([years]) => ({ annual: true, repeat: num(years) }) %}

WeeksExpression ->
  Amount __ repeat_every __ NumberOfWeeks __ starting __ Day (__ Limit):?
  {% ([amount, , , , weeks, , , , starting, limit]) => ({ type: 'week', amount, weeks, starting, limit: limit?.[1] }) %}

NumberOfWeeks ->
    "week"i             {% () => null %}
  | Digit:+ __ "weeks"i {% ([weeks]) => num(weeks) %}

PercentageExpression ->
  Percent __ of __ .:*
  {% ([percent, , , , category]) => ({ type: "percentage", percent, category: str(category) }) %}

# Numbers

Limit -> up_to __ Amount {% ([, , limit]) => limit %}

Amount -> ("$" _):? Digit:+ ("." Digit Digit):?
  {% (d) => +str(d.slice(1)) %}

Percent -> Digit:+ _ "%"
  {% (d) => +str(d[0]) %}

# Words
by -> "by"i
of -> "of"i
repeat_every -> "repeat"i __ "every"i
starting -> "starting"i
up_to -> "up"i __ "to"i
spend_from -> "spend"i __ "from"i

# Dates
Year -> Digit Digit Digit Digit {% str %}
Month -> Year "-" Digit Digit  {% str %}
Day -> Month "-" Digit Digit {% str %}

# Basic Types
Digit -> [0-9] {% str %}
