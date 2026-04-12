# Tags

Transactions can be easily flagged and identified in the account register by tagging them in their notes.
An example would be to tag all transactions for a trip with `#Vacation2025`

## Syntax

- A tag is a string of any characters (except `#`) prefixed by the `#` symbol; it can be added anywhere within the _Notes_ field of a transaction.
- It is possible to have multiple tags for a single transaction.
- Tags are case-sensitive, meaning that `#tag` and `#TAG` are different. 
- Tags cannot contain a space as you can see in the screenshots below. Use `#camelText`, `#dashed-entries` or `#underscored_separators` instead of spaces in tags.
- To use the `#` symbol in the _Notes_ field without tagging, you can escape it by inputting it twice: `##do-not-tag-this`.

![Tagging a transaction](/img/tags/input.webp)

![Tagged transaction](/img/tags/input-result.webp)

## Filter Transactions

To view transactions with a given tag, you can either:

- Click on a colored tag in the Account register.
- Use the `has tags` filter on the _Notes_ field:

![Tag based filter of transactions](/img/tags/filter.webp)

## Manage Tags

Tags use a default color defined in the theme. If you use a lot of tags, it can be helpful to customize the color of the tags. You can configure this through the _Tags_ management page, located in the sidebar.

![Tag management page](/img/tags/manage.webp)

On the Tag management page, you can perform the following actions:

- **Add New** tags. Do not enter the `#` when adding tags here, it will be added for you. If the tag already exists, the new color will be reflected in the existing tags.
- **Find Existing Tags**, searches for tags already used within transactions and adds them to the list of managed tags.
- Change the color of any tag and/or add a description.
- **View Transactions** which use a given tag.
- Use the context menu (right-click menu) to delete a tag from this page. It will **not** delete the tag from the transaction notes.
