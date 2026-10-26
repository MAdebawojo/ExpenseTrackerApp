import { getCategorySummaries, roundToCents } from './expenseCalculations.js';
import { formatDate, parseISODate } from './formatters.js';

const DAILY_TREND_MAX_DAYS = 60;

/** Returns categories with spending, ordered from highest to lowest amount. */
export function getSpendingByCategory(categories, expenses) {
  return getCategorySummaries(categories, expenses)
    .filter((category) => category.spent > 0)
    .sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name));
}

/**
 * Groups expenses by date for spans up to 60 days, or by calendar month for
 * longer spans. Invalid dates are excluded because they cannot be placed on a
 * timeline.
 */
export function getSpendingTrend(expenses) {
  const datedExpenses = expenses.filter((expense) => parseISODate(expense.date));
  if (datedExpenses.length === 0) {
    return { granularity: 'day', buckets: [] };
  }

  const sortedDates = datedExpenses.map((expense) => expense.date).sort();
  const firstDate = parseISODate(sortedDates[0]);
  const lastDate = parseISODate(sortedDates.at(-1));
  const spanInDays =
    (Date.UTC(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()) -
      Date.UTC(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate())) /
    86_400_000;
  const granularity = spanInDays <= DAILY_TREND_MAX_DAYS ? 'day' : 'month';
  const totalsByKey = new Map();

  datedExpenses.forEach((expense) => {
    const key = granularity === 'day' ? expense.date : expense.date.slice(0, 7);
    totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + Number(expense.amount));
  });

  const buckets = [...totalsByKey.entries()]
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, amount]) => {
      const date = parseISODate(granularity === 'day' ? key : `${key}-01`);
      return {
        key,
        label:
          granularity === 'day'
            ? formatDate(key)
            : date.toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }),
        total: roundToCents(amount),
      };
    });

  return { granularity, buckets };
}
