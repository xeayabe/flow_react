# Flow - Budget Tracker Application

A beautiful iOS mobile app for calm financial control. Track expenses with your household using a premium, minimalist design.

## Features

### Welcome Experience
- ✅ Premium welcome screen with Flow branding
- ✅ Smooth animations with flowing water droplets forming currency symbols
- ✅ Deep teal and sage green aesthetic
- ✅ Material Design 3 filled button with elegant interactions

### Authentication
- ✅ **Fully passwordless authentication** - no passwords to remember!
- ✅ Email magic code signup and login via InstantDB
- ✅ Email verification required (6-digit codes)
- ✅ **Biometric quick-login** for returning users (Face ID/Touch ID)
- ✅ **Rate limiting** (5 attempts/minute, 15-min lockout)
- ✅ **Secure credential storage** using Expo SecureStore
- ✅ Profile check on login to prevent unauthorized access
- ✅ Auto-login after signup
- ✅ Protected routes with auth guards
- ✅ Material Design 3 forms with floating labels
- ✅ Empathetic error design with calming colors (no harsh reds)
- ✅ Real-time validation with supportive feedback
- ✅ Celebratory success modal with confetti animation
- ✅ Smooth onboarding experience with professional animations

### User Management
- ✅ User profiles with email and name
- ✅ Default household creation on signup
- ✅ Automatic household member assignment

### Wallet Management
- ✅ **Add Multiple Wallets** - Track different bank accounts, cards, and cash
- ✅ **Wallet Types**: Checking, Savings, Credit Card, Cash, Investment
- ✅ **Major Institutions**: UBS, Credit Suisse, Revolut, PostFinance, Raiffeisen, Cash, Other
- ✅ **M3 Form with Floating Labels** - Beautiful Material Design 3 form
- ✅ **Character Counter** - Wallet name with 0-50 character counter
- ✅ **Modal Presentation** - Full-screen modal with draggable handle
- ✅ **Bottom Sheet Pickers**:
  - Institution picker: Bottom sheet with emoji icons, radio buttons, M3 styling
  - Wallet type picker: Bottom sheet with icons, radio buttons, smooth animations
  - Dimmed overlay with 30% black opacity
  - Spring animation with smooth slide-up motion
  - Header with "Select Institution" / "Select Wallet Type" title
- ✅ **Field Validation**:
  - Wallet name: 2-50 characters, must be unique per user
  - Institution: Required dropdown selection
  - Wallet type: Required dropdown selection
  - Starting balance: Must be valid number (positive or negative)
  - Card/Account number: Optional 4-digit field with placeholder
- ✅ **Default Wallet Logic**:
  - First wallet automatically set as default (disabled checkbox)
  - Only one default wallet allowed per user
  - Auto-unset previous default when changing
- ✅ **Real-time Validation** - Input validation with empathetic error messages
- ✅ **Wallet Cards** - Beautiful cards showing institution, type, and balance
- ✅ **Default Badge** - "Default" badge with soft lavender background
- ✅ **Wallets List** - View all wallets with total balance card
- ✅ **Dashboard Integration** - Main dashboard shows real wallet data

### Categories System (US-017)
- ✅ **Default Categories** - Automatically created when household is created
  - Income Categories: Salary, Bonus, Freelance, Investment, Gift, Refund, Other Income
  - Expense Categories (Needs - 50%): Rent/Housing, Groceries, Utilities, Transportation, Health Insurance, Internet/Phone
  - Expense Categories (Wants - 30%): Dining Out, Entertainment, Shopping, Hobbies, Subscriptions, Vacations
  - Expense Categories (Savings - 20%): Emergency Fund, Investments, Savings Goals
  - Other: Other Expense
- ✅ **Categories Management Page** - Full CRUD for custom categories
  - View all categories organized by type and group
  - Create custom categories with name, type, group, icon (emoji), and color
  - Edit custom categories (name, icon, color only)
  - Delete custom categories (soft delete, with validation)
  - Default categories are read-only
- ✅ **Category Validation**:
  - Category name: 2-30 characters, unique per household (case-insensitive)
  - Type: Income or Expense (required)
  - Group: Needs/Wants/Savings/Other for expenses, auto Income for income (required for expenses)
  - Icon: Optional emoji picker
  - Color: Optional hex color code
- ✅ **Category Organization**:
  - Income categories section
  - Needs (50%) section
  - Wants (30%) section
  - Savings (20%) section
  - Other section
  - Default categories listed first, then custom categories, sorted alphabetically
- ✅ **Phase 1 Implementation**:
  - All categories personal to user (is_shareable = false)
  - No shared expense functionality yet

### Transaction System (US-014, US-018, & US-020)
- ✅ **Add Transaction Page** - Full form to track income and expenses
  - Type Toggle: Income/Expense with dynamic category filtering
  - Amount Input: Auto-formatting with currency symbol (CHF)
  - Category Dropdown: Grouped by Income/Needs/Wants/Savings/Other
  - Account Selection: Pre-selected default account with balance display
  - Date Input: Custom calendar chip picker with month navigation
  - Optional Note: Max 200 characters with character counter
  - Recurring Option: Monthly recurring with day selector
- ✅ **Edit Transaction Page (US-020)** - Edit existing transactions with smart balance adjustment
  - Pre-filled form with all existing transaction data
  - Complex balance calculations:
    * Reverse original transaction impact
    * Apply new transaction impact
    * Handle account changes (update both old and new accounts)
    * Handle type changes (income ↔ expense)
    * Handle amount changes with net adjustment
  - Transaction not found error handling
  - Access denied protection (only own transactions)
  - Delete button available on edit page
  - Success message and automatic redirect after update
- ✅ **Transaction Validation**:
  - Amount: Required, must be > 0, max 2 decimals
  - Category: Required, filtered by transaction type
  - Account: Required, shows current balance
  - Date: Required, cannot be future date, prevents future dates in calendar
  - Note: Optional, max 200 characters
- ✅ **Database Integration**:
  - Transactions stored with all metadata
  - Account balance automatically updated (income adds, expense subtracts)
  - Soft delete support with balance restoration
  - Edit updates balance correctly for all scenarios
- ✅ **User Experience**:
  - Success message after transaction creation
  - Confirmation modal asking if user wants to add another transaction
  - Quick entry: "Add Another" button resets form for fast successive entries
  - Exit option: "Done" button returns to previous screen (dashboard or transactions tab)
  - Auto-focus on amount field for quick re-entry
  - Custom date picker with calendar UI (no native date picker)
  - FAB button on Dashboard to add transactions
- ✅ **View & Filter Transactions (US-018)** - Complete transaction list with filtering
  - 4 Filter Types:
    - **Date Range**: This week, This month, Last month, Last 3 months, This year, All time
    - **Transaction Type**: All, Income only, Expense only
    - **Category Filter**: Multi-select specific categories or view all
    - **Account Filter**: Multi-select specific accounts or view all
  - **Summary Statistics**: Real-time income and expense calculations
    * Income card with TrendingUp icon and green M3 styling
    * Expenses card with TrendingDown icon and red M3 styling
    * Full-width vertical layout with circular icon backgrounds
  - **Grouped Display**: Transactions grouped by date (newest first) with Swiss date format
  - **Modal-Based Filters**: Each filter type opens in a modal for easy selection
  - **Clear Filters Button**: Reset all filters to view everything
  - **Transaction Interactions**:
    - **Tap** on transaction → Navigate to edit page
    - **Long-press** on transaction → Delete confirmation modal
  - **Empty States**: Helpful messages when no transactions match filters
  - **Two Access Points**:
    - Transactions Tab: Bottom navigation tab for quick access
    - Standalone Page: `/transactions` route for direct navigation
- ✅ **Phase 1 Implementation**:
  - Personal transactions only (is_shared = false)
  - No split/shared expenses yet
  - Basic recurring flag (full templates in Phase 2)

### Payday & Budget Period (US-024)
- ✅ **Set Monthly Payday** - Configure when user receives monthly income
  - Route: `/settings/payday` from Profile tab menu
  - Payday Day Selection: 1-31 or "Last day of month" option
  - Default payday: 25th (Swiss standard)
- ✅ **Budget Period Calculation**
  - Automatically calculates current budget period based on payday
  - If today ≥ payday: Period runs from payday of this month to (payday-1) of next month
  - If today < payday: Period runs from payday of last month to (payday-1) of this month
  - Special handling for "last day of month" option
  - Handles months with different day counts (28, 29, 30, 31)
- ✅ **Settings Page Features**
  - Shows current payday setting
  - Displays current budget period with dates
  - Shows days remaining in current period
  - Shows next reset date
  - Payday picker modal with all options
  - Save changes button with success message
- ✅ **Default Configuration**
  - Payday automatically set to 25th on household creation
  - Initial budget period calculated and stored
  - User can change payday anytime
- ✅ **Phase 1 Implementation**:
  - Monthly payday only
  - Single payday per household
  - Automatic period calculation on payday change
  - Stored in households table

### Zero-Based Budget Allocation (US-034)
- ✅ **Budget Setup** - Allocate 100% of monthly income across categories
  - Route: `/budget/setup` from navigation
  - Monthly income input with CHF formatting
  - Category allocation with dual CHF/percentage inputs
  - Real-time sync between amount and percentage
  - Grouped by 50/30/20 framework (Needs/Wants/Savings)
- ✅ **Budget Features**
  - Auto-Balance button distributes remaining amount proportionally
  - 50/30/20 Quick Split button applies framework allocation
  - Validation ensures exactly 100% allocation (99.99%-100.01% tolerance)
  - Budget period automatically set from payday settings
- ✅ **Budget Overview** - Track spending against budget
  - Route: `/budget` shows allocated vs spent
  - Overall progress with visual progress bar
  - 50/30/20 summary cards with spent percentages
  - Category breakdown with status indicators
  - Edit Budget button to modify allocations
- ✅ **Real-Time Spent Tracking**
  - Creating expense transactions updates budget spent amounts
  - Editing transactions updates spent amounts (handles category/amount changes)
  - Deleting transactions decreases spent amounts
  - Budget period awareness (only tracks within current period)
- ✅ **Color Coding**
  - Green (on-track): 0-80% spent
  - Yellow (warning): 80-95% spent
  - Orange/Red (over-budget): >95% spent
- ✅ **Phase 1 Implementation**:
  - Personal budgets only
  - Monthly periods based on payday
  - Simple allocation interface
  - Basic tracking (allocated vs spent)

### Database Schema (InstantDB)

#### Users
- `id`: UUID (primary key)
- `email`: String (unique)
- `name`: String
- `emailVerified`: Boolean (default: true after magic code verification)
- `isActive`: Boolean (default: true)
- `createdAt`: Timestamp

#### Households
- `id`: UUID (primary key)
- `name`: String
- `currency`: String (default: "CHF")
- `createdByUserId`: UUID (foreign key to Users)
- `paydayDay`: Number (1-31, or -1 for last day of month) (default: 25)
- `payFrequency`: String (default: "monthly", Phase 1 only)
- `budgetPeriodStart`: String (ISO format YYYY-MM-DD, calculated based on payday)
- `budgetPeriodEnd`: String (ISO format YYYY-MM-DD, calculated based on payday)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### HouseholdMembers
- `id`: UUID (primary key)
- `householdId`: UUID (foreign key to Households)
- `userId`: UUID (foreign key to Users)
- `role`: String ("admin" | "member")
- `status`: String ("active" | "invited" | "removed")
- `joinedAt`: Timestamp

#### Wallets (formerly Accounts)
- `id`: UUID (primary key)
- `userId`: UUID (foreign key to Users)
- `householdId`: UUID (foreign key to Households)
- `name`: String (unique per user)
- `institution`: String ("UBS" | "Credit Suisse" | "Revolut" | "PostFinance" | "Raiffeisen" | "Cash" | "Other")
- `accountType`: String ("Checking" | "Savings" | "Credit Card" | "Cash" | "Investment")
- `balance`: Number (current balance in CHF)
- `startingBalance`: Number (initial balance when wallet created)
- `currency`: String (default: "CHF")
- `last4Digits`: String (optional, last 4 digits of card/account number)
- `isDefault`: Boolean (default: true for first wallet)
- `isActive`: Boolean (default: true)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### Categories
- `id`: UUID (primary key)
- `householdId`: UUID (foreign key to Households)
- `name`: String (unique per household, case-insensitive)
- `type`: String ("income" | "expense")
- `categoryGroup`: String ("income" | "needs" | "wants" | "savings" | "other")
- `isShareable`: Boolean (default: false for Phase 1)
- `isDefault`: Boolean (true for system categories, false for user-created)
- `createdByUserId`: UUID (optional, references Users.id for user-created categories)
- `icon`: String (optional, emoji or icon name)
- `color`: String (optional, hex color code)
- `isActive`: Boolean (default: true, false for soft-deleted categories)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### Transactions
- `id`: UUID (primary key)
- `userId`: UUID (foreign key to Users)
- `householdId`: UUID (foreign key to Households)
- `accountId`: UUID (foreign key to Accounts)
- `categoryId`: UUID (foreign key to Categories)
- `type`: String ("income" | "expense")
- `amount`: Number (always positive)
- `date`: String (ISO format YYYY-MM-DD)
- `note`: String (optional, max 200 chars)
- `isShared`: Boolean (default: false for Phase 1)
- `paidByUserId`: UUID (optional, for Phase 2 shared expenses)
- `isRecurring`: Boolean (default: false)
- `recurringDay`: Number (1-31, optional, for monthly recurring)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### Budgets
- `id`: UUID (primary key)
- `userId`: UUID (foreign key to Users)
- `householdId`: UUID (foreign key to Households)
- `categoryId`: UUID (foreign key to Categories)
- `periodStart`: String (ISO format YYYY-MM-DD)
- `periodEnd`: String (ISO format YYYY-MM-DD)
- `allocatedAmount`: Number (budget amount in CHF)
- `spentAmount`: Number (sum of transactions in this category for period)
- `percentage`: Number (allocatedAmount / totalIncome * 100)
- `categoryGroup`: String ("needs" | "wants" | "savings" | "other")
- `isActive`: Boolean (default: true)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### BudgetSummary
- `id`: UUID (primary key)
- `userId`: UUID (foreign key to Users)
- `householdId`: UUID (foreign key to Households)
- `periodStart`: String (ISO format YYYY-MM-DD)
- `periodEnd`: String (ISO format YYYY-MM-DD)
- `totalIncome`: Number (monthly income set by user)
- `totalAllocated`: Number (sum of all budget allocations)
- `totalSpent`: Number (sum of all spent amounts)
- `needsAllocated`: Number (sum of needs category budgets)
- `wantsAllocated`: Number (sum of wants category budgets)
- `savingsAllocated`: Number (sum of savings category budgets)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

## Tech Stack

- **Frontend**: Expo SDK 53, React Native 0.76.7
- **Database**: InstantDB (real-time database)
- **Styling**: NativeWind + TailwindCSS v3
- **State Management**: React Query + Zustand
- **Authentication**: Passwordless magic code authentication via InstantDB
- **Biometric Auth**: Expo Local Authentication (Face ID/Touch ID)
- **Secure Storage**: Expo SecureStore for biometric credentials
- **Security**: Email verification, profile validation, rate limiting, lockout protection

## Project Structure

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigator
│   │   ├── index.tsx         # Dashboard screen with wallets
│   │   └── two.tsx           # Profile screen with settings menu
│   ├── accounts/
│   │   ├── add.tsx           # Add Wallet modal (Material Design 3)
│   │   └── index.tsx         # Wallets list screen
│   ├── budget/
│   │   ├── setup.tsx         # Budget allocation setup page (US-034)
│   │   └── index.tsx         # Budget overview & tracking page (US-034)
│   ├── settings/
│   │   ├── payday.tsx           # Payday & Budget Period settings page (US-024)
│   │   └── categories.tsx       # Categories management page
│   ├── _layout.tsx           # Root layout with auth routing
│   ├── welcome.tsx           # Welcome screen (first screen)
│   ├── signup.tsx            # Passwordless signup screen
│   └── login.tsx             # Passwordless login with biometric quick-login
├── lib/
│   ├── db.ts                 # InstantDB configuration & schema
│   ├── auth-api.ts           # Auth API with rate limiting & lockout
│   ├── accounts-api.ts       # Account management API
│   ├── categories-api.ts     # Categories management API
│   ├── transactions-api.ts   # Transactions management API
│   ├── budget-api.ts         # Budget management API (US-034)
│   ├── budget-utils.ts       # Budget calculation utilities (US-034)
│   ├── payday-utils.ts       # Payday calculation & budget period utilities
│   ├── biometric-auth.ts     # Biometric authentication utilities
│   └── cn.ts                 # Utility for className merging
└── components/
    ├── Themed.tsx            # Themed components
    ├── SuccessModal.tsx      # Success celebration modal
    ├── InstitutionPicker.tsx  # Institution selection bottom sheet
    └── AccountTypePicker.tsx  # Wallet type selection bottom sheet
```

## Authentication Flow

Flow uses a **fully passwordless** authentication system with optional biometric quick-login for enhanced security and convenience.

1. **Welcome Screen**:
   - Beautiful first impression with Flow branding
   - Animated water droplets forming currency symbols
   - Single "Get Started" button to begin signup flow
   - "Already have an account? Log in" link for returning users
   - Automatic redirect to dashboard if already logged in

2. **Signup** (Passwordless):
   - User fills signup form with:
     - Full name
     - Email address
     - **No password required!**
   - Validation rules enforced:
     - Email must be valid format
     - Email must not already be registered
     - Name minimum 2 characters
   - Info message explains: "No password needed! We'll send a secure verification code to your email."
   - Magic code sent to email via InstantDB
   - User enters 6-digit verification code
   - Upon verification:
     - User profile created in database
     - Default household created automatically
     - HouseholdMember record created linking user to household
     - User auto-logged in
     - Success modal with confetti animation
   - Redirect to dashboard

3. **Login** (Passwordless + Biometric):
   - **Biometric Quick-Login** (if enabled):
     - Button shown: "Log in with Face ID" or "Log in with Touch ID"
     - Tapping button triggers biometric authentication
     - Upon successful biometric auth: Email auto-filled and magic code sent
     - User still verifies with 6-digit code (hybrid security)
   - **Standard Email Login**:
     - User enters email only
     - System checks if user profile exists in database:
       - If no profile: Show error "No account found with this email. Please sign up first."
       - If profile exists AND not rate-limited: Send magic code to email via InstantDB
       - If rate-limited: Show error "Too many attempts. Please try again in X minutes"
     - User enters 6-digit verification code
     - Upon successful verification:
       - If biometric available and not enabled: Prompt to enable Face ID/Touch ID
       - User logged in → redirect to dashboard
   - **Important**: Users CANNOT receive a login code unless they have already signed up
   - **Security**: Passwordless authentication only - no passwords collected or validated

4. **Biometric Setup** (Optional Enhancement):
   - After first successful login on device with Face ID/Touch ID
   - App shows prompt: "Enable [Face ID/Touch ID]?"
   - User can enable for faster future logins or skip ("Maybe Later")
   - If enabled:
     - Email securely stored in Expo SecureStore
     - Only accessible after successful biometric authentication
     - Quick-login button appears on login screen
   - Can be disabled anytime from settings

5. **Auth Guards**:
   - Unauthenticated users redirected to signup
   - Authenticated users redirected to dashboard
   - Auth state managed by InstantDB SDK

## Key Security Features

- **Fully Passwordless Authentication**: Uses InstantDB Magic Codes - more secure than passwords
- **No Password Storage**: No passwords stored in database or transmitted anywhere
- **Email Verification Required**: Users must verify email with 6-digit code to authenticate
- **Profile Check on Login**: Ensures only registered users can receive login codes
- **Duplicate Email Prevention**: Checks for existing accounts during signup
- **Rate Limiting**: Maximum 5 failed attempts per minute per email
- **Automatic Lockout**: 15-minute lockout after exceeding rate limit
- **Biometric Security**:
  - Face ID/Touch ID optional for returning users
  - Email securely stored in Expo SecureStore
  - Only accessible after successful biometric authentication
  - Hybrid approach: Biometric auth + magic code verification
- **Session Management**: InstantDB handles secure session tokens
- **No Client-Side Secrets**: All sensitive operations server-side via InstantDB

## Environment Variables

```
EXPO_PUBLIC_INSTANTDB_APP_ID=your-app-id
INSTANTDB_ADMIN_TOKEN=your-admin-token
```

## Running the App

```bash
bun start
```

## Navigation Guide

### Main Navigation Flow

1. **Dashboard** (`/` or `/(tabs)/index`)
   - Main app screen showing all wallets
   - View all transactions link
   - FAB button to add new transaction
   - Bottom tab navigation with three tabs

2. **Transactions Tab** (`/(tabs)/transactions`)
   - View all transactions with powerful filtering system
   - Filter by: Date range, Type (income/expense), Category, Account
   - Summary statistics showing income and expense for current filters
   - Transactions grouped by date with Swiss date format (DD.MM.YYYY)
   - Transaction details: type icon, amount, category, account
   - **Tap on transaction** → Edit transaction page
   - **Long-press on transaction** → Delete confirmation modal
   - Empty state with quick-add option
   - Real-time updates when tab comes into focus

3. **Profile** (`/(tabs)/two`)
   - User profile section with avatar and email
   - Settings menu with items:
     - **Wallets** → `/accounts` - Manage bank accounts and wallets
     - **Categories** → `/settings/categories` - Organize income/expense categories
     - **Profile** → Coming soon
   - Sign Out button at bottom

4. **Categories Management** (`/settings/categories`)
   - View all categories organized by type (Income, Needs, Wants, Savings, Other)
   - Add new category button (+) in top-right
   - Click category to edit (custom categories only)
   - Delete custom categories (default categories are read-only)
   - Back button returns to Profile tab

5. **Add Transaction** (`/transactions/add`)
   - Full form to log income and expenses
   - Type toggle with dynamic category filtering
   - Amount input with auto-formatting
   - Category and account selection with modals
   - **Custom date picker** with calendar UI
     - Month/year header with navigation arrows
     - Day labels (Sun-Sat) with calendar grid
     - Today highlighted with border, selected date with teal background
     - Prevents selection of future dates
     - Done/Cancel buttons to confirm selection
   - Optional note with character counter
   - Monthly recurring transaction option
   - Real-time validation with error messages
   - Success feedback with form reset

### Quick Access Paths

| Screen | Route | How to Access |
|--------|-------|---------------|
| Dashboard | `/` | App default/home (first tab) |
| Transactions | `/(tabs)/transactions` | Click "Transactions" tab at bottom |
| Profile | `/(tabs)/two` | Click "Profile" tab at bottom |
| Categories | `/settings/categories` | Profile tab > Categories |
| Wallets | `/accounts` | Profile tab > Wallets |
| Add Transaction | `/transactions/add` | FAB on Dashboard or Transactions tab |

## Design Principles

- **Premium iOS Design**: Follows Apple's Human Interface Guidelines
- **Calm & Empathetic**: Deep teal (#006A6A) and sage green color palette
- **Material Design 3**: Modern rounded corners, subtle shadows, and smooth interactions
- **Mobile-first**: Designed specifically for iOS with touch-optimized interactions
- **Generous Whitespace**: Clean, uncluttered layouts that breathe
- **Smooth Animations**: React Native Reanimated for fluid, delightful micro-interactions
- **Accessible**: Proper form labels, error messages, and keyboard handling

## Next Steps

- [ ] Implement recurring transaction templates (Phase 2)
- [ ] Create transaction search functionality
- [ ] Build settlement/splitting logic for shared expenses (Phase 2)
- [ ] Add notifications for recurring transactions
- [ ] Implement household member invitations
- [ ] Add receipt attachment to transactions
- [ ] Create expense reports and analytics
- [ ] Phase 2: Implement shareable transactions for household splitting
- [ ] Phase 2: Add transaction edit history/audit log
