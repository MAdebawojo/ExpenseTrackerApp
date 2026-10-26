import { describe, expect, it } from 'vitest';
import {
  calculateAvailableBudget,
  calculateCategoryBudgetStatus,
  calculateCategoryRemaining,
  calculateCategorySpent,
  calculateTotalBudget,
  getCategorySummaries,
  roundToCents,
  reallocateCategoryBudget,
  sortExpensesByCategory,
  sortExpensesByDate,
} from '../src/utils/expenseCalculations.js';
import {
  DEFAULT_CATEGORIES,
  createSampleCategories,
  createSampleExpenses,
} from '../src/data/sampleData.js';
import { formatCurrency, formatDate, parseISODate, toISODate } from '../src/utils/formatters.js';
import { getSpendingByCategory, getSpendingTrend } from '../src/utils/spendingInsights.js';

const categories = [
  { id: 'food', name: 'Food', budget: 100 },
  { id: 'fun', name: 'Fun', budget: 50 },
];

const expenses = [
  { id: 'e1', description: 'Lunch', amount: 12.5, categoryId: 'food', date: '2026-01-03' },
  { id: 'e2', description: 'Dinner', amount: 30.25, categoryId: 'food', date: '2026-01-05' },
  { id: 'e3', description: 'Movie', amount: 60, categoryId: 'fun', date: '2026-01-04' },
];

describe('calculateTotalBudget', () => {
  it('adds up all category budgets', () => {
    expect(calculateTotalBudget(categories)).toBe(150);
  });

  it('returns 0 when there are no categories', () => {
    expect(calculateTotalBudget([])).toBe(0);
  });
});

describe('calculateCategorySpent', () => {
  it('adds up only the expenses in the given category', () => {
    expect(calculateCategorySpent(expenses, 'food')).toBe(42.75);
    expect(calculateCategorySpent(expenses, 'fun')).toBe(60);
  });

  it('returns 0 for a category with no expenses', () => {
    expect(calculateCategorySpent(expenses, 'travel')).toBe(0);
  });

  it('avoids floating point rounding errors', () => {
    const small = [
      { id: 'a', amount: 0.1, categoryId: 'food' },
      { id: 'b', amount: 0.2, categoryId: 'food' },
    ];
    expect(calculateCategorySpent(small, 'food')).toBe(0.3);
  });
});

describe('calculateCategoryRemaining', () => {
  it('subtracts spending from the category budget', () => {
    expect(calculateCategoryRemaining(categories[0], expenses)).toBe(57.25);
  });

  it('allows a negative remaining balance when over budget', () => {
    expect(calculateCategoryRemaining(categories[1], expenses)).toBe(-10);
  });
});

describe('budget reallocation', () => {
  const reallocationCategories = [
    { id: 'source', name: 'Source', budget: 100 },
    { id: 'destination', name: 'Destination', budget: 50 },
  ];
  const reallocationExpenses = [
    { id: 'spent', amount: 70, categoryId: 'source' },
    { id: 'other', amount: 5, categoryId: 'destination' },
  ];

  it('reports only unspent budget as available', () => {
    expect(calculateAvailableBudget(reallocationCategories[0], reallocationExpenses)).toBe(30);
    expect(calculateAvailableBudget({ id: 'over', budget: 10 }, [
      { amount: 12, categoryId: 'over' },
    ])).toBe(0);
  });

  it('transfers funds without changing the inputs or expenses', () => {
    const originalCategories = structuredClone(reallocationCategories);
    const originalExpenses = structuredClone(reallocationExpenses);
    const result = reallocateCategoryBudget(
      reallocationCategories,
      reallocationExpenses,
      'source',
      'destination',
      '12.34'
    );

    expect(result).toEqual({
      success: true,
      categories: [
        { id: 'source', name: 'Source', budget: 87.66 },
        { id: 'destination', name: 'Destination', budget: 62.34 },
      ],
    });
    expect(calculateTotalBudget(result.categories)).toBe(calculateTotalBudget(reallocationCategories));
    expect(reallocationCategories).toEqual(originalCategories);
    expect(reallocationExpenses).toEqual(originalExpenses);
  });

  it.each([
    ['', 'invalid_amount'],
    ['0', 'invalid_amount'],
    ['-1', 'invalid_amount'],
    ['abc', 'invalid_amount'],
    ['1.234', 'invalid_amount'],
    ['1e2', 'invalid_amount'],
  ])('rejects invalid transfer amount %s', (amount, error) => {
    expect(
      reallocateCategoryBudget(
        reallocationCategories,
        reallocationExpenses,
        'source',
        'destination',
        amount
      )
    ).toEqual({ success: false, error });
  });

  it('rejects missing, identical, and unknown categories', () => {
    expect(reallocateCategoryBudget(reallocationCategories, [], '', 'destination', '1')).toEqual({
      success: false,
      error: 'select_categories',
    });
    expect(
      reallocateCategoryBudget(reallocationCategories, [], 'source', 'source', '1')
    ).toEqual({ success: false, error: 'same_category' });
    expect(
      reallocateCategoryBudget(reallocationCategories, [], 'missing', 'destination', '1')
    ).toEqual({ success: false, error: 'unknown_category' });
  });

  it('rejects transfers that exceed the source unspent budget', () => {
    expect(
      reallocateCategoryBudget(
        reallocationCategories,
        reallocationExpenses,
        'source',
        'destination',
        '30.01'
      )
    ).toEqual({ success: false, error: 'insufficient_funds', available: 30 });
  });

  it('rejects transfers from a category with no available funds', () => {
    expect(
      reallocateCategoryBudget(
        [{ id: 'source', budget: 10 }, { id: 'destination', budget: 0 }],
        [{ amount: 10, categoryId: 'source' }],
        'source',
        'destination',
        '1'
      )
    ).toEqual({ success: false, error: 'no_available_funds', available: 0 });
  });
});

describe('calculateCategoryBudgetStatus', () => {
  it('reports normal status below 80% using the actual percentage', () => {
    expect(calculateCategoryBudgetStatus(79.99, 100)).toEqual({
      percentage: 79.99,
      progress: 79.99,
      status: 'normal',
    });
  });

  it('reports a warning at exactly 80% and below 100%', () => {
    expect(calculateCategoryBudgetStatus(80, 100)).toEqual({
      percentage: 80,
      progress: 80,
      status: 'warning',
    });
    expect(calculateCategoryBudgetStatus(99.99, 100).status).toBe('warning');
  });

  it('reports an alert at 100% or more and caps visual progress at 100%', () => {
    expect(calculateCategoryBudgetStatus(100, 100)).toEqual({
      percentage: 100,
      progress: 100,
      status: 'alert',
    });
    expect(calculateCategoryBudgetStatus(125, 100)).toEqual({
      percentage: 125,
      progress: 100,
      status: 'alert',
    });
  });

  it('handles zero budgets without producing a non-finite percentage', () => {
    expect(calculateCategoryBudgetStatus(0, 0)).toEqual({
      percentage: 0,
      progress: 0,
      status: 'normal',
    });
    expect(calculateCategoryBudgetStatus(10, 0)).toEqual({
      percentage: null,
      progress: 100,
      status: 'alert',
    });
  });
});

describe('getCategorySummaries', () => {
  it('adds spent, remaining and expenseCount to each category', () => {
    expect(getCategorySummaries(categories, expenses)).toEqual([
      { id: 'food', name: 'Food', budget: 100, spent: 42.75, remaining: 57.25, expenseCount: 2 },
      { id: 'fun', name: 'Fun', budget: 50, spent: 60, remaining: -10, expenseCount: 1 },
    ]);
  });

  it('does not modify the original categories', () => {
    const copy = structuredClone(categories);
    getCategorySummaries(categories, expenses);
    expect(categories).toEqual(copy);
  });
});

describe('getSpendingByCategory', () => {
  it('returns only categories with spending, ordered by amount', () => {
    const result = getSpendingByCategory(
      [...categories, { id: 'travel', name: 'Travel', budget: 0 }],
      expenses
    );

    expect(result.map(({ id, spent }) => ({ id, spent }))).toEqual([
      { id: 'fun', spent: 60 },
      { id: 'food', spent: 42.75 },
    ]);
  });

  it('does not modify the input arrays', () => {
    const originalCategories = structuredClone(categories);
    const originalExpenses = structuredClone(expenses);

    getSpendingByCategory(categories, expenses);

    expect(categories).toEqual(originalCategories);
    expect(expenses).toEqual(originalExpenses);
  });
});

describe('getSpendingTrend', () => {
  it('groups expenses by calendar date for a span of 60 days or less', () => {
    const result = getSpendingTrend([
      { id: 'later', amount: 0.2, date: '2026-03-02' },
      { id: 'same-day', amount: 0.1, date: '2026-03-02' },
      { id: 'earlier', amount: 5, date: '2026-01-01' },
    ]);

    expect(result.granularity).toBe('day');
    expect(result.buckets.map(({ key, total }) => ({ key, total }))).toEqual([
      { key: '2026-01-01', total: 5 },
      { key: '2026-03-02', total: 0.3 },
    ]);
  });

  it('groups expenses by calendar month when the date span exceeds 60 days', () => {
    const result = getSpendingTrend([
      { id: 'jan', amount: 10, date: '2026-01-31' },
      { id: 'feb', amount: 20, date: '2026-02-01' },
      { id: 'mar', amount: 30, date: '2026-04-02' },
    ]);

    expect(result.granularity).toBe('month');
    expect(result.buckets.map(({ key, total }) => ({ key, total }))).toEqual([
      { key: '2026-01', total: 10 },
      { key: '2026-02', total: 20 },
      { key: '2026-04', total: 30 },
    ]);
  });

  it('returns an empty daily trend when there are no valid expense dates', () => {
    expect(getSpendingTrend([])).toEqual({ granularity: 'day', buckets: [] });
    expect(getSpendingTrend([{ id: 'invalid', amount: 12, date: '2026-02-30' }])).toEqual({
      granularity: 'day',
      buckets: [],
    });
  });

  it('does not modify its input expenses', () => {
    const input = structuredClone(expenses);

    getSpendingTrend(expenses);

    expect(expenses).toEqual(input);
  });
});

describe('sortExpensesByDate', () => {
  it('sorts newest first by default', () => {
    expect(sortExpensesByDate(expenses).map((e) => e.id)).toEqual(['e2', 'e3', 'e1']);
  });

  it('can sort oldest first', () => {
    expect(sortExpensesByDate(expenses, 'oldest').map((e) => e.id)).toEqual(['e1', 'e3', 'e2']);
  });

  it('does not modify the original array', () => {
    const ids = expenses.map((e) => e.id);
    sortExpensesByDate(expenses);
    expect(expenses.map((e) => e.id)).toEqual(ids);
  });
});

describe('sortExpensesByCategory', () => {
  it('groups by category name A–Z, newest first within each category', () => {
    expect(sortExpensesByCategory(expenses, categories).map((e) => e.id)).toEqual([
      'e2',
      'e1',
      'e3',
    ]);
  });

  it('puts expenses with an unknown category last', () => {
    const withUnknown = [
      { id: 'u1', amount: 5, categoryId: 'deleted', date: '2026-01-09' },
      ...expenses,
    ];
    expect(sortExpensesByCategory(withUnknown, categories).map((e) => e.id)).toEqual([
      'e2',
      'e1',
      'e3',
      'u1',
    ]);
  });

  it('does not modify the original array', () => {
    const ids = expenses.map((e) => e.id);
    sortExpensesByCategory(expenses, categories);
    expect(expenses.map((e) => e.id)).toEqual(ids);
  });
});

describe('roundToCents', () => {
  it('rounds to two decimal places', () => {
    expect(roundToCents(1.005 + 2.001)).toBe(3.01);
    expect(roundToCents(0.1 + 0.2)).toBe(0.3);
  });
});

describe('formatters', () => {
  it('formats currency as Naira', () => {
    expect(formatCurrency(1234.5)).toBe('₦1,234.50');
    expect(formatCurrency(-2669.55)).toBe('-₦2,669.55');
  });

  it('converts dates to and from YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 0, 9))).toBe('2026-01-09');
    expect(parseISODate('2026-01-09')).toEqual(new Date(2026, 0, 9));
  });

  it('rejects invalid dates', () => {
    expect(parseISODate('')).toBeNull();
    expect(parseISODate('2026-02-30')).toBeNull();
    expect(parseISODate('not-a-date')).toBeNull();
  });

  it('formats dates for display', () => {
    expect(formatDate('2026-10-11')).toBe('11 Oct 2026');
  });
});

describe('sample data', () => {
  const sampleCategories = createSampleCategories();
  const sampleExpenses = createSampleExpenses(new Date(2026, 9, 11));
  const summaries = getCategorySummaries(sampleCategories, sampleExpenses);
  const percentUsed = (category) => (category.spent / category.budget) * 100;

  it('has six categories totalling a ₦270,000 budget', () => {
    expect(sampleCategories).toHaveLength(6);
    expect(calculateTotalBudget(sampleCategories)).toBe(270000);
  });

  it('has 25-30 expenses with unique IDs in known categories', () => {
    expect(sampleExpenses.length).toBeGreaterThanOrEqual(25);
    expect(sampleExpenses.length).toBeLessThanOrEqual(30);
    expect(new Set(sampleExpenses.map((e) => e.id)).size).toBe(sampleExpenses.length);
    const categoryIds = sampleCategories.map((c) => c.id);
    sampleExpenses.forEach((e) => expect(categoryIds).toContain(e.categoryId));
  });

  it('includes categories below 50%, between 80-99%, and at or above 100% of budget', () => {
    expect(summaries.some((c) => percentUsed(c) < 50)).toBe(true);
    expect(summaries.some((c) => percentUsed(c) >= 80 && percentUsed(c) < 100)).toBe(true);
    expect(summaries.some((c) => percentUsed(c) >= 100)).toBe(true);
  });

  it('has the expected spending per category', () => {
    const spentById = Object.fromEntries(summaries.map((c) => [c.id, c.spent]));
    expect(spentById).toEqual({
      food: 85498.98,
      transportation: 21982.95,
      shopping: 32669.55,
      entertainment: 15262.5,
      bills: 29968.75,
      health: 15315.05,
    });
  });

  it('generates dates relative to today, all within the last 28 days', () => {
    const dates = sampleExpenses.map((e) => e.date).sort();
    expect(dates[dates.length - 1]).toBe('2026-10-11');
    expect(dates[0]).toBe('2026-09-14');
  });

  it('returns fresh copies so callers cannot modify the defaults', () => {
    const copy = createSampleCategories();
    copy[0].budget = 1;
    expect(DEFAULT_CATEGORIES[0].budget).toBe(100000);
  });
});
