// @ts-strict-ignore

import { Currency, getCurrency } from 'loot-core/shared/currencies';

import * as monthUtils from '../../shared/months';
import { amountToInteger } from '../../shared/util';
import { CategoryEntity } from '../../types/models';
import * as db from '../db';

import { getSheetValue, getSheetBoolean } from './actions';
import { runSchedule } from './schedule-template';
import { getActiveSchedules } from './statements';
import {
  AverageTemplate,
  ByTemplate,
  CopyTemplate,
  GoalTemplate,
  PercentageTemplate,
  RemainderTemplate,
  SimpleTemplate,
  SpendTemplate,
  Template,
  WeekTemplate,
} from './types/templates';

export class CategoryTemplateContext {
  /*----------------------------------------------------------------------------
   * Using This Class:
   * 1. instantiate via `await categoryTemplate.init(templates, categoryID, month)`;
   *    templates: all templates for this category (including templates and goals)
   *    categoryID: the ID of the category that this Class will be for
   *    month: the month string of the month for templates being applied
   * 2. gather needed data for external use.  ex: remainder weights, priorities, limitExcess
   * 3. run each priority level that is needed via runTemplatesForPriority
   * 4. run the remainder templates via runRemainder()
   * 5. finish processing by running getValues() and saving values for batch processing.
   * Alternate:
   * If the situation calls for it you can run all templates in a catagory in one go using the
   * method runAll which will run all templates and goals for reference, and can optionally be saved
   */

  //-----------------------------------------------------------------------------
  // Class interface

  // set up the class and check all templates
  static async init(
    templates: Template[],
    category: CategoryEntity,
    month: string,
    budgeted: number,
    currencyCode: string,
  ) {
    // get all the needed setup values
    const lastMonthSheet = monthUtils.sheetForMonth(
      monthUtils.subMonths(month, 1),
    );
    const lastMonthBalance = await getSheetValue(
      lastMonthSheet,
      `leftover-${category.id}`,
    );
    const carryover = await getSheetBoolean(
      lastMonthSheet,
      `carryover-${category.id}`,
    );
    let fromLastMonth;
    if (lastMonthBalance < 0 && !carryover) {
      fromLastMonth = 0;
    } else if (category.is_income) {
      //for tracking budget
      fromLastMonth = 0;
    } else {
      fromLastMonth = lastMonthBalance;
    }
    // run all checks
    await CategoryTemplateContext.checkByAndScheduleAndSpend(templates, month);
    await CategoryTemplateContext.checkPercentage(templates);
    // call the private constructor
    return new CategoryTemplateContext(
      templates,
      category,
      month,
      fromLastMonth,
      budgeted,
      currencyCode,
    );
  }

  isGoalOnly(): boolean {
    // if there is only a goal
    return (
      this.templates.length === 0 &&
      this.remainder.length === 0 &&
      this.goals.length > 0
    );
  }
  getPriorities(): number[] {
    return this.priorities;
  }
  getRemainderWeight(): number {
    return this.remainderWeight;
  }
  getLimitExcess(): number {
    return this.limitExcess;
  }

  // what is the full requested amount this month
  async runAll(available: number) {
    let toBudget: number = 0;
    for (let i = 0; i < this.priorities.length; i++) {
      const p = this.priorities[i];
      toBudget += await this.runTemplatesForPriority(p, available, available);
    }
    //TODO does this need to run limits? maybe pass in option to ignore previous balance?
    return toBudget;
  }

  // run all templates in a given priority level
  // return: amount budgeted in this priority level
  async runTemplatesForPriority(
    priority: number,
    budgetAvail: number,
    availStart: number,
  ): Promise<number> {
    if (!this.priorities.includes(priority)) return 0;
    if (this.limitMet) return 0;

    const t = this.templates.filter(t => t.priority === priority);
    let available = budgetAvail || 0;
    let toBudget = 0;
    let byFlag = false;
    let remainder = 0;
    let scheduleFlag = false;
    // switch on template type and calculate the amount for the line
    for (const template of t) {
      let newBudget = 0;
      switch (template.type) {
        case 'simple': {
          newBudget = CategoryTemplateContext.runSimple(template, this);
          break;
        }
        case 'copy': {
          newBudget = await CategoryTemplateContext.runCopy(template, this);
          break;
        }
        case 'week': {
          newBudget = CategoryTemplateContext.runWeek(template, this);
          break;
        }
        case 'spend': {
          newBudget = await CategoryTemplateContext.runSpend(template, this);
          break;
        }
        case 'percentage': {
          newBudget = await CategoryTemplateContext.runPercentage(
            template,
            availStart,
            this,
          );
          break;
        }
        case 'by': {
          // all by's get run at once
          if (!byFlag) {
            newBudget = CategoryTemplateContext.runBy(this);
          } else {
            newBudget = 0;
          }
          byFlag = true;
          break;
        }
        case 'schedule': {
          if (!scheduleFlag) {
            const budgeted = this.fromLastMonth + toBudget;
            const ret = await runSchedule(
              t,
              this.month,
              budgeted,
              remainder,
              this.fromLastMonth,
              toBudget,
              [],
              this.category,
            );
            // Schedules assume that its to budget value is the whole thing so this
            // needs to remove the previous funds so they aren't double counted
            newBudget = ret.to_budget - toBudget;
            remainder = ret.remainder;
            scheduleFlag = true;
          }
          break;
        }
        case 'average': {
          newBudget = await CategoryTemplateContext.runAverage(template, this);
          break;
        }
      }

      available = available - newBudget;
      toBudget += newBudget;
    }

    //check limit
    if (this.limitCheck) {
      if (
        toBudget + this.toBudgetAmount + this.fromLastMonth >=
        this.limitAmount
      ) {
        const orig = toBudget;
        toBudget = this.limitAmount - this.toBudgetAmount - this.fromLastMonth;
        this.limitMet = true;
        available = available + orig - toBudget;
      }
    }
    // don't overbudget when using a priority
    if (priority > 0 && available < 0) {
      this.fullAmount += toBudget;
      toBudget = Math.max(0, toBudget + available);
      this.toBudgetAmount += toBudget;
    } else {
      this.fullAmount += toBudget;
      this.toBudgetAmount += toBudget;
    }
    return toBudget;
  }

  // run all of the 'remainder' type templates
  runRemainder(budgetAvail: number, perWeight: number) {
    if (this.remainder.length === 0) return 0;
    let toBudget = Math.round(this.remainderWeight * perWeight);
    //check possible overbudget from rounding, 1cent leftover
    if (toBudget > budgetAvail) {
      toBudget = budgetAvail;
      this.toBudgetAmount += toBudget;
      return toBudget;
    } else if (budgetAvail - toBudget === 1) {
      toBudget += 1;
      this.toBudgetAmount += toBudget;
      return toBudget;
    } else {
      this.toBudgetAmount += toBudget;
      return toBudget;
    }
  }

  getValues() {
    this.runGoal();
    return {
      budgeted: this.toBudgetAmount,
      goal: this.goalAmount,
      longGoal: this.isLongGoal,
    };
  }

  //-----------------------------------------------------------------------------
  // Implementation
  readonly category: CategoryEntity; //readonly so we can double check the category this is using
  private month: string;
  private templates: Template[] = [];
  private remainder: RemainderTemplate[] = [];
  private goals: GoalTemplate[] = [];
  private priorities: number[] = [];
  private remainderWeight: number = 0;
  private toBudgetAmount: number = 0; // amount that will be budgeted by the templates
  private fullAmount: number = null; // the full requested amount, start null for remainder only cats
  private isLongGoal: boolean = null; //defaulting the goals to null so templates can be unset
  private goalAmount: number = null;
  private fromLastMonth = 0; // leftover from last month
  private limitMet = false;
  private limitExcess: number = 0;
  private limitAmount = 0;
  private limitCheck = false;
  private limitHold = false;
  readonly previouslyBudgeted: number = 0;
  private currency: Currency;

  protected constructor(
    templates: Template[],
    category: CategoryEntity,
    month: string,
    fromLastMonth: number,
    budgeted: number,
    currencyCode: string,
  ) {
    this.category = category;
    this.month = month;
    this.fromLastMonth = fromLastMonth;
    this.previouslyBudgeted = budgeted;
    this.currency = getCurrency(currencyCode);

    // sort the template lines into regular template, goals, and remainder templates
    if (templates) {
      templates.forEach(t => {
        if (t.directive === 'template' && t.type !== 'remainder') {
          this.templates.push(t);
        }
      });
      templates.forEach(t => {
        if (t.directive === 'template' && t.type === 'remainder') {
          this.remainder.push(t);
        }
      });
      templates.forEach(t => {
        if (t.directive === 'goal' && t.type === 'goal') this.goals.push(t);
      });
    }
    // check limits here since it needs to save states inside the object
    this.checkLimit();
    this.checkSpend();
    this.checkGoal();

    //find priorities
    const p = [];
    this.templates.forEach(t => {
      if (t.priority != null) {
        p.push(t.priority);
      }
    });
    //sort and reduce to unique items
    this.priorities = p
      .sort(function (a, b) {
        return a - b;
      })
      .filter((item, idx, curr) => curr.indexOf(item) === idx);

    //find remainder weight
    let weight = 0;
    this.remainder.forEach(r => {
      weight += r.weight;
    });
    this.remainderWeight = weight;
  }

  private runGoal() {
    if (this.goals.length > 0) {
      if (this.isGoalOnly()) this.toBudgetAmount = this.previouslyBudgeted;
      this.isLongGoal = true;
      this.goalAmount = amountToInteger(
        this.goals[0].amount,
        this.currency.decimalPlaces,
      );
      return;
    }
    this.goalAmount = this.fullAmount;
  }

  //-----------------------------------------------------------------------------
  //  Template Validation
  static async checkByAndScheduleAndSpend(
    templates: Template[],
    month: string,
  ) {
    if (
      templates.filter(t => t.type === 'schedule' || t.type === 'by').length ===
      0
    ) {
      return;
    }
    //check schedule names
    const scheduleNames = (await getActiveSchedules()).map(({ name }) =>
      name.trim(),
    );
    templates
      .filter(t => t.type === 'schedule')
      .forEach(t => {
        if (!scheduleNames.includes(t.name.trim())) {
          throw new Error(`Schedule ${t.name.trim()} does not exist`);
        }
      });
    //find lowest priority
    const lowestPriority = Math.min(
      ...templates
        .filter(t => t.type === 'schedule' || t.type === 'by')
        .map(t => t.priority),
    );
    //warn if priority needs fixed
    templates
      .filter(t => t.type === 'schedule' || t.type === 'by')
      .forEach(t => {
        if (t.priority !== lowestPriority) {
          throw new Error(
            `Schedule and By templates must be the same priority level. Fix by setting all Schedule and By templates to priority level ${lowestPriority}`,
          );
          //t.priority = lowestPriority;
        }
      });
    // check if the target date is past and not repeating
    templates
      .filter(t => t.type === 'by' || t.type === 'spend')
      .forEach(t => {
        const range = monthUtils.differenceInCalendarMonths(
          `${t.month}`,
          month,
        );
        if (range < 0 && !(t.repeat || t.annual)) {
          throw new Error(
            `Target month has passed, remove or update the target month`,
          );
        }
      });
  }

  static async checkPercentage(templates: Template[]) {
    const pt = templates.filter(t => t.type === 'percentage');
    if (pt.length === 0) return;
    const reqCategories = pt.map(t => t.category.toLowerCase());

    const availCategories = await db.getCategories();
    const availNames = availCategories
      .filter(c => c.is_income)
      .map(c => c.name.toLocaleLowerCase());

    reqCategories.forEach(n => {
      if (n === 'available funds' || n === 'all income') {
        //skip the name check since these are special
      } else if (!availNames.includes(n)) {
        throw new Error(
          `Category \x22${n}\x22 is not found in available income categories`,
        );
      }
    });
  }

  private checkLimit() {
    for (const template of this.templates
      .filter(
        t => t.type === 'simple' || t.type === 'week' || t.type === 'remainder',
      )
      .filter(t => t.limit)) {
      if (this.limitCheck) {
        throw new Error('Only one `up to` allowed per category');
      }
      if (template.limit.period === 'daily') {
        const numDays = monthUtils.differenceInCalendarDays(
          monthUtils.addMonths(this.month, 1),
          this.month,
        );
        this.limitAmount +=
          amountToInteger(template.limit.amount, this.currency.decimalPlaces) *
          numDays;
      } else if (template.limit.period === 'weekly') {
        const nextMonth = monthUtils.nextMonth(this.month);
        let week = template.limit.start;
        const baseLimit = amountToInteger(
          template.limit.amount,
          this.currency.decimalPlaces,
        );
        while (week < nextMonth) {
          if (week >= this.month) {
            this.limitAmount += baseLimit;
          }
          week = monthUtils.addWeeks(week, 1);
        }
      } else if (template.limit.period === 'monthly') {
        this.limitAmount = amountToInteger(
          template.limit.amount,
          this.currency.decimalPlaces,
        );
      } else {
        throw new Error('Invalid limit period. Check template syntax');
      }
      //amount is good save the rest
      this.limitCheck = true;
      this.limitHold = template.limit.hold ? true : false;
      // check if the limit is already met and save the excess
      if (this.fromLastMonth >= this.limitAmount) {
        this.limitMet = true;
        if (this.limitHold) {
          this.limitExcess = 0;
          this.toBudgetAmount = 0;
          this.fullAmount = 0;
        } else {
          this.limitExcess = this.fromLastMonth - this.limitAmount;
          this.toBudgetAmount = -this.limitExcess;
          this.fullAmount = -this.limitExcess;
        }
      }
    }
  }

  private checkSpend() {
    const st = this.templates.filter(t => t.type === 'spend');
    if (st.length > 1) {
      throw new Error('Only one spend template is allowed per category');
    }
  }

  private checkGoal() {
    if (this.goals.length > 1) {
      throw new Error(`Only one #goal is allowed per category`);
    }
  }

  //-----------------------------------------------------------------------------
  //  Processor Functions

  static runSimple(
    template: SimpleTemplate,
    templateContext: CategoryTemplateContext,
  ): number {
    if (template.monthly != null) {
      return amountToInteger(
        template.monthly,
        templateContext.currency.decimalPlaces,
      );
    } else {
      return templateContext.limitAmount;
    }
  }

  static async runCopy(
    template: CopyTemplate,
    templateContext: CategoryTemplateContext,
  ): Promise<number> {
    const sheetName = monthUtils.sheetForMonth(
      monthUtils.subMonths(templateContext.month, template.lookBack),
    );
    return await getSheetValue(
      sheetName,
      `budget-${templateContext.category.id}`,
    );
  }

  static runWeek(
    template: WeekTemplate,
    templateContext: CategoryTemplateContext,
  ): number {
    let toBudget = 0;
    const amount = amountToInteger(
      template.amount,
      templateContext.currency.decimalPlaces,
    );
    const weeks = template.weeks != null ? Math.round(template.weeks) : 1;
    let w = template.starting;
    const nextMonth = monthUtils.addMonths(templateContext.month, 1);

    while (w < nextMonth) {
      if (w >= templateContext.month) {
        toBudget += amount;
      }
      w = monthUtils.addWeeks(w, weeks);
    }
    return toBudget;
  }

  static async runSpend(
    template: SpendTemplate,
    templateContext: CategoryTemplateContext,
  ): Promise<number> {
    let fromMonth = `${template.from}`;
    let toMonth = `${template.month}`;
    let alreadyBudgeted = templateContext.fromLastMonth;
    let firstMonth = true;

    //update months if needed
    const repeat = template.annual
      ? (template.repeat || 1) * 12
      : template.repeat;
    let m = monthUtils.differenceInCalendarMonths(
      toMonth,
      templateContext.month,
    );
    if (repeat && m < 0) {
      while (m < 0) {
        toMonth = monthUtils.addMonths(toMonth, repeat);
        fromMonth = monthUtils.addMonths(fromMonth, repeat);
        m = monthUtils.differenceInCalendarMonths(
          toMonth,
          templateContext.month,
        );
      }
    }

    for (
      let m = fromMonth;
      monthUtils.differenceInCalendarMonths(templateContext.month, m) > 0;
      m = monthUtils.addMonths(m, 1)
    ) {
      const sheetName = monthUtils.sheetForMonth(m);
      if (firstMonth) {
        //TODO figure out if I already  found these values and can pass them in
        const spent = await getSheetValue(
          sheetName,
          `sum-amount-${templateContext.category.id}`,
        );
        const balance = await getSheetValue(
          sheetName,
          `leftover-${templateContext.category.id}`,
        );
        alreadyBudgeted = balance - spent;
        firstMonth = false;
      } else {
        alreadyBudgeted += await getSheetValue(
          sheetName,
          `budget-${templateContext.category.id}`,
        );
      }
    }

    const numMonths = monthUtils.differenceInCalendarMonths(
      toMonth,
      templateContext.month,
    );
    const target = amountToInteger(
      template.amount,
      templateContext.currency.decimalPlaces,
    );
    if (numMonths < 0) {
      return 0;
    } else {
      return Math.round((target - alreadyBudgeted) / (numMonths + 1));
    }
  }

  static async runPercentage(
    template: PercentageTemplate,
    availableFunds: number,
    templateContext: CategoryTemplateContext,
  ): Promise<number> {
    const percent = template.percent;
    const cat = template.category.toLowerCase();
    const prev = template.previous;
    let sheetName;
    let monthlyIncome = 1;

    //choose the sheet to find income for
    if (prev) {
      sheetName = monthUtils.sheetForMonth(
        monthUtils.subMonths(templateContext.month, 1),
      );
    } else {
      sheetName = monthUtils.sheetForMonth(templateContext.month);
    }
    if (cat === 'all income') {
      monthlyIncome = await getSheetValue(sheetName, `total-income`);
    } else if (cat === 'available funds') {
      monthlyIncome = availableFunds;
    } else {
      const incomeCat = (await db.getCategories()).find(
        c => c.is_income && c.name.toLowerCase() === cat,
      );
      monthlyIncome = await getSheetValue(
        sheetName,
        `sum-amount-${incomeCat.id}`,
      );
    }

    return Math.max(0, Math.round(monthlyIncome * (percent / 100)));
  }

  static async runAverage(
    template: AverageTemplate,
    templateContext: CategoryTemplateContext,
  ): Promise<number> {
    let sum = 0;
    for (let i = 1; i <= template.numMonths; i++) {
      const sheetName = monthUtils.sheetForMonth(
        monthUtils.subMonths(templateContext.month, i),
      );
      sum += await getSheetValue(
        sheetName,
        `sum-amount-${templateContext.category.id}`,
      );
    }
    return -Math.round(sum / template.numMonths);
  }

  static runBy(templateContext: CategoryTemplateContext): number {
    const byTemplates: ByTemplate[] = templateContext.templates.filter(
      t => t.type === 'by',
    );
    const savedInfo = [];
    let totalNeeded = 0;
    let shortNumMonths;
    //find shortest time period
    for (let i = 0; i < byTemplates.length; i++) {
      const template = byTemplates[i];
      let targetMonth = `${template.month}`;
      const period = template.annual
        ? (template.repeat || 1) * 12
        : template.repeat != null
          ? template.repeat
          : null;
      let numMonths = monthUtils.differenceInCalendarMonths(
        targetMonth,
        templateContext.month,
      );
      while (numMonths < 0 && period) {
        targetMonth = monthUtils.addMonths(targetMonth, period);
        numMonths = monthUtils.differenceInCalendarMonths(
          targetMonth,
          templateContext.month,
        );
      }
      savedInfo.push({ numMonths, period });
      if (numMonths < shortNumMonths || !shortNumMonths) {
        shortNumMonths = numMonths;
      }
    }

    // calculate needed funds per template
    for (let i = 0; i < byTemplates.length; i++) {
      const template = byTemplates[i];
      const numMonths = savedInfo[i].numMonths;
      const period = savedInfo[i].period;
      let amount;
      // back interpolate what is needed in the short window
      if (numMonths > shortNumMonths && period) {
        amount = Math.round(
          (amountToInteger(
            template.amount,
            templateContext.currency.decimalPlaces,
          ) /
            period) *
            (period - numMonths + shortNumMonths),
        );
        // fallback to this.  This matches what the prior math accomplished, just more round about
      } else if (numMonths > shortNumMonths) {
        amount = Math.round(
          (amountToInteger(
            template.amount,
            templateContext.currency.decimalPlaces,
          ) /
            (numMonths + 1)) *
            (shortNumMonths + 1),
        );
      } else {
        amount = amountToInteger(
          template.amount,
          templateContext.currency.decimalPlaces,
        );
      }
      totalNeeded += amount;
    }
    return Math.round(
      (totalNeeded - templateContext.fromLastMonth) / (shortNumMonths + 1),
    );
  }
}
