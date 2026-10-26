import { formatCurrency, parseISODate } from '../utils/formatters.js';

const CHART_HEIGHT = 270;
const PLOT_TOP = 18;
const PLOT_BOTTOM = 205;
const PLOT_LEFT = 104;
const PLOT_RIGHT = 18;

function SpendingTrendChart({ trend }) {
  const { buckets, granularity } = trend;

  if (buckets.length === 0) {
    return (
      <article className="card insights-card">
        <h4 className="card__title">Spending Over Time</h4>
        <p className="insights-chart-empty">No dated expenses are available to show a trend.</p>
      </article>
    );
  }

  const chartWidth = Math.max(640, buckets.length * 58);
  const plotWidth = chartWidth - PLOT_LEFT - PLOT_RIGHT;
  const plotHeight = PLOT_BOTTOM - PLOT_TOP;
  const maxSpend = Math.max(...buckets.map((bucket) => bucket.total));
  const axisMax = maxSpend || 1;
  const stepWidth = plotWidth / buckets.length;
  const barWidth = Math.min(36, stepWidth * 0.62);

  return (
    <article className="card insights-card">
      <h4 className="card__title">Spending Over Time</h4>
      <p className="chart-caption">
        {granularity === 'day' ? 'Daily spending' : 'Monthly spending'}
      </p>
      <div
        className="insights-chart-scroll"
        role="group"
        tabIndex="0"
        aria-label={`Scrollable ${granularity} spending chart. Exact values are available in the trend data table.`}
      >
        <svg
          className="trend-chart"
          width={chartWidth}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
          aria-hidden="true"
        >
          {[0, 1, 2, 3, 4].map((tick) => {
            const value = (axisMax * (4 - tick)) / 4;
            const y = PLOT_TOP + (plotHeight * tick) / 4;

            return (
              <g key={tick}>
                <line
                  className="chart-grid-line"
                  x1={PLOT_LEFT}
                  x2={chartWidth - PLOT_RIGHT}
                  y1={y}
                  y2={y}
                />
                <text className="chart-axis-label" x={PLOT_LEFT - 8} y={y + 4} textAnchor="end">
                  {formatCurrency(value)}
                </text>
              </g>
            );
          })}
          {buckets.map((bucket, index) => {
            const height = (bucket.total / axisMax) * plotHeight;
            const x = PLOT_LEFT + index * stepWidth + (stepWidth - barWidth) / 2;
            const y = PLOT_BOTTOM - height;
            const date = parseISODate(granularity === 'day' ? bucket.key : `${bucket.key}-01`);
            const label =
              granularity === 'day'
                ? date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
                : bucket.label;

            return (
              <g key={bucket.key}>
                <rect
                  className="chart-bar chart-bar--trend"
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  rx="4"
                >
                  <title>{`${bucket.label}: ${formatCurrency(bucket.total)}`}</title>
                </rect>
                <text
                  className="chart-axis-label"
                  x={x + barWidth / 2}
                  y={PLOT_BOTTOM + 22}
                  textAnchor="middle"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <details className="insights-data-details">
        <summary>View trend data</summary>
        <table className="data-table chart-data-table">
          <caption>
            {granularity === 'day' ? 'Daily spending totals' : 'Monthly spending totals'}
          </caption>
          <thead>
            <tr>
              <th scope="col">{granularity === 'day' ? 'Date' : 'Month'}</th>
              <th scope="col" className="num">Spent</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={bucket.key}>
                <th scope="row">{bucket.label}</th>
                <td className="num">{formatCurrency(bucket.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </article>
  );
}

export default SpendingTrendChart;
