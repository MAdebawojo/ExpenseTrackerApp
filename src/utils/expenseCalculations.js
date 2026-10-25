/**
 * Pure helper functions for expense and budget math.
 * Components should use these instead of calculating totals inline.
 */

/** Rounds a number to 2 decimal places to avoid floating point noise. */
export function roundToCents(value) {
  return Math.round(value * 100) / 100;
}

/** Sum of all category budgets. */
export function calculateTotalBudget(categories) {
  return roundToCents(categories.reduce((total, category) => total + Number(category.budget), 0));
}

/** Sum of all recorded expenses. */
export function calculateTotalExpenses(expenses) {
  return roundToCents(expenses.reduce((total, expense) => total + Number(expense.amount), 0));
}

/** Total budget minus total expenses. May be negative. */
export function calculateRemainingBalance(categories, expenses) {
  return roundToCents(calculateTotalBudget(categories) - calculateTotalExpenses(expenses));
}

/** Sum of the expenses that belong to one category. */
export function calculateCategorySpent(expenses, categoryId) {
  return roundToCents(
    expenses
      .filter((expense) => expense.categoryId === categoryId)
      .reduce((total, expense) => total + Number(expense.amount), 0)
  );
}

/**
 * Calculates budget usage for a category.
 * `percentage` is null when positive spending is divided by a zero budget.
 */
export function calculateCategoryBudgetStatus(spent, budget) {
  const spentCents = Math.round(Number(spent) * 100);
  const budgetCents = Math.round(Number(budget) * 100);

  if (budgetCents === 0) {
    const hasSpending = spentCents > 0;
    return {
      percentage: hasSpending ? null : 0,
      progress: hasSpending ? 100 : 0,
      status: hasSpending ? 'alert' : 'normal',
    };
  }

  const ratio = spentCents / budgetCents;
  const percentage = Math.round(ratio * 10000) / 100;
  const status =
    ratio >= 1
      ? 'alert'
      : ratio >= 0.8
        ? 'warning'
        : 'normal';

  return {
    percentage,
    progress: Math.min(percentage, 100),
    status,
  };
}

/** Category budget minus what has been spent in it. May be negative. */
export function calculateCategoryRemaining(category, expenses) {
  return roundToCents(Number(category.budget) - calculateCategorySpent(expenses, category.id));
}

/** Available budget is the unspent portion, never less than zero. */
export function calculateAvailableBudget(category, expenses) {
  return Math.max(0, calculateCategoryRemaining(category, expenses));
}

/**
 * Transfers available budget between categories without changing expenses.
 * Returns a validation error code and available amount on failure.
 */
export function reallocateCategoryBudget(categories, expenses, sourceId, destinationId, amount) {
  if (!sourceId || !destinationId) {
    return { success: false, error: 'select_categories' };
  }
  if (sourceId === destinationId) {
    return { success: false, error: 'same_category' };
  }

  const source = categories.find((category) => category.id === sourceId);
  const destination = categories.find((category) => category.id === destinationId);
  if (!source || !destination) {
    return { success: false, error: 'unknown_category' };
  }

  const amountText = String(amount).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(amountText)) {
    return { success: false, error: 'invalid_amount' };
  }

  const amountCents = Math.round(Number(amountText) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { success: false, error: 'invalid_amount' };
  }

  const availableCents = Math.max(
    0,
    Math.round(Number(source.budget) * 100) -
      Math.round(calculateCategorySpent(expenses, sourceId) * 100)
  );
  const available = availableCents / 100;
  if (availableCents === 0) {
    return { success: false, error: 'no_available_funds', available };
  }
  if (amountCents > availableCents) {
    return { success: false, error: 'insufficient_funds', available };
  }

  return {
    success: true,
    categories: categories.map((category) => {
      if (category.id === sourceId) {
        return { ...category, budget: (Math.round(Number(category.budget) * 100) - amountCents) / 100 };
      }
      if (category.id === destinationId) {
        return { ...category, budget: (Math.round(Number(category.budget) * 100) + amountCents) / 100 };
      }
      return category;
    }),
  };
}

/**
 * Returns each category with its calculated `spent`, `remaining`
 * and `expenseCount` values. Does not modify the input.
 */
export function getCategorySummaries(categories, expenses) {
  return categories.map((category) => ({
    ...category,
    spent: calculateCategorySpent(expenses, category.id),
    remaining: calculateCategoryRemaining(category, expenses),
    expenseCount: expenses.filter((expense) => expense.categoryId === category.id).length,
  }));
}

/** Returns a new array sorted by date, newest first (or oldest first). */
export function sortExpensesByDate(expenses, order = 'newest') {
  const direction = order === 'oldest' ? 1 : -1;
  return [...expenses].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -direction : direction;
    if (a.id === b.id) return 0;
    return a.id < b.id ? -direction : direction;
  });
}

/**
 * Returns a new array grouped by category name (A–Z), newest first within
 * each category. Expenses with an unknown category go last.
 */
export function sortExpensesByCategory(expenses, categories) {
  const namesById = Object.fromEntries(categories.map((category) => [category.id, category.name]));
  return sortExpensesByDate(expenses).sort((a, b) => {
    const nameA = namesById[a.categoryId];
    const nameB = namesById[b.categoryId];
    if (nameA === nameB) return 0;
    if (nameA === undefined) return 1;
    if (nameB === undefined) return -1;
    return nameA.localeCompare(nameB);
  });
}
