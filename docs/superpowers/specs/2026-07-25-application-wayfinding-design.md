# Application Wayfinding Design

## Goal

Every navigable application screen must provide a predictable way back and a
clear indication of its place in the application hierarchy on mobile and
desktop.

## Scope

- Add one shared wayfinding rail above every page rendered by the authenticated
  application layout.
- Keep the rail in the same location on every screen.
- Give nested screens a deterministic link to their semantic parent.
- Use browser history only for root screens that do not have a semantic parent.
- Render breadcrumbs even when the trail contains only the current root screen.
- Cover every route declared in `client/src/App.tsx`, including Academic Levels
  and Semester Setup.
- Add a compact `Library / Book title` breadcrumb to the full-screen book
  reader, which intentionally sits outside the authenticated layout.
- Replace the purpose-built return links on sign-in, registration, activation,
  password-reset, access-denied, and not-found screens with one standalone
  back-and-breadcrumb component. The welcome page is the public root and does
  not receive an artificial back action.

## Interaction

The shared back control is a semantic link when a parent route exists. Its
accessible label names the destination, such as “Back to Students.” On a root
screen it is a semantic button labeled “Go back” and uses browser history.

The control has a minimum 44px touch target, a visible keyboard focus ring, and
uses the existing Lucide arrow icon. On narrow screens the visible label becomes
“Back”; the full destination remains available to assistive technology.

Breadcrumbs remain horizontally scrollable on small screens and collapse long
trails using the existing ellipsis behavior. The current page is marked with
`aria-current` by the existing breadcrumb primitive.

## Architecture

`client/src/lib/breadcrumbs.ts` remains the source of truth for route hierarchy.
It will expose a small helper that derives the parent back target from the
trail. `client/src/components/BreadcrumbNavigation.tsx` will compose the back
control and breadcrumb trail. `StandalonePageNavigation.tsx` will provide the
same interaction contract on screens outside the authenticated layout.
`ProtectedRoute` will render that standalone rail only when it owns the outer
page shell; nested permission denials reuse the authenticated layout rail so
the controls never appear twice. No page-specific navigation state or new
dependency is required.

## Validation

- Route-table tests prove that every authenticated content route produces a
  current-page breadcrumb.
- Unit tests prove nested routes resolve to their immediate semantic parent and
  root routes fall back to history.
- Source/component tests cover the accessible back control, touch sizing, and
  full-screen book breadcrumb.
- Full client tests, lint, and production build must pass.
- The final diff receives an independent code review before commit and push.
