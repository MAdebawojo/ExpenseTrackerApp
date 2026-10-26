# ExpenseFlow — Personal Expense & Budget Tracker

ExpenseFlow is a small expense tracker built with **React** and **Vite**. It is the starter project for the **[Building with AI: AI-Assisted Engineering](https://github.com/IAMebonyhope/building-with-ai-workshop)** workshop. In the workshop you will use an AI coding agent, such as GitHub Copilot, to explore this codebase, debug an issue, and build a new feature.

Everything runs in your browser. There is no backend, no login, and no API keys. Your data is saved in the browser's `localStorage`.

> 👋 **Attending the workshop?** Start with the [workshop guide](https://github.com/IAMebonyhope/building-with-ai-workshop). It walks you through setup step by step.

---

## Technology Stack

| Technology | What it's used for |
| --- | --- |
| [React](https://react.dev) | Building the user interface from components |
| JavaScript | The programming language (no TypeScript) |
| [Vite](https://vite.dev) | Development server and production build |
| CSS and inline SVG | Styling and lightweight, responsive spending charts |
| Browser `localStorage` | Saving your data between page refreshes |
| [Vitest](https://vitest.dev) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) | Automated tests |
| npm | Installing packages and running scripts |

## Prerequisites

- **Node.js 22.12 or newer.** The current LTS version (24) is recommended. Check with:
  ```bash
  node --version
  ```
  If you need to install it, download the **LTS** version from <https://nodejs.org>. Node.js 20 is **not** supported, because the test tools need Node.js 22 or newer.
- **npm** (installed with Node.js).
- **Git**, to download (clone) the project.
- A code editor (VS Code recommended) and a modern web browser.

## Getting Started

```bash
# 1. Download the project
git clone https://github.com/IAMebonyhope/simple-expense-tracker.git

# 2. Go to the project folder
cd simple-expense-tracker

# 3. Install dependencies (only needed once)
npm install

# 4. Start the development server
npm run dev
```

Open the URL printed in the terminal, usually <http://localhost:5173>. The app reloads automatically when you save a file. Press `Ctrl + C` in the terminal to stop the server.

### Other commands

| Command              | What it does                                                           |
| -------------------- | ---------------------------------------------------------------------- |
| `npm run dev`        | Starts the development server.                                         |
| `npm run build`      | Creates a production build in the `dist/` folder.                      |
| `npm run preview`    | Serves the production build locally (run `npm run build` first).       |
| `npm test`           | Runs the main automated test suite once.                               |
| `npm run test:watch` | Runs the main tests in watch mode, re-running when files change.       |
| `npm run test:bug`   | Runs the targeted regression test for the dashboard totals (see below). |

## Running Tests

Tests use [Vitest](https://vitest.dev) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

```bash
npm test
```

All tests in the main suite should pass.

The dashboard-total **regression test** lives in `tests/regression/` and runs separately:

```bash
npm run test:bug
```

This targeted suite is separate from `npm test`; both should pass.

## Features

- **Dashboard**: total allocated budget, total expenses, remaining balance, and Spending Insights.
- **Spending Insights**: horizontal bars compare spending across categories; a trend chart shows daily totals for spans up to 60 days and monthly totals for longer spans. Expand the data details under each chart to see exact values.
- **Category budgets**: six categories, each with an allocated budget, the amount spent, and the remaining balance. Click **Edit** to change a category's budget. The remaining balance can go negative when you overspend.
- **Add expenses**: enter a description, amount, category, and date. The form checks that every field is valid.
- **View expenses**: all expenses are listed newest first. Use the **Sort** menu to show oldest first, or to group them by category.
- **Delete expenses**: click **Delete** on any expense and confirm.
- **Saved automatically**: changes are kept in `localStorage`, so they survive a page refresh.
- **Reset Demo Data**: restores the original sample data (see below).

Spending Insights uses the same expense data as the expense list and updates automatically when expenses are added or deleted. If there are no expenses, it displays a prompt to add one instead of empty charts. The total remains visible as ₦0.00. Expenses are not currently editable through the interface.

### Sample data

All amounts are in **Nigerian Naira (₦)**. On first launch the app loads 29 sample expenses across six categories. They reflect a typical month for a young working professional in a Nigerian city: market runs and buka lunches, danfo and keke fares, data plans, electricity tokens, and so on. The monthly budgets are:

| Category          | Allocated Budget |
| ----------------- | ---------------: |
| Food & Dining     |         ₦100,000 |
| Transportation    |          ₦50,000 |
| Shopping          |          ₦30,000 |
| Entertainment     |          ₦20,000 |
| Bills & Utilities |          ₦50,000 |
| Health & Wellness |          ₦20,000 |
| **Total**         |     **₦270,000** |

Rent isn't included because it's usually paid yearly. Expense amounts are the same for everyone. Dates are calculated relative to today, so the data always looks recent.

## Resetting Demo Data

Click **↺ Reset Demo Data** at the bottom of the page and confirm. This replaces all expenses and budgets with the original sample data.

If the page ever fails to load, you can also clear the data manually. Open your browser's DevTools, go to **Application → Local Storage**, and delete the `expenseflow.expenses` and `expenseflow.categories` keys. Then refresh the page.

## Project Structure

```text
├── index.html                  # HTML page that loads the React app
├── src/
│   ├── main.jsx                # Entry point: renders <App /> into the page
│   ├── App.jsx                 # Top-level component: holds state and actions
│   ├── styles.css              # All application styles
│   ├── components/
│   │   ├── Header.jsx          # App title and subtitle
│   │   ├── Dashboard.jsx       # Dashboard summaries and Spending Insights
│   │   ├── SummaryCard.jsx     # One summary statistic card
│   │   ├── SpendingInsights.jsx # Insights section and empty state
│   │   ├── CategorySpendChart.jsx # Horizontal category comparison chart
│   │   ├── SpendingTrendChart.jsx # Daily/monthly spending trend chart
│   │   ├── CategoryBudgets.jsx # Category table with budget editing
│   │   ├── ExpenseForm.jsx     # Add-expense form with validation
│   │   └── ExpenseList.jsx     # Expense table with sorting and delete
│   ├── data/
│   │   └── sampleData.js       # Default categories, sample expenses, storage keys
│   ├── hooks/
│   │   └── useLocalStorage.js  # useState that also saves to localStorage
│   └── utils/
│       ├── expenseCalculations.js # Totals, per-category spending, sorting
│       ├── spendingInsights.js # Category and timeline aggregation
│       └── formatters.js       # Currency and date helpers
├── tests/
│   ├── setup.js                # Test setup (jest-dom matchers, cleanup)
│   ├── expenseCalculations.test.js
│   ├── components.test.jsx
│   ├── spendingInsights.test.jsx
│   └── regression/             # Targeted regression test (npm run test:bug)
├── SPEC.md                     # Spending Insights requirements
├── PLAN.md                     # Spending Insights technical plan
├── TESTING.md                  # Spending Insights test coverage and results
├── vite.config.js              # Vite + Vitest configuration
└── vitest.regression.config.js # Vitest config for the regression test
```

### How data flows

1. `App.jsx` keeps two pieces of state, `expenses` and `categories`, using the `useLocalStorage` hook.
2. On first launch, the hook fills them with sample data from `sampleData.js`. After that it loads whatever was saved.
3. `App.jsx` passes the data down to the dashboard and other components as props, together with functions to change it (`addExpense`, `deleteExpense`, `updateCategoryBudget`).
4. Dashboard components use helpers in `utils/expenseCalculations.js` and `utils/spendingInsights.js` to calculate totals, category spending, and time buckets. These insight values are **derived**, not stored separately.
5. Any change to state is saved back to `localStorage` automatically.

### Stored data format

```js
// localStorage["expenseflow.categories"]
[{ id: 'food', name: 'Food & Dining', icon: '🍽️', budget: 100000 }, ...]

// localStorage["expenseflow.expenses"]  (amounts in Naira)
[{ id: 'exp-003', description: 'Supermarket groceries', amount: 15745.85,
   categoryId: 'food', date: '2026-09-24' }, ...]
```

## Troubleshooting

| Problem | Try this |
| ------- | -------- |
| `npm` or `node` is not recognized | Install the Node.js LTS version (22.12 or newer) and restart your terminal. |
| Errors mentioning `EBADENGINE` or an unsupported Node.js version | Your Node.js is too old. Install the LTS version from nodejs.org, then delete `node_modules` and run `npm install` again. |
| `npm install` fails | Check your internet connection. Delete the `node_modules` folder, then run `npm install` again. |
| Port 5173 is already in use | Vite picks the next free port automatically. Use the URL shown in the terminal. |
| The page is blank | Check the terminal and the browser console (F12) for errors. Make sure you ran `npm install`. |
| My data looks wrong or old | Click **Reset Demo Data**, or clear the `expenseflow.*` keys in DevTools (see above). |
| Tests fail after you changed the code | Read the failure message. It shows the expected and the actual value. Run `npm run test:watch` while you fix it. |
| PowerShell blocks `npm` scripts on Windows | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use Command Prompt or Git Bash. |

Happy building! 🚀
