import SummaryCard from './SummaryCard.jsx';
import SpendingInsights from './SpendingInsights.jsx';
import {
  calculateRemainingBalance,
  calculateTotalBudget,
  calculateTotalExpenses,
} from '../utils/expenseCalculations.js';

function Dashboard({ categories, expenses }) {
  const totalBudget = calculateTotalBudget(categories);
  const totalExpenses = calculateTotalExpenses(expenses);
  const remainingBalance = calculateRemainingBalance(categories, expenses);

  return (
    <section className="section" aria-labelledby="dashboard-heading">
      <h2 id="dashboard-heading" className="section__title">
        Dashboard
      </h2>

      <div className="summary-grid">
        <SummaryCard
          label="Total Allocated Budget"
          amount={totalBudget}
          icon="💰"
          variant="budget"
          description={`Across ${categories.length} categories`}
        />
        <SummaryCard
          label="Total Expenses"
          amount={totalExpenses}
          icon="🧾"
          variant="expenses"
          description={`${expenses.length} transactions recorded`}
        />
        <SummaryCard
          label="Remaining Balance"
          amount={remainingBalance}
          icon="🏦"
          variant="remaining"
          description="Allocated budget minus expenses"
        />
      </div>

      <SpendingInsights categories={categories} expenses={expenses} />
    </section>
  );
}

export default Dashboard;
