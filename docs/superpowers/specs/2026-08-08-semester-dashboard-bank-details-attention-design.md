# Semester dashboard bank-details attention

## Goal

Make the semester dashboard's existing **Needs attention** section the first operational section on mobile, and remind the signed-in user to complete payment details when any required bank field is missing.

## Scope

- Reorder the mobile dashboard so **Needs attention** appears immediately below the semester header and before **Quick tools**.
- Preserve the current desktop placement and visual treatment.
- Add one user-specific attention item when payment details are incomplete.
- Link the item to the existing payment-details editor at `/profile#payment`.
- Leave attendance and curriculum attention checks unchanged.

## Completeness rule

Payment details are complete only when every existing payment field contains a non-whitespace value:

- Bank account number
- Name on account
- IFSC code
- Bank name
- Bank branch
- UPI ID

The rule applies to every signed-in user, regardless of global role or semester sub-role. It checks only the current user; it does not inspect other staff members.

## User interface

When payment details are incomplete, **Needs attention** includes an item with:

- Title: `Complete your bank details`
- Supporting text explaining that all payment details are required for remuneration
- Action: `Complete bank details`
- Destination: `/profile#payment`

The item remains visible until all six fields satisfy the completeness rule. Once complete, it disappears automatically when the current-user query refreshes after saving payment details.

On mobile, the full **Needs attention** card is rendered directly below the semester header. **Quick tools** follows it. On desktop, the card remains in the main dashboard column. A shared rendering path should prevent the mobile and desktop versions from drifting.

If there are no attention items, retain the existing mobile all-clear state and desktop no-follow-up state.

## Data flow

1. `Dashboard` receives the signed-in user from the existing authentication hook.
2. A small pure helper evaluates the six payment fields.
3. An incomplete result adds the bank-details item to the existing `attentionItems` collection.
4. The existing current-user invalidation after saving payment details refreshes the dashboard state; no additional API request or database column is needed.

## Accessibility and error handling

- Use the existing semantic section heading and keyboard-focus styles.
- Render the requested action as a clearly named link/button with an adequate touch target.
- Treat absent user data or any missing/blank payment field as incomplete. The dashboard's existing loading and error states remain responsible for authentication and page-level failures.

## Testing

- Unit-test the completeness helper with all fields present and with each field missing or whitespace-only.
- Verify the bank-details attention item and `/profile#payment` action are wired into the dashboard.
- Verify the mobile **Needs attention** section occurs before **Quick tools** while desktop placement remains responsive.
- Run the focused dashboard tests, then the relevant client test suite and build checks.

## Out of scope

- Adding notification persistence, dismissal, history, email, or push delivery
- Checking or displaying another user's bank details
- Changing payment-detail validation or the profile payment form
- Adding a backend completeness field or endpoint
