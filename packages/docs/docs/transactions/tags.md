# Tags

Transactions can be easily flagged and identified in the account register by tagging them in their notes.
An example would be to tag all transactions for a trip with `#Vacation2025`

## Syntax

- A tag is a string of any characters (except `#` and whitespaces) prefixed by the `#` symbol; it can be added anywhere within the _Notes_ field of a transaction.
- Tags cannot contain whitespaces (spaces, tabs, etc.). Use `#camelText`, `#dashed-entries` or `#underscored_separators` instead.
- It is possible to have multiple tags for a single transaction.
- Tags are case-sensitive, meaning that `#tag` and `#TAG` are different.
- To use the `#` symbol in the _Notes_ field without tagging, you can escape it by inputting it twice: `##do-not-tag-this`.

![Tagging a transaction](/img/tags/input.webp)

![Tagged transaction](/img/tags/input-result.webp)

## Filter Transactions

To view transactions with a given tag, you can:

- Use the _View Transactions_ button in the Tag management page, in the sidebar.
- Click on a colored tag in the account register.
- Use the `has tags` filter on the _Notes_ field:

![Tag based filter of transactions](/img/tags/filter.webp)

## Manage Tags

![Tag management page](/img/tags/manage.webp)

The Tag management page can be found in the sidebar under _More_. Here you can perform the following actions:

- Change the color. Tags use a default color defined in the theme. Change the color of any tag by clicking on the tag to bring up a color picker.
- **Add New** tags. Do not include the `#` prefix when adding tags here; it will be added automatically. If the tag already exists, this will update its color.
- **Find Existing Tags** searches for tags already used within transactions and adds them to the list of managed tags.
- Add a description by clicking in the description field.
- **View Transactions** which use a given tag.
- Use the context menu (right-click menu) to delete a tag from this page. It will **not** delete the tag from the transaction notes.
