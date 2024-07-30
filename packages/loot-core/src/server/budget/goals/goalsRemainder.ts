// @ts-strict-ignore
export async function goalsRemainder(
  template,
  budgetAvailable,
  remainder_scale,
  to_budget,
  set_budget,
) {
  to_budget = set_budget;


  if (remainder_scale >= 0) {
    to_budget +=
      (remainder_scale === 0 && template.payDistributeTemplateActive) //Was getting 1cent error when Paydistribution was active, this fixed it
        ? Math.round(template.weight)
        : Math.round(remainder_scale * template.weight);
    // can over budget with the rounding, so checking that
    if (to_budget >= budgetAvailable) {
      to_budget = budgetAvailable;
      // check if there is 1 cent leftover from rounding
    } else if (budgetAvailable - to_budget === 1) {
      to_budget = to_budget + 1;
    }
  }
  set_budget = to_budget;
  return { to_budget, set_budget };
}

export function findRemainder(priority_list, categories, category_templates) {
  // find all remainder templates, place them at highest priority
  let remainder_found;
  let remainder_weight_total = 0;
  const remainder_priority = priority_list[priority_list.length - 1] + 1;
  for (let c = 0; c < categories.length; c++) {
    const category = categories[c];
    const templates = category_templates[category.id];
    if (templates) {
      for (let i = 0; i < templates.length; i++) {
        if (templates[i].type === 'remainder') {
          templates[i].priority = remainder_priority;
          remainder_weight_total += templates[i].weight;
          remainder_found = true;
        }
      }
    }
  }
  return {
    remainder_found,
    remainder_priority,
    remainder_weight_total,
  };
}
