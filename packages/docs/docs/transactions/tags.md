# Tags

Transactions can be easily flagged and identified in the account register by tagging them in their notes.
An example would be to tag all transactions for a trip with `#Vacation2025`

## Syntax

- A tag is a string of any characters (except `#` and whitespaces) prefixed by the `#` symbol; it can be added anywhere within the _Notes_ field of a transaction.
- Tags cannot contain whitespaces (spaces, tabs, etc.). Use `#camelText`, `#dashed-entries` or `#underscored_separators` instead.
- It is possible to have multiple tags for a single transaction.
- Tags are case-sensitive, meaning that `#tag` and `#TAG` are different.
- To use the `#` symbol in the _Notes_ field without tagging, you can escape it by inputting it twice: `##do-not-tag-this`.

<img width="860" alt="Typing #Vac in a transaction's notes, with the #Vacation2025 tag suggested" src="/img/transactions/tags-input@2x.webp" />

<img width="860" alt="Two transactions whose notes show the #Vacation2025 tag" src="/img/transactions/tags-input-result@2x.webp" />

## Filter Transactions

To view transactions with a given tag, you can:

- Use the _View Transactions_ button in the Tag management page.
- Click on a colored tag in the account register.
- Use the `has all tags` or `has any tag` filter on the _Notes_ field:

<img width="299" alt="A Notes filter using has any tag with #Vacation2025 chosen" src="/img/transactions/tags-filter@2x.webp" />

## Manage Tags

![The Tags page in Settings](/img/transactions/tags-manage@2x.webp)

The Tag management page can be found under _Settings_ > _Tags_. Here you can perform the following actions:

- Change the color. Tags use a default color defined in the theme. Change the color of any tag by clicking on the tag to bring up a color picker.
- **Add New** tags. Do not include the `#` prefix when adding tags here; it will be added automatically. If the tag already exists, this will update its color.
- **Discover new tags**, in the menu at the top right, searches for tags already used within transactions and adds them to the list of managed tags.
- Add a description by clicking in the description field.
- **View Transactions** which use a given tag.
- **Rename** a tag from the context menu (right-click menu), or from the selection menu when exactly one tag is selected. Renaming also rewrites the hashtag in every transaction note that uses it. Tag names cannot contain spaces or `#`, and cannot match an existing tag.
- Use the context menu (right-click menu) to delete a tag from this page. It will **not** delete the tag from the transaction notes.
