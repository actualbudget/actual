## Template

Create a template by adding a note to a category and adding a line that begins with ```#template```.  

![category_note](https://user-images.githubusercontent.com/335468/141658974-1fb72d02-d30d-4c24-826a-eb2574e360d5.png)

You are welcome to have other lines in your note, but the ```#template``` line must match the syntax.

| Syntax | Description | How I use this |
| ------ | --- | --- |
| ```#template $50``` | Budget $50 each month | Regular monthly bills, such as internet |
| ```#template up to $150``` | Budget up to $150 each month | Variable expenses, such as petrol and groceries |
| ```#template $50 up to $300``` | Budget $50 each month up to a maximum of $300 | Funding rainy day categories, such as replacement shoes and bicycle repairs |
| ```#template $500 by 2022-03``` | Break down large, less-frequent expenses into manageable monthly expenses | Saving for a replacement car in a few years |
| ```#template $500 by 2021-03 repeat every 6 months``` | Break down large, less-frequent expenses into manageable monthly expenses | Biannual credit card fees |
| ```#template $500 by 2021-03 repeat every year``` | Break down large, less-frequent expenses into manageable monthly expenses | Annual insurance premium |
| ```#template $500 by 2021-03 repeat every 2 years``` | Break down large, less-frequent expenses into manageable monthly expenses | Domain name renewal |
| ```#template $500 by 2021-12 spend from 2021-03``` | Budget $500 by December. Any spending between March and December is OK. | Christmas presents, overseas holiday, or any other expenses that I will be partially paying for before the target period ends. |
| ```#template $500 by 2021-12 spend from 2021-03 repeat every year``` | | |
| ```#template $500 by 2021-12 spend from 2021-03 repeat every 2 years``` | | |
| ```#template $10 repeat every week starting 2022-01-03``` | Budget $10 a week |  |
| ```#template $10 repeat every week starting 2022-01-03 up to 80``` | Budget $10 a week, up to a maximum of $80 |  |
| ```#template $10 repeat every 2 weeks starting 2022-01-04``` | Budget $10 fortnightly |  |
| ```#template $10 repeat every 9 weeks starting 2022-01-04 up to 30``` | Budget $10 every 9 weeks, up to a maximum of $30 |  |

### Notes
* $ sign is optional, ```#template $50``` and ```#template 50``` are the same.
* Other currency symbols are not supported.
* Number formats that use comma for the decimal seperator are not supported (eg, ```123,45```). You must use ```123.45```.
* Thousands separators are not supported (eg, ```1,234```).  You must use ```1234```.

### Multiple Template Lines

You can add multiple ```#template``` lines for a single category note.  Lines that don't have a 'by' keyword in them add together, where as lines that do have the 'by' keyword are run sequentially - only the next next due template line is applied.

For examples:
#### Budget $200/month for 3 months, then $400/month for the next 3 months
```
#template $600 by 2021-03 repeat every 6 months
#template $1200 by 2021-06 repeat every 6 months
```
#template 
#### Streaming Services: $42.97
```
Netflix
#template $24.99
Disney Plus
#template $9.99
Amazon Prime
#template $7.99
```
#### $120 in February 2022, $130 in March 2022
```
#template $10 repeat every 2 weeks starting 2022-01-04
#template $100
```
