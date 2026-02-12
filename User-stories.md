# Flow - User Stories
*Detailed User Stories for Premium iOS Budgeting App Development*

[![Status](https://img.shields.io/badge/Phase%201-85%25%20Complete-blue)](https://github.com)
[![Phase 2](https://img.shields.io/badge/Phase%202-In%20Progress-yellow)](https://github.com)
[![Total Stories](https://img.shields.io/badge/User%20Stories-69%20Active-green)](https://github.com)

**Last Updated**: February 12, 2026
**Document Version**: 2.1
**Original Stories**: 60 (9 removed, 9 added = 60 active)
**New Phase 2 Stories**: 9 (US-061 through US-069)
**Latest Updates**: Profile screen added, 5 bug fixes completed (BUG-003 through BUG-007)  

---

## Table of Contents

1. [Overview & Story Format](#overview--story-format)
2. [Phase 1: Foundation Stories (85% Complete)](#phase-1-foundation-stories)
   - [1.1 Account Management](#11-account-management)
   - [1.2 Household & Setup](#12-household--setup)
   - [1.3 Wallet Management](#13-wallet-management)
   - [1.4 Transaction Tracking](#14-transaction-tracking)
   - [1.5 Payday & Budget Periods](#15-payday--budget-periods)
   - [1.6 Budgeting & Awareness](#16-budgeting--awareness)
   - [1.7 Data Import/Export](#17-data-importexport)
   - [1.8 Dashboard & Analytics](#18-dashboard--analytics)
3. [Phase 2: Household Sharing & Intelligence (Current Focus)](#phase-2-household-sharing--intelligence)
   - [2.1 Income Detection & Budget Intelligence](#21-income-detection--budget-intelligence)
   - [2.2 Household Member Management](#22-household-member-management)
   - [2.3 Smart Split Ratios](#23-smart-split-ratios)
   - [2.4 Shared Expenses & Settlement](#24-shared-expenses--settlement)
   - [2.5 Enhanced Analytics](#25-enhanced-analytics)
4. [Phase 3-4: Swiss Open Banking (Future)](#phase-3-4-swiss-open-banking)
5. [Technical & Infrastructure Stories](#technical--infrastructure-stories)
6. [UX & Accessibility Stories](#ux--accessibility-stories)
7. [Bug Fixes & Known Issues](#bug-fixes--known-issues)
8. [Story Prioritization & Estimation](#story-prioritization--estimation)
9. [Acceptance Testing Guidelines](#acceptance-testing-guidelines)
10. [Removed & Deferred Stories](#removed--deferred-stories)

---

## Overview & Story Format

### Story Structure

Every user story follows this format:

```
**Story**: As a [user type], I want to [action], so that [benefit].

**Phase**: Phase X | **Priority**: PX | **Time**: Xh | **Status**: [emoji]

**Features**:
- Feature 1
- Feature 2

**Business Rules**:
- Rule 1
- Rule 2

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

**Dependencies**: US-XXX, US-YYY
```

### User Types

- **New Budgeter**: First-time user setting up budget for the first time
- **Regular User**: Established user with active budget and transactions
- **Household Member**: User sharing expenses with partner/roommate
- **Privacy-Conscious User**: User particularly concerned about financial data security
- **Power User**: Advanced user customizing and optimizing their budget
- **Developer**: Technical role implementing features (for technical stories)
- **QA Engineer**: Testing and quality assurance role

### Status Indicators

- ✅ **Completed**: Feature fully implemented and tested
- 🚧 **In Progress**: Currently being developed
- 🐛 **Bug Fix Needed**: Known issue requiring fix
- 🔜 **Not Started**: Planned but not yet begun
- 🔍 **Needs Testing**: Implementation complete, testing required
- ✏️ **Enhancement Needed**: Existing feature needs improvement
- 🆕 **New Story**: Recently added to backlog
- ⏸️ **Deferred**: Postponed to future phase
- ❌ **Removed**: No longer in scope

### Priority Levels

- **P0 (Critical)**: Blocking phase completion, must be fixed immediately
- **P1 (High)**: Important for phase success, should be in current sprint
- **P2 (Medium)**: Valuable but can wait, plan for next sprint
- **P3 (Low)**: Nice-to-have, backlog for future consideration

### Story Points (Fibonacci Scale)

- **1 point**: < 2 hours (simple utility function, minor UI tweak)
- **2 points**: 2-4 hours (standard component, basic CRUD operation)
- **3 points**: 4-8 hours (screen with business logic, complex calculation)
- **5 points**: 1-2 days (feature with multiple screens, database changes)
- **8 points**: 2-3 days (complex feature with integrations, testing)
- **13 points**: Should be broken down into smaller stories

---

## Phase 1: Foundation Stories

**Overall Status**: 85% Complete (28 completed, 1 bug, 4 not started, 3 needs testing)

### 1.1 Account Management

Core authentication and user account lifecycle management.

---

#### US-001: Sign Up as New User ✅

**Story**: As a new user, I want to sign up for an account, so that I can start tracking my budget.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 4h | **Status**: ✅ Completed

**Features**:
- Email/password registration
- Email verification link sent
- Password requirements: 8+ characters, uppercase, number
- Automatic household creation on signup

**Business Rules**:
- Email must be unique across all users
- Verification link valid for 24 hours
- Unverified accounts deleted after 7 days
- User automatically becomes admin of their household

**Acceptance Criteria**:
- [x] User can enter email and password
- [x] Password validation enforces security requirements
- [x] Verification email sent within 60 seconds
- [x] User redirected to onboarding after email verification
- [x] Household automatically created with user as admin
- [x] Error messages are empathetic and helpful

**Dependencies**: None

---

#### US-002: Log In ✅

**Story**: As a returning user, I want to log in to my account, so that I can access my budget.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 2h | **Status**: ✅ Completed

**Features**:
- Email/password authentication
- "Remember me" option (30-day session)
- Account lockout after 5 failed attempts (15 minutes)
- Session expires after 24 hours of inactivity

**Business Rules**:
- Email is case-insensitive
- Failed login attempts tracked per IP and email
- Session token stored securely in iOS Keychain

**Acceptance Criteria**:
- [x] User can log in with valid credentials
- [x] "Remember me" persists session for 30 days
- [x] Account locks after 5 failed attempts
- [x] Locked account shows countdown timer
- [x] Session expires and requires re-login after 24h
- [x] Error message: "Email or password is incorrect" (don't reveal which)

**Dependencies**: US-001

---

#### US-003: Reset Password ✅

**Story**: As a user who forgot their password, I want to reset it, so that I can regain access to my account.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 3h | **Status**: ✅ Completed

**Features**:
- Email reset link sent to registered email
- Reset link valid for 1 hour
- Cannot reuse last 3 passwords
- Automatically logs out all active sessions after reset

**Business Rules**:
- Reset link is single-use only
- New reset request invalidates previous links
- Password history maintained for security

**Acceptance Criteria**:
- [x] User can request password reset from login screen
- [x] Reset email sent within 60 seconds
- [x] Link expires after 1 hour with clear message
- [x] User cannot reuse last 3 passwords (shows error)
- [x] All sessions logged out after successful reset
- [x] Confirmation message: "Password updated successfully"

**Dependencies**: US-001

---

#### US-070: Edit Profile Information ✅

**Story**: As a user, I want to edit my personal profile information (name and email), so that I can keep my account details up to date.

**Phase**: Phase 1 | **Priority**: P2 | **Time**: 3h | **Points**: 3 | **Status**: ✅ Completed (Feb 12, 2026)

**Features**:
- Edit full name
- Change email address with validation
- View app version information
- Profile avatar displays user's initial
- Edit/Save/Cancel workflow

**Business Rules**:
- Name cannot be empty
- Email must be valid format (regex validation)
- Email changes don't require re-authentication (future enhancement)
- Profile accessible from Settings screen profile card

**UI/UX**:
- Profile card at top of Settings screen is clickable
- Tapping profile card navigates to `/settings/profile`
- "Edit" button enables editing mode
- "Save" validates and persists changes
- "Cancel" discards changes and exits edit mode
- Success message shown after save

**Acceptance Criteria**:
- [x] User can tap profile card in Settings to open Profile screen
- [x] Profile screen shows current name and email
- [x] "Edit" button enables editing mode
- [x] Name field is editable text input
- [x] Email field is editable with keyboard type "email-address"
- [x] "Save" button validates name (not empty) and email (valid format)
- [x] "Cancel" button discards changes and returns to view mode
- [x] App version displayed (read-only)
- [x] Success alert shown after successful save
- [x] Profile data updates immediately in Settings screen
- [x] Follows design.md guidelines (gradient background, glass cards, sage green accents)

**Design Compliance**:
- ✅ LinearGradient background (contextDark → contextTeal)
- ✅ Glass cards for information sections
- ✅ Sage green icons and accents
- ✅ FadeInDown animations with staggered delays
- ✅ Profile avatar with sage green border at top

**Files Added**:
- `src/app/settings/profile.tsx` - Profile screen component
- Added route in `src/app/settings/_layout.tsx`

**Files Modified**:
- `src/app/(tabs)/settings.tsx` - Made profile card clickable, removed Profile menu item

**Dependencies**: US-001 (Sign Up), US-002 (Log In)

---

### 1.2 Household & Setup

Household creation, member management, and currency configuration.

---

#### US-004: Create Household ✅

**Story**: As a new user, I want a household automatically created for me, so that I have a space to manage my finances.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 2h | **Status**: ✅ Completed

**Features**:
- Household automatically created on signup
- Default name: "[User]'s Household"
- User is automatically set as admin
- Currency selection during onboarding (CHF/EUR/USD)

**Business Rules**:
- One household per user in Phase 1
- Currency locked after first transaction (prevents data inconsistency)
- Admin has full permissions (invite, remove, delete household)

**Acceptance Criteria**:
- [x] Household created immediately after email verification
- [x] Default name uses user's email prefix
- [x] User can select currency during onboarding
- [x] Currency cannot be changed after first transaction
- [x] User has admin role assigned

**Dependencies**: US-001

---

#### US-005: Invite Household Member 🚧

**Story**: As an admin, I want to invite my partner to my household, so that we can share expenses.

**Phase**: Phase 1 (DB) / Phase 2 (Active) | **Priority**: P0 | **Time**: 5h | **Status**: 🚧 In Progress

**Features**:
- Email invitation system
- Invitation link valid for 7 days
- Can resend or cancel pending invitations
- Notification when invitation is accepted
- Maximum 2 members per household (Phase 2 limit)

**Business Rules**:
- Only household admin can invite members
- Cannot invite already-existing household member
- Invitee must create account if they don't have one

**Acceptance Criteria**:
- [ ] Admin can enter invitee email address
- [ ] Invitation email sent with secure link
- [ ] Link expires after 7 days with clear message
- [ ] Admin can view pending invitations
- [ ] Admin can cancel pending invitation
- [ ] Admin receives notification when invite is accepted
- [ ] Maximum 2 members enforced (error if exceeded)

**Dependencies**: US-004

---

#### US-006: Accept Household Invitation 🚧

**Story**: As an invitee, I want to accept a household invitation, so that I can join my partner's budget.

**Phase**: Phase 1 (DB) / Phase 2 (Active) | **Priority**: P0 | **Time**: 3h | **Status**: 🚧 In Progress

**Features**:
- Click invitation link to accept
- Create account if new user
- Join existing household as member (not admin)
- See household name and admin before accepting

**Business Rules**:
- User can only be in one household at a time
- Accepting invitation merges user into household
- User's existing data remains private unless shared

**Acceptance Criteria**:
- [ ] User clicks invitation link
- [ ] Shows household details before accepting
- [ ] New users prompted to create account first
- [ ] Existing users confirm join with password
- [ ] User added to household with member role
- [ ] User sees success message and household dashboard

**Dependencies**: US-005, US-001

---

#### US-007: Remove Household Member 🔜

**Story**: As an admin, I want to remove a member from my household, so that they no longer have access to shared finances.

**Phase**: Phase 2 | **Priority**: P1 | **Time**: 4h | **Status**: 🔜 Not Started

**Features**:
- Remove member from household
- Member's shared transactions remain visible (historical data)
- Member's personal transactions go with them
- Unsettled debts must be settled first (or acknowledged)

**Business Rules**:
- Only admin can remove members
- Cannot remove yourself (use Leave Household instead)
- Warning shown if unsettled debts exist
- Removed member keeps their account (not deleted)

**Acceptance Criteria**:
- [ ] Admin sees "Remove Member" option in household settings
- [ ] Warning shown if unsettled debts exist (CHF X owed)
- [ ] Confirmation dialog: "Are you sure you want to remove [Name]?"
- [ ] Member removed from household immediately
- [ ] Member receives notification of removal
- [ ] Shared transaction history preserved
- [ ] Personal transactions remain with removed member

**Dependencies**: US-005, US-006

---

#### US-008: Leave Household 🔜

**Story**: As a household member, I want to leave a household, so that I can manage my finances independently.

**Phase**: Phase 2 | **Priority**: P1 | **Time**: 3h | **Status**: 🔜 Not Started

**Features**:
- Member can voluntarily leave household
- Shared transactions remain visible to admin
- Personal transactions go with leaving member
- Warning if unsettled debts exist

**Business Rules**:
- Admin cannot leave (must transfer admin first or delete household)
- Leaving creates new household for member automatically
- Unsettled debts must be resolved or acknowledged

**Acceptance Criteria**:
- [ ] Member sees "Leave Household" in settings
- [ ] Warning if unsettled debts exist
- [ ] Confirmation dialog with debt summary
- [ ] Member removed and new household created
- [ ] Admin receives notification
- [ ] Shared expense history preserved for both parties
- [ ] Personal data moves to new household

**Dependencies**: US-005, US-006

---

#### US-013: Select Currency 🔜

**Story**: As a new user, I want to select my preferred currency during onboarding, so that all amounts are displayed correctly.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 2h | **Status**: 🔜 Not Started

**Features**:
- Currency selection during onboarding
- Support for CHF, EUR, USD (Phase 1)
- Currency symbol and formatting applied throughout app
- Cannot change currency after first transaction (data integrity)

**Business Rules**:
- Swiss Franc (CHF) formatting: CHF 1'234.56 (apostrophe separator)
- EUR and USD use standard formatting
- Currency locked after any transaction created

**Acceptance Criteria**:
- [ ] Currency selection screen during onboarding
- [ ] CHF selected by default (Swiss target market)
- [ ] All amounts formatted correctly (CHF 1'234.56)
- [ ] Currency symbol shown consistently throughout app
- [ ] Error message if user tries to change after transactions exist
- [ ] Settings show current currency (read-only after lock)

**Dependencies**: US-004

---

### 1.3 Wallet Management

Managing accounts/wallets (UBS, Revolut, Cash) for tracking balances.

**Note**: These stories originally used "Account" terminology but are being renamed to "Wallet" to avoid confusion with user accounts.

---

#### US-009: Add Wallet ✅ ✏️

**Story**: As a user, I want to add a wallet (bank account or cash), so that I can track balances across multiple sources.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 3h | **Status**: ✅ Completed (Needs UI Rename)

**Features**:
- Add wallet with name, type (Bank/Cash), initial balance
- Wallet types: UBS, Revolut, PostFinance, Cash, Other
- Balance automatically updated when transactions added
- Multiple wallets supported

**Business Rules**:
- Wallet name must be unique within household
- Initial balance can be positive, negative, or zero
- Balance recalculated from transactions (not manually editable)

**UI Update Needed**: Change all instances of "Account" to "Wallet" in UI

**Acceptance Criteria**:
- [x] User can create wallet with name and type
- [x] Initial balance entered during creation
- [x] Wallet appears in wallet list immediately
- [x] Balance updates when transactions are added
- [ ] UI shows "Wallet" terminology (not "Account")

**Dependencies**: US-004

---

#### US-010: Edit Wallet ✅ ✏️

**Story**: As a user, I want to edit a wallet's name and type, so that I can keep my wallet information accurate.

**Phase**: Phase 1 | **Priority**: P1 | **Time**: 2h | **Status**: ✅ Completed (Needs UI Rename)

**Features**:
- Edit wallet name and type
- Cannot edit balance directly (calculated from transactions)
- Can mark wallet as inactive (hidden but preserved)

**Business Rules**:
- Cannot change wallet if it has transactions (historical integrity)
- Name must remain unique

**UI Update Needed**: Change "Account" to "Wallet" in edit screen

**Acceptance Criteria**:
- [x] User can edit wallet name
- [x] User can change wallet type (dropdown)
- [x] Cannot edit balance directly (shows calculated value)
- [x] Can mark wallet as inactive
- [ ] UI shows "Wallet" terminology

**Dependencies**: US-009

---

#### US-011: Delete Wallet 🔜 ✏️

**Story**: As a user, I want to delete a wallet I no longer use, so that my wallet list stays clean.

**Phase**: Phase 1 | **Priority**: P2 | **Time**: 2h | **Status**: 🔜 Not Started

**Features**:
- Delete wallet from household
- Cannot delete wallet with transactions (must be empty)
- Confirmation dialog before deletion
- Soft delete (recoverable if needed)

**Business Rules**:
- Wallet must have zero balance
- Cannot delete wallet with transaction history
- Suggest marking as inactive instead

**UI Update Needed**: Use "Wallet" terminology in all dialogs

**Acceptance Criteria**:
- [ ] User sees "Delete Wallet" option
- [ ] Warning if wallet has transactions: "Cannot delete wallet with transactions. Mark as inactive instead?"
- [ ] Confirmation: "Delete [Wallet Name]? This cannot be undone."
- [ ] Wallet removed from list immediately
- [ ] Soft delete in database (can be recovered)

**Dependencies**: US-009

---

#### US-012: View Wallet Balance ✅ ✏️

**Story**: As a user, I want to see my wallet balances at a glance, so that I know how much money I have available.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 2h | **Status**: ✅ Completed (Needs UI Rename)

**Features**:
- Dashboard widget showing all wallet balances
- Total balance across all wallets
- Individual wallet breakdown
- Color coding: positive (Sage Green), negative (Soft Amber)

**Business Rules**:
- Balance calculated in real-time from transactions
- Inactive wallets not included in total
- Respects household currency (CHF formatting)

**UI Update Needed**: "Wallets" section heading, not "Accounts"

**Acceptance Criteria**:
- [x] Dashboard shows all active wallets
- [x] Total balance displayed prominently
- [x] Each wallet shows name, type, current balance
- [x] Positive balances in Sage Green (#A8B5A1)
- [x] Negative balances in Soft Amber (#E3A05D)
- [ ] UI uses "Wallet" terminology

**Dependencies**: US-009

---

### 1.4 Transaction Tracking

Core expense and income tracking functionality.

---

#### US-014: Add Income Transaction ✅

**Story**: As a user, I want to record income, so that I can track money coming in.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 3h | **Status**: ✅ Completed

**Features**:
- Add income transaction with amount, category, date, wallet, notes
- Income categories: Salary, Bonus, Gift, Other
- Positive amount automatically (user doesn't enter +/-)
- Optional notes field

**Business Rules**:
- Amount must be positive
- Date defaults to today
- Wallet required (where money is deposited)
- Category must be from Income group

**Acceptance Criteria**:
- [x] User can enter income amount (CHF formatting)
- [x] Category dropdown shows only Income categories
- [x] Wallet selection dropdown
- [x] Date picker defaults to today
- [x] Optional notes field (unlimited characters)
- [x] Transaction saves and appears in transaction list immediately
- [x] Wallet balance updates automatically

**Dependencies**: US-009, US-017 (Categories)

---

#### US-015: Add Expense Transaction ✅

**Story**: As a user, I want to record expenses, so that I can track where my money goes.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 3h | **Status**: ✅ Completed

**Features**:
- Add expense with amount, category, date, wallet, notes
- Expense categories: Rent, Groceries, Dining Out, Transportation, etc.
- Toggle for "Shared Expense" (household feature)
- Negative amount automatically (user enters positive number)

**Business Rules**:
- Amount entered as positive, stored as negative
- Wallet balance decreases automatically
- Shared expense creates split (if household has 2+ members)

**Acceptance Criteria**:
- [x] User enters expense amount (displays as CHF X.XX)
- [x] Category dropdown shows expense categories
- [x] Wallet selection required
- [x] Date picker defaults to today
- [x] "Shared Expense" toggle visible
- [x] Transaction saves and appears immediately
- [x] Wallet balance decreases by expense amount
- [x] If shared, split calculation triggered (60/40 or custom)

**Dependencies**: US-009, US-017, US-027 (Split Ratios)

---

#### US-016: Recurring Expense Templates 🐛

**Story**: As a user, I want to create recurring expense templates (rent, subscriptions), so that I don't have to manually enter them every month.

**Phase**: Phase 1 | **Priority**: P1 | **Time**: 5h | **Status**: 🐛 Bug Fix Needed

**Features**:
- Create recurring template with amount, category, frequency
- Frequency: Weekly, Bi-weekly, Monthly
- Templates appear in "Upcoming" section (manual activation)
- Not automatically added to budget (user control)

**Business Rules**:
- Templates are NOT transactions (must be activated manually)
- User sees template in "Upcoming" and taps to create transaction
- Templates can be paused/resumed without deletion

**Known Bug**: Calendar view shows templates incorrectly (displays as actual transactions)

**Acceptance Criteria**:
- [x] User can create recurring template
- [x] Template appears in "Upcoming" section
- [ ] **BUG FIX**: Calendar view should NOT show templates as transactions
- [ ] User taps template to activate for current period
- [ ] Activation creates actual transaction
- [ ] Template remains for future periods
- [ ] User can pause/resume template

**Dependencies**: US-015, US-017

---

#### US-017: Manage Categories ✅

**Story**: As a user, I want to organize transactions into categories, so that I can understand my spending patterns.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 4h | **Status**: ✅ Completed

**Features**:
- Default categories provided (Rent, Groceries, Dining Out, etc.)
- Create custom categories
- Assign emoji icons for visual recognition
- Assign to budget type: Needs (50%), Wants (30%), Savings (20%)
- Mark as "Shareable" for household expenses

**Business Rules**:
- Category name must be unique within household
- Category group (Income/Expense) set at creation, cannot change
- Budget type affects 50/30/20 calculations

**Acceptance Criteria**:
- [x] Default categories created on household setup
- [x] User can create custom category with name + emoji
- [x] User selects budget type (Needs/Wants/Savings)
- [x] User can mark as "Shareable" for household
- [x] Categories appear in dropdown when adding transactions
- [x] Cannot delete category with transactions (mark inactive instead)

**Dependencies**: US-004

---

#### US-018: Edit Transaction ✅

**Story**: As a user, I want to edit a transaction I recorded incorrectly, so that my records are accurate.

**Phase**: Phase 1 | **Priority**: P1 | **Time**: 3h | **Status**: ✅ Completed

**Features**:
- Edit amount, category, date, wallet, notes
- Toggle shared expense on/off
- Recalculates wallet balance automatically
- Shows "Last edited" timestamp

**Business Rules**:
- Editing transaction updates wallet balance immediately
- Changing shared status creates/deletes expense split (US-030)
- Cannot edit if settlement already processed (must un-settle first)

**Acceptance Criteria**:
- [x] User can tap transaction to edit
- [x] All fields editable (amount, category, date, wallet, notes)
- [x] Shared toggle can be changed
- [x] Wallet balance recalculated correctly
- [x] Last edited timestamp shown
- [x] If changed from personal to shared, creates expense split
- [x] Optimistic update (UI updates immediately)

**Dependencies**: US-014, US-015, US-030

---

#### US-020: Delete Transaction ✅

**Story**: As a user, I want to delete a transaction I entered by mistake, so that my records are clean.

**Phase**: Phase 1 | **Priority**: P1 | **Time**: 2h | **Status**: ✅ Completed

**Features**:
- Swipe-to-delete gesture (iOS native pattern)
- Confirmation dialog before deletion
- Soft delete (recoverable for 30 days)
- Wallet balance recalculated automatically

**Business Rules**:
- Cannot delete if part of settled expense (must un-settle first)
- Deleting shared expense removes split for other household member
- Soft delete allows recovery if deleted by mistake

**Acceptance Criteria**:
- [x] User swipes left on transaction
- [x] "Delete" button appears (red background)
- [x] Confirmation: "Delete this transaction? This cannot be undone."
- [x] Transaction removed from list immediately
- [x] Wallet balance updated
- [x] If shared, removes split for household member
- [x] Soft deleted (recoverable from "Recently Deleted" for 30 days)

**Dependencies**: US-014, US-015

---

#### US-021: Transaction Search & Filter ✅

**Story**: As a user with many transactions, I want to search and filter, so that I can find specific transactions quickly.

**Phase**: Phase 1 | **Priority**: P2 | **Time**: 5h | **Status**: ✅ Completed

**Features**:
- Search by transaction notes
- Filter by category, wallet, date range
- Filter by shared/personal
- Sort by date, amount

**Business Rules**:
- Search is case-insensitive
- Filters can be combined (category + date range)
- Results update in real-time

**Acceptance Criteria**:
- [x] Search bar at top of transaction list
- [x] Filter button shows filter modal
- [x] Can filter by category (multi-select)
- [x] Can filter by wallet (multi-select)
- [x] Date range picker (start and end date)
- [x] Toggle: Shared Only / Personal Only / All
- [x] Sort by: Date (newest/oldest), Amount (high/low)
- [x] Results update instantly as filters applied

**Dependencies**: US-014, US-015

---

### 1.5 Payday & Budget Periods

Payday-based budget period management (Flow's key differentiator from calendar-month apps).

---

#### US-024: Set Payday ✅

**Story**: As a user, I want to set my payday date, so that my budget periods align with my actual cash flow.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 3h | **Status**: ✅ Completed

**Features**:
- Select payday (day of month: 1-31)
- Budget period automatically calculated from payday
- Example: Payday = 25th → Budget period: Jan 25 - Feb 24
- Grace period for weekend shifts (±3 days)

**Business Rules**:
- If payday > last day of month, uses last day (e.g., 31st becomes 28th in Feb)
- Cannot change payday mid-period (must wait until current period ends)
- First budget period starts on next payday after setting

**Acceptance Criteria**:
- [x] User selects payday during onboarding
- [x] Dropdown shows days 1-31
- [x] Budget period calculated automatically
- [x] Shows next payday date: "Next payday: Feb 25 (28 days)"
- [x] Warning if trying to change mid-period
- [x] Grace period handles weekend payments correctly

**Dependencies**: US-004

---

#### US-025: Budget Period Reset ✅

**Story**: As a user, my budget automatically resets on my payday, so that I start fresh each period.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 3h | **Status**: ✅ Completed

**Features**:
- Budget automatically resets at midnight on payday
- Previous period's data archived (budget snapshot)
- Unspent amounts do NOT roll over (zero-based budgeting)
- New period starts with fresh allocations

**Business Rules**:
- Budget snapshot created at period transition (US-064)
- Weekly allowances reset to 0 (US-036, US-037, US-038)
- Recurring expenses appear in "Upcoming" (manual activation)

**Acceptance Criteria**:
- [x] Budget resets automatically on payday at 00:00
- [x] Previous period data saved to budgetSnapshots
- [x] New period shows 0 spent for all categories
- [x] Budget allocations copied from previous period (same CHF amounts)
- [x] User sees notification: "New budget period started!"
- [x] Recurring templates appear in "Upcoming"

**Dependencies**: US-024, US-034 (Budget Allocation), US-064 (Budget Snapshots)

---

### 1.6 Budgeting & Awareness

Zero-based budgeting with 50/30/20 framework and awareness features.

---

#### US-027: Configure Split Ratios ✅ ✏️

**Story**: As a household member, I want to set how we split shared expenses (e.g., 60/40), so that costs are divided fairly.

**Phase**: Phase 1 (Manual) / Phase 2 (Income-Based) | **Priority**: P0 | **Time**: 4h + 2h enhancement | **Status**: ✅ Completed (Enhancement Needed)

**Features**:
- **Phase 1 (Current)**: Manual split ratio entry (e.g., 60/40, 70/30)
- **Phase 2 (NEW)**: Auto-calculate based on income (US-067)
- Default: 50/50 split
- Custom ratios for each household member
- Preview showing CHF amounts for sample expense

**Business Rules**:
- Ratios must sum to 100%
- Minimum 1% per member (prevents 99/1 unfair splits)
- Applies to all shared expenses unless overridden at transaction level (US-030)

**Phase 2 Enhancement**: Add income-based auto-calculation mode

**Acceptance Criteria**:
- [x] **Phase 1**: User can enter manual split percentages
- [x] Percentages must sum to 100% (validation error if not)
- [x] Preview shows: "On a CHF 100 expense, you pay CHF 60, Partner pays CHF 40"
- [x] Split applied to all new shared expenses
- [ ] **Phase 2**: Toggle between Manual and Income-Based mode
- [ ] **Phase 2**: Auto-recalculate button based on detected income (US-067)

**Dependencies**: US-005 (Invite Member), US-015 (Shared Expenses)

**Enhancement Story**: US-067 (Auto-Recalc Split Ratios)

---

#### US-030: Transaction-Level Split Override ✅

**Story**: As a user, I want to override the default split ratio for a specific expense, so that I can handle exceptions (e.g., partner's birthday gift).

**Phase**: Phase 1 | **Priority**: P1 | **Time**: 3h | **Status**: ✅ Completed

**Features**:
- Override split ratio when adding shared expense
- Custom percentages just for this transaction
- Shows both default and custom ratios for clarity
- Does not affect future transactions (one-time override)

**Business Rules**:
- Override only applies to current transaction
- Next shared expense uses default split ratio again
- Custom split must sum to 100%

**Acceptance Criteria**:
- [x] When adding shared expense, "Custom Split" option appears
- [x] User can enter custom percentages
- [x] Shows preview: "You pay CHF X, Partner pays CHF Y"
- [x] Validation: must sum to 100%
- [x] Transaction saved with custom split
- [x] Next transaction reverts to default split
- [x] Transaction detail shows "Custom split: 80/20" indicator

**Dependencies**: US-027, US-015

---

#### US-032: Rounding Remainder Handling ✅ ❓

**Story**: As a user, I want split amounts to round correctly, so that totals always match (no CHF 0.01 discrepancies).

**Phase**: Phase 1 | **Priority**: P1 | **Time**: 2h | **Status**: ✅ Completed (Needs Verification)

**Features**:
- Smart rounding for split calculations
- Remainder assigned to largest split holder
- Total always equals original transaction amount
- No accumulating rounding errors

**Business Rules**:
- Split amounts rounded to 2 decimal places (CHF 0.00)
- If rounding creates discrepancy, add to largest share
- Example: CHF 100 split 60/40 = CHF 60.00 + CHF 40.00 ✅
- Example: CHF 100.01 split 50/50 = CHF 50.01 + CHF 50.00 ✅ (larger share gets remainder)

**Verification Needed**: Test edge cases with prime number amounts

**Acceptance Criteria**:
- [x] Split calculation rounds to 2 decimal places
- [x] Total of splits equals original amount exactly
- [ ] **VERIFY**: Test with CHF 100.01, 100.03, 99.99 amounts
- [ ] **VERIFY**: Test with 3-way splits (if Phase 3+ supports it)
- [x] Unit tests cover rounding edge cases

**Dependencies**: US-027, US-030

---

#### US-034: Budget Allocation (50/30/20) ✅

**Story**: As a new budgeter, I want to allocate my income using the 50/30/20 framework, so that I have a balanced budget.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 5h | **Status**: ✅ Completed

**Features**:
- Enter monthly income (manual or auto-detect in Phase 2)
- Automatic 50/30/20 split suggestion:
  - 50% Needs (rent, groceries, utilities)
  - 30% Wants (dining out, entertainment)
  - 20% Savings (emergency fund, investments)
- Customizable per category (override suggestions)
- Visual breakdown (pie chart or bar chart)

**Business Rules**:
- Total allocation must equal income (zero-based budgeting)
- Can deviate from 50/30/20 (not mandatory, just suggestion)
- Categories assigned to Needs/Wants/Savings during creation (US-017)

**Acceptance Criteria**:
- [x] User enters monthly income
- [x] System suggests 50/30/20 split with CHF amounts
- [x] User can adjust individual category allocations
- [x] Visual shows: Needs (Sage Green), Wants (Soft Amber), Savings (Deep Teal)
- [x] Warning if allocations don't sum to income: "CHF 200 unallocated"
- [x] Can save budget even if not perfectly balanced (flexibility)

**Dependencies**: US-024 (Payday), US-017 (Categories)

**Phase 2 Enhancement**: US-061-063 (Income Auto-Detection)

---

#### US-036: Weekly Needs Allowance ✅

**Story**: As a user, I want to see how much I can spend on Needs this week, so that I stay within budget.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 3h | **Status**: ✅ Completed

**Features**:
- Calculate weekly allowance: Needs budget ÷ weeks in period
- Show remaining allowance for current week
- Updates in real-time as expenses added
- Color coding: Green (on track), Amber (caution), Red alternative (over budget)

**Business Rules**:
- Week starts on Monday (configurable in future)
- Allowance resets every Monday at 00:00
- Over-spending in one week doesn't affect next week's allowance
- Uses "Calm" colors (no harsh reds)

**Acceptance Criteria**:
- [x] Dashboard shows "This Week - Needs: CHF 250 / CHF 300"
- [x] Progress bar with color coding
- [x] Updates immediately when Needs expense added
- [x] Shows "CHF 50 remaining" or "CHF 20 over budget"
- [x] Over budget shown in Soft Amber, not harsh red
- [x] Resets to full allowance every Monday

**Dependencies**: US-034

---

#### US-037: Weekly Wants Allowance ✅

**Story**: As a user, I want to see my Wants spending limit for the week, so that I control discretionary spending.

**Phase**: Phase 1 | **Priority**: P0 | **Time**: 3h | **Status**: ✅ Completed

**Features**:
- Same as US-036 but for Wants category
- Helps control dining out, entertainment, shopping
- Weekly reset prevents month-long deprivation feeling

**Business Rules**:
- Identical to Needs allowance logic
- Independent from Needs (separate tracking)

**Acceptance Criteria**:
- [x] Dashboard shows "This Week - Wants: CHF 150 / CHF 200"
- [x] Progress bar with calm color scheme
- [x] Updates in real-time
- [x] Resets every Monday
- [x] Separate section from Needs (clear visual distinction)

**Dependencies**: US-034

---

#### US-038: Weekly Savings Progress ✅

**Story**: As a user, I want to track savings progress, so that I stay motivated to save.

**Phase**: Phase 1 | **Priority**: P1 | **Time**: 2h | **Status**: ✅ Completed

**Features**:
- Track actual savings vs. target (20% of income)
- Weekly savings goal
- Celebration when goal met (gentle encouragement)

**Business Rules**:
- Savings = income transactions in Savings category
- Does NOT include leftover budget (zero-based = no rollover)

**Acceptance Criteria**:
- [x] Dashboard shows "Savings This Week: CHF 80 / CHF 100"
- [x] Progress bar (Sage Green when on track)
- [x] Celebration message when goal met: "Great work! Savings goal achieved 🎉"
- [x] Can be dismissed (opt-out of celebrations)
- [x] Resets weekly

**Dependencies**: US-034

---

### 1.7 Data Import/Export

CSV import/export for transaction data portability.

---

#### US-046: CSV Import 🔍

**Story**: As a user switching from another app, I want to import transactions from CSV, so that I don't lose my financial history.

**Phase**: Phase 1 | **Priority**: P2 | **Time**: 5h | **Status**: 🔍 Needs Testing

**Features**:
- Upload CSV file
- Auto-detect columns (amount, date, category, notes)
- Manual column mapping if auto-detect fails
- Preview before import (US-048)
- Duplicate detection

**Business Rules**:
- CSV must have date and amount columns
- Dates accepted in multiple formats (DD/MM/YYYY, YYYY-MM-DD, etc.)
- Negative amounts = expenses, positive = income
- Unknown categories create new categories (user review)

**Acceptance Criteria**:
- [ ] **TEST**: User can upload CSV file
- [ ] **TEST**: Auto-detect works for common formats
- [ ] **TEST**: Manual mapping allows field selection
- [ ] **TEST**: Preview shows first 10 transactions
- [ ] **TEST**: Duplicate detection prevents re-import
- [ ] **TEST**: Import creates transactions correctly
- [ ] **TEST**: Error handling for malformed CSV

**Dependencies**: US-014, US-015, US-017

---

#### US-048: Preview Import 🔍

**Story**: As a user importing data, I want to preview transactions before import, so that I can verify correctness.

**Phase**: Phase 1 | **Priority**: P2 | **Time**: 3h | **Status**: 🔍 Needs Testing

**Features**:
- Show first 10 transactions from CSV
- Highlight detected fields (amount, date, category)
- Flag potential issues (missing category, invalid date)
- Allow editing before import

**Business Rules**:
- Preview does not create transactions (just shows what will be imported)
- User can cancel import after preview

**Acceptance Criteria**:
- [ ] **TEST**: Preview screen shows after file upload
- [ ] **TEST**: Shows first 10 rows from CSV
- [ ] **TEST**: Detected fields highlighted (green = good, amber = warning)
- [ ] **TEST**: Issues flagged with clear explanation
- [ ] **TEST**: User can edit category mappings
- [ ] **TEST**: "Cancel" and "Import" buttons work correctly

**Dependencies**: US-046

---

#### US-049: Category Mapping (Import) ✅

**Story**: As a user importing data, I want to map old categories to new ones, so that my budget structure is maintained.

**Phase**: Phase 1 | **Priority**: P2 | **Time**: 4h | **Status**: ✅ Completed

**Features**:
- Map CSV categories to Flow categories
- Create new categories during import
- Save mappings for future imports
- Bulk mapping (map all "Food" → "Groceries")

**Business Rules**:
- Unmapped categories prompt user before import
- Can map multiple old categories to one new category
- Mapping saved for next import (convenience)

**Acceptance Criteria**:
- [x] Import process shows category mapping screen
- [x] Dropdown for each CSV category → Flow category
- [x] "Create New Category" option available
- [x] Bulk mapping: "Map all 'X' to 'Y'"
- [x] Mappings saved to user preferences
- [x] Next import auto-applies saved mappings

**Dependencies**: US-046, US-017

---

#### US-050: Export CSV 🔍

**Story**: As a user, I want to export my transactions to CSV, so that I can analyze data externally or migrate to another app.

**Phase**: Phase 1 | **Priority**: P2 | **Time**: 3h | **Status**: 🔍 Needs Testing

**Features**:
- Export all transactions or filtered subset
- CSV format: date, amount, category, wallet, notes, shared indicator
- Date range selection
- Option to include budget data (separate CSV)

**Business Rules**:
- Export respects privacy (only user's own data, not household member's personal transactions)
- Shared transactions included with split amounts
- CSV uses Swiss number formatting (apostrophe separators) or standard (user choice)

**Acceptance Criteria**:
- [ ] **TEST**: Export button in settings
- [ ] **TEST**: Date range picker for export
- [ ] **TEST**: Option to include budget data
- [ ] **TEST**: CSV downloads successfully
- [ ] **TEST**: CSV opens in Excel/Numbers/Google Sheets correctly
- [ ] **TEST**: Swiss formatting option works (CHF 1'234.56)
- [ ] **TEST**: Shared transactions show split amounts

**Dependencies**: US-014, US-015, US-021 (Filtering)

---

### 1.8 Dashboard & Analytics

Financial overview, visualizations, and reporting.

---

#### US-051: Dashboard Overview ✅

**Story**: As a user, I want a financial overview dashboard, so that I can see my financial health at a glance.

**Phase**: Phase 1 / Phase 2 (Enhanced) | **Priority**: P0 | **Time**: 10h | **Status**: ✅ Completed

**Features**:
- **Phase 1**:
  - Total wallet balances
  - Weekly allowance summary (Needs, Wants, Savings)
  - Budget progress (50/30/20 breakdown)
  - Income vs. spend for current period
  - Recent transactions (last 5)
- **Phase 2 Enhancements**:
  - Debt balance widget (if household member, US-040)
  - Shared spending widget
  - Income progress widget (US-068)

**Business Rules**:
- Dashboard updates in real-time (InstantDB subscriptions)
- Widgets can be reordered (future: drag-and-drop)
- Uses "Calm" color palette throughout

**Acceptance Criteria**:
- [x] Dashboard loads in <2 seconds
- [x] All widgets show correct real-time data
- [x] Budget progress uses Sage Green (on track), Soft Amber (caution)
- [x] Recent transactions are last 5, with "View All" link
- [x] Tapping widget navigates to detail screen
- [ ] **Phase 2**: Debt balance widget appears if household member
- [ ] **Phase 2**: Income progress widget (US-068)

**Dependencies**: US-012 (Wallets), US-036/037/038 (Weekly Allowances), US-034 (Budget)

**Phase 2 Enhancement**: US-068 (Income Progress Widget)

---

#### US-052: Category Spending Charts ✅

**Story**: As a user, I want to see spending visualizations by category, so that I understand where my money goes.

**Phase**: Phase 1 | **Priority**: P1 | **Time**: 4h | **Status**: ✅ Completed

**Features**:
- Pie chart showing category breakdown
- Bar chart for top spending categories
- Percentage breakdown
- Toggle between views (pie/bar)
- Color-coded by budget type (Needs/Wants/Savings)

**Business Rules**:
- Shows current budget period by default
- Can change to previous periods (dropdown)
- Excludes income categories (expense analysis only)

**Acceptance Criteria**:
- [x] Pie chart shows category percentages
- [x] Bar chart shows categories sorted by spending (high to low)
- [x] Color coding: Needs (Sage Green), Wants (Soft Amber), Savings (Deep Teal)
- [x] Toggle between pie and bar view
- [x] Shows top 10 categories (combines others into "Other")
- [x] Tapping category shows transactions in that category

**Dependencies**: US-015, US-017, US-021

---

#### US-053: Income vs. Expenses Trend ✅

**Story**: As a user, I want to see income vs. expenses over time, so that I can identify trends.

**Phase**: Phase 1 | **Priority**: P1 | **Time**: 4h | **Status**: ✅ Completed

**Features**:
- Line chart showing income and expenses over 3 months
- Trend indicators (up/down arrows with percentages)
- Summary stats: total income, total expenses, savings rate
- Savings rate calculation: (Income - Expenses) / Income

**Business Rules**:
- Shows last 3 completed budget periods + current period
- Savings rate displayed as percentage
- Uses budget snapshots for historical data (US-064)

**Acceptance Criteria**:
- [x] Line chart with 2 lines: Income (Deep Teal), Expenses (Soft Amber)
- [x] X-axis: Budget periods (Feb 25-Mar 24, Mar 25-Apr 24, etc.)
- [x] Y-axis: CHF amounts
- [x] Trend indicators: "Income ↑ 5% from last period"
- [x] Savings rate: "Savings Rate: 15%" (with color: >20% green, 10-20% amber, <10% needs improvement)
- [x] Tapping data point shows transactions for that period

**Dependencies**: US-014, US-015, US-064 (Budget Snapshots)

---

#### US-054: Budget Performance Report ✅

**Story**: As a user, I want a budget performance report, so that I can see how well I'm sticking to my budget.

**Phase**: Phase 1 / Phase 2 (Enhanced) | **Priority**: P0 | **Time**: 5h | **Status**: ✅ Completed

**Features**:
- Overall budget status (on track, overspending, underspending)
- Category-level breakdown
- Under/over indicators for each category
- Recommendations based on spending patterns

**Business Rules**:
- On track: Within 10% of budget
- Overspending: >10% over budget
- Underspending: >20% under budget
- Recommendations shown proactively (not on demand)

**Phase 2 Enhancement**: Uses budget snapshots (US-069) for historical accuracy

**Acceptance Criteria**:
- [x] Report shows overall status with color coding
- [x] Each category shows: Budgeted, Spent, Remaining (or Over)
- [x] Progress bars with calm colors
- [x] Recommendations: "You're spending more on Dining Out. Consider adjusting budget or reducing spending."
- [x] Can view report for current or past periods
- [ ] **Phase 2**: Historical data uses budget snapshots, not current budget values

**Dependencies**: US-034, US-015, US-064

---

#### US-055: Month-over-Month Comparison 🔍

**Story**: As a user, I want to compare spending across periods, so that I can identify trends and changes.

**Phase**: Phase 2 | **Priority**: P2 | **Time**: 4h | **Status**: 🔍 Needs Review

**Features**:
- Side-by-side period comparison
- Change indicators (CHF amount and percentage)
- Category-level comparison
- Insights highlighting significant changes

**Business Rules**:
- Compares current period vs. previous period (default)
- Can select any two periods for comparison
- Uses budget snapshots for historical accuracy (US-069)

**Phase 2 Enhancement**: Analytics History Integration (US-069)

**Acceptance Criteria**:
- [ ] **REVIEW**: Two-column view (Period A vs. Period B)
- [ ] Change indicators: "Dining Out: +CHF 120 (+35%)"
- [ ] Color coding: Increase (Soft Amber), Decrease (Sage Green), No change (neutral)
- [ ] Insights: "Your Groceries spending increased by 20% this month"
- [ ] Period selector dropdown
- [ ] Uses budget snapshots for past periods (US-069)

**Dependencies**: US-034, US-064, US-069

---

#### US-058: Custom Reports 🔍

**Story**: As a power user, I want to create custom reports with specific date ranges and filters, so that I can analyze exactly what I need.

**Phase**: Phase 2 | **Priority**: P2 | **Time**: 6h | **Status**: 🔍 Needs Review

**Features**:
- Date range selector (any start/end date)
- Group by: Month, Week, Day, Category
- Include/exclude filters (categories, wallets, shared/personal)
- Chart type selection (pie, bar, line)
- Save report template for reuse

**Business Rules**:
- Maximum date range: 2 years (performance)
- Can export report to CSV or PDF (US-059)
- Saved templates stored per user (not shared)

**Acceptance Criteria**:
- [ ] **REVIEW**: Date range picker with start and end date
- [ ] Grouping options: Month/Week/Day/Category
- [ ] Filter checkboxes: Categories, Wallets, Shared/Personal
- [ ] Chart type selector: Pie, Bar, Line
- [ ] "Save as Template" button
- [ ] Saved templates appear in "My Reports" list
- [ ] Export to CSV/PDF buttons

**Dependencies**: US-021 (Filtering), US-050 (CSV Export), US-059 (PDF Export)

---

#### US-059: PDF Report Export 🔍

**Story**: As a user, I want to export reports as PDF, so that I can share them or keep offline records.

**Phase**: Phase 2 | **Priority**: P2 | **Time**: 5h | **Status**: 🔍 Needs Review

**Features**:
- Export any report/chart as professional PDF
- Includes Flow branding (subtle, not intrusive)
- Charts rendered as images in PDF
- Summary stats included

**Business Rules**:
- PDF respects privacy (only user's data, no household member's personal transactions)
- File naming: "Flow_Report_YYYY-MM-DD.pdf"
- Maximum file size: 10MB (prevents huge PDFs from crashing app)

**Acceptance Criteria**:
- [ ] **REVIEW**: "Export PDF" button on report screens
- [ ] PDF generates in <5 seconds
- [ ] PDF includes: Report title, date range, charts, summary stats
- [ ] Flow logo in header (tasteful branding)
- [ ] PDF opens in iOS share sheet (can save to Files, email, etc.)
- [ ] Error handling if file too large

**Dependencies**: US-051, US-052, US-053, US-054, US-058

---

---

## Phase 2: Household Sharing & Intelligence

**Overall Status**: In Active Development (5 completed, 9 new stories, 2 enhancements needed)

### 2.1 Income Detection & Budget Intelligence

Smart income detection and budget history tracking (NEW in Phase 2).

---

#### US-061: Income Detection Configuration 🆕

**Story**: As a user, I want to choose how my monthly income is calculated, so that my budget automatically adjusts to my actual earnings.

**Phase**: Phase 2 | **Priority**: P0 | **Time**: 4h | **Points**: 3 | **Status**: 🆕 New Story

**Features**:
- Toggle: Manual Entry vs. Auto-Detect from Transactions
- **Manual Mode**: Enter expected monthly salary directly (fixed amount)
- **Auto-Detect Mode**: System calculates from income transactions automatically
- Grace period setting (±3 days for weekend payday shifts)
- Fallback to manual if no transactions detected

**Business Rules**:
- Default: Manual mode with CHF 0 income
- Auto-detect requires at least one income category selected (US-062)
- Grace period default: 3 days (handles Friday payday landing on Saturday)
- Switching modes updates budget allocation immediately

**Acceptance Criteria**:
- [ ] Settings screen shows "Income Detection" section
- [ ] Toggle: Manual Entry / Auto-Detect
- [ ] Manual mode: Input field for monthly income amount
- [ ] Auto-detect mode: Shows detected amount from transactions
- [ ] Grace period slider: 1-7 days (default 3)
- [ ] Preview: "Based on your settings, we'll detect income from [categories] ±3 days from payday"
- [ ] Switching modes triggers budget recalculation
- [ ] If auto-detect finds CHF 0, falls back to manual amount with notification

**Dependencies**: US-024 (Set Payday), US-062 (Income Category Selection)

**Technical Notes**:
- Add `incomeDetectionMode` field to user settings: 'manual' | 'auto'
- Add `gracePeriodDays` field (default: 3)
- Add `manualMonthlyIncome` field (used when mode = manual or auto-detect fails)

---

#### US-062: Income Category Selection 🆕

**Story**: As a user with auto-detect enabled, I want to select which income categories count toward my monthly budget, so that bonuses and gifts don't inflate my regular budget.

**Phase**: Phase 2 | **Priority**: P0 | **Time**: 3h | **Points**: 2 | **Status**: 🆕 New Story

**Features**:
- Checkbox list of user's income categories (only "Income" group)
- Multiple categories can be selected (Salary + Bonus, etc.)
- Real-time preview: "Expected this month: CHF X from Y transactions"
- Create new income category directly from this screen
- Suggested categories: Salary (default checked), Bonus, Freelance, Gift

**Business Rules**:
- Only categories with categoryGroup = "Income" are selectable
- Default category "Salary" is pre-checked if it exists
- User can create custom income categories (must be in Income group)
- Selecting 0 categories forces manual mode
- Changes recalculate income immediately (optimistic update)

**Acceptance Criteria**:
- [ ] Settings screen shows "Income Categories" section
- [ ] Checkbox list shows all Income group categories
- [ ] "Salary" is checked by default
- [ ] Real-time preview updates as checkboxes toggled
- [ ] "Create New Income Category" button at bottom
- [ ] If all unchecked, warning: "Auto-detect requires at least one category. Switching to manual mode."
- [ ] Saves immediately (optimistic update with rollback on error)

**Dependencies**: US-017 (Categories), US-061 (Income Detection Config)

**Technical Notes**:
- Add `includedInBudget` boolean field to categories (default: false for Income, true for Expenses)
- Query: `categories.where('categoryGroup', '=', 'Income').where('includedInBudget', '=', true)`

---

#### US-063: Monthly Income Auto-Detection 🆕

**Story**: As a user with auto-detect enabled, I want the system to automatically calculate my monthly income from salary transactions, so that I don't have to manually update my budget each month.

**Phase**: Phase 2 | **Priority**: P0 | **Time**: 6h | **Points**: 5 | **Status**: 🆕 New Story

**Features**:
- Automatically sum income transactions within budget period
- Apply grace period (±3 days from period boundaries)
- Display: "This period: CHF X from Y transactions"
- Show transaction list used for calculation (transparency)
- Update in real-time when income transactions added/edited/deleted
- Fallback to manual amount if no transactions found

**Business Rules**:
- Only counts transactions in selected income categories (US-062)
- Grace period: Transactions ±3 days from period start/end count toward that period
  - Example: Period starts Feb 25, grace = 3 days → transactions from Feb 22-27 count
- Period = Budget period based on payday (US-024)
- Recalculates automatically on:
  - New income transaction added
  - Existing income transaction edited/deleted
  - Period change (payday arrives)
  - Income category selection changes (US-062)
- If actualIncome = CHF 0 AND mode = auto → use manualMonthlyIncome as fallback + show notification

**Acceptance Criteria**:
- [ ] Budget screen shows detected income with breakdown
- [ ] Display: "Monthly Income: CHF 5'200 (Auto-detected from 1 transaction)"
- [ ] Tapping amount shows transaction list modal
- [ ] Modal lists: Date, Amount, Category for each transaction
- [ ] Real-time update: Adding income transaction immediately updates budget
- [ ] Grace period applied correctly (test with transactions on Feb 22, Feb 25, Feb 28)
- [ ] Fallback notification: "No income detected this period. Using manual amount: CHF 5'000"
- [ ] Budget allocations recalculate when income changes (50/30/20 maintained)

**Dependencies**: US-061, US-062, US-024 (Payday), US-034 (Budget Allocation)

**Technical Notes**:
- Add `detectedIncome` calculated field to budget period
- Add `incomeTransactionCount` field
- Add `lastIncomeDetectionAt` timestamp
- Income detection runs on:
  - Transaction CRUD operations (if income category)
  - Period transition (midnight on payday)
  - Income category selection changes

---

#### US-064: Budget History Snapshots 🆕

**Story**: As a user who changes my budget mid-period, I want historical analytics to show what my budget actually was in past periods, so that comparisons are accurate.

**Phase**: Phase 2 | **Priority**: P0 | **Time**: 5h | **Points**: 5 | **Status**: 🆕 New Story

**Features**:
- Automatic snapshot creation on payday (period transition)
- Snapshot captures: Period dates, allocated amounts, spent amounts, percentages
- Snapshots are immutable (cannot be edited after creation)
- Used for all historical analytics queries (US-069)
- Current period always uses live budget data

**Business Rules**:
- Snapshot created at midnight on payday (period boundary)
- Captures FINAL state of budgets from previous period
- One snapshot per budget category per period
- Snapshots never deleted (permanent financial history)
- Analytics queries:
  - Current period → use `budgets` table (live, editable)
  - Past periods → use `budgetSnapshots` table (historical, immutable)
- If user changes budget mid-period (e.g., reallocates CHF 100 from Groceries to Dining Out), snapshot still captures final state at period end

**Acceptance Criteria**:
- [ ] Snapshot automatically created at midnight on payday
- [ ] Snapshot includes: userId, categoryId, periodStart, periodEnd, allocatedAmount, spentAmount, percentage, snapshotDate
- [ ] Snapshots are immutable (no UPDATE queries allowed)
- [ ] Analytics screens query snapshots for past periods (US-069)
- [ ] Dashboard shows live data for current period, snapshots for "Last Period" view
- [ ] Unit test: Create budget, add transactions, trigger period transition, verify snapshot matches final state
- [ ] Edge case test: User changes budget allocation mid-period, snapshot captures end-of-period state

**Dependencies**: US-024 (Payday), US-034 (Budget Allocation), US-025 (Budget Reset)

**Technical Notes**:
- New table: `budgetSnapshots`
  - `id`, `userId`, `categoryId`, `periodStart`, `periodEnd`
  - `allocatedAmount`, `spentAmount`, `percentage`
  - `snapshotDate` (timestamp of creation)
  - Compound index: (userId, periodStart, categoryId)
- Trigger: On budget period transition, run snapshot creation
- Helper function: `getBudgetForPeriod(userId, periodStart, periodEnd)` → returns budget data from appropriate source (live or snapshot)

---

#### US-065: Payday Display in Budget Screen 🆕

**Story**: As a user, I want to see and edit my payday directly in the budget screen, so that I don't have to dig through settings.

**Phase**: Phase 2 | **Priority**: P0 | **Time**: 4h | **Points**: 3 | **Status**: 🆕 New Story

**Features**:
- Payday date displayed prominently on budget screen
- Next payday countdown: "Next payday: Feb 25 (17 days)"
- Quick edit: Tap payday to change (opens modal)
- Visual calendar widget showing current period
- Historical period selector (view past budgets)

**Business Rules**:
- Payday remains in Settings but also accessible from Budget screen
- Cannot change payday mid-period (warning shown)
- Next payday calculated automatically accounting for month length

**Acceptance Criteria**:
- [ ] Budget screen header shows: "Current Period: Jan 25 - Feb 24"
- [ ] Subheader shows: "Next payday: Feb 25 (17 days)"
- [ ] Tapping payday date opens edit modal
- [ ] Modal shows calendar picker (day of month: 1-31)
- [ ] If mid-period, warning: "Payday change will take effect after current period ends (Feb 24)"
- [ ] Confirmation: "Change payday to 28th? Next period will start Feb 28."
- [ ] Period selector dropdown: Current, Last Period, 2 Months Ago, etc.
- [ ] Selecting past period loads budget snapshot (US-064, US-069)

**Dependencies**: US-024 (Set Payday), US-034 (Budget Allocation), US-064 (Budget Snapshots)

**UX Notes**:
- This addresses user frustration of payday being "buried in settings"
- Makes budget period concept more transparent and understandable
- Countdown creates anticipation ("17 days until budget resets")

---

#### US-066: Bonus Detection & Handling 🆕

**Story**: As a user who receives occasional bonuses, I want Flow to detect bonus income separately from regular salary, so that my budget doesn't inflate incorrectly.

**Phase**: Phase 2 | **Priority**: P1 | **Time**: 6h | **Points**: 5 | **Status**: 🆕 New Story

**Features**:
- Auto-detect unusually large income transactions (>150% of average)
- Prompt user: "This looks like a bonus. Treat as one-time income?"
- If confirmed as bonus:
  - Doesn't affect regular monthly budget allocation
  - Allocated to "Bonus Pool" category
  - User decides how to use: Save, Splurge, Extra Debt Payment
- Manual bonus marking (user can tag any income as bonus)

**Business Rules**:
- Bonus detection threshold: >150% of average income over last 3 periods
- Bonuses excluded from auto-detected monthly income (US-063)
- Bonus Pool is a special category (not Needs/Wants/Savings)
- User must allocate bonus within 7 days or it becomes regular income

**Acceptance Criteria**:
- [ ] When income transaction >150% of average, show prompt: "Bonus detected! This is CHF 2'000 more than your usual salary. How would you like to handle it?"
- [ ] Options: Treat as Bonus (separate), Include in Budget (inflate monthly income), Not a Bonus (dismiss)
- [ ] If "Treat as Bonus", creates transaction in Bonus Pool category
- [ ] Bonus Pool shows on dashboard: "Bonus: CHF 2'000 available. Allocate now?"
- [ ] Allocation screen: Sliders for Save, Splurge (Wants), Debt Payment
- [ ] If not allocated within 7 days, notification: "Allocate your bonus before it rolls into regular budget"
- [ ] Manual bonus marking: Edit transaction → "Mark as Bonus" toggle

**Dependencies**: US-063 (Income Auto-Detection), US-034 (Budget Allocation)

**UX Philosophy**:
- Aligns with "Calm Financial Control" - user stays in control of one-time income
- Prevents budget inflation from bonuses/gifts (common mistake in budgeting apps)
- Encourages intentional allocation (don't let bonus disappear into spending)

---

### 2.2 Household Member Management

Managing household invitations and member lifecycle (continued from Phase 1).

*See Phase 1 stories: US-005, US-006, US-007, US-008*

These stories are partially complete (database schema done in Phase 1, UI implementation in Phase 2).

---

### 2.3 Smart Split Ratios

Income-based automatic split ratio calculation (NEW in Phase 2).

---

#### US-067: Auto-Recalculate Split Ratios Based on Income 🆕

**Story**: As a household member using auto-detect income, I want split ratios to automatically adjust based on our actual incomes, so that expenses are always divided fairly.

**Phase**: Phase 2 | **Priority**: P0 | **Time**: 4h | **Points**: 3 | **Status**: 🆕 New Story

**Features**:
- Toggle: Manual Split Ratio vs. Income-Based (auto-calculate)
- **Manual Mode (Phase 1)**: User sets percentages (60/40, 70/30, etc.)
- **Income-Based Mode (Phase 2 NEW)**:
  - Calculates split from detected incomes: User A = CHF 6'000, User B = CHF 4'000 → 60/40 split
  - Recalculates automatically on payday (new period starts)
  - Shows preview: "Based on this period's income, split is 58/42"
- Manual override: "Recalculate Now" button
- Fallback to manual if income detection fails

**Business Rules**:
- Income-based calculation: `userA_percentage = (userA_income / (userA_income + userB_income)) * 100`
- Requires exactly 2 household members (Phase 2 limitation)
- Auto-recalculate triggers:
  1. On payday (new period starts, uses previous period's actual income)
  2. When user clicks "Recalculate Now"
  3. When switching from manual to income-based mode
- Uses `actualIncomeThisPeriod` from previous period if available
- Fallback to `baseMonthlyIncome` if no actual income detected
- If mode = manual: Split set once, never auto-updates

**Acceptance Criteria**:
- [ ] Settings screen shows "Split Ratio Mode" section
- [ ] Toggle: Manual / Income-Based
- [ ] Manual mode: Shows percentage sliders (Phase 1 behavior)
- [ ] Income-based mode: Shows calculation breakdown
  - "Your income: CHF 6'000 (60%)"
  - "Partner's income: CHF 4'000 (40%)"
  - "Shared expenses will split 60/40"
- [ ] "Recalculate Now" button in income-based mode
- [ ] On payday, automatic recalculation with notification: "Split ratio updated to 58/42 based on this period's income"
- [ ] If income detection fails, shows warning: "Could not detect income. Using manual split ratio (60/40)"
- [ ] Switching modes shows confirmation: "Change to income-based? Future shared expenses will split based on your incomes."

**Dependencies**: US-027 (Split Ratio Config), US-063 (Income Detection), US-005 (Invite Member)

**Technical Notes**:
- Add `splitRatioSettings` to household:
  - `mode`: 'manual' | 'income-based'
  - `autoRecalculate`: boolean (default true for income-based)
  - `manualUserAPercentage`: number | null
  - `manualUserBPercentage`: number | null
- Add `currentPeriodIncome` to householdMembers (for split calculation)
- On period transition, run: `recalculateSplitRatios(householdId)`

---

### 2.4 Shared Expenses & Settlement

Settlement workflow and debt tracking (continued from Phase 1, enhancements in Phase 2).

---

#### US-040: Live Debt Balance ✅ ✏️

**Story**: As a household member, I want to see who owes what in real-time, so that we can settle up easily.

**Phase**: Phase 1 (DB) / Phase 2 (Active) | **Priority**: P0 | **Time**: 3h + 3h enhancement | **Status**: ✅ Completed (Enhancement Needed)

**Features**:
- **Phase 1 (Current)**:
  - Live balance calculation from shared expenses
  - Shows: "You owe Partner: CHF 120" or "Partner owes you: CHF 85"
  - Updates immediately when shared expense added/edited/deleted
- **Phase 2 (NEW)**:
  - Batch settlement support (settle multiple expenses at once)
  - Settlement history with filters
  - Export settlement report (CSV/PDF)

**Business Rules**:
- Balance = sum of all unsettled expense splits
- Positive balance = you owe partner
- Negative balance = partner owes you
- Zero balance = all settled up

**Phase 2 Enhancement**: Multi-transaction batch settlement

**Acceptance Criteria**:
- [x] **Phase 1**: Dashboard widget shows debt balance
- [x] Balance updates in real-time
- [x] Color coding: Owe (Soft Amber), Owed (Sage Green), Settled (neutral)
- [x] Tapping widget shows "Settle Up" screen
- [ ] **Phase 2**: "Settle Up" screen shows transaction list
- [ ] **Phase 2**: Checkboxes to select multiple transactions
- [ ] **Phase 2**: "Settle Selected" button
- [ ] **Phase 2**: Settlement confirmation with total amount

**Dependencies**: US-015 (Shared Expenses), US-027 (Split Ratios), US-030 (Split Override)

**Enhancement Story**: Multi-transaction batch settlement (Phase 2)

---

#### US-042: Settlement Workflow ✅

**Story**: As a household member, I want to mark expenses as settled when money is exchanged, so that our balance stays accurate.

**Phase**: Phase 2 | **Priority**: P0 | **Time**: 4h | **Status**: ✅ Completed

**Features**:
- "Settle Up" button on debt balance widget
- Shows breakdown of unsettled expenses
- Single-tap settlement: "Mark All as Settled"
- Individual transaction settlement
- Settlement creates settlement record (audit trail)

**Business Rules**:
- Settlement is permanent (cannot be unsettled in Phase 2)
- Both parties see settlement in transaction history
- Settlement date recorded for reporting

**Acceptance Criteria**:
- [x] "Settle Up" screen shows unsettled transactions
- [x] Total amount due displayed prominently
- [x] "Mark All as Settled" button (one-tap for full balance)
- [x] Individual "Settle" buttons per transaction
- [x] Confirmation: "Settle CHF 120 with Partner? This cannot be undone."
- [x] Settlement creates record with timestamp
- [x] Balance immediately updates to CHF 0 (or remaining balance)
- [x] Both household members see settlement notification

**Dependencies**: US-040 (Live Balance), US-015 (Shared Expenses)

---

**Note**: US-041 (Itemized Breakdown), US-043 (Mark Settled), US-044 (Settlement History) were **removed** and merged into US-040 and US-042 to avoid redundancy.

---

### 2.5 Enhanced Analytics

Analytics improvements using budget snapshots for historical accuracy (NEW in Phase 2).

---

#### US-068: Income Progress Widget 🆕

**Story**: As a user with auto-detect income, I want to see my income progress through the period, so that I know when my full budget is available.

**Phase**: Phase 2 | **Priority**: P1 | **Time**: 3h | **Points**: 2 | **Status**: 🆕 New Story

**Features**:
- Dashboard widget showing monthly income status
- **Auto-Detect Mode**:
  - Display: "Monthly Income: CHF 5'200"
  - Received: "CHF 5'200 from 1 transaction (Salary)"
  - Progress bar showing received vs. expected
  - List of income transactions received this period
- **Manual Mode**:
  - Display: "Monthly Income: CHF 5'000 (Manual)"
  - No progress bar (static amount)
- Next payday countdown: "Next payday: Feb 25 (17 days)"

**Business Rules**:
- Widget appears on main dashboard (below wallet balances)
- Updates in real-time when income transactions added
- Shows different content based on budgeting mode (US-061):
  - Manual: Just shows static monthly income amount
  - Auto-detect: Shows received vs. expected, transaction list, progress
- Tapping widget navigates to income settings (US-061)
- Next payday calculated from US-024 payday setting

**Acceptance Criteria**:
- [ ] Widget appears on dashboard in income section
- [ ] **Manual Mode**: Shows "CHF 5'000 (Manual)" with payday countdown
- [ ] **Auto-Detect Mode**: Shows "CHF 5'200 received from 1 transaction"
- [ ] Progress bar: Green (100%+ received), Amber (50-99%), Neutral (<50%)
- [ ] Transaction list: "Salary - Feb 25 - CHF 5'200"
- [ ] Tapping widget opens income settings (US-061)
- [ ] Next payday countdown updates daily
- [ ] Real-time update when income transaction added

**Dependencies**: US-061, US-062, US-063, US-024

**UX Philosophy**:
- Provides reassurance ("income received, budget is funded")
- Countdown creates anticipation for payday
- Progress bar gamifies income tracking (positive reinforcement)

---

#### US-069: Analytics - Budget History Integration 🆕

**Story**: As a user viewing analytics, I want historical data to reflect what my budget actually was in past periods, so that comparisons are meaningful.

**Phase**: Phase 2 | **Priority**: P0 | **Time**: 3h | **Points**: 3 | **Status**: 🆕 New Story

**Features**:
- Analytics queries automatically use correct data source:
  - **Current period**: Live data from `budgets` table
  - **Past periods**: Historical data from `budgetSnapshots` table
- Month comparison (US-055) shows accurate budget amounts for each period
- Trend charts use historical budget allocations
- Budget Performance report (US-054) uses period-specific data
- No user-visible changes (transparent backend logic)

**Business Rules**:
- **Query logic**:
  ```
  IF period = current period: 
    Use budgets table (live data, can change)
  ELSE: 
    Use budgetSnapshots WHERE periodStart = requested period
  ```
- Handles mid-period budget changes correctly:
  - Current period: Shows live changes immediately
  - Past periods: Shows final snapshot values (unchangeable)
- "Compare last 3 months" uses mix of snapshots (2 past) + current (1 live)
- Charts and reports always historically accurate
- **Critical**: Without this, changing budget in February would retroactively change what January's budget looks like in analytics

**Acceptance Criteria**:
- [ ] Month comparison (US-055) queries budget snapshots for past periods
- [ ] Budget Performance (US-054) uses snapshots for historical periods
- [ ] Trend charts (US-053) use snapshots for data points before current period
- [ ] Helper function `getBudgetForPeriod()` routes to correct data source
- [ ] Unit test: Change budget mid-February → January analytics unchanged
- [ ] Integration test: View "Last 3 Months" → shows accurate historical budgets
- [ ] No performance degradation (snapshots indexed properly)

**Dependencies**: US-064 (Budget Snapshots), US-054 (Budget Performance), US-055 (Month Comparison)

**Technical Notes**:
- Add helper: `getBudgetForPeriod(userId, periodStart, periodEnd)`
  - Returns budget data from appropriate source
  - All analytics queries use this helper
  - Seamless transition between snapshot and live data
- Index `budgetSnapshots` on (userId, periodStart, categoryId) for fast queries

---

---

## Phase 3-4: Swiss Open Banking

**Overall Status**: Planned (Research phase begins Q2 2025)

### Swiss Open Banking Integration Stories

These stories are deferred to Phase 3-4 (2026) and represent Flow's strategic competitive advantage.

---

#### US-070: Bank Account Connection (OAuth) 🔮

**Story**: As a user, I want to connect my Swiss bank account (UBS, PostFinance, Raiffeisen), so that transactions are automatically imported.

**Phase**: Phase 3 | **Priority**: P0 | **Time**: 13h | **Points**: 13 | **Status**: 🔮 Future

**Features**:
- OAuth 2.0 connection flow
- Supported banks: UBS, Credit Suisse, PostFinance, Raiffeisen, Cantonal banks
- Bank selection screen with logos
- Permission review before authorizing
- Token refresh handling (90-day expiry)

**Business Rules**:
- User must explicitly authorize each bank connection
- Tokens stored encrypted in iOS Keychain
- User can revoke connection anytime
- Connection must be re-authorized every 90 days (Swiss banking regulation)

**Acceptance Criteria**:
- [ ] Bank selection screen shows supported banks
- [ ] Tapping bank opens OAuth flow in Safari
- [ ] User reviews permissions: "Flow will access: Account balances, Transaction history (last 90 days)"
- [ ] After authorization, returns to app with success message
- [ ] Connection saved with bank name, account number (last 4 digits), connection date
- [ ] Token refresh automated before expiry
- [ ] Revoke connection from settings → deletes tokens, stops sync

**Dependencies**: Research Swiss Open Banking APIs (Phase 3 prerequisite)

**Research Needed**:
- Swiss FinTech API standards
- OAuth provider (Tink, Plaid, or direct bank APIs)
- Compliance requirements (FADP, GDPR, Swiss banking regulations)
- Cost analysis (API fees per transaction import)

---

#### US-071: Automatic Transaction Import 🔮

**Story**: As a user with connected bank account, I want transactions automatically imported daily, so that I don't have to manually enter them.

**Phase**: Phase 3 | **Priority**: P0 | **Time**: 13h | **Points**: 13 | **Status**: 🔮 Future

**Features**:
- Daily automatic sync (runs at 6 AM)
- Manual sync: "Refresh Now" button
- First sync imports last 90 days of transactions
- Subsequent syncs import new transactions only
- Duplicate detection (prevents double-entry)
- Transaction matching: Bank transaction → Flow category

**Business Rules**:
- Sync runs in background (iOS background task)
- User notified of import: "12 new transactions imported"
- Duplicate detection by: Date + Amount + Merchant (exact match)
- If duplicate detected, asks user: "Keep existing, Replace, Keep both"
- Failed sync shows error notification

**Acceptance Criteria**:
- [ ] First sync imports last 90 days with progress indicator
- [ ] Daily sync runs at 6 AM (user configurable in settings)
- [ ] Manual "Refresh Now" button in Transactions screen
- [ ] Duplicate detection prevents double-entry
- [ ] Notification: "12 transactions imported from UBS"
- [ ] Imported transactions marked with bank icon
- [ ] Failed sync shows error: "Could not connect to UBS. Try again?"

**Dependencies**: US-070 (Bank Connection), US-014, US-015

---

#### US-072: ML-Based Categorization Suggestions 🔮

**Story**: As a user with imported transactions, I want Flow to suggest categories based on merchant names, so that categorization is fast and accurate.

**Phase**: Phase 3 | **Priority**: P1 | **Time**: 13h | **Points**: 13 | **Status**: 🔮 Future

**Features**:
- ML model trained on Swiss merchant names (Migros, Coop, SBB, etc.)
- Confidence score for each suggestion (High/Medium/Low)
- One-tap accept: "Migros → Groceries (High confidence)"
- Learns from user corrections
- Batch categorization: "Categorize all 12 suggested?"

**Business Rules**:
- High confidence (>90%): Auto-categorize (user can override)
- Medium confidence (70-90%): Suggest, user confirms
- Low confidence (<70%): Leave uncategorized, user manually assigns
- User corrections train model (reinforcement learning)

**Acceptance Criteria**:
- [ ] Imported transactions show suggested category
- [ ] Confidence badge: High (Sage Green), Medium (Soft Amber), Low (neutral)
- [ ] One-tap accept: Checkmark button
- [ ] Override: Tap category to change
- [ ] Batch categorization modal: "12 transactions suggested. Accept all?"
- [ ] Learning: User changes "SBB → Transportation" to "SBB → Commute" → future SBB transactions suggest "Commute"
- [ ] Swiss merchant database: Migros, Coop, Denner, Aldi, Lidl, SBB, PostAuto, Swisscom, etc.

**Dependencies**: US-071 (Transaction Import), US-017 (Categories)

---

#### US-073: Account Balance Synchronization 🔮

**Story**: As a user with connected bank account, I want my wallet balance to sync automatically, so that I always know my real available funds.

**Phase**: Phase 3 | **Priority**: P1 | **Time**: 8h | **Points**: 8 | **Status**: 🔮 Future

**Features**:
- Real-time balance sync (daily with transactions)
- Dashboard widget: "Bank Balance: CHF 3'245.67 (as of today 6:05 AM)"
- Discrepancy detection: Flow balance vs. bank balance
- Reconciliation workflow if balances don't match

**Business Rules**:
- Balance updates when transactions sync (US-071)
- If Flow balance ≠ bank balance → notification: "Balance mismatch detected. Reconcile now?"
- Reconciliation shows: Flow balance, Bank balance, Difference, Missing transactions

**Acceptance Criteria**:
- [ ] Dashboard shows synced bank balance
- [ ] Last sync timestamp shown
- [ ] Balance updates when transactions imported
- [ ] Discrepancy notification if Flow ≠ Bank
- [ ] Reconciliation screen: Side-by-side comparison
- [ ] User can add missing transactions to reconcile
- [ ] After reconciliation, balances match (confirmation message)

**Dependencies**: US-070, US-071

---

---

## Technical & Infrastructure Stories

Stories for reusable components, performance optimization, testing, and security.

---

### Reusable Components

---

#### TECH-001: GlassCard Component Library 🆕

**Story**: As a developer, I want a GlassCard component library, so that I can apply consistent glassmorphism effects throughout the app.

**Phase**: Phase 2 | **Priority**: P1 | **Time**: 5h | **Points**: 5 | **Status**: 🆕 New Story

**Features**:
- Reusable GlassCard component with variants
- Variants: `primary`, `secondary`, `accent`
- Blur levels: `light`, `medium`, `heavy`
- Props: `variant`, `blur`, `children`, `onPress`
- No hardcoded colors (uses design tokens)

**Business Rules**:
- All transaction cards, budget cards, dashboard widgets use GlassCard
- Backdrop blur values optimized for iOS performance (8px, 16px, 24px)
- Color values from design system tokens (`colors.ts`)

**Acceptance Criteria**:
- [ ] GlassCard component created in `/src/components/cards/`
- [ ] Supports variants: primary (Deep Teal), secondary (Sage Green), accent (Soft Amber)
- [ ] Supports blur levels: light (8px), medium (16px), heavy (24px)
- [ ] TypeScript props interface defined
- [ ] Example usage documented in CLAUDE.md
- [ ] All existing hardcoded glass effects refactored to use GlassCard
- [ ] Performance test: 60fps on iPhone 11 with 10 GlassCards on screen

**Dependencies**: None

**Technical Notes**:
```typescript
// Example usage
<GlassCard variant="primary" blur="medium">
  <TransactionContent />
</GlassCard>
```

---

#### TECH-002: LoadingScreen Component 🆕

**Story**: As a developer, I want a LoadingScreen component, so that all loading states look consistent.

**Phase**: Phase 2 | **Priority**: P2 | **Time**: 2h | **Points**: 2 | **Status**: 🆕 New Story

**Features**:
- Centered loading spinner (iOS ActivityIndicator)
- Optional loading message
- Prevents user interaction while loading
- Uses Flow color palette (Deep Teal spinner)

**Acceptance Criteria**:
- [ ] LoadingScreen component created in `/src/components/shared/`
- [ ] Shows centered spinner with optional message
- [ ] Blocks user interaction (overlay)
- [ ] Uses Deep Teal (#2C5F5D) for spinner
- [ ] Example: `<LoadingScreen message="Loading transactions..." />`
- [ ] Used on: App launch, data sync, budget calculation

**Dependencies**: None

---

#### TECH-003: ErrorBoundary Component 🆕

**Story**: As a developer, I want an ErrorBoundary, so that crashes are gracefully handled instead of showing blank screen.

**Phase**: Phase 2 | **Priority**: P1 | **Time**: 3h | **Points**: 3 | **Status**: 🆕 New Story

**Features**:
- React ErrorBoundary component
- Catches unhandled errors in component tree
- Shows empathetic error screen with retry button
- Logs error to analytics (for debugging)

**Business Rules**:
- ErrorBoundary wraps entire app (in App.tsx)
- Error screen shows: "Something went wrong. We're sorry for the inconvenience."
- "Try Again" button reloads app
- Error details logged (for developer debugging only, not shown to user)

**Acceptance Criteria**:
- [ ] ErrorBoundary component created
- [ ] Wraps app in App.tsx
- [ ] Error screen shows empathetic message (no technical jargon)
- [ ] "Try Again" button resets error state
- [ ] Error logged to console (dev mode) or analytics (production)
- [ ] Test: Trigger intentional error, verify ErrorBoundary catches it

**Dependencies**: None

---

### Performance Optimization

---

#### TECH-004: App Launch Time Optimization 🆕

**Story**: As a developer, I want app launch time under 2 seconds, so that users don't experience delay.

**Phase**: Phase 1 / Phase 2 | **Priority**: P0 | **Time**: 8h | **Points**: 8 | **Status**: 🆕 New Story

**Features**:
- Lazy loading for non-critical components
- Optimize InstantDB initial queries
- Reduce bundle size (code splitting)
- Splash screen with animated Flow logo

**Business Rules**:
- Target: <2 seconds on iPhone 12 Pro
- Measure: Time from tap to interactive dashboard
- Critical path: Auth check → Load budget → Render dashboard

**Acceptance Criteria**:
- [ ] App launches in <2 seconds on iPhone 12 Pro (cold start)
- [ ] Splash screen shows during initial load
- [ ] Critical data loaded first (budget, recent transactions)
- [ ] Non-critical data loaded lazily (analytics, settings)
- [ ] Performance profiled with React Native Performance Monitor
- [ ] Bundle size analyzed and optimized (<5MB)

**Dependencies**: None

---

#### TECH-005: Transaction List Rendering Optimization 🆕

**Story**: As a developer, I want transaction list to render 500 items in <100ms, so that scrolling is smooth.

**Phase**: Phase 2 | **Priority**: P1 | **Time**: 5h | **Points**: 5 | **Status**: 🆕 New Story

**Features**:
- Virtualization (FlatList with optimizations)
- Lazy loading pagination (load 50 at a time)
- Memoization for transaction cards
- Optimistic updates for instant feedback

**Business Rules**:
- Target: <100ms render time for 500 transactions
- Maintain 60fps scrolling
- Infinite scroll with "Load More" trigger

**Acceptance Criteria**:
- [ ] FlatList used for transaction rendering
- [ ] Only visible items rendered (windowing)
- [ ] Pagination: Load 50 transactions at a time
- [ ] Scroll to bottom triggers "Load More"
- [ ] Transaction cards memoized (React.memo)
- [ ] Performance test: 1000 transactions render without lag
- [ ] 60fps scrolling verified on iPhone 11

**Dependencies**: US-014, US-015, US-021

---

### Testing Infrastructure

---

#### TECH-006: Unit Test Framework Setup 🆕

**Story**: As a developer, I want a unit test framework, so that business logic is verified automatically.

**Phase**: Phase 1 / Phase 2 | **Priority**: P1 | **Time**: 8h | **Points**: 8 | **Status**: 🆕 New Story

**Features**:
- Jest + React Native Testing Library
- Test coverage reporting (Istanbul)
- Automated tests run on every commit (GitHub Actions CI)
- Coverage target: 80% for utils, 60% overall

**Acceptance Criteria**:
- [ ] Jest configured for React Native
- [ ] Example test file created (`currency.test.ts`)
- [ ] Coverage reports generated (HTML + terminal)
- [ ] CI runs tests on every push to main
- [ ] Coverage badge in README.md
- [ ] Target: 80%+ coverage on `/src/utils/`

**Dependencies**: None

---

#### TECH-007: Critical Flow Automation 🆕

**Story**: As a QA engineer, I want automated tests for critical flows, so that regressions are caught before deployment.

**Phase**: Phase 2 | **Priority**: P0 | **Time**: 13h | **Points**: 13 | **Status**: 🆕 New Story

**Features**:
- Automated tests for 4 critical user flows:
  1. Create budget → Add transaction → View budget status
  2. Set up household → Add shared expense → Settle up
  3. Create recurring template → Activate for period
  4. Edit transaction → Change to shared → Verify split creation
- Integration tests using React Native Testing Library
- Mock InstantDB queries (deterministic tests)

**Acceptance Criteria**:
- [ ] 4 critical flows have integration tests
- [ ] Tests run in <5 minutes total
- [ ] Tests pass consistently (no flakiness)
- [ ] CI fails if critical tests fail (blocking deployment)
- [ ] Test reports show steps and assertions
- [ ] Mock data realistic (Swiss currency, realistic amounts)

**Dependencies**: TECH-006

---

### Security & Privacy

---

#### TECH-008: UserId Scoping Enforcement 🆕

**Story**: As a security specialist, I want all queries to enforce userId scoping, so that data never leaks between users.

**Phase**: Phase 1 / Phase 2 | **Priority**: P0 | **Time**: 5h | **Points**: 5 | **Status**: 🆕 New Story

**Features**:
- Automated linting rule: Enforce `.where('userId', '=', userId)` on all queries
- Utility function: `userScopedQuery(collection, userId)`
- Code review checklist item
- Automated tests verify userId scoping

**Business Rules**:
- EVERY InstantDB query must include userId filter
- Linting error if query missing userId
- Exception: System-level queries (admin only, future Phase 4)

**Acceptance Criteria**:
- [ ] ESLint custom rule created: `enforce-userid-scoping`
- [ ] Utility function: `userScopedQuery(collection, userId)` enforces pattern
- [ ] Code review checklist: "All queries userId-scoped?"
- [ ] Integration test: Attempt to query without userId → returns empty (not error)
- [ ] All existing queries refactored to use utility
- [ ] CI fails if linting error detected

**Dependencies**: None

**Technical Notes**:
```typescript
// Utility enforces pattern
export const userScopedQuery = <T>(
  collection: string, 
  userId: string
) => {
  return db.query(collection).where('userId', '=', userId);
};

// Usage
const transactions = userScopedQuery('transactions', userId)
  .where('date', '>=', startDate)
  .useQuery();
```

---

#### TECH-009: Data Export & Deletion (FADP Compliance) 🆕

**Story**: As a privacy-conscious user, I want to export my data as JSON and delete my account, so that I comply with Swiss data protection laws.

**Phase**: Phase 2 | **Priority**: P0 | **Time**: 8h | **Points**: 8 | **Status**: 🆕 New Story

**Features**:
- Export all user data as JSON (transactions, budgets, categories, household)
- Delete account workflow with confirmation
- Data permanently deleted within 30 days (FADP requirement)
- Export delivered via email or in-app download

**Business Rules**:
- Export includes: Transactions, budgets, categories, wallets, household members (IDs only, not personal data)
- Household members notified if user deletes account with unsettled debts
- Deletion is permanent after 30-day grace period

**Acceptance Criteria**:
- [ ] Settings screen shows "Export Data" button
- [ ] Export generates JSON file with all user data
- [ ] File naming: "Flow_Export_YYYY-MM-DD.json"
- [ ] JSON is human-readable and machine-parsable
- [ ] "Delete Account" button with confirmation: "This will permanently delete your account and all data. This cannot be undone."
- [ ] Deletion marks account for deletion (soft delete)
- [ ] After 30 days, automated job permanently deletes data
- [ ] Household members notified if unsettled debts exist

**Dependencies**: US-014, US-015, US-034, US-005

---

---

## UX & Accessibility Stories

Stories for progressive disclosure, empathetic design, accessibility, and onboarding.

---

### Progressive Disclosure

---

#### UX-001: Progressive Disclosure - Household Features 🆕

**Story**: As a new budgeter, I want household sharing features hidden until I need them, so that I'm not overwhelmed.

**Phase**: Phase 2 | **Priority**: P1 | **Time**: 3h | **Points**: 3 | **Status**: 🆕 New Story

**Features**:
- Household sharing features hidden by default
- "Invite Partner" card appears on dashboard after 1 week of use
- Settings menu: "Household Sharing" section collapsed
- Once invited, household features always visible

**Business Rules**:
- New users see simple single-user budgeting interface
- After 7 days, subtle prompt: "Track shared expenses with your partner"
- User can dismiss prompt (doesn't appear again for 30 days)
- Once household member invited, UI expands to show shared features

**Acceptance Criteria**:
- [ ] New user sees only personal budgeting features
- [ ] After 7 days, "Invite Partner" card appears on dashboard
- [ ] Card can be dismissed with "Not now" button
- [ ] Dismissed card reappears after 30 days
- [ ] Once household member added, shared expense toggle always visible
- [ ] Settings expands to show household section

**Dependencies**: US-005 (Invite Member)

---

#### UX-002: Collapsible "Upcoming" Section 🆕

**Story**: As a user without future-dated transactions, I want the "Upcoming" section hidden, so that my screen isn't cluttered.

**Phase**: Phase 2 | **Priority**: P2 | **Time**: 2h | **Points**: 2 | **Status**: 🆕 New Story

**Features**:
- "Upcoming" section collapsed by default if empty
- Expands when user adds recurring expense template or future-dated transaction
- Section header: "Upcoming (3)" shows count
- Smooth expand/collapse animation

**Business Rules**:
- Section hidden if 0 upcoming items
- Auto-expands when first item added
- User can manually collapse (preference saved)

**Acceptance Criteria**:
- [ ] Section hidden if no upcoming transactions or templates
- [ ] Header shows count: "Upcoming (3)"
- [ ] Tap header to expand/collapse
- [ ] Smooth animation (200ms ease-in-out)
- [ ] User preference saved (stays collapsed if user collapses it)
- [ ] Auto-expands when first item added (subtle highlight animation)

**Dependencies**: US-016 (Recurring Expenses)

---

### Empathetic Error Handling

---

#### UX-003: Empathetic Budget Overspend Messaging 🆕

**Story**: As a user who overspent, I want helpful suggestions instead of guilt, so that I know what to do next.

**Phase**: Phase 2 | **Priority**: P1 | **Time**: 3h | **Points**: 3 | **Status**: 🆕 New Story

**Features**:
- Overspend notification shows actionable options:
  1. Adjust this month's budget (reallocate from another category)
  2. Review recent transactions (find errors or unnecessary spending)
  3. Make a plan for next period (reduce allocation)
- No harsh language ("overspent", "exceeded", "failed")
- Use calm language: "You've spent more than planned"

**Business Rules**:
- Trigger: Category spending >110% of budget
- Notification: Modal (not intrusive banner)
- Dismissible (don't force user to take action)

**Acceptance Criteria**:
- [ ] Overspend triggers modal (not banner)
- [ ] Message: "You've spent CHF 234 more than planned in Dining Out this period. Here are some options:"
- [ ] Option 1: "Adjust Budget" (opens budget allocation screen)
- [ ] Option 2: "Review Transactions" (opens filtered transaction list)
- [ ] Option 3: "Make a Plan" (opens note-taking screen for next period)
- [ ] Option 4: "Dismiss" (closes modal)
- [ ] No harsh words: "overspent", "failed", "exceeded"
- [ ] Color: Soft Amber (not harsh red)

**Dependencies**: US-034, US-015

---

#### UX-004: Network Error Empathetic Messaging 🆕

**Story**: As a user with network error, I want clear explanation and retry option, so that I understand the problem.

**Phase**: Phase 2 | **Priority**: P2 | **Time**: 2h | **Points**: 2 | **Status**: 🆕 New Story

**Features**:
- Network error shows: "We're having trouble connecting. This might be a network issue."
- Retry button prominently displayed
- Option to continue offline (if applicable)
- No technical jargon ("Error 500", "API timeout")

**Acceptance Criteria**:
- [ ] Network error shows modal (not error banner)
- [ ] Message: "We're having trouble connecting. Please check your internet connection and try again."
- [ ] "Retry" button (primary action)
- [ ] "Continue Offline" button (if applicable)
- [ ] No error codes shown to user
- [ ] Error logged to console/analytics for debugging

**Dependencies**: None

---

### Celebration Loops

---

#### UX-005: Budget Goal Achievement Celebration 🆕

**Story**: As a user who stayed within budget, I want gentle encouragement, so that I feel motivated to continue.

**Phase**: Phase 2 | **Priority**: P2 | **Time**: 2h | **Points**: 2 | **Status**: 🆕 New Story

**Features**:
- End-of-period celebration if all categories stayed within budget
- Message: "Great work! You stayed within budget this period 🎉"
- Subtle animation (confetti or checkmark)
- Opt-out option (some users find gamification patronizing)

**Business Rules**:
- Trigger: End of budget period, all categories ≤100% of budget
- Celebration shown once per period
- User can disable in settings: "Celebrate budget goals"

**Acceptance Criteria**:
- [ ] End of period, if all categories within budget, show celebration modal
- [ ] Message: "Great work! You stayed within budget this period 🎉"
- [ ] Subtle confetti animation (tasteful, not excessive)
- [ ] "Thanks!" button to dismiss
- [ ] Settings option: "Celebrate budget goals" toggle
- [ ] If disabled, no celebrations shown

**Dependencies**: US-034, US-025 (Period Reset)

---

#### UX-006: First Budget Created Encouragement 🆕

**Story**: As a new budgeter, I want encouragement after creating my first budget, so that I feel confident.

**Phase**: Phase 1 | **Priority**: P2 | **Time**: 1h | **Points**: 1 | **Status**: 🆕 New Story

**Features**:
- One-time message after first budget created
- Message: "Great start! You've taken the first step toward calm financial control."
- Links to helpful resources (optional)

**Acceptance Criteria**:
- [ ] First budget creation triggers modal
- [ ] Message: "Great start! You've taken the first step toward calm financial control."
- [ ] "Continue" button to dismiss
- [ ] Optional: "Learn More" link to budgeting tips
- [ ] Never shown again (one-time only)

**Dependencies**: US-034

---

### Accessibility

---

#### UX-007: VoiceOver Support 🆕

**Story**: As a visually impaired user, I want VoiceOver support, so that I can use the app independently.

**Phase**: Phase 2 | **Priority**: P1 | **Time**: 8h | **Points**: 8 | **Status**: 🆕 New Story

**Features**:
- All interactive elements have accessibility labels
- Transaction amounts announced in full: "CHF 1'234.56"
- Budget progress announced: "Groceries: CHF 450 spent of CHF 500 budgeted, 90%"
- Navigation hints for complex gestures

**Business Rules**:
- Accessibility labels required for all buttons, inputs, links
- Labels are descriptive (not just "Button")
- Complex gestures (swipe-to-delete) have VoiceOver alternatives

**Acceptance Criteria**:
- [ ] All buttons have `accessibilityLabel` set
- [ ] Transaction amounts announced correctly
- [ ] Budget progress descriptive: "Groceries: 90% spent, CHF 50 remaining"
- [ ] Swipe-to-delete has alternative: Long-press menu → Delete
- [ ] VoiceOver navigation tested on all major screens
- [ ] No accessibility errors in Xcode Accessibility Inspector

**Dependencies**: All UI components

---

#### UX-008: Color Contrast Compliance (WCAG AA) 🆕

**Story**: As a user with color blindness, I want WCAG AA contrast, so that text is readable.

**Phase**: Phase 1 / Phase 2 | **Priority**: P1 | **Time**: 3h | **Points**: 3 | **Status**: 🆕 New Story

**Features**:
- All text meets WCAG AA contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Color palette verified for contrast
- No reliance on color alone for information (use icons + text)

**Business Rules**:
- Deep Teal (#2C5F5D) with white text: 4.8:1 ✅
- Sage Green (#A8B5A1) with dark text: 4.6:1 ✅
- Soft Amber (#E3A05D) with dark text: 4.7:1 ✅

**Acceptance Criteria**:
- [ ] All text/background combinations verified with contrast checker
- [ ] WCAG AA compliance report generated
- [ ] Budget status uses icons + color (not color alone)
- [ ] Error states use icon + color (not just red)
- [ ] Tested with color blindness simulators

**Dependencies**: Design system (colors.ts)

---

#### UX-009: Touch Target Size (44pt minimum) 🆕

**Story**: As a user with motor difficulties, I want 44pt touch targets, so that buttons are easy to tap.

**Phase**: Phase 1 / Phase 2 | **Priority**: P1 | **Time**: 3h | **Points**: 3 | **Status**: 🆕 New Story

**Features**:
- All interactive elements minimum 44x44pt
- Spacing between buttons prevents mis-taps
- Large enough for one-handed use

**Business Rules**:
- iOS HIG recommendation: 44x44pt minimum
- Applies to: Buttons, links, checkboxes, toggles, list items

**Acceptance Criteria**:
- [ ] All buttons audited for size (minimum 44x44pt)
- [ ] Spacing between adjacent buttons ≥8pt
- [ ] List items tappable area minimum 44pt height
- [ ] Toggle switches 44pt wide
- [ ] Tested on iPhone SE (smallest screen) for one-handed use

**Dependencies**: All UI components

---

---

## Bug Fixes & Known Issues

Current bugs and edge cases that need fixing.

---

### Critical Bugs (P0 - Fix Immediately)

---

#### BUG-001: Settlement Workflow - Personal to Shared Transition 🐛

**Story**: As a household member, I edit an existing personal transaction to make it shared, expecting it to create expense splits for my partner, **but the system doesn't generate the splits**, which causes incorrect settlement balances.

**Phase**: Phase 2 | **Priority**: P0 | **Time**: 3h | **Points**: 3 | **Status**: 🐛 Critical Bug

**Expected Behavior**:
1. User edits transaction, toggles "Shared" to ON
2. System calculates splits based on household ratio (e.g., 60/40)
3. ExpenseSplit record created for partner with correct amount
4. "Settle Up" view updates to show amount owed

**Actual Behavior**:
1. User edits transaction, toggles "Shared" to ON
2. Transaction updates but no splits are created
3. Settlement balance remains at zero (incorrect)

**Root Cause**: Mutation logic in `editTransaction()` not checking for personal→shared transition

**Acceptance Criteria**:
- [ ] Editing personal→shared triggers split calculation
- [ ] ExpenseSplit records created with correct amounts (60% / 40%)
- [ ] "Settle Up" view immediately reflects new balance
- [ ] Unit test added to verify personal→shared transition
- [ ] Integration test covers full settlement workflow end-to-end
- [ ] Regression test: shared→personal removes splits correctly
- [ ] Edge case: Editing split percentage also updates ExpenseSplit records

**Dependencies**: US-018 (Edit Transaction), US-027 (Split Ratios), US-040 (Debt Balance)

**Fix Strategy**:
```typescript
// In editTransaction mutation
if (wasPersonal && nowShared) {
  // Create expense splits
  const splits = calculateSplits(transaction.amount, householdRatios);
  await createExpenseSplits(transactionId, splits);
}
if (wasShared && nowPersonal) {
  // Delete expense splits
  await deleteExpenseSplits(transactionId);
}
```

---

#### BUG-002: Recurring Expense Calendar Display 🐛

**Story**: As a user viewing the calendar, I see recurring expense templates displayed as actual transactions, which is confusing because the money hasn't been spent yet.

**Phase**: Phase 1 | **Priority**: P1 | **Time**: 2h | **Points**: 2 | **Status**: 🐛 Bug Fix Needed

**Expected Behavior**:
- Calendar view shows only actual transactions (income and expenses)
- Recurring templates appear in "Upcoming" section, not calendar

**Actual Behavior**:
- Recurring templates shown on calendar as if they are transactions
- User confused: "I already paid rent?" (but template hasn't been activated)

**Root Cause**: Calendar query includes templates (should filter by `isTemplate = false`)

**Acceptance Criteria**:
- [ ] Calendar view filters out recurring templates
- [ ] Query: `transactions.where('isTemplate', '=', false)`
- [ ] Templates only appear in "Upcoming" section
- [ ] Activated templates (converted to transactions) appear on calendar
- [ ] Unit test verifies templates excluded from calendar query

**Dependencies**: US-016 (Recurring Expenses)

---

### High Priority Bugs (P1 - Fix This Sprint)

---

#### BUG-003: Settings Screen Color Consistency ✅

**Story**: As a user, I see hardcoded colors in settings screens that don't match the glassmorphism theme, which breaks visual consistency.

**Phase**: Phase 1 | **Priority**: P1 | **Time**: 3h | **Points**: 3 | **Status**: ✅ Completed (Feb 12, 2026)

**Issue**: Settings screens used hardcoded colors (#006A6A, #E3A05D) instead of design tokens

**Root Cause**: Components created before design system was finalized

**Fixes Applied**:
- ✅ Settings screen: All menu icons now use `colors.sageGreen` instead of hardcoded `#006A6A`
- ✅ Sign out button: Proper padding, consistent styling with design system
- ✅ Payday settings: Replaced hardcoded `#E3A05D` with `colors.softAmber`
- ✅ Save button: Uses sage green background instead of harsh `colors.contextTeal`
- ✅ All settings screens follow "Calm Financial Control" design philosophy

**Acceptance Criteria**:
- [x] All settings components use design tokens (no hardcoded colors)
- [x] Visual consistency: All icons use sage green (#A8B5A1)
- [x] Buttons use appropriate colors (sage green for primary, soft amber for warnings)
- [x] No harsh colors (bright teal, red) in settings UI

----

#### BUG-004: Dashboard Payday Data Swap on First Load ✅

**Story**: As a user opening the app for the first time, I see a visual swap between household payday (Day 25) and my actual payday, which is confusing and looks unpolished.

**Phase**: Phase 2 | **Priority**: P1 | **Time**: 2h | **Points**: 2 | **Status**: ✅ Completed (Feb 12, 2026)

**Issue**: Dashboard used fallback data with hardcoded payday 25 while loading, causing visible swap to actual payday

**Root Cause**: `budgetPeriod` fallback object with hardcoded values rendered before real data loaded

**Fixes Applied**:
- ✅ Removed hardcoded fallback with payday 25
- ✅ Updated loading state to wait for `budgetPeriod` data before rendering
- ✅ Added safety checks to all queries depending on `budgetPeriod`
- ✅ Added optional chaining to prevent errors when data is undefined

**Acceptance Criteria**:
- [x] Loading screen shows until real payday data loads
- [x] No visual swap or flicker when data loads
- [x] Dashboard displays correct payday immediately on first render
- [x] No errors when `budgetPeriod` is undefined

**Files Changed**: `src/app/(tabs)/index.tsx`

----

#### BUG-005: Settings Menu Progressive Loading ✅

**Story**: As a user navigating to Settings for the first time, I see menu items appear progressively (Payday → Invite Partner → Household Members), which looks unprofessional.

**Phase**: Phase 2 | **Priority**: P1 | **Time**: 1h | **Points**: 1 | **Status**: ✅ Completed (Feb 12, 2026)

**Issue**: Menu items rendered while `showSplitSettings` query was still loading, causing staggered appearance

**Root Cause**: Component rendered before all queries completed

**Fixes Applied**:
- ✅ Added loading state that waits for `showSplitSettings` query
- ✅ Display loading screen until all menu data is ready
- ✅ All menu items now appear simultaneously

**Acceptance Criteria**:
- [x] Loading screen shows while queries complete
- [x] All menu items appear at once (no progressive loading)
- [x] No gaps or jumps in menu layout

**Files Changed**: `src/app/(tabs)/settings.tsx`

----

#### BUG-006: Sign Out Button Inconsistent Design ✅

**Story**: As a user viewing the Settings screen, I see the sign out button doesn't match the design system (wrong padding, low opacity, amber text).

**Phase**: Phase 1 | **Priority**: P2 | **Time**: 0.5h | **Points**: 1 | **Status**: ✅ Completed (Feb 12, 2026)

**Issue**: Sign out button had inconsistent padding and text color

**Root Cause**: Button styling didn't follow design token patterns

**Fixes Applied**:
- ✅ Changed `paddingVertical: 14` to `padding: 16` for consistency
- ✅ Increased background opacity from 0.15 to 0.2 (more visible)
- ✅ Increased border opacity from 0.3 to 0.4 (more defined)
- ✅ Changed text and icon color from soft amber to white

**Acceptance Criteria**:
- [x] Button has proper full padding matching other elements
- [x] Text is white (not amber) for better readability
- [x] Icon is white (not amber)
- [x] Background/border use soft amber to indicate destructive action

**Files Changed**: `src/app/(tabs)/settings.tsx`

----

#### BUG-007: File Naming Clarity ✅

**Story**: As a developer, I see generic file names like `two.tsx` that don't indicate their purpose, which makes navigation and maintenance difficult.

**Phase**: Phase 1 | **Priority**: P2 | **Time**: 0.5h | **Points**: 1 | **Status**: ✅ Completed (Feb 12, 2026)

**Issue**: Settings tab screen named `two.tsx` instead of descriptive name

**Root Cause**: Default Expo Router naming not updated to be descriptive

**Fixes Applied**:
- ✅ Renamed `src/app/(tabs)/two.tsx` → `src/app/(tabs)/settings.tsx`
- ✅ Updated tab layout to reference new file name
- ✅ Removed unused `import.tsx` file from settings folder

**Acceptance Criteria**:
- [x] Settings tab file has descriptive name
- [x] Tab navigation still works correctly
- [x] No unused files in codebase

**Files Changed**:
- Renamed: `src/app/(tabs)/two.tsx` → `src/app/(tabs)/settings.tsx`
- Updated: `src/app/(tabs)/_layout.tsx`
- Deleted: `src/app/settings/import.tsx`
- [ ] Performance: No degradation from refactor

**Dependencies**: TECH-001 (GlassCard Component)

---

#### BUG-004: Swipe Gesture Implementation ✏️

**Story**: As a user, I swipe to delete a transaction, but the gesture feels unresponsive or doesn't work consistently.

**Phase**: Phase 1 | **Priority**: P1 | **Time**: 3h | **Points**: 3 | **Status**: ✏️ Enhancement Needed

**Issue**: Swipe-to-delete gesture implementation needs improvement

**Expected Behavior**:
- Smooth swipe gesture (iOS native feel)
- Delete button appears after swipe
- Confirmation before deletion

**Actual Behavior**:
- Gesture sometimes doesn't register
- Delete button appears inconsistently

**Acceptance Criteria**:
- [ ] Swipe gesture uses React Native Gesture Handler
- [ ] Swipe threshold: 60pt (reveals delete button)
- [ ] Delete button shows with smooth animation
- [ ] Confirmation modal appears on delete tap
- [ ] Tested on various swipe speeds (fast and slow)

**Dependencies**: US-020 (Delete Transaction)

---

### Medium Priority Bugs (P2 - Fix Next Sprint)

---

#### BUG-005: TypeScript Property Mismatch Errors ✏️

**Story**: As a developer, I see TypeScript errors about property mismatches between InstantDB types and component props, which slows development.

**Phase**: Phase 1 / Phase 2 | **Priority**: P2 | **Time**: 5h | **Points**: 5 | **Status**: ✏️ Technical Debt

**Issue**: InstantDB schema types don't align perfectly with component interfaces

**Current Workaround**: Type assertions (`as Transaction`)

**Long-Term Fix**: Align InstantDB schema types with component interfaces

**Acceptance Criteria**:
- [ ] Create shared type definitions in `/src/types/models.ts`
- [ ] InstantDB schema uses same types
- [ ] Component props use same types
- [ ] No type assertions needed (`as Transaction`)
- [ ] TypeScript strict mode with zero errors

**Dependencies**: All components using InstantDB

---

---

## Story Prioritization & Estimation

### Phase 1 Priority Matrix

| Story ID | Title | Priority | Points | Status | Sprint |
|----------|-------|----------|--------|--------|--------|
| US-001 | Sign Up | P0 | 3 | ✅ Complete | - |
| US-002 | Log In | P0 | 2 | ✅ Complete | - |
| US-003 | Reset Password | P0 | 2 | ✅ Complete | - |
| US-004 | Create Household | P0 | 2 | ✅ Complete | - |
| US-009 | Add Wallet | P0 | 3 | ✅ Complete (Rename) | - |
| US-012 | View Wallet Balance | P0 | 2 | ✅ Complete (Rename) | - |
| US-013 | Select Currency | P0 | 2 | 🔜 Not Started | Sprint 1 |
| US-014 | Add Income | P0 | 3 | ✅ Complete | - |
| US-015 | Add Expense | P0 | 3 | ✅ Complete | - |
| US-017 | Manage Categories | P0 | 3 | ✅ Complete | - |
| US-024 | Set Payday | P0 | 3 | ✅ Complete | - |
| US-025 | Budget Period Reset | P0 | 3 | ✅ Complete | - |
| US-034 | Budget Allocation | P0 | 5 | ✅ Complete | - |
| US-036 | Weekly Needs Allowance | P0 | 3 | ✅ Complete | - |
| US-037 | Weekly Wants Allowance | P0 | 3 | ✅ Complete | - |
| US-051 | Dashboard Overview | P0 | 8 | ✅ Complete | - |
| BUG-002 | Recurring Calendar Bug | P1 | 2 | 🐛 Fix Needed | Sprint 1 |
| US-007 | Remove Member | P1 | 3 | 🔜 Not Started | Sprint 1 |
| US-008 | Leave Household | P1 | 3 | 🔜 Not Started | Sprint 1 |
| US-011 | Delete Wallet | P2 | 2 | 🔜 Not Started | Sprint 2 |

**Phase 1 Remaining**: ~19 hours (~3-4 sprints)

---

### Phase 2 Priority Matrix

| Story ID | Title | Priority | Points | Status | Sprint | Dependencies |
|----------|-------|----------|--------|--------|--------|--------------|
| BUG-001 | Settlement Bug | P0 | 3 | 🐛 Critical | Sprint 3 | US-018, US-027 |
| US-061 | Income Detection Config | P0 | 3 | 🆕 New | Sprint 3 | US-024 |
| US-062 | Income Category Selection | P0 | 2 | 🆕 New | Sprint 3 | US-061, US-017 |
| US-063 | Income Auto-Detection | P0 | 5 | 🆕 New | Sprint 4 | US-061, US-062 |
| US-064 | Budget Snapshots | P0 | 5 | 🆕 New | Sprint 4 | US-024, US-034 |
| US-065 | Payday in Budget Screen | P0 | 3 | 🆕 New | Sprint 4 | US-024, US-064 |
| US-067 | Auto-Recalc Split Ratios | P0 | 3 | 🆕 New | Sprint 5 | US-027, US-063 |
| US-069 | Analytics History Integration | P0 | 3 | 🆕 New | Sprint 5 | US-064 |
| US-005 | Invite Member (UI) | P0 | 3 | 🚧 In Progress | Sprint 3 | US-004 |
| US-006 | Accept Invitation (UI) | P0 | 2 | 🚧 In Progress | Sprint 3 | US-005 |
| US-042 | Settlement Workflow | P0 | 3 | ✅ Complete | - | US-040 |
| US-066 | Bonus Handling | P1 | 5 | 🆕 New | Sprint 6 | US-063 |
| US-068 | Income Progress Widget | P1 | 2 | 🆕 New | Sprint 6 | US-061-063 |
| TECH-001 | GlassCard Component | P1 | 5 | 🆕 New | Sprint 3 | None |
| TECH-003 | ErrorBoundary | P1 | 3 | 🆕 New | Sprint 4 | None |
| TECH-004 | App Launch Optimization | P0 | 8 | 🆕 New | Sprint 5 | None |
| UX-007 | VoiceOver Support | P1 | 8 | 🆕 New | Sprint 6 | All UI |

**Phase 2 Total**: ~54 hours (~7-9 sprints)

---

### Sprint Planning Guidance

#### Sprint 1 (Week 1-2): Complete Phase 1
**Goal**: Finish remaining Phase 1 stories + critical bug fixes
- US-013: Select Currency (2h)
- US-007: Remove Member (3h)
- US-008: Leave Household (3h)
- BUG-002: Recurring Calendar Bug (2h)
- UI Rename: "Account" → "Wallet" (2h)
- **Total**: 12h

#### Sprint 2 (Week 3-4): Phase 1 Polish
**Goal**: Testing, optimization, polish
- US-011: Delete Wallet (2h)
- US-046-048-050: Import/Export Testing (4h)
- TECH-002: LoadingScreen Component (2h)
- BUG-003: Color Consistency (3h)
- BUG-004: Swipe Gesture (3h)
- **Total**: 14h

#### Sprint 3 (Week 5-6): Phase 2 Foundation
**Goal**: Income detection + household UI + critical bug fix
- BUG-001: Settlement Bug (3h) **← Critical**
- US-061: Income Detection Config (3h)
- US-062: Income Category Selection (2h)
- US-005: Invite Member UI (3h)
- US-006: Accept Invitation UI (2h)
- TECH-001: GlassCard Component (5h)
- **Total**: 18h

#### Sprint 4 (Week 7-8): Budget Intelligence
**Goal**: Auto-detection + snapshots + payday integration
- US-063: Income Auto-Detection (5h)
- US-064: Budget Snapshots (5h)
- US-065: Payday in Budget Screen (3h)
- TECH-003: ErrorBoundary (3h)
- **Total**: 16h

#### Sprint 5 (Week 9-10): Smart Features
**Goal**: Split ratios + analytics + performance
- US-067: Auto-Recalc Split Ratios (3h)
- US-069: Analytics History Integration (3h)
- TECH-004: App Launch Optimization (8h)
- **Total**: 14h

#### Sprint 6 (Week 11-12): Polish & Accessibility
**Goal**: Bonus handling + UX enhancements + accessibility
- US-066: Bonus Handling (5h)
- US-068: Income Progress Widget (2h)
- UX-007: VoiceOver Support (8h)
- UX-008: Color Contrast Compliance (3h)
- UX-009: Touch Target Size (3h)
- **Total**: 21h

---

## Acceptance Testing Guidelines

### Testing Methodology

For each user story, follow this testing process:

1. **Manual Testing**: Follow step-by-step user flow
2. **Automated Testing**: Verify unit/integration tests pass
3. **Performance Verification**: Check benchmarks are met
4. **Visual QA**: Compare to design mockups
5. **Accessibility Checks**: VoiceOver, contrast, touch targets

---

### Example: Acceptance Testing for US-061 (Income Detection Config)

**Manual Testing Steps**:
1. Navigate to Settings → Income Detection
2. Verify toggle shows "Manual Entry" (default)
3. Switch to "Auto-Detect" mode
4. Verify grace period slider appears (default: 3 days)
5. Adjust grace period to 5 days
6. Save settings
7. Navigate to Budget screen
8. Verify income detection runs (if transactions exist)
9. Add income transaction
10. Verify detected income updates immediately

**Automated Tests Required**:
- [ ] Unit test: `incomeDetectionMode` saves to user settings
- [ ] Unit test: Switching modes triggers budget recalculation
- [ ] Integration test: Auto-detect mode calculates income correctly
- [ ] Integration test: Grace period applies to transaction dates

**Performance Verification**:
- [ ] Settings save completes in <500ms
- [ ] Budget recalculation completes in <100ms
- [ ] UI updates optimistically (no loading spinner)

**Visual QA**:
- [ ] Toggle matches Flow design system (GlassCard)
- [ ] Grace period slider uses Sage Green accent
- [ ] Layout matches design mockup

**Accessibility Checks**:
- [ ] Toggle has `accessibilityLabel`: "Income Detection Mode"
- [ ] VoiceOver announces state: "Manual Entry, selected"
- [ ] Grace period slider accessible with VoiceOver
- [ ] Touch targets minimum 44x44pt

---

### Critical Flow Testing Checklist

#### Flow 1: Create Budget → Add Transaction → View Budget Status

**Steps**:
1. New user completes onboarding, sets payday (25th)
2. User creates budget: CHF 5'000 income, 50/30/20 allocation
3. User adds expense: CHF 45 Groceries (Needs category)
4. Navigate to Dashboard
5. Verify budget status updates

**Pass Criteria**:
- [ ] Budget period: Jan 25 - Feb 24 (correct dates)
- [ ] Groceries allocated: CHF 2'500 (50% of income)
- [ ] Groceries spent: CHF 45
- [ ] Groceries remaining: CHF 2'455
- [ ] Weekly allowance updates (Needs allowance decreased by CHF 45)
- [ ] Budget progress bar shows 1.8% spent
- [ ] Dashboard updates in real-time (<500ms)

---

#### Flow 2: Set Up Household → Add Shared Expense → Settle Up

**Steps**:
1. User A invites User B to household (email)
2. User B accepts invitation
3. User A sets split ratio: 60/40
4. User A adds shared expense: CHF 100 Groceries
5. User B views "Settle Up" screen
6. User B marks as settled
7. Verify balance updates

**Pass Criteria**:
- [ ] User B receives invitation email
- [ ] User B joins household successfully
- [ ] Split ratio saved: 60/40
- [ ] Shared expense creates ExpenseSplit: User A pays CHF 60, User B owes CHF 40
- [ ] User B "Settle Up" shows: "You owe User A: CHF 40"
- [ ] Settlement creates record with timestamp
- [ ] Balance updates to CHF 0 after settlement
- [ ] Both users see settlement in history

---

#### Flow 3: Create Recurring Template → Activate for Period

**Steps**:
1. User creates recurring template: Rent, CHF 1'200, Monthly
2. Navigate to Transactions screen
3. Verify template appears in "Upcoming" section
4. Tap template to activate
5. Verify transaction created

**Pass Criteria**:
- [ ] Template saved with frequency: Monthly
- [ ] "Upcoming" section shows template
- [ ] Tapping template opens confirmation: "Activate Rent (CHF 1'200) for this period?"
- [ ] Transaction created with correct date (today)
- [ ] Budget updates (Needs spending increases by CHF 1'200)
- [ ] Template remains in "Upcoming" for next period

---

#### Flow 4: Edit Transaction → Change to Shared → Verify Split

**Steps**:
1. User creates personal transaction: CHF 80 Dining Out
2. Edit transaction
3. Toggle "Shared Expense" to ON
4. Save
5. Verify split created
6. Navigate to "Settle Up"
7. Verify balance updated

**Pass Criteria**:
- [ ] Transaction edits successfully
- [ ] "Shared" toggle changes from OFF to ON
- [ ] Split calculation runs: 60/40 = CHF 48 / CHF 32
- [ ] ExpenseSplit created for household member (CHF 32 owed)
- [ ] "Settle Up" shows updated balance
- [ ] Transaction detail shows "Shared" indicator
- [ ] Household member sees transaction in their list

---

---

## Removed & Deferred Stories

### Removed Stories (9 Total)

These stories were removed from scope due to redundancy or complexity.

| US# | Story | Reason for Removal |
|-----|-------|-------------------|
| US-005a | Shareable Categories | Transaction-based sharing is simpler and more flexible |
| US-022 | Refunds | Defer to Phase 4 (relevant when connecting banks for auto-import) |
| US-023 | Pending Approval | Trust model sufficient for Phase 2 household sharing |
| US-029 | Category Split Overrides | Done at transaction level (US-030) - category-level unnecessary |
| US-035 | Shared Budgets | Transaction-based sharing simpler than separate shared budget |
| US-041 | Itemized Breakdown | Redundant with transaction list filtering |
| US-043 | Mark as Settled | Merged into US-040 and US-042 |
| US-044 | Settlement History | Available in transaction list with filters |
| US-045 | YNAB Import | Too complex, CSV import (US-046) sufficient |

---

### Deferred Stories (Phase 3+)

These stories are postponed to future phases.

| US# | Story | Deferred To | Reason |
|-----|-------|-------------|--------|
| US-047 | Category Mapping (advanced) | Phase 3 | CSV import enhancement, not critical for Phase 2 |
| US-060 | Email Reports | Phase 3 | Nice-to-have, focus on core features first |
| US-070-073 | Swiss Open Banking | Phase 3-4 | Strategic advantage, requires regulatory research |

---

### Future Considerations (Not Yet Scoped)

Features discussed but not yet fully scoped:

- **Pay Frequency Expansion**: Bi-weekly, weekly, bi-monthly payday support (currently monthly only)
- **Multi-Currency Support**: Handle multiple currencies within one household (EUR + CHF)
- **3+ Household Members**: Expand beyond 2-person households (Phase 5+)
- **Budget Templates**: Pre-built budget templates for common scenarios (Student, Freelancer, Family)
- **Savings Goals**: Track specific savings goals (Emergency Fund, Vacation, House Down Payment)
- **Tax Categorization**: Swiss tax-deductible expense tracking (Pillar 3a, work expenses)

---

---

## Summary Statistics

### Overall User Story Metrics

- **Total Active Stories**: 60 (original) - 9 (removed) + 9 (new Phase 2) = **60 active stories**
- **Phase 1 Status**: 28 completed, 1 bug, 4 not started, 3 needs testing = **85% complete**
- **Phase 2 Status**: 5 completed, 9 new, 2 enhancements needed = **In Progress**
- **Technical Stories**: 9 new infrastructure/testing stories
- **UX Stories**: 9 new accessibility/empathetic design stories
- **Bug Fixes**: 5 identified (2 critical, 2 high, 1 medium)

### Time Estimates

| Phase | Original Estimate | Actual Remaining | Status |
|-------|------------------|------------------|--------|
| Phase 1 | 120-150h | ~19h | 85% Complete |
| Phase 2 | 60-80h | ~54h | Just Beginning |
| Technical | - | ~38h | New Stories |
| UX | - | ~21h | New Stories |
| **Total** | **180-230h** | **~132h remaining** | **~40% Complete Overall** |

### Sprint Velocity Projection

- **Average Sprint Capacity**: 15-20h (assuming 2-week sprints, 1.5-2h/day commitment)
- **Remaining Work**: ~132h
- **Projected Timeline**: 7-9 sprints (14-18 weeks)
- **Estimated Completion**: Mid-May 2026 (Phase 2 complete)

---

**Document Version**: 2.0  
**Last Updated**: February 8, 2026  
**Next Review**: After Sprint 3 completion (March 2026)  
**Maintained By**: Alexander (Flow Founder & Lead Developer)

---

*This document contains all active user stories for Flow development. Stories are organized by phase, prioritized, estimated, and tracked. Use this as the single source of truth for sprint planning and development tasks..*
