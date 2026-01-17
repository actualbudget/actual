---
title: Goal Templates with a twist for weekly targets
description: An example using Goal Templates for weekly targets
slug: 2024-03-25-goal-templates-with-a-twist
tags: [budgeting, goals]
hide_table_of_contents: false
---

Hello budgeters!

I hope you all enjoyed the last blog post focused on how to use goal templates. If you haven't read it yet, you might want to start [here](/blog/2023-12-15-automate.md). While we always recommend embracing the envelope system and [getting a month ahead](/blog/2023-12-15-automate.md#month-ahead) on your budget, there are some situations where that just isn't possible right away. I'm going to introduce a method here that uses the goal template system that uses your income as you receive it throughout the month using priorities.

<!--truncate-->

# The Scenario

Goal templates are an experimental feature within Actual that allow you to auto-budget categories. You can set goals that can be once off or repeating with scheduling options that are very flexible. To see more about this feature in detail, you can check out the [documentation](../../docs/experimental/goal-templates) page. To enable this feature, navigate to the settings page and scroll down and click the link to expose Experimental features within the Advanced settings area. In the mean time, you can read more about a specific use case using goal templates for weekly budgeting.

In this scenario, my income will be $500 per week, starting on the first of the month. I have certain priorities that need to be met. For example, I like to eat so I'm going to prioritize food for the first pay period. I'm going to set up my mortgage to be paid at the end of the month, saving a little each week. I'm going to budget for several bills that happen throughout the month where I know which week they'll need to be paid. I'm also going to use a simple template with priorities to illustrate this method. Feel free to use other template types.

Priorities allow you to decide which goals are funded first. Check out our last [blog post](/blog/2023-12-15-automate.md#how-priorities-work) or the section in the [documentation](../../docs/experimental/goal-templates#template-priorities) that explains in much greater detail on how to use them. In this example, I've decided to use the following priority levels

- Week 1: 10-19
- Week 2: 20-29
- Week 3: 30-39
- Week 4: 40-49
- 50+ for any additional priorities that can be funded after my monthly priorities are satisfied. This includes long term goals like vacation savings, investments, or holiday spending.

In week 1, level 10 will run first, level 11 second, level 12 third, and so on. This strategy allows me to have different priorities within each week if I want. Since I've decided week 2 priorities will start at 20, all week 1 goals will be funded before week 2, and all of week 2 will be funded before week 3.

| Category          |                                                  How much I need per week, and when                                                   |                         Template used for the category                          |
| :---------------- | :-----------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------: |
| **Food**          |                                                       $50 per week, every week                                                        | #template-10 50<br/> #template-20 50<br/> #template-30 50<br/> #template-40 50  |
| **Restaurants**   | $25 per week, every week. I've decided the Food category is more important so I'm using the x5 priority levels to run after Foods x0. |   #template-15 25<br/>#template-25 25<br/>#template-35 25<br/>#template-45 25   |
| **Entertainment** |                                                       $10 per week, every week                                                        |   #template-13 10<br/>#template-23 10<br/>#template-33 10<br/>#template-43 10   |
| **Clothing**      |                                          $20 per week for first two weeks, then $5 per week                                           |    #template-11 20<br/>#template-21 20<br/>#template-31 5<br/>#template-41 5    |
| **General**       |                             $30 in the first week, but all other first week categories are more important                             |                                 #template-19 30                                 |
| **Gift**          |                                                          No gifts this month                                                          |                                                                                 |
| **Medical**       |                                                   $25 when all other goals are met                                                    |                                 #template-50 25                                 |
| **Savings**       |                                                  All extra money after goals are met                                                  |                               #template remainder                               |
| **Cell**          |                                                       $40 due in the first week                                                       |                                 #template-12 40                                 |
| **Internet**      |                                                      $100 due in the fourth week                                                      |                                #template-40 100                                 |
| **Mortgage**      |                                           Save $200 per week so $800 is available in week 4                                           | #template-10 200<br/>#template-20 200<br/>#template-30 200<br/>#template-40 200 |
| **Water**         |                                                      $130 due in the third week                                                       |                                #template-30 130                                 |
| **Power**         |                                                      $150 due in the second week                                                      |                                #template-20 150                                 |

You'll notice I used different priorities for different categories. When the goal templates are applied, the categories will be filled in the following order. I've bolded the categories that will only be filled for certain periods. When the templates are applied, the categories will be filled in order. Week 1 priorities will be filled first, followed by week 2 and so forth. The lower the priority number in the template from the table above, the earlier that goal will be filled.

| First week                                                                                                              | Second week                                                                                           | Third week                                                                                            | Fourth week                                                                                         | Leftovers                         |
| :---------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- | :-------------------------------- |
| 1. Food<br/>2. Mortgage<br/>3. Clothing<br/>**4. Cell**<br/>5. Entertainment<br/>6. Restaurants<br/>**7. General**<br/> | 1. Food<br/>2. Mortgage<br/>**3. Power**<br/>4. Clothing<br/>5. Entertainment<br/>6. Restaurants<br/> | 1. Food<br/>2. Mortgage<br/>**3. Water**<br/>4. Clothing<br/>5. Entertainment<br/>6. Restaurants<br/> | 1. Food<br/>2. Mortgage<br/>**3. Internet**<br/>4. Clothing<br/>5. Entertainment<br/>6. Restaurants | **1. Medical**<br/>**2. Savings** |

Here's my budget as I step through week by week. For each week I receive new income, I reapply the templates. You'll see that each of my categories gets filled a little more each time. If I have a little extra from one week, it will start filling up the categories for the next weeks goals. When I receive my final pay in the fourth week, my final two categories receive some funding.

This approach fills your budget categories as your income arrives by prioritizing your needs and allows you to spend from your categories along the way.

### Week 1, Receive first income deposit

Now that we have our first deposit for the month, we're ready to start budgeting using templates.

![](/img/blog/twist-1.webp)

### Week 1, Apply budget templates

Use the **Apply budget template** menu option in the monthly menu. Open the menu by clicking on the three vertical dots to the right of the month.

Notice that both Food, Power, and Cell categories have received funding greater than expected this week. The templates are already funding goals for week 2! Only half ($75) of the desired power budget ($150) is satisfied and was the last category to receive funding. It'll be the first category in the next pay period to be filled. Feel free to refer back to the table above to see which categories are being filled. There is a lot happening here.

![](/img/blog/twist-2.webp)

### Receive second week's income and 'Overwrite with budget templates'

For each time going forward, we're going to use the **Overwrite with budget template** button in the month's menu. We do this because we already have a budget filled out. This will force the templates to replace any budgeted values already filled.

Notice that week 3 goals are already being funded. Most of the categories still show a yellow indicator. This means that they still need more funding this month to reach all of your goals. If they have turned green, like General, Cell, and Power, the target goal has been reached.

![](/img/blog/twist-3.webp)

### Receive third week's income and 'Overwrite with budget templates'

More green category balances! Keep in mind, you can spend from these categories along the way. I simply didn't show any spending in these graphics.

![](/img/blog/twist-4.webp)

### Receive fourth week's income and 'Overwrite with budget templates'

This is the final pay period for the month. I was successful in reaching all of my target goals. There was even a little extra for the savings category! Amazing!

![](/img/blog/twist-5.webp)

# Conclusion

Thanks for following along. This may be an unconventional way to use goal templates, but this shows the power of priorities in Actual and how they could be used effectively for weekly budgeting.
