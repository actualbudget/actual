# Monte Carlo Analysis

<ExperimentalFeatureWarning />

## What Does This Report Do?

The Monte Carlo Analysis report helps you answer one of the biggest money questions there is: **"If I stop working and start living off my savings, will the money last?"**

Nobody knows what the stock market will do next year, let alone over the next 30 years. So instead of guessing once, this report guesses thousands of times. It replays your retirement over and over - 5,000 times by default - and in each replay the market has different luck: some replays hit a crash early on, some enjoy a long boom, most land somewhere in between.

At the end it tells you a simple, powerful number: **in what percentage of those replays did your money last as long as you needed it to?** If your plan survives in 85% of the replays, that's a much more honest answer than any single prediction could give you.

:::note
This report is a planning aid, not financial advice, and not a prediction. It can't know the future - it can only show you how your plan holds up across many possible futures.
:::

![The Monte Carlo Analysis report](/img/experimental/monte-carlo-analysis/monte-carlo-overview.png)

## Turning the Report On

Monte Carlo Analysis is an experimental feature, so it's switched off until you enable it:

1. Open **Settings** from the sidebar.
2. Click **Show advanced settings**.
3. Open **Experimental features** and acknowledge the warning.
4. Tick **Monte Carlo Analysis Report**.

## Adding the Report to Your Dashboard

1. Go to **Reports** in the sidebar.
2. Click **Add new widget** and choose **Monte Carlo analysis**.
3. A card appears on your dashboard showing your success rate and a small chart. Click the card to open the full report.
4. After changing any settings in the full report, click **Save widget** so your setup is remembered next time.

The report works immediately with sensible example numbers filled in, so you can explore how it behaves before entering your own figures.

## Setting Up Your Plan

The configuration area at the top of the report is organized into five tabs.

### Plan Details

![The Plan Details tab](/img/experimental/monte-carlo-analysis/monte-carlo-plan-details.png)

The tab is organized into three small groups - **Your plan**, **Inflation** and **Simulation**:

- **Your current age** and **Pot must last until age** - these two numbers define the period being tested. If you're 40 and want the money to last until you're 95, the report simulates 55 years.
- **Return model** - how the simulation invents each year's investment returns:
  - **Random (normal distribution)**: each year's return is drawn randomly around the expected return and volatility you set on each pot. Think of it as a weighted coin flip, year after year. Every pot lives through the same simulated market year - a good year is good for all your pots, scaled by each pot's volatility - so two pots holding the same investments earn the same return.
  - **Historical returns, shuffled**: instead of invented numbers, each simulated year is a real year from US market history (1928 onwards), picked in random order. Real crashes like 1931 and 2008 are in the deck.
  - **Historical sequences (replay)**: each replay is actual history, played in order from a different starting year - "what if you retired in 1929?", "what if you retired in 1972?", and so on. This is the strictest test of bad timing, because real crashes and recoveries happen in their true order.
- **Inflation - Mean (%)** - the average yearly rise in prices. When set, your planned spending grows with it so your spending power keeps up. Leave it blank to take exactly the same amount every year.
- **Inflation - Std dev (%)** - real-world inflation bounces around from year to year rather than staying fixed. When set, each simulated year draws its own inflation rate around the mean, separately in every replay. The default of 2% is roughly how much US inflation has varied in recent decades; set it to 0 to use the fixed mean rate every year.
- **Simulations** - how many replays to run (1,000 to 10,000). More replays give steadier numbers but take slightly longer. When using historical sequences, this field is disabled because there is exactly one replay per historical starting year.

### Investment Pots

![The Investment Pots tab](/img/experimental/monte-carlo-analysis/monte-carlo-pots.png)

A _pot_ is a chunk of invested money - a pension or retirement account, an investment account, a savings account. You can model one pot or several, each with its own settings:

- **Pot name** - anything you like, such as "Pension".
- **Starting balance** - how much is in the pot today. Enter it by hand, or use **Linked account** below to keep it up to date automatically.
- **Linked account** - link the pot to one of your accounts and its starting balance becomes that account's live balance, so the plan tracks reality without re-typing numbers. Typing a starting balance manually unlinks the pot and keeps your typed value - useful for what-if questions like "how big would this pot need to be?" - and you can re-link it any time with the picker.
- **Portfolio allocation** - a one-click preset that fills in a typical expected return and volatility for a given mix of stocks and bonds. A pot that's 100% stocks tends to grow faster but swings harder; a cash pot barely moves in either direction. You can always override the numbers, which switches the pot to **Custom**.
- **Expected return (%)** - the average yearly growth you expect from this pot, before inflation.
- **Volatility (std dev %)** - how much the returns swing from year to year. Two pots can have the same average return, but the one with higher volatility is riskier: bad early years can do damage that a smooth ride would avoid.
  Click the arrow at the start of a pot's row to expand its additional settings, organized into three groups:

- **Access - Accessible from age** - some pots can't be touched until a certain age; retirement accounts in many countries work this way. Leave this blank if the pot is available now. A locked pot stays invested and keeps growing - it just can't pay your bills until you reach the access age.
- **Tax - Tax (%)** (or **Taxable portion (%)** with the bands model) - how withdrawals from this pot are taxed; see [Tax](#tax) below. Leave at 0 for tax-free pots.
- **Fees** - what this pot costs you each year, charged at the end of every simulated year:
  - **Fixed yearly fee** - the sum of fixed costs like adviser or platform fees, as an amount. Tick **Adjust by inflation** if the fee will rise with prices over time (untick it for a contractually flat fee, which shrinks in real terms).
  - **Fee (% of balance)** - percentage charges like fund management fees, taken from the pot's end-of-year balance - e.g. 0.22 for a typical index fund platform.

Drag a pot's row to reorder the list - the order matters if you choose to drain pots one at a time (see [Spending](#spending) below).

:::tip
The access age setting is what lets the report model the classic "bridge gap": retiring at 48 with a big pension you can't open until 57, and a smaller pot that has to carry you across those nine years. If the bridge pot runs dry too soon, the plan fails - even though the pension money exists.
:::

### Contributions

![The Contributions tab](/img/experimental/monte-carlo-analysis/monte-carlo-contributions.png)

If you're still earning, you can model the money you add to your pots each year - pension deposits or brokerage savings, anything that tops up a pot on a regular basis. Each contribution has:

- **Contribution name** - anything you like, such as "Pension contributions".
- **Into pot** - the pot the money is paid into. A pot can receive any number of contributions, and contributions can go into a pot that is still locked for withdrawals - the access age only controls when money can come _out_.
- **From age** and **To age** - the years the contribution runs, inclusive at both ends. Leave **From age** blank to start now, and **To age** blank to keep contributing until the end of the plan.
- **Amount (per year)** - how much is added each year, in today's money. The money is paid in at the start of each year, so it earns that year's investment return.
- **Adjust by inflation** - tick this if the contribution will grow with prices over time (for example, a percentage of a salary that keeps pace with inflation). Untick it for a fixed amount, which buys a little less each year as prices rise.

Contributions pair naturally with a spending phase set to 0: while you're working, salary covers your costs and the plan only accumulates; from your retirement age, contributions stop and spending begins.

### Spending

![The Spending tab](/img/experimental/monte-carlo-analysis/monte-carlo-withdrawals.png)

- **Spending phases** - how much you take out each year to live on. You can keep it simple with a single phase, or split your plan into phases with different amounts - for example, $30,000 a year for your first 10 years of retirement while you're travelling, then $20,000 a year onwards. Each phase sets a yearly amount from a chosen age until the next phase begins; the first phase always starts now. Amounts are in today's money - the inflation settings on the Plan Details tab are applied on top, so "$20,000 from age 65" always means $20,000 of today's spending power.
- **Withdrawal order** - only matters if you have more than one pot:
  - **Split proportionally across pots**: each year's withdrawal is taken from all pots in proportion to their size, so they shrink together.
  - **Drain pots in order**: empty the first pot in your list before touching the next - for example, spend your taxable account first and let the pension keep compounding. Pots that haven't reached their access age are skipped until they unlock.
  - **Spend from the best performer first**: each year, the withdrawal comes from the pot that earned the highest return _last_ year. This is the classic "bucket strategy" instinct: after a stock crash, live off your cash and give the crashed pot time to recover; in a boom year, spend from stocks and leave the cash reserve alone. The first year (when there's no track record yet) uses your listed order, and locked pots are skipped here too.
  - **Keep pots at their target mix**: each pot's share of your starting balances becomes its target weight, and withdrawals come from whichever pots have grown above their target - most overweight first - pulling the portfolio back toward the mix you chose. This behaves like the best-performer option in booms and crashes (trim stocks after a good run, spend cash and bonds after a crash) but without slowly drifting your money into low-growth pots, because it always steers back to your chosen mix. If you want a permanent cash buffer, give the cash pot the share you want to maintain and this order will keep it topped up in spirit - by spending it only when it's above its target share.
- **Withdrawal rule** and **Minimum withdrawal** - see the next section.

The inflation settings that grow your spending over time live on the [Plan Details](#plan-details) tab.

### Tax

![The Tax tab](/img/experimental/monte-carlo-analysis/monte-carlo-tax.png)

Withdrawing money from a pension or a taxable account usually costs more than the amount you get to spend. The Tax tab lets the simulation account for that: **your yearly spending is always what you keep after tax**, and the simulation withdraws extra to cover the tax bill. Two models are available:

- **Flat rate per pot** (the default) - each pot gets one effective tax rate on its withdrawals, set in the pots table. A tax-free account is 0%. For a pension with a tax-free portion, blend it with your expected income tax rate - for example, 25% tax-free plus 20% tax on the rest works out around 15%. For a taxable investment account, estimate the effective rate on your typical withdrawal. This is deliberately simple and works for any country - you own the number.
- **Tax bands (progressive)** - enter your own tax brackets: yearly income thresholds and the rate above each one (your tax-free allowance is simply the first band at 0%). Each pot then declares its **Taxable portion (%)** - how much of a withdrawal counts as taxable income: a pension with a 25% tax-free lump portion is 75, a tax-free account is 0, and a taxable account is roughly the share of each withdrawal that is gains. The bands apply to each year's combined taxable withdrawals across all pots, and the thresholds are in today's money - they rise with inflation in the simulation.

With either model, the run drill-in shows each year's gross withdrawal with the tax paid underneath, so you can see exactly what your spending actually costs.

:::note
This is a deliberate approximation, not a tax calculator. It doesn't track capital-gains cost basis, model frozen thresholds, or know any country's actual rules - and tax law changes every year. Treat the rates and bands as your own honest estimates.
:::

## Withdrawal Rules Explained

By default, the simulation withdraws the same (inflation-adjusted) amount every year, no matter what the market does. Real retirees usually don't behave that way - in a bad stretch they tighten their belts, and in a good stretch they allow themselves a bit more. Withdrawal rules teach the simulation to do the same.

All the rules share a few ideas:

- Your **spending phases** set the planned amounts. From the second year onward, the rule adjusts what's actually taken - independently in every replay, reacting to how that replay is going. A cut or raise carries across phase boundaries: if the rule cut your spending by 10% during a rough patch, the next phase's amount starts 10% lower too.
- Rules usually improve your **success rate** by cutting spending in bad times, but that safety isn't free - you get it by living on less. Keep an eye on the **Median total withdrawn** stat to see what a rule costs you in income.
- Rules only see the wealth you can actually spend. If a pension is locked until its access age, it doesn't earn you spending raises while a bridge pot pays the bills - the rules watch the accessible pots, and the pension starts counting the moment it unlocks.

If you set a **Minimum withdrawal**, your yearly spending never drops below that amount, no matter what the rule says. It only applies in years you actually plan to spend - a spending phase set to 0 (for example, years before retirement while your salary covers your costs) takes nothing. Like your spending phases, it's an amount in today's money - it rises with inflation so its spending power holds steady.

### Guardrails (Guyton-Klinger)

Think of this as pay cuts and pay rises. The rule watches what percentage of your remaining money you're withdrawing each year. If your pots shrink so much that the percentage drifts well above where your plan says it should be, you take a pay cut (for example, 10% less). If your pots race ahead and the percentage falls well below it, you get a pay rise. You set how far the percentage must drift before the rule reacts, and how big the adjustment is. The drift is measured against your planned spending path, so moving into a deliberately higher or lower spending phase doesn't count as drift by itself - only market-driven changes do.

### Ratcheting (Kitces)

The optimist's rule: withdrawals only ever go **up**, never down. If your balance stays above a threshold (for example, 1.5 times what you started with) for several years in a row, you give yourself a raise. If markets fall, your spending simply stays where it is - the rule never cuts.

### Floor & Ceiling (Bengen)

Instead of a fixed amount, each year you withdraw a fixed **percentage of whatever the pots are currently worth** - so spending naturally falls in bad years and rises in good ones. To stop that swinging too wildly, the withdrawal is kept within a floor and a ceiling around your original (inflation-adjusted) amount.

### Boundaries

A simpler version of Guardrails: you set an upper and lower limit on the withdrawal percentage directly. Above the upper limit, spending is cut; below the lower limit, it's increased.

## Reading the Results

By default, every money figure in the results is shown in **today's money** - what the amounts would actually be worth in terms of today's prices, discounted by each replay's own inflation path. Untick **Show values in today's money** to see the raw future amounts instead; they'll look much bigger over long horizons, but most of that is inflation rather than real growth. The success rate and failure ages are the same either way.

### The Headline Numbers

![The results summary](/img/experimental/monte-carlo-analysis/monte-carlo-results.png)

- **Success rate** - the big number: the percentage of replays in which your money lasted the full time. There's no single "right" target, but many planners aim for 80–90%.
- **Median ending balance** - in the middle-of-the-road replay, how much was left at the end.
- **Median total withdrawn** - how much income the middle replay actually paid you over the whole period. Especially useful when comparing withdrawal rules.
- **Chance of running out of money** - the flip side of the success rate.
- **Typical failure runs out at** - among the replays that failed, the typical age the money ran out.

### The Portfolio Performance Chart

![The portfolio performance chart](/img/experimental/monte-carlo-analysis/monte-carlo-chart.png)

The chart shows your total balance from your current age to your target age - but instead of one line, it shows the whole range of futures at once:

- The **lighter band** covers 80% of all replays - at any age, 8 out of 10 replays landed inside it.
- The **darker band** covers the middle half of replays.
- The **line** is the median: half the replays did better, half did worse.

The dropdown above the chart switches views. **Single worst run** shows the one unluckiest replay in full. The **Worst-case**, **Pessimistic**, **Median** and **Optimistic** views each trace a single percentile - for example, the pessimistic line is the level that 70% of replays stayed above.

### When Did the Pot Run Out?

![The depletion histogram](/img/experimental/monte-carlo-analysis/monte-carlo-histogram.png)

This bar chart only counts the replays that failed, showing at which age they ran out. If 900 of 5,000 replays failed, these bars add up to 900 - the other 4,100 kept a positive balance the whole way and don't appear here.

### Exploring Individual Runs

![The simulation runs table](/img/experimental/monte-carlo-analysis/monte-carlo-runs.png)

Switch the results view from **Chart** to **Runs** to see every replay listed from worst outcome to best. Rather than paging through thousands of runs, use the **Jump to** dropdown to go straight to the worst, median or best run - or the 25th/75th percentile for a typically-bad or typically-good outcome - with the run highlighted so you can click into it. Click any run to walk through it year by year: the balance at the start of each year, the contributions paid in (when your plan has any), the withdrawal taken, the investment growth in that year (as money and as a percentage), and the balance at the end. Expand a year with the arrow at the start of its row (or use **Expand all years**) for the fully labeled breakdown: the withdrawal split into gross, tax and money to spend; the contributions added; the fees paid; and a small table showing each pot's balance at the start of the year, what was contributed into it, what it contributed to the withdrawal, how much of that counted as taxable income, the tax paid on its share, the fee it was charged that year, its return that year, and its ending balance - so you can watch, for example, the cash pot covering spending after a crash while the stock pots are left alone. With the tax-bands model, the per-pot tax is the year's tax bill shared out in proportion to each pot's taxable income.

![The simulation run table](/img/experimental/monte-carlo-analysis/monte-carlo-run.png)

Above the year-by-year table, a summary line totals the run: how much was withdrawn over the whole replay, how much of that went to tax, and how much was paid in fees on top.

If a run failed while money was still locked in an inaccessible pot, the table says so explicitly, so you can tell the difference between "the market ate my savings" and "the money existed but I couldn't reach it yet."

## Things to Keep in Mind

- **This is a model, not a prophecy.** A 90% success rate does not mean success is guaranteed - 1 in 10 of the simulated futures still failed.
- **The random model is simplified.** It draws each year independently, which ignores the way real crashes cluster together and the occasional extreme year. It also moves all pots in step - there's no independent luck per pot, so a bond-heavy pot dips a little in the same year a stock-heavy pot crashes. The historical models partly address the first point.
- **The historical data is US market data** (S&P 500 shares, US government bonds and bills, from 1928 onwards). US markets had an unusually good century, so results may be optimistic if your money is invested elsewhere.
- **Fees and taxes are approximations you control.** Each pot's fee settings model yearly costs explicitly - so enter expected returns _gross_ of those fees to avoid double-counting - and the [Tax](#tax) settings are effective-rate estimates, not a tax calculator.
- **Garbage in, garbage out.** The results are only as good as your estimates for returns, volatility, spending and inflation. Try a few variations - small changes to the withdrawal often move the success rate a lot.
