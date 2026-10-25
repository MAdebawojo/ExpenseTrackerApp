import { useState } from 'react';
import {
  calculateAvailableBudget,
  calculateCategoryBudgetStatus,
  getCategorySummaries,
} from '../utils/expenseCalculations.js';
import { formatCurrency } from '../utils/formatters.js';

function CategoryBudgets({ categories, expenses, onUpdateBudget, onReallocateBudget }) {
  const [editingId, setEditingId] = useState(null);
  const [draftBudget, setDraftBudget] = useState('');
  const [error, setError] = useState('');
  const [transfer, setTransfer] = useState({ sourceId: '', destinationId: '', amount: '' });
  const [transferError, setTransferError] = useState('');
  const [transferMessage, setTransferMessage] = useState('');

  const categorySummaries = getCategorySummaries(categories, expenses);
  const categoriesWithAvailable = categories.map((category) => ({
    ...category,
    available: calculateAvailableBudget(category, expenses),
  }));
  const hasTransferableBudget = categoriesWithAvailable.some((category) => category.available > 0);

  function startEditing(category) {
    setEditingId(category.id);
    setDraftBudget(String(category.budget));
    setError('');
  }

  function cancelEditing() {
    setEditingId(null);
    setDraftBudget('');
    setError('');
  }

  function saveBudget(event) {
    event.preventDefault();
    const budget = Number(draftBudget);
    if (draftBudget.trim() === '' || !Number.isFinite(budget) || budget < 0) {
      setError('Budget must be a number of 0 or more.');
      return;
    }
    onUpdateBudget(editingId, Math.round(budget * 100) / 100);
    cancelEditing();
  }

  function handleTransferChange(event) {
    const { name, value } = event.target;
    setTransfer((current) => ({ ...current, [name]: value }));
    setTransferError('');
    setTransferMessage('');
  }

  function submitTransfer(event) {
    event.preventDefault();
    setTransferError('');
    setTransferMessage('');

    const result = onReallocateBudget(
      transfer.sourceId,
      transfer.destinationId,
      transfer.amount
    );
    if (!result.success) {
      const messages = {
        select_categories: 'Select both a source and destination category.',
        same_category: 'Choose different source and destination categories.',
        unknown_category: 'Choose valid source and destination categories.',
        invalid_amount: 'Enter a positive amount with no more than two decimal places.',
        no_available_funds: 'The selected source category has no available funds to transfer.',
        insufficient_funds: `Transfer amount exceeds available funds (${formatCurrency(result.available)}).`,
      };
      setTransferError(messages[result.error]);
      return;
    }

    const source = categories.find((category) => category.id === transfer.sourceId);
    const destination = categories.find((category) => category.id === transfer.destinationId);
    setTransfer({ ...transfer, amount: '' });
    setTransferMessage(
      `Transferred ${formatCurrency(Number(transfer.amount))} from ${source.name} to ${destination.name}.`
    );
  }

  return (
    <section className="section" aria-labelledby="categories-heading">
      <h2 id="categories-heading" className="section__title">
        Category Budgets
      </h2>

      {categories.length >= 2 && (
        <div className="card reallocation-card">
          <h3 className="card__title">Reallocate Budget</h3>
          <form className="reallocation-form" onSubmit={submitTransfer} noValidate>
            <div className="form-field">
              <label htmlFor="transfer-source">From category</label>
              <select
                id="transfer-source"
                name="sourceId"
                value={transfer.sourceId}
                onChange={handleTransferChange}
                aria-invalid={transferError ? 'true' : 'false'}
                aria-describedby={transferError ? 'transfer-error' : undefined}
              >
                <option value="">Select source</option>
                {categoriesWithAvailable.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                    disabled={category.available <= 0}
                  >
                    {category.name} — {formatCurrency(category.available)} available
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="transfer-destination">To category</label>
              <select
                id="transfer-destination"
                name="destinationId"
                value={transfer.destinationId}
                onChange={handleTransferChange}
                aria-invalid={transferError ? 'true' : 'false'}
                aria-describedby={transferError ? 'transfer-error' : undefined}
              >
                <option value="">Select destination</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="transfer-amount">Transfer amount (₦)</label>
              <input
                id="transfer-amount"
                name="amount"
                type="text"
                inputMode="decimal"
                value={transfer.amount}
                onChange={handleTransferChange}
                aria-invalid={transferError ? 'true' : 'false'}
                aria-describedby={transferError ? 'transfer-error' : undefined}
              />
            </div>
            <button type="submit" className="btn btn--primary">
              Transfer funds
            </button>
            {!hasTransferableBudget && (
              <p className="reallocation-note">No category has unspent budget available to transfer.</p>
            )}
            {transferError && (
              <p id="transfer-error" className="field-error" role="alert">
                {transferError}
              </p>
            )}
            {transferMessage && (
              <p className="form-status" role="status" aria-live="polite">
                {transferMessage}
              </p>
            )}
          </form>
        </div>
      )}

      <div className="card card--flush">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col" className="num">
                Allocated Budget
              </th>
              <th scope="col" className="num">
                Spent
              </th>
              <th scope="col" className="num">
                Remaining
              </th>
              <th scope="col">Budget Progress</th>
              <th scope="col">Budget Status</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {categorySummaries.map((category) => {
              const isEditing = editingId === category.id;
              const inputId = `budget-${category.id}`;
              const errorId = `budget-error-${category.id}`;
              const { percentage, progress, status } = calculateCategoryBudgetStatus(
                category.spent,
                category.budget
              );
              const progressValueText =
                percentage === null
                  ? `${formatCurrency(category.spent)} spent against a zero budget`
                  : `${percentage}% of ${formatCurrency(category.budget)} budget used`;

              return (
                <tr key={category.id}>
                  <th scope="row" data-label="Category">
                    <span className="category-icon" aria-hidden="true">
                      {category.icon}
                    </span>
                    {category.name}
                  </th>
                  <td className="num" data-label="Allocated Budget">
                    {isEditing ? (
                      <form className="budget-form" onSubmit={saveBudget} noValidate>
                        <label htmlFor={inputId} className="visually-hidden">
                          Allocated budget for {category.name}
                        </label>
                        <input
                          id={inputId}
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={draftBudget}
                          onChange={(event) => setDraftBudget(event.target.value)}
                          aria-invalid={error ? 'true' : 'false'}
                          aria-describedby={error ? errorId : undefined}
                          autoFocus
                        />
                        <div className="budget-form__actions">
                          <button type="submit" className="btn btn--primary btn--small">
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            onClick={cancelEditing}
                          >
                            Cancel
                          </button>
                        </div>
                        {error && (
                          <p id={errorId} className="field-error" role="alert">
                            {error}
                          </p>
                        )}
                      </form>
                    ) : (
                      formatCurrency(category.budget)
                    )}
                  </td>
                  <td className="num" data-label="Spent">
                    {formatCurrency(category.spent)}
                  </td>
                  <td className="num" data-label="Remaining">
                    {formatCurrency(category.remaining)}
                  </td>
                  <td data-label="Budget Progress">
                    <div className="budget-progress">
                      <progress
                        max="100"
                        value={progress}
                        aria-label={`${category.name} budget usage`}
                        aria-valuetext={progressValueText}
                      />
                      <span>
                        {formatCurrency(category.spent)} of {formatCurrency(category.budget)} (
                        {percentage === null ? 'Over budget' : `${percentage}%`})
                      </span>
                    </div>
                  </td>
                  <td data-label="Budget Status">
                    {status !== 'normal' && (
                      <p
                        className={`budget-status budget-status--${status}`}
                        role={status === 'alert' ? 'alert' : 'status'}
                      >
                        {status === 'warning'
                          ? `Warning: ${percentage}% of budget used.`
                          : percentage === null
                            ? 'Alert: Spending exceeds a zero budget.'
                            : `Alert: ${percentage}% of budget used.`}
                      </p>
                    )}
                  </td>
                  <td className="actions">
                    {!isEditing && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--small"
                        onClick={() => startEditing(category)}
                        aria-label={`Edit budget for ${category.name}`}
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default CategoryBudgets;
