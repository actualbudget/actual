# Schedules

## Creating a schedule

Schedules can be used to enter anticipated transactions early. Some of the available options to tailor schedules to your needs are:

1.  Set to be recurring or only entered once
2.  Set to be automatically entered into the account register or choose to manually approve entries
3.  Options for recurring entries for multiple specific days of the month.
    1. A single schedule can be created for a Cell phone plan that has multiple users and different payment cycles for each phone. If you have 3 cell phones that all get paid on different days of the month, each day can be defined in a single schedule for each phone.
4.  Options to determine frequency of payments, such as every month, every 2 months, every 2 years, etc.

Once a schedule is started, Actual will search the transaction history for entries that match the schedule, select the matches, and the option to link those transactions to the schedule is given. You can click to the **Find missing transactions** button to have Actual look for matches.

![Example of adding a schedule for a mortgage](/img/schedules/schedules-1.png)

!Example of schedule for a mortgage[](/img/schedules/schedules-6.png)

!Example of schedule for a mortgage[](/img/schedules/schedules-7.png)

## How Actual finds schedules

In addition to the requirements you have specified when creating a schedule, a transaction must also meet the date requirements to be matched to a schedule. Transactions must be dated within 2 days before or after a schedule.

For example: You have a schedule set up for your power bill for the 15th of every month. Today is the 10th of the month and you can see an upcoming scheduled transaction of your bill in Actual. The utility company decided to withdraw the funds on the 10th this month, so you post the transaction to Actual early and change the date of the transaction to match your bank statement. A problem just occurred because now the posted transaction is outside of the 2 day window to match scheduled transactions. You'll see your bill posted in the Actual account ledger but you'll also see an upcoming transaction for the power bill on the 15th even though you just entered it. This is the expected behavior when using schedules.

You can resolve this issue in one of two ways.

1. Skip the next schedule by selecting the upcoming scheduled transaction and choosing the "Skip Scheduled Date" from the menu options.
2. Accept the date doesn't match and leave it as is so the schedule doesn't prompt a second transaction.

## Schedule options that are not supported

1. Schedules cannot be made that adjust based on the last non-weekend day (Monday-Friday) of a month.
2. Schedules do not take into account holidays.

## How to use rules with Schedules

Many times it's desired to add notes to the scheduled transactions or to assign categories automatically. This is done with the [Rules][rules] tool.

Create a schedule.

![Schedules overview](/img/schedules/schedules-2.png)

You can click on it and a new button has now appeared called **Edit as rule**.

![Example of mortgage scheduled](/img/schedules/schedules-3.png)

Click on **Edit as Rule** to further customize the automatic entry.

![Rule associated with the mortgage schedule](/img/schedules/schedules-4.png)

By clicking the **+** arrow on in the **Then apply these actions** area, you can define the category this schedule should be assigned against as well as any notes you might want to include.

![Rule associated with the mortgage schedule](/img/schedules/schedules-5.png)

You can apply this newly made rule to any other of the linked transactions. Select all of the transactions from the rules dialog and press **Apply actions**.

![Rule associated with the mortgage schedule](/img/schedules/schedules-8.png)

Save the rule and any time this scheduled transaction gets entered into the register it can be automatically categorized with a helpful note.

### Creating Schedules From Transactions
To create a Schedule from an existing transactions,
1. Navigate to the Accounts page
2. select the tick box in the left hand column for the Transaction you wish to copy.
3. Once selected, go to the drop-down menu on the top right of the page
4. Click Link Selection
5. In the Pop up that appears Click "Create New"
6. All fields will populate from the transaction,
7. Adjust any additional fields and click Add.

![Linking a schedule on a given transaction](/img/bulk-edit/link-schedule.png)

![Create new schedule dialog](/img/bulk-edit/create-new-schedule.png)
