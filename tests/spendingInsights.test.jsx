import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import SpendingInsights from '../src/components/SpendingInsights.jsx';

const categories = [
  { id: 'food', name: 'Food & Dining', icon: '🍽️', budget: 100 },
  { id: 'travel', name: 'Transportation', icon: '🚗', budget: 50 },
  { id: 'unused', name: 'Unused', icon: '📦', budget: 20 },
];

describe('SpendingInsights', () => {
  it('shows category totals and the trend data for recorded expenses', async () => {
    const user = userEvent.setup();
    const expenses = [
      { id: 'e1', amount: 12.5, categoryId: 'food', date: '2026-04-01' },
      { id: 'e2', amount: 7.5, categoryId: 'food', date: '2026-04-01' },
      { id: 'e3', amount: 25, categoryId: 'travel', date: '2026-04-03' },
    ];
    render(<SpendingInsights categories={categories} expenses={expenses} />);

    const categoryChart = screen.getByRole('img', { name: /Spending by category/ });
    expect(within(categoryChart).getByText('Food & Dining')).toBeInTheDocument();
    expect(within(categoryChart).getByText('₦20.00')).toBeInTheDocument();
    expect(within(categoryChart).getByText('Transportation')).toBeInTheDocument();
    expect(within(categoryChart).getByText('₦25.00')).toBeInTheDocument();
    expect(within(categoryChart).queryByText('Unused')).not.toBeInTheDocument();

    await user.click(screen.getByText('View trend data'));
    const trendTable = screen.getByRole('table', { name: 'Daily spending totals' });
    expect(within(trendTable).getByText('1 Apr 2026')).toBeInTheDocument();
    expect(within(trendTable).getByText('3 Apr 2026')).toBeInTheDocument();
    expect(within(trendTable).getByText('₦20.00')).toBeInTheDocument();
    expect(within(trendTable).getByText('₦0.00')).toBeInTheDocument();
    expect(within(trendTable).getByText('₦25.00')).toBeInTheDocument();
  });

  it('shows monthly trend values for a long history', async () => {
    const user = userEvent.setup();
    render(
      <SpendingInsights
        categories={categories}
        expenses={[
          { id: 'e1', amount: 15, categoryId: 'food', date: '2026-01-31' },
          { id: 'e2', amount: 30, categoryId: 'travel', date: '2026-04-02' },
        ]}
      />
    );

    expect(screen.getByText('Monthly spending')).toBeInTheDocument();
    await user.click(screen.getByText('View trend data'));
    const trendTable = screen.getByRole('table', { name: 'Monthly spending totals' });
    expect(within(trendTable).getByText('Jan 2026')).toBeInTheDocument();
    expect(within(trendTable).getByText('Feb 2026')).toBeInTheDocument();
    expect(within(trendTable).getByText('Mar 2026')).toBeInTheDocument();
    expect(within(trendTable).getByText('Apr 2026')).toBeInTheDocument();
    const februaryRow = within(trendTable).getByRole('row', { name: /Feb 2026/ });
    const marchRow = within(trendTable).getByRole('row', { name: /Mar 2026/ });
    expect(within(februaryRow).getByText('₦0.00')).toBeInTheDocument();
    expect(within(marchRow).getByText('₦0.00')).toBeInTheDocument();
  });

  it('updates category and time breakdowns when expense data is edited', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <SpendingInsights
        categories={categories}
        expenses={[
          { id: 'e1', amount: 10, categoryId: 'food', date: '2026-05-01' },
        ]}
      />
    );

    const initialCategoryChart = screen.getByRole('img', { name: /Spending by category/ });
    expect(within(initialCategoryChart).getByText('₦10.00')).toBeInTheDocument();

    rerender(
      <SpendingInsights
        categories={categories}
        expenses={[
          { id: 'e1', amount: 35, categoryId: 'travel', date: '2026-05-02' },
        ]}
      />
    );

    const updatedCategoryChart = screen.getByRole('img', { name: /Spending by category/ });
    expect(within(updatedCategoryChart).getByText('₦35.00')).toBeInTheDocument();
    expect(within(updatedCategoryChart).queryByText('Food & Dining')).not.toBeInTheDocument();

    await user.click(screen.getByText('View trend data'));
    const trendTable = screen.getByRole('table', { name: 'Daily spending totals' });
    expect(within(trendTable).getByText('2 May 2026')).toBeInTheDocument();
    expect(within(trendTable).queryByText('1 May 2026')).not.toBeInTheDocument();
    expect(within(trendTable).getByText('₦35.00')).toBeInTheDocument();
  });

  it('shows a helpful empty state without rendering chart data when expenses are empty', () => {
    render(<SpendingInsights categories={categories} expenses={[]} />);

    expect(
      screen.getByText('Add an expense to see your category breakdown and spending trend.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Spending by category/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('explains when expenses exist but no valid dates can be plotted', () => {
    render(
      <SpendingInsights
        categories={categories}
        expenses={[{ id: 'e1', amount: 10, categoryId: 'food', date: 'not-a-date' }]}
      />
    );

    expect(screen.getByText('No dated expenses are available to show a trend.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Spending by category/ })).toBeInTheDocument();
  });
});
