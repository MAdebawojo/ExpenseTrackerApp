import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
import { STORAGE_KEYS, createSampleExpenses } from '../src/data/sampleData.js';
import { toISODate } from '../src/utils/formatters.js';

function readStorage(key) {
  return JSON.parse(localStorage.getItem(key));
}

function setBudgetData(categories, expenses) {
  localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));
  localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses));
}

function getCategoryRow(name) {
  const table = screen.getByRole('region', { name: 'Category Budgets' });
  return within(table).getByRole('row', { name: new RegExp(name) });
}

function getExpenseTable() {
  return within(screen.getByRole('region', { name: 'Expenses' })).getByRole('table');
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('localStorage initialization', () => {
    it('loads sample data and saves it on first launch', () => {
      render(<App />);

      expect(readStorage(STORAGE_KEYS.expenses)).toHaveLength(29);
      expect(readStorage(STORAGE_KEYS.categories)).toHaveLength(6);
      expect(screen.getByText('Lunch at the buka')).toBeInTheDocument();
    });

    it('uses existing saved data instead of overwriting it', () => {
      localStorage.setItem(
        STORAGE_KEYS.expenses,
        JSON.stringify([
          { id: 'x1', description: 'Saved expense', amount: 5, categoryId: 'food', date: '2026-01-01' },
        ])
      );

      render(<App />);

      const rows = within(getExpenseTable()).getAllByRole('row');
      expect(rows).toHaveLength(2); // header + 1 expense
      expect(screen.getByText('Saved expense')).toBeInTheDocument();
      expect(readStorage(STORAGE_KEYS.expenses)).toHaveLength(1);
    });
  });

  describe('dashboard', () => {
    it('shows the total allocated budget and a breakdown for every category', () => {
      render(<App />);
      const dashboard = screen.getByRole('region', { name: 'Dashboard' });

      expect(within(dashboard).getByText('₦270,000.00')).toBeInTheDocument();
      expect(within(dashboard).getByText('Food & Dining')).toBeInTheDocument();
      expect(within(dashboard).getByText('₦85,498.98')).toBeInTheDocument();
      expect(within(dashboard).getByText('Health & Wellness')).toBeInTheDocument();
    });
  });

  describe('adding an expense', () => {
    it('adds the expense to the list, updates the category and saves it', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.type(screen.getByLabelText('Description'), 'Team lunch');
      await user.type(screen.getByLabelText('Amount (₦)'), '2500.5');
      await user.selectOptions(screen.getByLabelText('Category'), 'Entertainment');
      await user.click(screen.getByRole('button', { name: /add expense/i }));

      // Newest first, so the new expense (dated today) is near the top.
      expect(within(getExpenseTable()).getByText('Team lunch')).toBeInTheDocument();

      // Entertainment: 15,262.50 + 2,500.50 = 17,763.00 spent, 20,000 - 17,763 = 2,237.00 remaining.
      const row = getCategoryRow('Entertainment');
      expect(within(row).getByText('₦17,763.00')).toBeInTheDocument();
      expect(within(row).getByText('₦2,237.00')).toBeInTheDocument();

      const saved = readStorage(STORAGE_KEYS.expenses);
      expect(saved).toHaveLength(30);
      expect(saved.at(-1)).toMatchObject({
        description: 'Team lunch',
        amount: 2500.5,
        categoryId: 'entertainment',
        date: toISODate(new Date()),
      });
      expect(saved.at(-1).id).toEqual(expect.any(String));
    });

    it('shows validation errors and does not add an invalid expense', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.clear(screen.getByLabelText('Date'));
      await user.type(screen.getByLabelText('Amount (₦)'), '0');
      await user.click(screen.getByRole('button', { name: /add expense/i }));

      expect(screen.getByText('Please enter a description.')).toBeInTheDocument();
      expect(screen.getByText('Amount must be greater than zero.')).toBeInTheDocument();
      expect(screen.getByText('Please select a category.')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid date.')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toHaveAttribute('aria-invalid', 'true');
      expect(readStorage(STORAGE_KEYS.expenses)).toHaveLength(29);
    });
  });

  describe('viewing expenses', () => {
    it('lists expenses newest first and can switch to oldest first', async () => {
      const user = userEvent.setup();
      render(<App />);

      const firstExpense = () => within(getExpenseTable()).getAllByRole('row')[1];
      expect(firstExpense()).toHaveTextContent('Mosquito repellent');

      await user.selectOptions(screen.getByLabelText('Sort'), 'Oldest first');
      expect(firstExpense()).toHaveTextContent(/Electricity token|Gym membership/);
    });

    it('can sort expenses by category', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.selectOptions(screen.getByLabelText('Sort'), 'Category (A–Z)');

      const rows = within(getExpenseTable()).getAllByRole('row').slice(1);
      // Bills & Utilities comes first alphabetically; Transportation comes last.
      expect(rows[0]).toHaveTextContent('Airtime top-up');
      expect(rows[0]).toHaveTextContent('Bills & Utilities');
      expect(rows.at(-1)).toHaveTextContent('Ride-hailing trip to work');
      expect(rows.at(-1)).toHaveTextContent('Transportation');
    });
  });

  describe('deleting an expense', () => {
    it('removes the expense after confirmation and updates totals', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      render(<App />);

      await user.click(screen.getByRole('button', { name: 'Delete Wireless earbuds' }));

      expect(confirmSpy).toHaveBeenCalledOnce();
      expect(screen.queryByText('Wireless earbuds')).not.toBeInTheDocument();
      // Shopping: 32,669.55 - 12,820.75 = 19,848.80 spent, 10,151.20 remaining.
      const row = getCategoryRow('Shopping');
      expect(within(row).getByText('₦19,848.80')).toBeInTheDocument();
      expect(within(row).getByText('₦10,151.20')).toBeInTheDocument();
      expect(readStorage(STORAGE_KEYS.expenses).map((e) => e.id)).not.toContain('exp-012');
    });

    it('keeps the expense when the user cancels', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<App />);

      await user.click(screen.getByRole('button', { name: 'Delete Wireless earbuds' }));

      expect(screen.getByText('Wireless earbuds')).toBeInTheDocument();
      expect(readStorage(STORAGE_KEYS.expenses)).toHaveLength(29);
    });
  });

  describe('category budgets', () => {
    it('reallocates available funds, preserves total budget and expenses, and saves the budgets', async () => {
      const user = userEvent.setup();
      const expenses = [
        { id: 'e1', description: 'Source purchase', amount: 70, categoryId: 'source', date: '2026-01-01' },
      ];
      setBudgetData(
        [
          { id: 'source', name: 'Source', icon: '🅰️', budget: 100 },
          { id: 'destination', name: 'Destination', icon: '🅱️', budget: 50 },
        ],
        expenses
      );
      render(<App />);

      await user.selectOptions(screen.getByLabelText('From category'), 'source');
      await user.selectOptions(screen.getByLabelText('To category'), 'destination');
      await user.type(screen.getByLabelText('Transfer amount (₦)'), '20');
      await user.click(screen.getByRole('button', { name: 'Transfer funds' }));

      expect(screen.getByText('Transferred ₦20.00 from Source to Destination.')).toHaveAttribute(
        'role',
        'status'
      );
      expect(within(getCategoryRow('Source')).getByText('₦80.00')).toBeInTheDocument();
      expect(within(getCategoryRow('Source')).getByText('₦10.00')).toBeInTheDocument();
      expect(within(getCategoryRow('Destination')).getAllByText('₦70.00')).toHaveLength(2);
      expect(screen.getByText('₦150.00')).toBeInTheDocument();
      expect(readStorage(STORAGE_KEYS.categories).map(({ budget }) => budget)).toEqual([80, 70]);
      expect(readStorage(STORAGE_KEYS.expenses)).toEqual(expenses);
      expect(screen.getByLabelText('Transfer amount (₦)')).toHaveValue('');
    });

    it('validates transfer selections and amount without changing budgets', async () => {
      const user = userEvent.setup();
      const categories = [
        { id: 'source', name: 'Source', icon: '🅰️', budget: 100 },
        { id: 'destination', name: 'Destination', icon: '🅱️', budget: 100 },
        { id: 'blocked', name: 'Blocked', icon: '🚫', budget: 20 },
      ];
      const expenses = [
        { id: 'e1', description: 'Source spend', amount: 80, categoryId: 'source', date: '2026-01-01' },
        { id: 'e2', description: 'Blocked spend', amount: 20, categoryId: 'blocked', date: '2026-01-02' },
      ];
      setBudgetData(categories, expenses);
      render(<App />);

      const sourceSelect = screen.getByLabelText('From category');
      const destinationSelect = screen.getByLabelText('To category');
      const amountInput = screen.getByLabelText('Transfer amount (₦)');
      const submit = screen.getByRole('button', { name: 'Transfer funds' });
      const expectError = async (message) => {
        await user.click(submit);
        expect(screen.getByText(message)).toHaveAttribute('role', 'alert');
      };

      expect(
        within(sourceSelect).getByRole('option', { name: /Blocked — ₦0.00 available/ })
      ).toBeDisabled();
      await expectError('Select both a source and destination category.');

      await user.selectOptions(sourceSelect, 'source');
      await user.selectOptions(destinationSelect, 'source');
      await user.type(amountInput, '1');
      await expectError('Choose different source and destination categories.');

      await user.selectOptions(destinationSelect, 'destination');
      for (const invalidAmount of ['0', '-1', 'abc', '1.234']) {
        await user.clear(amountInput);
        await user.type(amountInput, invalidAmount);
        await expectError('Enter a positive amount with no more than two decimal places.');
      }

      await user.clear(amountInput);
      await user.type(amountInput, '20.01');
      await expectError('Transfer amount exceeds available funds (₦20.00).');

      expect(readStorage(STORAGE_KEYS.categories)).toEqual(categories);
      expect(readStorage(STORAGE_KEYS.expenses)).toEqual(expenses);
    });

    it('explains when no category has unspent budget and does not offer transfers with fewer than two categories', () => {
      setBudgetData(
        [{ id: 'source', name: 'Source', icon: '🅰️', budget: 10 }],
        [{ id: 'e1', description: 'Source fully spent', amount: 10, categoryId: 'source', date: '2026-01-01' }]
      );
      const { unmount } = render(<App />);
      expect(screen.queryByRole('heading', { name: 'Reallocate Budget' })).not.toBeInTheDocument();

      unmount();
      setBudgetData(
        [
          { id: 'source', name: 'Source', icon: '🅰️', budget: 10 },
          { id: 'destination', name: 'Destination', icon: '🅱️', budget: 5 },
        ],
        [
          { id: 'e1', description: 'Source fully spent', amount: 10, categoryId: 'source', date: '2026-01-01' },
          { id: 'e2', description: 'Destination fully spent', amount: 5, categoryId: 'destination', date: '2026-01-02' },
        ]
      );
      render(<App />);
      expect(screen.getByText('No category has unspent budget available to transfer.')).toBeInTheDocument();
      expect(
        within(screen.getByLabelText('From category')).getByRole('option', {
          name: /Source — ₦0.00 available/,
        })
      ).toBeDisabled();
    });

    it('renders accessible progress bars with accurate, capped values', () => {
      setBudgetData(
        [
          { id: 'food', name: 'Food', icon: '🍽️', budget: 100 },
          { id: 'fun', name: 'Fun', icon: '🎮', budget: 0 },
          { id: 'bills', name: 'Bills', icon: '🧾', budget: 100 },
        ],
        [
          { id: 'e1', description: 'Lunch', amount: 35, categoryId: 'food', date: '2026-01-01' },
          { id: 'e2', description: 'Medicine', amount: 10, categoryId: 'fun', date: '2026-01-02' },
          { id: 'e3', description: 'Utilities', amount: 125, categoryId: 'bills', date: '2026-01-03' },
        ]
      );
      render(<App />);

      const foodProgress = within(getCategoryRow('Food')).getByRole('progressbar', {
        name: 'Food budget usage',
      });
      expect(foodProgress).toHaveAttribute('max', '100');
      expect(foodProgress).toHaveAttribute('value', '35');
      expect(foodProgress).toHaveAttribute('aria-valuetext', '35% of ₦100.00 budget used');
      expect(within(getCategoryRow('Food')).getByText('₦35.00 of ₦100.00 (35%)')).toBeInTheDocument();

      const zeroBudgetProgress = within(getCategoryRow('Fun')).getByRole('progressbar', {
        name: 'Fun budget usage',
      });
      expect(zeroBudgetProgress).toHaveAttribute('value', '100');
      expect(zeroBudgetProgress).toHaveAttribute(
        'aria-valuetext',
        '₦10.00 spent against a zero budget'
      );

      const overBudgetProgress = within(getCategoryRow('Bills')).getByRole('progressbar', {
        name: 'Bills budget usage',
      });
      expect(overBudgetProgress).toHaveAttribute('value', '100');
      expect(overBudgetProgress).toHaveAttribute(
        'aria-valuetext',
        '125% of ₦100.00 budget used'
      );
      expect(within(getCategoryRow('Bills')).getByText('₦125.00 of ₦100.00 (125%)')).toBeInTheDocument();
    });

    it('shows warnings at 80% and alerts at 100%, but no status below 80%', () => {
      setBudgetData(
        [
          { id: 'food', name: 'Food', icon: '🍽️', budget: 100 },
          { id: 'fun', name: 'Fun', icon: '🎮', budget: 100 },
          { id: 'bills', name: 'Bills', icon: '🧾', budget: 100 },
        ],
        [
          { id: 'e1', description: 'Food', amount: 79.99, categoryId: 'food', date: '2026-01-01' },
          { id: 'e2', description: 'Fun', amount: 80, categoryId: 'fun', date: '2026-01-02' },
          { id: 'e3', description: 'Bills', amount: 100, categoryId: 'bills', date: '2026-01-03' },
        ]
      );
      render(<App />);

      expect(within(getCategoryRow('Food')).queryByRole('status')).not.toBeInTheDocument();
      expect(within(getCategoryRow('Fun')).getByRole('status')).toHaveTextContent(
        'Warning: 80% of budget used.'
      );
      expect(within(getCategoryRow('Bills')).getByRole('alert')).toHaveTextContent(
        'Alert: 100% of budget used.'
      );
    });

    it('replaces the warning with an alert when spending reaches the budget', async () => {
      const user = userEvent.setup();
      setBudgetData(
        [{ id: 'food', name: 'Food', icon: '🍽️', budget: 100 }],
        [{ id: 'e1', description: 'Groceries', amount: 80, categoryId: 'food', date: '2026-01-01' }]
      );
      render(<App />);

      let row = getCategoryRow('Food');
      expect(within(row).getByRole('status')).toHaveTextContent('Warning: 80% of budget used.');

      await user.type(screen.getByLabelText('Description'), 'Produce');
      await user.type(screen.getByLabelText('Amount (₦)'), '20');
      await user.selectOptions(screen.getByLabelText('Category'), 'Food');
      await user.click(screen.getByRole('button', { name: /add expense/i }));

      row = getCategoryRow('Food');
      expect(within(row).queryByRole('status')).not.toBeInTheDocument();
      expect(within(row).getByRole('alert')).toHaveTextContent('Alert: 100% of budget used.');
    });

    it('updates a category budget and saves it', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByRole('button', { name: 'Edit budget for Transportation' }));
      const input = screen.getByLabelText('Allocated budget for Transportation');
      await user.clear(input);
      await user.type(input, '60000');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      // Transportation: 60,000 budget - 21,982.95 spent = 38,017.05 remaining.
      const row = getCategoryRow('Transportation');
      expect(within(row).getByText('₦60,000.00')).toBeInTheDocument();
      expect(within(row).getByText('₦38,017.05')).toBeInTheDocument();
      expect(screen.getByText('₦280,000.00')).toBeInTheDocument(); // total budget card

      const saved = readStorage(STORAGE_KEYS.categories);
      expect(saved.find((c) => c.id === 'transportation').budget).toBe(60000);
    });

    it('rejects a negative budget', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByRole('button', { name: 'Edit budget for Shopping' }));
      const input = screen.getByLabelText('Allocated budget for Shopping');
      await user.clear(input);
      await user.type(input, '-5');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(
        within(getCategoryRow('Shopping')).getByText('Budget must be a number of 0 or more.')
      ).toHaveAttribute('role', 'alert');
      expect(readStorage(STORAGE_KEYS.categories).find((c) => c.id === 'shopping').budget).toBe(30000);
    });

    it('shows a negative remaining balance when a category is over budget', () => {
      render(<App />);
      // Shopping: 30,000 - 32,669.55 = -2,669.55
      expect(within(getCategoryRow('Shopping')).getByText('-₦2,669.55')).toBeInTheDocument();
    });
  });

  describe('reset demo data', () => {
    it('restores the original sample data after confirmation', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify([]));
      localStorage.setItem(
        STORAGE_KEYS.categories,
        JSON.stringify([{ id: 'food', name: 'Food & Dining', icon: '🍽️', budget: 1 }])
      );
      render(<App />);
      expect(screen.getByText(/No expenses yet/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /reset demo data/i }));

      expect(screen.queryByText(/No expenses yet/)).not.toBeInTheDocument();
      expect(readStorage(STORAGE_KEYS.expenses)).toEqual(createSampleExpenses());
      expect(readStorage(STORAGE_KEYS.categories)).toHaveLength(6);
      expect(screen.getByText('₦270,000.00')).toBeInTheDocument();
    });

    it('does nothing when the user cancels', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify([]));
      render(<App />);

      await user.click(screen.getByRole('button', { name: /reset demo data/i }));

      expect(readStorage(STORAGE_KEYS.expenses)).toEqual([]);
    });
  });
});
