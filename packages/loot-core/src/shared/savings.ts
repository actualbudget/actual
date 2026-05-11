export function calculateMonthlyContribution(
  targetAmount: number,
  months: number,
): number {
  if (months <= 0) return targetAmount;
  return Math.ceil(targetAmount / months);
}

export function calculateRemainingAmount(
  targetAmount: number,
  savedAmount: number,
): number {
  return Math.max(targetAmount - savedAmount, 0);
}

export function calculateProgress(
  targetAmount: number,
  savedAmount: number,
): number {
  if (targetAmount <= 0) return 0;
  return Math.max(Math.min(savedAmount / targetAmount, 1), 0);
}

export function isCompleted(
  targetAmount: number,
  savedAmount: number,
): boolean {
  return targetAmount > 0 && savedAmount >= targetAmount;
}
