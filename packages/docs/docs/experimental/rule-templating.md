# Rule Action Templating

:::warning
This is an **experimental feature**. That means we're still working on finishing it. There may be bugs, missing functionality or incomplete documentation, and we may decide to remove the feature in a future release. If you have any feedback, please [open an issue](https://github.com/actualbudget/actual/issues) or post a message in the Discord.
:::
:::warning
All functionality described here may not be available in the latest stable release. See [Experimental Features](/docs/experimental/) for instructions to enable experimental features. Use the `edge` images for the latest implementation.
:::

Rule action templating allows rules to dynamically set fields based on transaction data via meta programming inside the rule.

Setting the following fields with a rule template is currently supported:

- notes
- date
- amount
- payee (name)
- cleared (although no boolean helper functions are currently supported)

Actual uses [handlebars](https://handlebarsjs.com/) under the hood to process the rule templates. You can find more in depth information about how this works in [their guide](https://handlebarsjs.com/guide).

## Using rule action templating

You can toggle between the normal and template input modes by clicking the icon to the right of the action input box.

![How to enable rule action templating](/img/experimental/rule-templating/enable-rule-templating.webp)

When the template input mode is active you can type your template into the input box as below. This example removes the string " 12345" from an imported payee and sets the payee to this new value.

![How to enable rule action templating 2](/img/experimental/rule-templating/enable-rule-templating-2.webp)

## Variables

| Variable              | Type    | Notes                                                                                                             |
| --------------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| today                 | date    | Today's date                                                                                                      |
| account               | id      |                                                                                                                   |
| balance               | number  | Balance of account as of the date of the transaction, excluding the transaction amount, stored without decimal    |
| date                  | date    |                                                                                                                   |
| payee                 | id      |                                                                                                                   |
| payee_name            | string  |                                                                                                                   |
| imported_payee        | string  |                                                                                                                   |
| notes                 | string  |                                                                                                                   |
| amount                | number  | This is stored without the decimal place. ie. 152 will be 15200. `{{div amount 100}}` can be used to convert back |
| cleared               | boolean |                                                                                                                   |
| reconciled            | boolean |                                                                                                                   |
| imported_id           | id      | ID of the transaction provided from an import source (eg. bank sync/QFX)                                          |
| is_child              | boolean | Flag for children in a split transaction                                                                          |
| is_parent             | boolean | Flag for the parent of a split transaction                                                                        |
| parent_id             | id      | Set if is_child = true                                                                                            |
| schedule              | id      |                                                                                                                   |
| starting_balance_flag | boolean | Set if the transaction is a starting balance transaction                                                          |
| transfer_id           | id      |                                                                                                                   |

## Functions

### Mathematical

| Function | Arguments           | Notes |
| -------- | ------------------- | ----- |
| add      | number1, number2... |       |
| sub      | number1, number2... |       |
| div      | number1, number2... |       |
| mul      | number1, number2... |       |
| mod      | number1, number2... |       |
| floor    | number              |       |
| ceil     | number              |       |
| round    | number              |       |
| abs      | number              |       |
| min      | number1, number2... |       |
| max      | number1, number2... |       |
| fixed    | number1, number2... |       |

### Text

| Function   | Arguments                   | Notes                                                                                                        |
| ---------- | --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| regex      | value, regex, replacement   |                                                                                                              |
| replace    | value, pattern, replacement | Mimics js replace. When pattern is not as /regex/flags it just uses raw value as opposed to `{{regex ...`    |
| replaceAll | value, pattern, replacement | Mimics js replaceAll. When pattern is not as /regex/flags it just uses raw value as opposed to `{{regex ...` |
| concat     | values...                   | Joins all arguments together                                                                                 |

### Date

| Function  | Arguments    | Notes                                                                     |
| --------- | ------------ | ------------------------------------------------------------------------- |
| addDays   | date, number |                                                                           |
| subDays   | date, number | Subtract days from date                                                   |
| addWeeks  | date, number |                                                                           |
| subWeeks  | date, number | Subtract weeks from date                                                  |
| addMonths | date, number |                                                                           |
| subMonths | date, number | Subtract months from date                                                 |
| addYears  | date, number |                                                                           |
| subYears  | date, number | Subtract years from date                                                  |
| setDay    | date, day    | Overflows are handled, 0 will set to last day of month before             |
| day       | date         | Extract the day from a date                                               |
| month     | date         | Extract the month from a date                                             |
| year      | date         | Extract the year from a date                                              |
| format    | date, format | See [date-fns docs](https://date-fns.org/v4.1.0/docs/format) for patterns |

### Other

| Function | Arguments | Notes                                                   |
| -------- | --------- | ------------------------------------------------------- |
| debug    | any       | Prints the arguments to the browser development console |
