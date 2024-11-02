// @ts-strict-ignore

import * as monthUtils from '../../shared/months';
import { amountToInteger } from '../../shared/util';
import * as db from '../db';

import { getSheetValue, setBudget, setGoal } from './actions';
import { getActiveSchedules } from './statements';
//import { Template } from './types/templates';

export class categoryTemplate {
  /*----------------------------------------------------------------------------
   * Using This Class:
   * 1. instantiate via `await categoryTemplate.init(templates, categoryID, month)`;
   *    templates: all templates for this category (including templates and goals)
   *    categoryID: the ID of the category that this Class will be for
   *    month: the month string of the month for templates being applied
   * 2. gather needed data for external use.  ex: remainder weights, priorities
   * 3. run each priority level that is needed via runTemplatesForPriority
   * 4. run applyLimits to apply any existing limit to the category
   * 5. run the remainder templates via runRemainder (limits get applied at the start of this)
   * 6. finish processing by running runFinish()
   * Alternate:
   * If the situation calls for it you can run all templates in a catagory in one go using the
   * method runAll which will run all templates and goals for reference, and can optionally be saved
   */

  //-----------------------------------------------------------------------------
  // Class interface

  // set up the class and check all templates
  static async init(templates, categoryID: string, month) {
    // get all the needed setup values
    const fromLastMonth = await getSheetValue(
      monthUtils.sheetForMonth(monthUtils.subMonths(month, 1)),
      `leftover-${categoryID}`,
    );
    // run all checks
    await categoryTemplate.checkByAndSchedule(templates);
    await categoryTemplate.checkPercentage(templates);
    // call the private constructor
    return new categoryTemplate(templates, categoryID, month, fromLastMonth);
  }

  getPriorities() {
    return this.priorities;
  }
  getRemainderWeight() {
    return this.remainderWeight;
  }

  // what is the full requested amount this month
  runAll(available: number) {
    let toBudget: number = 0;
    this.priorities.forEach(async p => {
      toBudget += await this.runTemplatesForPriority(p, available);
    });
    //TODO does this need to run limits?
    return toBudget;
  }

  // run all templates in a given priority level
  // return: amount budgeted in this priority level
  async runTemplatesForPriority(priority: number, budgetAvail: number) {
    if (!this.priorities.includes(priority)) return 0;

    const t = this.templates.filter(t => t.priority === priority);
    let available = budgetAvail || 0;
    let toBudget = 0;
    // switch on template type and calculate the amount for the line
    for (let i = 0; i < t.length; i++) {
      switch (t[i].type) {
        case 'simple': {
          toBudget += this.runSimple(t[i], this.limitAmount);
          break;
        }
        case 'copy': {
          toBudget += await this.runCopy(t[i]);
          break;
        }
        case 'week': {
          toBudget += this.runWeek(t[i]);
          break;
        }
        case 'spend': {
          toBudget += await this.runSpend(t[i]);
          break;
        }
        case 'percentage': {
          toBudget += await this.runPercentage(t[i], budgetAvail);
          break;
        }
        case 'by': {
          //TODO add the logic to run all of these at once
          toBudget += this.runBy(t[i], this.templates, 0, budgetAvail);
          break;
        }
        case 'schedule': {
          toBudget += this.runSchedule(t[i]);
          break;
        }
        case 'average': {
          toBudget += await this.runAverage(t[i]);
          break;
        }
      }

      // don't overbudget when using a priority
      if (priority > 0 && toBudget > available) {
        toBudget = available;
      }
      available = available - toBudget;

      if (priority > 0 && available <= 0) {
        break;
      }
    }

    this.toBudgetAmount += toBudget;
    return toBudget;
  }

  applyLimit(): number {
    if (this.limitCheck === false) {
      return 0;
    }
    if (this.limitHold && this.fromLastMonth >= this.limitAmount) {
      const orig = this.toBudgetAmount;
      this.toBudgetAmount = 0;
      return orig;
    }
    if (this.toBudgetAmount + this.fromLastMonth > this.limitAmount) {
      const orig = this.toBudgetAmount;
      this.toBudgetAmount = this.limitAmount - this.fromLastMonth;
      return orig - this.toBudgetAmount;
    }
  }

  // run all of the 'remainder' type templates
  runRemainder(budgetAvail: number, perWeight: number) {
    const toBudget = Math.round(this.remainderWeight * perWeight);
    //check possible overbudget from rounding, 1cent leftover
    if (toBudget > budgetAvail) {
      this.toBudgetAmount += budgetAvail;
    } else if (budgetAvail - toBudget === 1) {
      this.toBudgetAmount += toBudget + 1;
    } else {
      this.toBudgetAmount += toBudget;
    }
    return toBudget;
  }

  runFinish() {
    this.runGoal();
    this.setBudget();
    this.setGoal();
  }

  //-----------------------------------------------------------------------------
  // Implimentation
  readonly categoryID: string; //readonly so we can double check the category this is using
  private month: string;
  private templates = [];
  private remainder = [];
  private goals = [];
  private priorities: number[] = [];
  private remainderWeight: number = 0;
  private toBudgetAmount: number = null; // amount that will be budgeted by the templates
  private isLongGoal: boolean = null; //defaulting the goals to null so templates can be unset
  private goalAmount: number = null;
  private fromLastMonth = 0; // leftover from last month
  private limitAmount = null;
  private limitCheck = false;
  private limitHold = false;

  private constructor(
    templates,
    categoryID: string,
    month: string,
    fromLastMonth: number,
  ) {
    this.categoryID = categoryID;
    this.month = month;
    this.fromLastMonth = fromLastMonth;
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
        if (t.directive === 'goal') this.goals.push(t);
      });
    }
    // check limits here since it needs to save states inside the object
    this.checkLimit();
    this.checkSpend();

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
      this.isLongGoal = true;
      this.goalAmount = amountToInteger(this.goals[0].amount);
      return;
    }
    if (this.goals.length > 1) {
      //TODO make this not hard fail
      throw new Error(`Can only have one #goal per category`);
    }
    this.goalAmount = this.toBudgetAmount;
  }

  private setBudget() {
    setBudget({
      category: this.categoryID,
      month: this.month,
      amount: this.toBudgetAmount,
    });
  }

  private setGoal() {
    setGoal({
      category: this.categoryID,
      goal: this.goalAmount,
      month: this.month,
      long_goal: this.isLongGoal ? 1 : 0,
    });
  }

  private async getFromLastMonth() {
    const sheetName = monthUtils.sheetForMonth(
      monthUtils.subMonths(this.month, 1),
    );
    //TODO see if this is accurate from the sheet for the balance last month
    this.fromLastMonth = await getSheetValue(
      sheetName,
      `leftover-${this.categoryID}`,
    );
  }

  //-----------------------------------------------------------------------------
  //  Template Validation
  static async checkByAndSchedule(templates) {
    //check schedule names
    const scheduleNames = (await getActiveSchedules()).map(({ name }) => name);
    templates
      .filter(t => t.type === 'schedule')
      .forEach(t => {
        if (!scheduleNames.includes(t.name.trim())) {
          throw new Error(`Schedule ${t.name.trim()} does not exist`);
        }
      });
    //find lowest priority
    let lowestPriority = null;
    templates
      .filter(t => t.type === 'schedule' || t.type === 'by')
      .forEach(t => {
        if (lowestPriority === null || t.priority < lowestPriority) {
          lowestPriority = t.priority;
        }
      });
    //warn if priority needs fixed
    templates
      .filter(t => t.type === 'schedule' || t.type === 'by')
      .forEach(t => {
        if (t.priority !== lowestPriority) {
          throw new Error(
            `Schedule and By templates must be the same priority level.  Fix by setting all Schedule and By templates to priority level ${lowestPriority}`,
          );
          //t.priority = lowestPriority;
        }
      });
  }

  static async checkPercentage(templates) {
    const pt = templates.filter(t => t.type === 'percentage');
    const reqCategories = [];
    pt.forEach(t => reqCategories.push(t.category.toLowerCase()));

    const availCategories = await db.getCategories();
    const availNames = [];
    availCategories.forEach(c => {
      if (c.is_income) {
        availNames.push(c.name.toLowerCase());
      }
    });

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
    for (let i = 0; i < this.templates.length; i++) {
      const t = this.templates[i];
      if (this.limitCheck && t.limit) {
        throw new Error('Only one `up to` allowed per category');
      } else if (t.limit) {
        this.limitCheck = true;
        this.limitHold = t.limit.hold ? true : false;
        this.limitAmount = amountToInteger(t.limit.amount);
      }
    }
  }

  private checkSpend() {
    const st = this.templates.filter(t => t.type=== 'spend');
    if(st.length>1){
      throw new Error('Only one spend template is allowed per category');
    }
  }

  //-----------------------------------------------------------------------------
  //  Processor Functions

  private runSimple(template, limit) {
    let toBudget = 0;
    if (template.monthly != null) {
      toBudget = amountToInteger(template.monthly);
    } else {
      toBudget = limit || 0;
    }
    return toBudget;
  }

  private async runCopy(template) {
    const sheetName = monthUtils.sheetForMonth(
      monthUtils.subMonths(this.month, template.lookBack),
    );
    return await getSheetValue(sheetName, `budget-${this.categoryID}`);
  }

  private runWeek(template) {
    let toBudget = 0;
    const amount = amountToInteger(template.amount);
    const weeks = template.weeks != null ? Math.round(template.weeks) : 1;
    let w = template.starting;
    const nextMonth = monthUtils.addMonths(this.month, 1);

    while (w < nextMonth) {
      if (w >= this.month) {
        toBudget += amount;
      }
      w = monthUtils.addWeeks(w, weeks);
    }
    return toBudget;
  }

  private async runSpend(template) {
    const fromMonth = `${template.from}`;
    const toMonth = `${template.month}`;
    let alreadyBudgeted = this.fromLastMonth;
    let firstMonth = true;

    for (
      let m = fromMonth;
      monthUtils.differenceInCalendarMonths(this.month, m) > 0;
      m = monthUtils.addMonths(m, 1)
    ) {
      const sheetName = monthUtils.sheetForMonth(m);
      if (firstMonth) {
        //TODO figure out if I already  found these values and can pass them in
        const spent = await getSheetValue(
          sheetName,
          `sum-amount-${this.categoryID}`,
        );
        const balance = await getSheetValue(
          sheetName,
          `leftover-${this.categoryID}`,
        );
        alreadyBudgeted = balance - spent;
        firstMonth = false;
      } else {
        alreadyBudgeted += await getSheetValue(
          sheetName,
          `budget-${this.categoryID}`,
        );
      }
    }

    const numMonths = monthUtils.differenceInCalendarMonths(
      toMonth,
      this.month,
    );
    const target = amountToInteger(template.amount);
    if (numMonths < 0) {
      return 0;
    } else {
      return Math.round((target - alreadyBudgeted) / (numMonths + 1));
    }
  }

  private async runPercentage(template, availableFunds) {
    const percent = template.percent;
    const cat = template.category.toLowerCase();
    const prev = template.previous;
    let sheetName;
    let monthlyIncome = 1;

    //choose the sheet to find income for
    if (prev) {
      sheetName = monthUtils.sheetForMonth(monthUtils.subMonths(this.month, 1));
    } else {
      sheetName = monthUtils.sheetForMonth(this.month);
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

  private async runAverage(template) {
    let sum = 0;
    for (let i = 1; i <= template.numMonths; i++) {
      const sheetName = monthUtils.sheetForMonth(
        monthUtils.subMonths(this.month, i),
      );
      sum += await getSheetValue(sheetName, `sum-amount-${this.categoryID}`);
    }
    return -Math.round(sum / template.amount);
  }

  private runBy(template, allTemplates, l: number, remainder: number) {
    let target = 0;
    let targetMonth = `${allTemplates[l].month}`;
    let numMonths = monthUtils.differenceInCalendarMonths(
      targetMonth,
      this.month,
    );
    const repeat =
      template.type === 'by' ? template.repeat : (template.repeat || 1) * 12;
    while (numMonths < 0 && repeat) {
      targetMonth = monthUtils.addMonths(targetMonth, repeat);
      numMonths = monthUtils.differenceInCalendarMonths(
        allTemplates[l].month,
        this.month,
      );
    }
    if (l === 0) remainder = this.fromLastMonth;
    remainder = amountToInteger(allTemplates[l].amount) - remainder;
    if (remainder >= 0) {
      target = remainder;
      remainder = 0;
    } else {
      target = 0;
      remainder = Math.abs(remainder);
    }
    return numMonths >= 0 ? Math.round(target / (numMonths + 1)) : 0;
  }

  private runSchedule(template_lines) {
    //TODO add this......
    //TODO remember to trim the schedule name
    return 0;
  }
}
