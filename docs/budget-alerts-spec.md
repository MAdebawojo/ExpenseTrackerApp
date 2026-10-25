# Budget Alerts Feature Specification

## Purpose

Help users understand category-level budget usage, notice when spending is nearing or over budget, and move unspent budget between categories.

## Product context and scope

- The app is a client-side React expense tracker. Expenses and category budgets are stored in browser `localStorage`; this feature does not introduce a backend or cross-device synchronization.
- Budget status is derived from the current expenses and category budgets, rather than stored as separate alert records.
- The existing category budget table shows each category's budget, amount spent, and remaining amount. Users can already edit a category budget, including setting it below its current spending.
- Reallocation changes two category budgets. It does not move, create, or edit expenses, and it must preserve the total allocated budget.
- Alerts are persistent, in-context indicators of current status, not one-time notifications or browser push notifications.

## Functional requirements

### 1. 80% warning

Show a warning for a category when spending is at least 80% of its allocated budget and below 100%.

### 2. 100% alert

Show an alert for a category when spending is equal to or greater than its allocated budget. The alert replaces the 80% warning when the category is at or above 100%.

### 3. Visual budget status

Show a progress bar for every category, representing spending relative to its allocated budget. Include the amount spent, allocated budget, and percentage in visible text so status is not conveyed by color or the bar alone.

### 4. Fund reallocation

Allow a user to transfer a positive amount of available budget from one category to another.

- Available to transfer is the source category's unspent budget: `max(0, budget - spent)`.
- A transfer must not reduce the source budget below its current spending.
- The destination budget increases by the same amount that the source budget decreases.
- The transfer must not change total allocated budget or any expenses.
- The user must select distinct source and destination categories and enter a valid transfer amount.
- Provide a clear success message after a completed transfer and an actionable validation message when a transfer cannot be completed.

### 5. Automatic updates

Recalculate each category's spent amount, remaining balance, percentage, warning or alert state, and progress bar whenever an expense is added or deleted or a category budget is edited or reallocated. The displayed status must also be correct on initial load, including when values are restored from `localStorage`.

## Calculation and display rules

- Category spending is the sum of all expenses assigned to that category.
- Calculate percentage from spending and budget using decimal currency values; round displayed currency to two decimal places. Use the unrounded ratio for threshold comparisons to avoid changing threshold behavior due only to display rounding.
- At exactly 80%, show the warning. Below 80%, show no threshold warning or alert.
- At exactly 100% or higher, show the alert and do not show the 80% warning.
- Display the actual percentage, including values greater than 100%. Cap the progress bar's filled visual portion at 100% so it cannot overflow its track; the text and alert communicate any over-budget amount.
- For a zero budget and zero spending, show 0% and no warning or alert. For a zero budget and positive spending, show an alert and an over-budget status; do not divide by zero.
- Negative budgets are not valid. Existing category budget editing accepts zero and remains otherwise unchanged.
- Status indicators should be textually identifiable to assistive technology and must not rely on color alone. Progress bars must have an accessible category-specific name and expose their value and maximum to assistive technology.

## Acceptance criteria

1. A category at 79.99% of budget shows no warning or alert.
2. A category at exactly 80% shows the warning.
3. A category above 80% but below 100% continues to show the warning.
4. A category at exactly 100% shows the alert and not the warning.
5. A category above 100% shows the alert, its actual over-budget percentage and amount, and a visually capped progress bar.
6. Every category displays a progress bar plus readable spent, budget, and percentage values.
7. A zero-budget category with no spending displays 0% without a warning or alert; adding positive spending puts it in alert state without a calculation error.
8. Adding or deleting an expense updates the affected category's spent amount, remaining amount, percentage, progress bar, and status without a page reload.
9. Editing a category budget updates the same derived values and status without a page reload, including when the new budget causes a warning or alert.
10. A valid transfer reduces the source budget and increases the destination budget by the same amount; the total budget and expense records stay unchanged.
11. A transfer cannot make a source budget smaller than its spending. The app reports the issue and leaves both budgets unchanged.
12. Successful budget changes and transfers persist across reloads using the app's existing local-storage behavior; derived statuses are correct after reload.
13. Warnings, alerts, and progress values remain understandable without color and are exposed accessibly to assistive technologies.

## Edge cases and expected behavior

- **Threshold boundary:** Compare using the actual spending-to-budget ratio, not the rounded percentage shown in text.
- **Overspending:** An expense can take a category past 100%. Show the alert; do not block recording an otherwise valid expense.
- **Zero budget:** Handle zero-spend and positive-spend cases as defined above, without `NaN` or infinity in the UI.
- **No categories:** Do not render category progress/status entries or offer a transfer until there are at least two categories.
- **Same source and destination:** Reject the transfer, show a validation message, and leave budgets unchanged.
- **No transferable funds:** A source at or above its spending has no available funds; prevent a positive transfer from it.
- **Amount is blank, zero, negative, non-numeric, non-finite, or more than two decimal places:** Reject the transfer and explain that it must be a positive amount with at most two decimal places.
- **Transfer exceeds available funds:** Reject without partially applying the transfer; display the maximum currently transferable amount.
- **Insufficient destination/source selection:** Require both categories and keep the user's form context so they can correct the inputs.
- **Budget is edited below current spending:** Preserve the existing ability to edit it; immediately show the category's alert and over-budget progress status.
- **Expense is deleted after an alert:** Recalculate immediately; remove or downgrade the alert if the resulting spending is below the relevant threshold.
- **Budget change or transfer crosses a threshold:** Update the corresponding warning or alert immediately in both affected categories.
- **Currency precision:** Transfer amounts and budget updates are represented to cents. Reject extra precision rather than silently transferring a different amount.
- **Local storage unavailable or invalid:** Follow the app's existing persistence/error-handling behavior; do not present a successful persisted transfer if saving failed.
- **Responsive layout:** Keep the progress/status information and reallocation controls usable at narrow viewport sizes as well as desktop widths.
