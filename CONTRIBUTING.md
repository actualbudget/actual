Actual was _just_ open-sourced so the contributing model isn't fully fleshed out yet.

## Expectations

Personally, I would like to see an ecosystem of minor forks that make small changes to Actual and continually rebase on the latest version. Unlike what some people think, forks are a healthy sign of a community in my opinion.

We aren't going to take every single little change. Don't be offended if we close your PR. In order for the project to stay healthy, we need to guard our bandwidth and also only take changes that align with Actual.

Please ask first before making a large change; you might waste a lot of work if it doesn't align with how Actual should work.

Here are some initial guidelines for how contributions will be treated:

* The mental health of the maintainers will be prioritized above all else. If this means some things get lost and PRs are unreviewed because maintainers are spending time with family or on themselves, we celebrate that.

* Multiple maintainers are key to this being a healthy project. Currently, only I (@jlongster) have maintainer rights. I am actively looking for more people to come on as maintainers. If nobody steps up, expect less activity on this project.

* An open PR does not automatically deserve time for a full review and acceptance. It's up to the PR author to convince the maintainers that the change is good and worth reviewing. This involves a clear description for why the the change is being made, detailing the tradeoffs, and ideally a link to a live demo where Actual is running with the changes. (Ideally, we would automatically generate a live demo)

* We especially welcome improvements in automation: creating github actions to automatically generate builds, making the release process easier, etc.


## Main contributors

* @jlongster

## Project ideas

The code needs a lot of improvements. When it was just me (@jlongster) I would often find myself halfway through an improvement overall, but always had to put it aside to work on something else. This shows in the code; there's a lot of things that I wanted to improve but was never able to complete. These are list of projects on the top of my mind that I would love to see progress on.

### Rewriting the transaction table

The transaction table is a very complex component because of all the interactions. The original goal was to embrace inline editing fully and never pull the user out into something like a modal or a drawer. I like how this worked out for some workflows, but it made other workflows plain awkward.

For example, splitting a transaction. Currently, it all happens inline which means the user could be in the middle of splitting a transaction and navigate somewhere else. The transaction needs to support that middle state where the subtractions don't equal the parent transaction amount. Currently, we show a little "error" popup near the transacton when it's in this state.

This is a very awkward flow, and it would actually be better to pop the user into a modal state to split a transaction. I would still want to _display_ the split transaction inline, and even edit the categories of them, but for editing the amount the user should work on them in a modal/drawer/etc.

The code for the transaction table originates from a time when React hooks were very new. If I had to do it all over, I'd avoid hooks entirely and look into better ways to manage state. **The performance of the table is crucial** and React hooks with complicated interaction actively make it difficult for this to work. The code is convoluted for a single purpose: only a single row should ever render when something changes.

I'm proud of the fact that you can scroll down the transactions list incredibly fast. You can even hold down "enter" to move the editing cell downward and it'll scroll down the list to keep the edited cell in view. But this came at a cost: the code needs to be more maintainble.

I'm not sure what the solution is yet. Maybe it's using a 3rd party library like [react-table](https://react-table.tanstack.com). To be honest, I'm quite skeptical of 3rd party library performance-wise, but it's worth looking into. That would also make it easy to support hiding/showing columns and other advanced features.

### Ditching babel

A huge pain point in development is using babel. The way it interacts with other tooling and requires a billion dependencies make it fucking annoying to work with (sorry, I'm drinking bourbon at this point). Updating Jest requires fiddling with versions of babel in the `yarn.lock` file until it works. I'm freaking over it.

We should switch to [swc](https://swc.rs). That would also have another benefit: it's **blazingly** fast. Like 100x faster. So it's also make development way way faster.

### Adopt an existing component library

One of my mistakes with Actual was rebuilding everything from scratch, even the design system. While I was able to make it look good for the current version of Actual, it makes it a lot of work to build new designs. We should choose a 3rd party library and start using it in Actual. It would make it way faster to build new designs.

There aren't many good 3rd party library unfortunately. API, accessibility, and general thoughtful-ness are important. The two that come to my mind are [Radix](https://www.radix-ui.com) and [react-aria](https://react-spectrum.adobe.com/react-aria/). I'm leaning towards react-aria.

I'm open to other things, but we really need something to take the weight off of building UI.

### Enriching the budget page

This is more of a feature, but if someone (preferrably with design experience) wants to dig into the budget page and figure out how to make it more extensible, that'd be great. I always wanted to show more data on that page but never had time to design something good. The multi-month view makes it hard, but maybe if there's only a single month showing we could show additional data beside it.

This also might require the ability to "select" a category so we can show data specific to that category.

### Custom reports

This is a big one. I'm very sad I never had time to see this through. I would love to see experiments to how better reports should work, particularly custom reports. Actually letting the user write some SQL or AQL code and visualizing it somehow. This is something I'll probably still play with.
