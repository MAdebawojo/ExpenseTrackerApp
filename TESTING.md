# Spending Insights Testing

## Purpose

This document records the automated test strategy and results for reviewing the Spending Insights feature against the acceptance criteria in [SPEC.md](./SPEC.md).

The feature derives its insight values from the current expense and category data. The tests therefore cover both the pure aggregation functions and the React UI that presents their results.

## Coverage by Acceptance Criteria

| Specification criterion | Automated coverage |
| --- | --- |
| Category chart appears when categorized spending exists | `tests/spendingInsights.test.jsx` verifies category labels, formatted totals, and omission of unused categories; `tests/components.test.jsx` checks the dashboard chart. |
| Category totals match expenses | `tests/expenseCalculations.test.js` tests category aggregation; component tests verify rendered totals. |
| Spending trend appears in chronological order and reflects spending | `tests/expenseCalculations.test.js` covers daily/monthly grouping, chronological bucket keys, cent rounding, gaps, and the 60-day threshold; `tests/spendingInsights.test.jsx` verifies displayed trend tables and labels. |
| Total spending reflects all current expenses | `tests/expenseCalculations.test.js` tests summation, rounding, and empty input; `tests/components.test.jsx` checks the dashboard total after adding and deleting expenses. |
| Insights update when expenses change | `tests/components.test.jsx` exercises adding and deleting expenses through the app; `tests/spendingInsights.test.jsx` rerenders with edited amount, category, and date data and verifies the changed breakdowns. |
| No-expense state is helpful and avoids empty charts | `tests/components.test.jsx` verifies the dashboard total is zero and the empty message replaces the charts; `tests/spendingInsights.test.jsx` verifies the component has no chart data tables in this state. |
| Accessibility and data clarity | Component tests verify accessible chart names and that exact category and trend values are available through semantic data tables. |

The application currently has no user-facing edit-expense action. The edit test rerenders the insights component with a changed expense record to test its response to new props without adding an edit feature.

Visual clarity and responsive layout are partly visual qualities and are not fully proven by DOM tests. Before release, manually review the charts at desktop and narrow viewport widths, including horizontal scrolling of the daily trend.

## Test Layers

### Calculation tests

`tests/expenseCalculations.test.js` covers:

- Total spend across all expenses and zero expenses.
- Decimal sums rounded to cents.
- Per-category totals, sorting, and omission of zero-spend categories.
- Daily aggregation and monthly aggregation for longer date spans.
- The 60-day daily/monthly boundary.
- Chronological ordering and zero-valued buckets for periods without expenses.
- Invalid dates and input immutability.

### Component tests

`tests/spendingInsights.test.jsx` verifies rendered charts, category labels and amounts, trend data tables, monthly labels, dynamic updates from changed expense props, empty data, and expenses whose dates cannot be plotted.

`tests/components.test.jsx` verifies integration with the dashboard and app state, including updating totals and category spending after add/delete actions.

## Tests Performed

### Automated

The following automated tests were run after adding the Spending Insights coverage:

- Focused calculation, component, and app integration tests.
- The complete main Vitest suite.
- The separate dashboard-total regression suite.

### Manual

No manual browser or visual tests were performed for this review. The automated DOM tests verify rendered labels, values, accessible table data, and empty-state behaviour, but do not verify the actual visual appearance or responsive layout in a browser.

Suggested manual checks before release:

1. Open the dashboard with its sample data and check that category bars are easy to compare and their labels and amounts are legible.
2. Check the trend chart with both a short date span and expenses spanning more than 60 days.
3. Resize to a narrow viewport and confirm the chart cards stack and the trend remains reachable by horizontal scrolling.
4. Clear expenses and verify the empty message and zero total are visible; add an expense and verify the charts return.
5. Use keyboard navigation and a screen reader to review chart names, scroll controls, and the expandable data tables.

## Commands Used to Run the Tests

Run the main test suite:

```bash
npm test
```

Run only the Spending Insights and directly related tests:

```bash
npm test -- tests/expenseCalculations.test.js tests/spendingInsights.test.jsx tests/components.test.jsx
```

The dashboard regression tests use their own Vitest configuration and are run separately:

```bash
npm run test:bug
```

## Actual Test Results

Focused run (`npm test -- tests/expenseCalculations.test.js tests/spendingInsights.test.jsx tests/components.test.jsx`):

```text
Test Files  3 passed (3)
Tests       78 passed (78)
```

Full main suite (`npm test`):

```text
Test Files  3 passed (3)
Tests       78 passed (78)
```

Dashboard regression suite (`npm run test:bug`):

```bash
Test Files  1 passed (1)
Tests       4 passed (4)
```

All three commands exited successfully. The regression suite runs separately from `npm test`.

## Bugs Found and Fixed

- **Test assertion issue, not an application bug:** The first focused run failed because the monthly trend fixture included expenses in January and April, so the trend correctly rendered two zero-spend months (February and March). The test expected only one `₦0.00` result and therefore matched multiple elements. The assertion was changed to check the amount in each named month row separately. The tests passed after that correction.

No Spending Insights product defects were identified by the automated tests performed.

## Known Limitations

- No manual browser, visual, or assistive-technology testing was performed. Responsive appearance and actual screen-reader behaviour remain to be checked manually.
- Automated edit coverage rerenders the insights component with changed expense props. The app has no user-facing edit-expense flow, so an end-to-end edit action is not covered.
- Invalid expense dates are excluded from the trend chart because they cannot be assigned to a valid date bucket. The category chart and total still use the expense amounts.
- Trend detail switches from daily to monthly buckets when the first-to-last expense date span exceeds 60 days. This is the current design rule and has boundary test coverage; it is not user-configurable.
