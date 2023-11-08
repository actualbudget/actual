export async function goalsRemainder(
  template,
  budgetAvailable,
  remainder_scale,
  to_budget,
) {
  if (remainder_scale >= 0) {
    to_budget +=
      remainder_scale === 0
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
  return { to_budget };
}
