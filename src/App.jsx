import Header from './components/Header.jsx';
import Dashboard from './components/Dashboard.jsx';
import CategoryBudgets from './components/CategoryBudgets.jsx';
import ExpenseForm from './components/ExpenseForm.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import {
  STORAGE_KEYS,
  createSampleCategories,
  createSampleExpenses,
} from './data/sampleData.js';
import { reallocateCategoryBudget } from './utils/expenseCalculations.js';

function generateExpenseId() {
  return `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function App() {
  const [expenses, setExpenses] = useLocalStorage(STORAGE_KEYS.expenses, createSampleExpenses);
  const [categories, setCategories] = useLocalStorage(
    STORAGE_KEYS.categories,
    createSampleCategories
  );

  function addExpense(expense) {
    setExpenses((current) => [...current, { id: generateExpenseId(), ...expense }]);
  }

  function deleteExpense(expenseId) {
    setExpenses((current) => current.filter((expense) => expense.id !== expenseId));
  }

  function updateCategoryBudget(categoryId, budget) {
    setCategories((current) =>
      current.map((category) => (category.id === categoryId ? { ...category, budget } : category))
    );
  }

  function reallocateBudget(sourceId, destinationId, amount) {
    const result = reallocateCategoryBudget(categories, expenses, sourceId, destinationId, amount);
    if (result.success) {
      setCategories(result.categories);
    }
    return result;
  }

  function resetDemoData() {
    const confirmed = window.confirm(
      'Reset all data to the original demo data? Your added expenses and budget changes will be lost.'
    );
    if (confirmed) {
      setExpenses(createSampleExpenses());
      setCategories(createSampleCategories());
    }
  }

  return (
    <>
      <Header />

      <main className="container">
        <Dashboard categories={categories} expenses={expenses} />

        <CategoryBudgets
          categories={categories}
          expenses={expenses}
          onUpdateBudget={updateCategoryBudget}
          onReallocateBudget={reallocateBudget}
        />

        <section className="section" aria-labelledby="expenses-heading">
          <h2 id="expenses-heading" className="section__title">
            Expenses
          </h2>
          <div className="expenses-layout">
            <ExpenseForm categories={categories} onAddExpense={addExpense} />
            <ExpenseList
              expenses={expenses}
              categories={categories}
              onDeleteExpense={deleteExpense}
            />
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <div className="container app-footer__inner">
          <p>ExpenseFlow &middot; Data is stored locally in your browser.</p>
          <button type="button" className="btn btn--secondary" onClick={resetDemoData}>
            ↺ Reset Demo Data
          </button>
        </div>
      </footer>
    </>
  );
}

export default App;
