// @ts-strict-ignore
import { Currency, getCurrency } from 'loot-core/shared/currencies';
import { q } from 'loot-core/shared/query';

import * as monthUtils from '../../shared/months';
import { amountToInteger, integerToAmount } from '../../shared/util';
import { CategoryEntity } from '../../types/models';
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
  PeriodicTemplate,
} from '../../types/models/templates';
import { aqlQuery } from '../aql';
import * as db from '../db';

import { getSheetValue, getSheetBoolean } from './actions';
import { runSchedule } from './schedule-template';
import { getActiveSchedules } from './statements';

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

    const hideDecimal = await aqlQuery(
      q('preferences').filter({ id: 'hideFraction' }).select('*'),
    );

    const currencyPref = await aqlQuery(
      q('preferences').filter({ id: 'defaultCurrencyCode' }).select('*'),
    );
    const currencyCode =
      currencyPref.data.length > 0 ? currencyPref.data[0].value : '';

    // call the private constructor
    return new CategoryTemplateContext(
      templates,
      category,
      month,
      fromLastMonth,
      budgeted,
      currencyCode,
      hideDecimal.data.length > 0
        ? hideDecimal.data[0].value === 'true'
        : false,
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
    return Array.from(this.priorities);
  }
  hasRemainder(): boolean {
    return this.remainderWeight > 0 && !this.limitMet;
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
    const prioritiesSorted = new Int32Array([...this.getPriorities()].sort());
    for (let i = 0; i < prioritiesSorted.length; i++) {
      const p = prioritiesSorted[i];
      toBudget += await this.runTemplatesForPriority(p, available, available);
    }
    return toBudget;
  }

  // run all templates in a given priority level
  // return: amount budgeted in this priority level
  async runTemplatesForPriority(
    priority: number,
    budgetAvail: number,
    availStart: number,
  ): Promise<number> {
    if (!this.priorities.has(priority)) return 0;
    if (this.limitMet) return 0;

    const t = this.templates.filter(
      t => t.directive === 'template' && t.priority === priority,
    );
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
        case 'periodic': {
          newBudget = CategoryTemplateContext.runPeriodic(template, this);
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

    //round all budget values if needed
    if (this.hideDecimal) toBudget = this.removeFraction(toBudget);

    // don't overbudget when using a priority unless income category
    if (priority > 0 && available < 0 && !this.category.is_income) {
      this.fullAmount += toBudget;
      toBudget = Math.max(0, toBudget + available);
      this.toBudgetAmount += toBudget;
    } else {
      this.fullAmount += toBudget;
      this.toBudgetAmount += toBudget;
    }
    return this.category.is_income ? -toBudget : toBudget;
  }

  runRemainder(budgetAvail: number, perWeight: number) {
    if (this.remainder.length === 0) return 0;
    let toBudget = Math.round(this.remainderWeight * perWeight);

    let smallest = 1;
    if (this.hideDecimal) {
      // handle hideDecimal
      toBudget = this.removeFraction(toBudget);
      smallest = 100;
    }

    //check possible overbudget from rounding, 1cent leftover
    if (toBudget > budgetAvail || budgetAvail - toBudget <= smallest) {
      toBudget = budgetAvail;
    }

    if (this.limitCheck) {
      if (
        toBudget + this.toBudgetAmount + this.fromLastMonth >=
        this.limitAmount
      ) {
        toBudget = this.limitAmount - this.toBudgetAmount - this.fromLastMonth;
        this.limitMet = true;
      }
    }

    this.toBudgetAmount += toBudget;
    return toBudget;
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
  private priorities: Set<number> = new Set();
  readonly hideDecimal: boolean = false;
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
    hideDecimal: boolean = false,
  ) {
    this.category = category;
    this.month = month;
    this.fromLastMonth = fromLastMonth;
    this.previouslyBudgeted = budgeted;
    this.currency = getCurrency(currencyCode);
    this.hideDecimal = hideDecimal;
    // sort the template lines into regular template, goals, and remainder templates
    if (templates) {
      templates.forEach(t => {
        if (
          t.directive === 'template' &&
          t.type !== 'remainder' &&
          t.type !== 'limit'
        ) {
          this.templates.push(t);
          if (t.priority !== null) this.priorities.add(t.priority);
        } else if (t.directive === 'template' && t.type === 'remainder') {
          this.remainder.push(t);
          this.remainderWeight += t.weight;
        } else if (t.directive === 'goal' && t.type === 'goal') {
          this.goals.push(t);
        }
      });
    }

    this.checkLimit(templates);
    this.checkSpend();
    this.checkGoal();
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

  private checkLimit(templates: Template[]) {
    for (const template of templates.filter(
      t =>
        t.type === 'simple' ||
        t.type === 'periodic' ||
        t.type === 'limit' ||
        t.type === 'remainder',
    )) {
      let limitDef;
      if (template.type === 'limit') {
        limitDef = template;
      } else {
        if (template.limit) {
          limitDef = template.limit;
        } else {
          continue; // may not have a limit defined in the template
        }
      }

      if (this.limitCheck) {
        throw new Error('Only one `up to` allowed per category');
      }

      if (limitDef.period === 'daily') {
        const numDays = monthUtils.differenceInCalendarDays(
          monthUtils.addMonths(this.month, 1),
          this.month,
        );
        this.limitAmount +=
          amountToInteger(limitDef.amount, this.currency.decimalPlaces) *
          numDays;
      } else if (limitDef.period === 'weekly') {
        if (!limitDef.start) {
          throw new Error('Weekly limit requires a start date (YYYY-MM-DD)');
        }
        const nextMonth = monthUtils.nextMonth(this.month);
        let week = limitDef.start;
        const baseLimit = amountToInteger(
          limitDef.amount,
          this.currency.decimalPlaces,
        );
        while (week < nextMonth) {
          if (week >= this.month) {
            this.limitAmount += baseLimit;
          }
          week = monthUtils.addWeeks(week, 1);
        }
      } else if (limitDef.period === 'monthly') {
        this.limitAmount = amountToInteger(
          limitDef.amount,
          this.currency.decimalPlaces,
        );
      } else {
        throw new Error('Invalid limit period. Check template syntax');
      }

      //amount is good save the rest
      this.limitCheck = true;
      this.limitHold = limitDef.hold ? true : false;
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

  private removeFraction(amount: number): number {
    return amountToInteger(
      Math.round(integerToAmount(amount, this.currency.decimalPlaces)),
      this.currency.decimalPlaces,
    );
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

  static runPeriodic(
    template: PeriodicTemplate,
    templateContext: CategoryTemplateContext,
  ): number {
    let toBudget = 0;
    const amount = amountToInteger(
      template.amount,
      templateContext.currency.decimalPlaces,
    );
    const period = template.period.period;
    const numPeriods = template.period.amount;
    let date = template.starting;

    let dateShiftFunction;
    switch (period) {
      case 'day':
        dateShiftFunction = monthUtils.addDays;
        break;
      case 'week':
        dateShiftFunction = monthUtils.addWeeks;
        break;
      case 'month':
        dateShiftFunction = monthUtils.addMonths;
        break;
      case 'year':
        // the addYears function doesn't return the month number, so use addMonths
        dateShiftFunction = (date, numPeriods) =>
          monthUtils.addMonths(date, numPeriods * 12);
        break;
    }

    //shift the starting date until its in our month or in the future
    while (templateContext.month > date) {
      date = dateShiftFunction(date, numPeriods);
    }

    if (
      monthUtils.differenceInCalendarMonths(templateContext.month, date) < 0
    ) {
      return 0;
    } // nothing needed this month

    const nextMonth = monthUtils.addMonths(templateContext.month, 1);
    while (date < nextMonth) {
      toBudget += amount;
      date = dateShiftFunction(date, numPeriods);
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
      if (numMonths < shortNumMonths || shortNumMonths === undefined) {
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
