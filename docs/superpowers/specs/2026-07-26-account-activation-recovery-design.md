# Account Activation Recovery Design

**Date:** 2026-07-26

## Problem

Registration approval currently creates a secure, single-use activation token that
expires after one hour. Eight approval emails were sent successfully, but their
tokens expired before the educators used them. The email does not state the
deadline, and the activation screen does not provide a recovery action when a link
is no longer usable.

Opening or refreshing the activation page does not consume the token. A token is
consumed only when the user submits a valid password and the server successfully
updates the password. Issuing a newer activation token still invalidates older
unused activation tokens.

## Decisions

- Activation tokens remain random, hashed at rest, single-use, and invalidated when
  superseded.
- Activation tokens expire 24 hours after issue.
- Password-reset tokens retain their shorter one-hour lifetime.
- The approval email explicitly states the 24-hour activation deadline and directs
  users with an expired link to request a password-reset link from the sign-in
  flow.
- A failed activation attempt shows a neutral error-recovery panel with a direct
  link to the existing password-reset page.
- The recovery copy does not disclose whether a token was expired, already used,
  invalid, or replaced.
- No separate activation-resend endpoint is introduced. The existing password-reset
  flow already works for approved accounts and provides the smallest secure
  recovery path.

## One-time Data Repair

Exactly eight expired, unused activation tokens were previously verified as being
tied to successfully sent registration-approval emails. A guarded database repair
will:

1. Re-derive the relevant token hashes from sent approval email jobs.
2. Select only `ACTIVATION` tokens that remain unused and expired.
3. Abort unless the guarded set contains exactly eight records.
4. Give those records one common expiry 24 hours from the repair.
5. Verify that all eight are unused and live without logging tokens, hashes, user
   details, email addresses, or database IDs.

This repair does not revive tokens that were consumed or invalidated.

## User Experience

The existing account form remains visually consistent. After an activation
failure, an accessible `role="alert"` panel explains that the link may be unusable
and presents one clear, full-width-friendly recovery link. It uses existing
semantic theme colors, wraps cleanly on small screens, remains keyboard accessible,
and does not rely on color alone.

## Verification

- Service tests verify activation and reset lifetimes independently.
- Email tests verify that both deadlines are stated.
- Client tests verify the activation recovery action and accessible error region.
- Focused tests run red before implementation and green afterward.
- Full server and client test, lint, and build checks run before completion.
