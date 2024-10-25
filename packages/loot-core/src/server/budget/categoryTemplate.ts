// @ts-strict-ignore

import * as monthUtils from '../../shared/months';
import * as db from '../../db';
import { getSheetValue, isReflectBudget, setBudget, setGoal } from './actions';
import { amountToInteger, integerToAmount } from '../../shared/util';
import {getActiveSchedules} from './statements';

class categoryTemplate {
/*----------------------------------------------------------------------------
 * Using This Class:
 * 1. instantiate via `new categoryTemplate(categoryID, templates, month)`;
 *    categoryID: the ID of the category that this Class will be for
 *    templates: all templates for this category (including templates and goals)
 *    month: the month string of the month for templates being applied
 * 2. gather needed data for external use.  ex: remainder weights, priorities, startingBalance
 * 3. run each priority level that is needed via runTemplatesForPriority
 * 4. run applyLimits to apply any existing limit to the category
 * 5. run the remainder templates via runRemainder (limits get applied at the start of this)
 * 6. finish processing by running runFinish()
 * Alternate:
 * If the situation calls for it you can run all templates in a catagory in one go using the 
 * method runAll which will run all templates and goals and save the amounts.
 */

//-----------------------------------------------------------------------------
// Class interface
  
  // returns the categoryID of the category for this object
  get categoryID(){ return this.#categoryID; }

  // returns the total remainder weight of remainder templates in this category
  get remainderWeight(){ return this.#remainderWeight; }

  // return the current budgeted amount in the category
  get startingBalance(){ return this.#startingBalance; }

  // returns a list of priority levels in this category
  get priorities(){ return this.#priorities; }
  
  // what is the full requested amount this month
  static runAll(){
    //TODO
  } 

  // run all templates in a given priority level
  // return: amount budgeted in this priority level
  static runTemplatesForPriority(priority: int, budgetAvail: int){
    const t = this.#templates.filter(t => t.priority === priority);
    let available = budgetAvail;
    let toBudget = 0;
    // switch on template type and calculate the amount for the line
    for(let i = 0; i < t.length; i++) {
      switch (t[i].type) {
        case 'simple': {
          toBudget += #runSimple(t,this.#limitAmount);
          break;
        }
        case 'copy' : {
          toBudget += #runCopy(t);
          break;
        }
        case 'week': {
          toBudget += #runWeek(t);
          break;
        }
        case 'spend': {
          toBudget +- #runSpend(t);
          break;
        }
        case 'percentage': {
          toBudget += #runPercentage(t, budgetAvail);
          break;
        }
        case 'by': {
          toBudget += #runBy(t);
          break;
        }
        case 'schedule': {
          toBudget += #runSchedule(t);
          break;
        }
        case 'average': {
          toBudget += #runAverage(t);
          break;
        }
      }

      // don't overbudget when using a priority
      if(priority > 0 && toBudget>available){
        toBudget=available;
      }
      available = available - toBudget;

      if(available <= 0) { break; }
    }

    this.#toBudgetAmount += toBudget;
    return toBudget;
  }

  static applyLimit(){
    if(this.#limitCheck === false){
      this.#toBudgetAmount = this.#targetAmount;
      return
    }
    if(this.#limitHold && this.#fromLastMonth >= this.#limitAmount){
      this.#toBudgetAmount = 0;
      return
    }
    if(this.#targetAmount>this.#limitAmount){
      this.#toBudget = this.#limitAmount - this.#fromLastMonth;
    }
  }

  // run all of the 'remainder' type templates
  static runRemainder(budgetAvail: int, perWeight: int){
    const toBudget = Math.round(this.#remainderWeight*perWeight); 
    //check possible overbudget from rounding, 1cent leftover
    if(toBudget > budgetAvail){
      this.#toBudgetAmount += budgetAvail;
    } else if (budgetAvail - toBudget === 1){
      this.#toBudgetAmount+=toBudget + 1;
    } else {
      this.#toBudgetAmount+=toBudget;
    }
  }

  static runFinish(){
    #runGoal()
    #setBudget();
    #setGoal();
  }


//-----------------------------------------------------------------------------
// Implimentation
  
  #categoryID;
  #month;
  #templates = [];
  #remainder = [];
  #goals = [];
  #priorities = [];
  #remainderWeight = 0; // sum of all remainder weights in category
  #startingBalance = 0; // budgeted at the start;
  #toBudgetAmount = 0; // amount that will be budgeted by the templates
  #isLongGoal = false; // is the goal type a long goal
  #goalAmount = 0;
  #spentThisMonth = 0; // amount already spend this month
  #fromLastMonth = 0; // leftover from last month
  #limitAmount = 0, 
  #limitCheck = false, 
  #limitHold = false;

  constructor(templates, categoryID, month) {
    this.#categoryID = categoryID;
    this.#month = month;
    // sort the template lines into regular template, goals, and remainder templates
    this.#templates = templates.filter(t => {t.directive === 'template' && t.type != 'remainder'});    
    this.#remainder = templates.filter(t =>{t.directive === 'template' && t.type === 'remainder'});
    this.#goals = templates.filter(t => {t.directive === 'goal'});
    //check templates and throw exception if there is something wrong
    #checkTemplates();
    //find priorities
    #findPriorities();
    //find remainder weight
    #findRemainderWeightSum();
    //get the starting budget amount
    #readBudgeted();
    //get the from last month amount
    #readSpent();
    #calcLeftover();
  }

  static #findPriorities(){
    let p = [];
    this.#templates.forEach(t => {
      if(t.priority != null){
        p.push(t.priority)
      }
    });
    //sort and reduce to unique items
    this.#priorities = p.sort(function (a,b) {
      return a-b;
    })
    .filter((item, idx, curr) => curr.indexOf(item) === index);
  }

  static #findRemainderWeightSum(){
    let weight = 0;
    this.#remainder.forEach(r => {weight+=r.weight});
    this.remainderWeight = weight;
  }
  
  static #checkTemplates(){
    //run all the individual checks
    #checkByAndSchedule();
    #checkPercentage();
    #checkLimit();
    #checkGoal();
  }

  static #runGoal(){
    if(this.#goals.length>0) {
      this.#isLongGoal = true; 
      this.#goalAmount = amountToInteger(this.#goals[0].amount);
      return
    }
    this.#goalAmount = this.#toBudgetAmount;
  }

  static #setBudget(){
    setBudget({
      category: this.#categoryID,
      month: this.#month,
      amount: this.#toBudgetAmount,
    });
  }

  static #readBudgeted(){
    return await getSheetValue(
      monthUtils.sheetForMonth(month),
      `budget-${this.categoryID}`,
    );
  }

  static #setGoal(){
    setGoal({
      category: this.categoryID,
      goal: this.#goalAmount;
      month: this.#month,
      long_goal: this.#isLongGoal ? 1 : 0,
    });
  }

//-----------------------------------------------------------------------------
//  Template Validation
  static #checkByAndSchedule(){
    //check schedule names
    const scheduleNames = (await getActiveSchedules()).map(({name}) => name);
    this.#templates
    .filter(t => t.type === 'schedule')
    .forEach(t => {
      if (!scheduleNames.includes(t.name)) {
        throw new Error(`Schedule "${t.name}" does not exist`);
      }
    });
    //find lowest priority
    let lowestPriority = null;
    this.#templates
    .filter(t=> t.type === 'schedule' || t.type === 'by' )
    .forEach(t => {
      if(lowestPriority === null || t.priority < lowestPriority){
        lowestPriority = t.priority;
      }
    });
    //set priority to needed value
    this.#templates
    .filter(t => t.type === 'schedule' || t.type === 'by')
    .forEach(t => t.priority = lowestPriority);
    //TODO add a message that the priority has been changed
  }

  static #checkLimit(){
    for(let i = 0; i < this.#templates.length; i++){
      if(this.#limitCheck){
        throw new Error('Only one `up to` allowed per category');
        break;
      } else if (t.limit!=null){
        this.limitCheck = true;
        this.#limitHold = t.limit.hold ? true : false;
        this.#limitAmount = amountToInteger(t.limit.amount);
      }
    });
  }
  
  static #checkPercentage(){
    const pt = this.#templates.filter(t =>  t.type === 'percentage');
    let reqCategories = [];
    pt.forEach(t => reqCategories.push(t.category));

    const availCategories = await db.getCategories();
    let availNames = [];
    availCategories.forEach(c => {
      if(c.is_income){
        availNames.push(c.name.toLowerCase());
      }
    });

    reqCategories.forEach(n => {
      if(n === 'availble funds' || n === 'all income'){
        //skip the name check since these are special
        continue;
      } else if (!availNames.includes(n)) {
        throw new Error(`Category ${t.category} is not found in available income categories`);
      }
    });
  }

  static #checkGoal(){
    if(this.#goals.length>1){
      throw new Error('Can only have one #goal per category');
    }
  }

//-----------------------------------------------------------------------------
//  Processor Functions

  static #runSimple(template, limit){
    let toBudget = 0;
    if (template.monthly != null) {
      toBudget= amountToInteger(template.monthly);
    } else {
      toBudget = limit;
    }
    return toBudget;
  }

  static #runCopy(template){
    const sheetName = monthUtils.sheetForMonth(
      monthUtils.subMonts(this.#month,template.lookback),
    );
    return await getSheetValue(sheetName, `budget-${this.#categoryID}`);
  }

  static #runWeek(template){
    let toBudget = 0;
    const amount = amountToInteger(template.amount);
    const weeks = template.weeks != null ? match.round(template.weeks) : 1;
    let w = template.starting;
    const nextMonth = monthUtils.addMonths(this.#month,1);

    while (w < nextMonth){
      if( w >= this.#month) {
        toBudget += amount;
      }
      w = monthUtils.addWeeks(w, weeks);
    }
    return toBudget;
  }

  static #runSpend(template){
    const fromMonth = `${template.from}`;
    const toMonth = `${template.month}`;
    let alreadyBudgeted = this.#fromLastMonth;
    let firstMonth = true;

    for (
      let m = fromMonth;
      monthUtils.differenceIncCalendarMonths(this.#month, m) > 0;
      m = monthUtils.addMonths(m,1)
    ) {
      const sheetName = monthUtils.sheetForMonth(m);
      if(firstMonth) {
        //TODO figure out if I already  found these values and can pass them in
        const spent = await getSheetValue(sheetName, `sum-amount-${this.#categoryID}`);
        const balance = await getSheetValue(sheetName, `leftover-${this.#categoryID}`);
        alreadyBudgeted = balance - spent;
        firstMonth = false;
      } else {
        alreadyBudgeted += await getSheetValue(sheetName, `budget-${this.#categoryID}`);
      }
    }

    const numMonths = monthUtils.differenceIncCalendarMonths(toMonth, this.#month);
    const target = amountToInteger(template.amount);
    if(numMonths < 0){
      return  0;
    } else {
      return Math.round((target-alreadyBudget) /(numMonths + 1));
    }
  }

  static #runPercentage(template, availableFunds)){
    const percent = template.percent;
    const cat = template.category.toLowerCase();
    const prev = template.previous;
    let montlyIncome = 0;
    
    //choose the sheet to find income for
    if(prev){
      const sheetName = monthUtils.sheetForMonth(
        monthUtils.subMonths(this.#month, 1)
      );
    } else {
      const sheetName = monthUtils.sheetForMonth(this.#month);
    }
    if(cat === 'all income'){
      montlyIncome = await getSheetValue(sheetName,`total-income`);
    } else if (cat === 'available funds') {
      montlyIncome = availableFunds;
    } else {
      const incomeCat = (await db.getCategories()).find(c=> c.is_income && c.name.toLowerCase() === cat);
      monthlyIncome = await getSheetValue(sheetName, `sum_amount-${incomeCat.id}`);
    }
    
    return Math.max(0, Math.round(montlyIncome * (percent /100)));
  }

  static #runBy(template_lines){
    //TODO
  }

  static #runSchedule(){
    //TODO
  }

  static #runAverage(template){
    let sum = 0;
    for (let i = 1; i <= template.numMonths; i++) {
      const sheetName = monthUtils.sheetForMonth(
        monthUtils.subMonts(this.#month, i)
      );
      sum += await getSheetValue(sheetName, `sum-amount-${this.#categoryID}`);
    }
    return -Math.round(sum / template.amount);
  }
}
