# Tags

Transactions can be easily flagged and identified in the table by tagging them through their notes.
An example would be to tag all transactions for a trip with a tag like `#Vacation2025`

## Syntax

A tag is a string of any characters (except `#`) prefixed by the `#` symbol; it can be added anywhere within the _Notes_ field of a transaction.
It is possible to have multiple tags for a single transaction.
Tags are case-sensitive, meaning that `#tag` and `#TAG` are different.
To use the `#` symbol in the _Notes_ field without tagging, you can escape it by inputting it twice: `##do-not-tag-this`.

![Tagging a transaction](/img/tags/input.webp)

![Tagged transaction](/img/tags/input-result.webp)

## Filter Transactions

To view transactions with a given tag, you can either:

- Click on the colored tag in the transactions table.
- Use the `has tags` filter on the _Notes_ field:

![Tag based filter of transactions](/img/tags/filter.webp)

## Manage Tags

By default, tags use the purple brand color of Actual.
If you use a lot of tags, it can be helpful to customize the color of the tags. You can configure this through the dedicated _Tags_ page, located in the sidebar.

![Tag management page](/img/tags/manage.webp)

On the Tag management page, you can perform the following actions:

- **Add New** tags. It doesn't matter whether any transactions with this tag already exist or not.
- **Find Existing Tags**, searches for tags already used within transactions and adds them to the list of managed tags.
- Change the color of any tag and/or add a description.
- **View Transactions** which use a given tag.
