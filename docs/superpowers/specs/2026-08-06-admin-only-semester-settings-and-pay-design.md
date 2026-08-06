# Admin-only semester settings and pay

## Goal

Only administrators may access Team settings and Pay from a semester dashboard.

## Scope

- Remove Team settings (Semester users) and Pay (Remuneration) from non-admin dashboard actions.
- Protect their frontend routes with the existing admin-only route guard.
- Reject non-admin requests to the semester-users and remuneration read/write endpoints with HTTP 403.

## Design

The dashboard action model will render those actions only when the authenticated user has the `ADMIN` role. The corresponding routes will use `ProtectedRoute requireAdmin`, preventing a bookmarked URL from loading the pages.

The server remains the enforcement boundary. The semester-users listing and all remuneration user, rate, and period endpoints will require an administrator instead of accepting a scoped `CENTER_MANAGER` assignment. Existing administrator behavior and the expense payment restriction remain unchanged.

## Testing

Focused frontend tests will verify that an administrator sees both actions and a center manager sees neither. Server authorization tests will verify that a center manager receives 403 from each affected endpoint while an administrator remains permitted.

## Non-goals

- Changing center-manager access to attendance, students, curriculum, or exams.
- Altering a staff member's personal payment details.
- Introducing a new permission type.
