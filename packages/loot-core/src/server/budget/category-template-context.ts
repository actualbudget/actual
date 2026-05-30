import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { getCurrency } from '#shared/currencies';
import type { Currency } from '#shared/currencies';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import { amountToInteger, integerToAmount } from '#shared/util';
import type { CategoryEntity } from '#types/models';
import type {
  AverageTemplate,
  ByTemplate,
  CopyTemplate,
  GoalTemplate,
  PercentageTemplate,
  PeriodicTemplate,
  RefillTemplate,
  RemainderTemplate,
  SimpleTemplate,
  SpendTemplate,
  Template,
} from '#types/models/templates';

import { getSheetBoolean, getSheetValue, isTrackingBudget } from './actions';
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
    skipAvailableClamp: boolean = false,
  ) {
    // get all the needed setup values
    const lastMonthSheet = monthUtils.sheetForMonth(
      monthUtils.subMonths(month, 1),
    );
    let fromLastMonth = await getSheetValue(
      lastMonthSheet,
      `leftover-${category.id}`,
    );
    const carryover = await getSheetBoolean(
      lastMonthSheet,
      `carryover-${category.id}`,
    );

    if (
      (fromLastMonth < 0 && !carryover) || // overspend no carryover
      category.is_income || // tracking budget income categories
      (isTrackingBudget() && !carryover) // tracking budget regular categories
    ) {
      fromLastMonth = 0;
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
      skipAvailableClamp,
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
    const prioritiesSorted = new Int32Array(
      [...this.getPriorities()].sort((a, b) => a - b),
    );
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
    const perTemplateLocal = new Map<Template, number>();
    let byFlag = false;
    let remainder = 0;
    let scheduleFlag = false;
    let schedulePerTemplate: Map<string, number> | null = null;
    let byPerTemplate: Map<ByTemplate, number> | null = null;
    // switch on template type and calculate the amount for the line
    for (const template of t) {
      let newBudget = 0;
      switch (template.type) {
        case 'simple': {
          newBudget = CategoryTemplateContext.runSimple(template, this);
          break;
        }
        case 'refill': {
          newBudget = CategoryTemplateContext.runRefill(template, this);
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
            const ret = CategoryTemplateContext.runBy(this);
            newBudget = ret.toBudget;
            byPerTemplate = ret.perTemplateNeed;
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
              this.currency,
            );
            // Schedules assume that its to budget value is the whole thing so this
            // needs to remove the previous funds so they aren't double counted
            newBudget = ret.to_budget - toBudget;
            remainder = ret.remainder;
            schedulePerTemplate = ret.perScheduleMonthly;
            scheduleFlag = true;
          }
          break;
        }
        case 'average': {
          newBudget = await CategoryTemplateContext.runAverage(template, this);
          break;
        }
        default: {
          break;
        }
      }

      available = available - newBudget;
      toBudget += newBudget;
      perTemplateLocal.set(
        template,
        (perTemplateLocal.get(template) ?? 0) + newBudget,
      );
    }

    // `runBy` and `runSchedule` produce a single batch total per priority bucket
    // and the loop above credits it to whichever sibling template ran first. For
    // per-template UI projections we want to split that batch across all the
    // sibling templates. The breakdown is approximate (equal split for schedule,
    // weighted by goal amount for by); the actual budgeted total is unaffected.
    // Weight by each `by` template's effective per-month need (as computed
    // inside runBy) rather than its raw target amount, so per-row UI
    // projections reflect templates with shorter deadlines or different
    // repeat windows correctly.
    redistributeBatch(perTemplateLocal, t, 'by', template => {
      if (template.type !== 'by') return 0;
      return Math.max(0, byPerTemplate?.get(template) ?? 0);
    });
    // Schedules: weight by each schedule's actual monthly contribution as
    // computed by runSchedule, so the per-row UI projection reflects the
    // schedule's real cost rather than an equal split.
    redistributeBatch(perTemplateLocal, t, 'schedule', template => {
      if (template.type !== 'schedule') return 0;
      const monthly = schedulePerTemplate?.get(template.name.trim()) ?? 0;
      return Math.max(0, monthly);
    });

    let scale = 1;
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
        if (orig > 0) scale *= toBudget / orig;
      }
    }

    //round all budget values if needed
    if (this.hideDecimal) {
      // Capture the pre-round value so per-row contributions track the same
      // rounding delta as toBudget; otherwise perTemplateContribution would
      // sum to slightly more/less than the engine's actual budgeted amount.
      const preRound = toBudget;
      toBudget = this.removeFraction(toBudget);
      if (preRound !== 0) scale *= toBudget / preRound;
    }

    // don't overbudget when using a priority unless income category
    if (
      priority > 0 &&
      available < 0 &&
      !this.category.is_income &&
      !this.skipAvailableClamp
    ) {
      this.fullAmount = (this.fullAmount || 0) + toBudget;
      const adjusted = Math.max(0, toBudget + available);
      if (toBudget > 0) scale *= adjusted / toBudget;
      toBudget = adjusted;
      this.toBudgetAmount += toBudget;
    } else {
      this.fullAmount = (this.fullAmount || 0) + toBudget;
      this.toBudgetAmount += toBudget;
    }

    // Distribute the priority's final budget across its templates so per-row
    // projections reflect any clamping that occurred above. The limit branch
    // can produce a negative scale when the carried-over balance already
    // exceeds the cap; floor at 0 here so per-row UI projections never go
    // negative (engine totals are unaffected). Give the last entry the
    // residual so the per-row sum equals toBudget exactly even when scale
    // produces fractional cents.
    const perRowScale = Math.max(0, scale);
    const items = Array.from(perTemplateLocal);
    let remaining = Math.max(0, toBudget);
    items.forEach(([template, value], i) => {
      const isLast = i === items.length - 1;
      const share = isLast
        ? remaining
        : Math.max(0, Math.min(remaining, Math.round(value * perRowScale)));
      const existing = this.perTemplateContribution.get(template) ?? 0;
      this.perTemplateContribution.set(template, existing + share);
      remaining -= share;
    });
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

    if (toBudget > 0 && this.remainderWeight > 0) {
      let remaining = toBudget;
      for (let i = 0; i < this.remainder.length; i++) {
        const template = this.remainder[i];
        const isLast = i === this.remainder.length - 1;
        const share = isLast
          ? remaining
          : Math.round(toBudget * (template.weight / this.remainderWeight));
        const allocated = Math.max(0, Math.min(share, remaining));
        const existing = this.perTemplateContribution.get(template) ?? 0;
        this.perTemplateContribution.set(template, existing + allocated);
        remaining -= allocated;
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
      perTemplateContribution: this.perTemplateContribution,
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
  readonly skipAvailableClamp: boolean = false;
  private remainderWeight: number = 0;
  private toBudgetAmount: number = 0; // amount that will be budgeted by the templates
  private perTemplateContribution = new Map<Template, number>();
  private fullAmount: number | null = null; // the full requested amount, start null for remainder only cats
  private isLongGoal: boolean | null = null; //defaulting the goals to null so templates can be unset
  private goalAmount: number | null = null;
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
    skipAvailableClamp: boolean = false,
  ) {
    this.category = category;
    this.month = month;
    this.fromLastMonth = fromLastMonth;
    this.previouslyBudgeted = budgeted;
    this.currency = getCurrency(currencyCode);
    this.hideDecimal = hideDecimal;
    this.skipAvailableClamp = skipAvailableClamp;
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

    const availCategories = await db.getCategories();
    const incomeCategories = availCategories.filter(c => c.is_income);
    const availNames = new Set(
      incomeCategories.map(c => c.name.toLocaleLowerCase()),
    );
    const availIds = new Set(incomeCategories.map(c => c.id));

    const specialSources = new Set(['all income', 'available funds']);

    pt.forEach(t => {
      const raw = t.category;
      const lowered = raw.toLocaleLowerCase();
      // Accept either an income category name (text templates) or an income
      // category id (UI-managed templates from CategoryAutocomplete).
      if (
        specialSources.has(lowered) ||
        availNames.has(lowered) ||
        availIds.has(raw)
      ) {
        return;
      }
      throw new Error(
        `Category \x22${raw}\x22 is not found in available income categories`,
      );
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
      return templateContext.limitAmount - templateContext.fromLastMonth;
    }
  }

  static runRefill(
    template: RefillTemplate,
    templateContext: CategoryTemplateContext,
  ): number {
    return templateContext.limitAmount - templateContext.fromLastMonth;
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
    let date =
      template.starting && template.starting.length > 0
        ? template.starting
        : monthUtils.firstDayOfMonth(templateContext.month);

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
        dateShiftFunction = (date: string | Date, numPeriods: number) =>
          monthUtils.addMonths(date, numPeriods * 12);
        break;
      default:
        throw new Error(`Unrecognized periodic period: ${String(period)}`);
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
    const cat = template.category.toLocaleLowerCase();
    const prev = template.previous;
    let sheetName;
    let monthlyIncome;

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
      // Text templates address income categories by name (e.g. `#template
      // 10% of Salary`); the UI's CategoryAutocomplete stores the category
      // id. Accept either form.
      const incomeCat = (await db.getCategories()).find(
        c =>
          c.is_income &&
          (c.id === template.category || c.name.toLocaleLowerCase() === cat),
      );
      if (!incomeCat) {
        throw new Error(
          `Income category "${template.category}" not found for percentage template`,
        );
      }
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

    // negate as sheet value is cost ie negative
    let average = -(sum / template.numMonths);

    if (template.adjustment !== undefined && template.adjustmentType) {
      switch (template.adjustmentType) {
        case 'percent': {
          const adjustmentFactor = 1 + template.adjustment / 100;
          average = adjustmentFactor * average;
          break;
        }
        case 'fixed': {
          average += amountToInteger(
            template.adjustment,
            templateContext.currency.decimalPlaces,
          );
          break;
        }

        default:
        //no valid adjustment was found
      }
    }

    return Math.round(average);
  }

  static runBy(templateContext: CategoryTemplateContext): {
    toBudget: number;
    perTemplateNeed: Map<ByTemplate, number>;
  } {
    const byTemplates: ByTemplate[] = templateContext.templates.filter(
      t => t.type === 'by',
    );
    const savedInfo = [];
    let totalNeeded = 0;
    let workingShortNumMonths;
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
      if (
        workingShortNumMonths === undefined ||
        numMonths < workingShortNumMonths
      ) {
        workingShortNumMonths = numMonths;
      }
    }

    // calculate needed funds per template
    const shortNumMonths = workingShortNumMonths || 0;
    const perTemplateNeed = new Map<ByTemplate, number>();
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
      perTemplateNeed.set(template, amount);
      totalNeeded += amount;
    }
    const toBudget = Math.round(
      (totalNeeded - templateContext.fromLastMonth) / (shortNumMonths + 1),
    );
    return { toBudget, perTemplateNeed };
  }
}

// `runBy` and `runSchedule` are batched: they compute a single budget number
// for all sibling templates of the same type at a given priority, and the
// caller loop credits that total to whichever template was iterated first.
// Split the batch total across all siblings using `weightOf` so the
// per-template projection map reflects each template's share. The total
// allocated is preserved (last sibling absorbs any rounding remainder).
function redistributeBatch<T extends Template>(
  perTemplateLocal: Map<Template, number>,
  templates: Template[],
  type: T['type'],
  weightOf: (template: T) => number,
) {
  const siblings = templates.filter(
    (template): template is T => template.type === type,
  );
  if (siblings.length < 2) return;

  let total = 0;
  for (const sibling of siblings) {
    total += perTemplateLocal.get(sibling) ?? 0;
    perTemplateLocal.set(sibling, 0);
  }
  if (total === 0) return;

  const totalWeight = siblings.reduce((sum, s) => sum + weightOf(s), 0);
  if (totalWeight <= 0) {
    // Fall back to an equal split if no weights are usable.
    let remaining = total;
    siblings.forEach((sibling, i) => {
      const isLast = i === siblings.length - 1;
      const share = isLast ? remaining : Math.round(total / siblings.length);
      const allocated = Math.max(0, Math.min(share, remaining));
      perTemplateLocal.set(
        sibling,
        (perTemplateLocal.get(sibling) ?? 0) + allocated,
      );
      remaining -= allocated;
    });
    return;
  }

  let remaining = total;
  siblings.forEach((sibling, i) => {
    const isLast = i === siblings.length - 1;
    const share = isLast
      ? remaining
      : Math.round((total * weightOf(sibling)) / totalWeight);
    const allocated = Math.max(0, Math.min(share, remaining));
    perTemplateLocal.set(
      sibling,
      (perTemplateLocal.get(sibling) ?? 0) + allocated,
    );
    remaining -= allocated;
  });
}
