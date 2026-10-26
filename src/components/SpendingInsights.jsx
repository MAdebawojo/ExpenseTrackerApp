import CategorySpendChart from './CategorySpendChart.jsx';
import SpendingTrendChart from './SpendingTrendChart.jsx';
import { getSpendingByCategory, getSpendingTrend } from '../utils/spendingInsights.js';

function SpendingInsights({ categories, expenses }) {
  const categorySpend = getSpendingByCategory(categories, expenses);
  const spendingTrend = getSpendingTrend(expenses);

  return (
    <section className="insights-section" aria-labelledby="insights-heading">
      <h3 id="insights-heading" className="insights-section__title">
        Spending Insights
      </h3>
      {expenses.length === 0 ? (
        <div className="card insights-empty-state">
          <p>Add an expense to see your category breakdown and spending trend.</p>
        </div>
      ) : (
        <div className="insights-grid">
          <CategorySpendChart categories={categorySpend} />
          <SpendingTrendChart trend={spendingTrend} />
        </div>
      )}
    </section>
  );
}

export default SpendingInsights;
