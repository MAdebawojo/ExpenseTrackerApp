import { formatCurrency } from '../utils/formatters.js';

function CategorySpendChart({ categories }) {
  const chartHeight = Math.max(categories.length * 48, 48);
  const maxSpend = Math.max(...categories.map((category) => category.spent));

  return (
    <article className="card insights-card">
      <h4 className="card__title">Spending by Category</h4>
      {categories.length === 0 ? (
        <p className="insights-chart-empty">No categorized spending to show yet.</p>
      ) : (
        <>
          <div className="insights-chart-scroll">
            <svg
              className="category-chart"
              viewBox={`0 0 620 ${chartHeight}`}
              role="img"
              aria-labelledby="category-chart-title category-chart-description"
            >
              <title id="category-chart-title">Spending by category</title>
              <desc id="category-chart-description">
                Horizontal bars compare total spending across categories, highest first.
              </desc>
              {categories.map((category, index) => {
                const rowY = index * 48;
                const barWidth = (category.spent / maxSpend) * 300;

                return (
                  <g key={category.id}>
                    <text className="chart-label" x="0" y={rowY + 29}>
                      {category.name}
                    </text>
                    <rect
                      className="chart-track"
                      x="190"
                      y={rowY + 10}
                      width="300"
                      height="22"
                      rx="6"
                    />
                    <rect
                      className="chart-bar chart-bar--category"
                      x="190"
                      y={rowY + 10}
                      width={barWidth}
                      height="22"
                      rx="6"
                    >
                      <title>{`${category.name}: ${formatCurrency(category.spent)}`}</title>
                    </rect>
                    <text className="chart-value" x="505" y={rowY + 29}>
                      {formatCurrency(category.spent)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <details className="insights-data-details">
            <summary>View category data</summary>
            <table className="data-table chart-data-table">
              <caption>Spending totals by category</caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col" className="num">Spent</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <th scope="row">{category.name}</th>
                    <td className="num">{formatCurrency(category.spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </article>
  );
}

export default CategorySpendChart;
