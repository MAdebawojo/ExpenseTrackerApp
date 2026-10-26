# Spending Insights Technical Plan

## 1. Purpose

This plan describes how to implement the Spending Insights feature from [SPEC.md](./SPEC.md). It is a technical design and implementation plan only; no application code or dependencies are changed as part of this planning step.

## 2. Proposed Technical Approach

- Keep the feature in the existing React application and derive all insight values from the current `expenses` and `categories` props.
- Integrate Spending Insights into the existing Dashboard rather than creating a separate page. The information is a natural extension of the dashboard, and a new route or navigation system would add complexity without a requirement for a separate workflow.
- Keep the existing “Total Expenses” summary card as the single prominent total-spending value, and add a clearly titled Spending Insights area below the dashboard summary cards.
- Use small, focused chart components so the dashboard remains readable and each visualisation has a clear responsibility.
- Keep calculations in pure utility functions, separate from rendering. Do not save calculated totals or chart data to localStorage; derive them from the persisted expense records so there is no second source of truth.
- Use the existing currency and date formatters wherever suitable.
- Add no charting-library dependency. The project has a small dependency set and simple charts can be rendered with SVG, which avoids extra bundle weight and keeps the feature consistent with the app's client-side architecture.

## 3. Interface Organisation

Place a Spending Insights section inside the existing Dashboard, after its summary cards and before Category Budgets. It will contain:

1. The existing Total Expenses card, which already satisfies the total-spending summary requirement.
2. A “Spending by Category” card with a horizontal bar chart.
3. A “Spending Over Time” card with a time-series column chart.
4. A shared helpful empty state in place of both charts when there are no recorded expenses.

This arrangement keeps the main takeaway (total spent) prominent and puts the two complementary visualisations together. On wider screens, the chart cards can sit side by side; on narrow screens, they should stack. The charts should use existing card styles and responsive breakpoints.

## 4. Files and Components to Change

### Existing files

- `src/components/Dashboard.jsx`
  - Add the Spending Insights section and render its chart content.
  - Continue to calculate and display total spending using the existing `calculateTotalExpenses` helper.
  - Remove or adapt the current category breakdown list if it would duplicate the new category chart. Preserve useful category labels and amounts in the chart or its accessible data equivalent.
- `src/styles.css`
  - Add styles for the insights layout, chart cards, SVG chart elements, axes, labels, empty state, and narrow-screen behaviour.
  - Reuse existing card, spacing, typography, and responsive conventions where possible.
- `tests/components.test.jsx`
  - Extend dashboard and expense-interaction tests to cover the insights charts, total, empty state, and live updates.
- `tests/expenseCalculations.test.js`
  - Add focused tests for any new pure aggregation helpers.

### Existing files expected not to need changes

- `src/App.jsx` already passes `expenses` and `categories` into `Dashboard`, and add/delete actions update that state. If a future edit flow updates the same expense state, the insights will also receive those changes without new event wiring.
- `src/hooks/useLocalStorage.js` already persists the app state. Insight results should not be stored separately.
- `src/utils/formatters.js` already provides currency and date formatting that the charts can reuse.
- `package.json` should remain unchanged if the native SVG approach is used.

## 5. New Components and Functions

### Proposed components

- `src/components/SpendingInsights.jsx`
  - Owns the section heading and chooses between the empty state and populated chart layout.
  - Receives `expenses` and `categories` as props.
- `src/components/CategorySpendChart.jsx`
  - Renders category totals as a horizontal bar chart.
  - Shows category names and formatted values, so colour is not the only way to identify a bar.
- `src/components/SpendingTrendChart.jsx`
  - Renders aggregated spending buckets in chronological order as SVG columns with date labels and formatted values.
  - Provides a text/table equivalent for assistive technology and users who cannot interpret the graphic.

### Proposed calculation helpers

Add pure helper functions to `src/utils/expenseCalculations.js` (or move insight-specific functions into a dedicated `src/utils/spendingInsights.js` if that file grows beyond a small set of helpers):

- `getSpendingByCategory(categories, expenses)`
  - Returns category identifiers, names, and summed spend for chart rendering.
  - Reuse or build on the existing `getCategorySummaries` helper to avoid duplicating category aggregation.
- `getSpendingTrend(expenses)`
  - Groups amounts into chronological time buckets and returns labels and totals suitable for the trend chart.
- A small date-bucket selection helper may be used within the trend calculation to keep labels legible for both short and long histories.

The calculation helpers should not mutate their input arrays or expense objects.

## 6. Data Processing and Aggregation

### Total spending

Use the existing `calculateTotalExpenses(expenses)` helper. It already sums the current expense amounts and rounds to cents. Continue formatting the result with `formatCurrency`.

### Spending by category

Aggregate each expense amount by its `categoryId`, then associate each sum with the matching category name and icon. Reuse `getCategorySummaries(categories, expenses)` where practical; it already calculates per-category spend. Omit zero-spend categories from the plotted bars to avoid clutter, while keeping the category label and exact amount adjacent to each non-zero bar.

### Spending over time

- Parse expense dates using the project's existing `YYYY-MM-DD` date convention; do not parse these date-only strings as UTC timestamps.
- Sum expense amounts by calendar date for histories spanning 60 days or fewer.
- For longer histories, sum by calendar month to keep the number of chart columns and axis labels manageable.
- Include every recorded expense in the selected buckets. The bucket choice changes only the chart's level of detail; it does not filter out expenses.
- Sort buckets chronologically before rendering.
- Round aggregate amounts to cents, consistently with the existing calculation helpers.

The 60-day cutoff is a proposed display rule, not a user-selectable filter. It should be isolated in the trend aggregation helper and covered by boundary tests so it can be adjusted later if usability testing suggests a better cutoff.

### Empty and unusual data

- If `expenses` is empty, render a message explaining that insights will appear after an expense is added; do not render zero-height charts.
- A zero-valued total remains visible as ₦0.00, consistent with the existing summary card behaviour.
- Keep calculations deterministic and avoid writing derived chart data into state or localStorage.

## 7. Charting and Visualisation Approach

### Category chart: horizontal bars

A horizontal bar chart is the clearest choice for comparing category totals. Category names can be longer than a typical chart label, and horizontal bars make both the names and relative amounts easier to scan than a pie or donut chart. Each row should display the category name, a scaled bar, and a formatted Naira total.

### Time chart: chronological columns

A column chart is a straightforward way to compare spending amounts across dates or months. Daily columns show short-term changes; monthly columns make longer histories easier to scan. Place chronological labels along the horizontal axis and a currency scale/grid on the vertical axis.

### SVG and accessibility

- Render shapes, axes, and grid lines as inline SVG, styled with the existing CSS palette.
- Keep labels and formatted values visible outside of colour encodings.
- Ensure text contrast and responsive sizing; for many daily buckets, allow the chart area to scroll horizontally instead of squeezing labels together.
- Give each chart a visible heading and an accessible name/description.
- Provide a semantic text or table equivalent of the plotted values, so the underlying figures remain available to screen readers and do not depend on the visual alone.
- Use the empty state instead of drawing charts when there are no expenses.

### Why not Chart.js or Recharts?

Either library could support more complex interactions, but this feature needs only two basic charts and the project currently has no charting dependency. Native SVG avoids adding and maintaining a package, keeps the production bundle smaller, and lets the team style and test the visuals with the existing React/CSS setup. If future requirements add zooming, rich tooltips, or many chart types, reconsider a library as a separate design decision.

## 8. Dynamic Updates

`Dashboard` already receives the current expenses and categories. Render the insights from those props and calculate derived values during rendering (or with `useMemo` only if profiling later demonstrates a need). React will render updated totals and charts whenever `App` changes its expense state after an add or delete. A future edit flow should update the same expense state; no separate chart refresh action or persisted insight state is required.

## 9. Implementation Steps

1. Confirm the chart layout and aggregation rules in this plan: dashboard integration, SVG charts, daily buckets for up to 60 days, monthly buckets beyond that.
2. Add and unit-test pure category and time aggregation helpers, reusing existing calculation utilities where suitable.
3. Build the category bar chart and trend column chart as focused components with readable values and accessible text equivalents.
4. Add the Spending Insights section to `Dashboard`, retaining the existing total-spending summary and choosing a suitable treatment for the existing category breakdown.
5. Add responsive and accessible chart styling in `src/styles.css`, matching existing design patterns.
6. Implement the no-expenses empty state and verify it transitions to charts when expense data is added.
7. Add component and interaction tests for totals, category values, chronological buckets, and updates after expense changes.
8. Run the focused test suite and production build; resolve regressions without changing unrelated behaviour.

## 10. Testing Strategy

### Unit tests for aggregation helpers

Add cases covering:

- Correct total per category, including multiple expenses in one category.
- Categories with no expenses.
- Correct total spending across all expenses, including decimal values and cent rounding.
- Daily grouping for histories within the 60-day span.
- Monthly grouping for histories exceeding the 60-day span.
- Chronological ordering, including month/year boundaries.
- All expenses contributing exactly once to a time bucket.
- Empty input returning safe, empty chart data.
- Inputs remaining unchanged after aggregation.

### Component tests

Using Vitest and React Testing Library:

- Render category labels and formatted totals for the category chart.
- Render trend buckets in chronological order with formatted values.
- Expose chart titles and accessible text/table equivalents.
- Show a helpful empty state and no chart when there are no expenses.
- Show the zero total in the empty state.

### Integration tests

Extend the existing App tests to verify:

- Adding an expense updates the dashboard total, category chart, and time chart without a refresh.
- Deleting an expense removes its value from the total and relevant chart buckets.
- Re-rendering with edited expense data changes the category and/or trend aggregates, even though a user-facing edit flow is currently out of scope.
- Existing dashboard, category-budget, expense-list, and localStorage behaviours continue to work.

### Validation commands

- `npm test` for the main Vitest suite.
- `npm run build` to verify the application compiles for production.
- `npm run test:bug` only if the change touches behaviour covered by the existing regression exercise; that exercise is intentionally maintained separately from the main suite.

## 11. Decisions and Open Questions

The plan makes the following proposals to keep implementation focused:

- Integrate insights into the dashboard rather than introducing a dedicated page.
- Use horizontal bars for category comparison and chronological columns for trends.
- Use native SVG rather than adding Chart.js or Recharts.
- Use daily trend buckets for date spans up to 60 days and monthly buckets for longer spans.
- Treat all recorded expense dates as eligible for the trend chart; no date-range selector is included.

These choices can be revisited before implementation if product or accessibility review identifies a better fit.
