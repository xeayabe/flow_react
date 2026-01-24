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

### Invite Partner (US-005)
- ✅ **6-Digit Invite Code System** - Generate shareable codes instead of links
  - Codes are 6 characters (uppercase alphanumeric, excluding confusing chars: I, 1, O, 0)
  - Codes expire after 5 minutes
  - Live countdown timer displays remaining time
  - Progress bar shows expiration visually
- ✅ **Admin-Only Invitations** - Only household admin can generate invite codes
  - "Invite Partner" option only visible to admin users
  - Members see explanatory message: "Only the household admin can invite new members"
  - Role-based access control with comprehensive logging
- ✅ **Welcome Screen Integration** - Seamless code entry for new users
  - "Have an invite code?" toggle on welcome screen
  - Text input with auto-uppercase and 6-character limit
  - Code validation before signup navigation
  - Keyboard avoidance prevents overlapping UI
- ✅ **Copy-on-Tap Functionality** - Easy code sharing
  - Tap the large code display to copy to clipboard
  - Confirmation alert provides user feedback
  - Works across mobile and web platforms
- ✅ **Member Role Assignment** - Invited users get "member" role
  - Invited users are added as "member" to the household
  - Only the inviting user maintains "admin" role
  - Role assignment validated with detailed logging
- ✅ **Invite Preview** - New users see who invited them
  - Shows inviter name and household on signup screen
  - Confirmation banner displays before account creation
- ✅ **UX Improvements**
  - Keyboard handling optimized with KeyboardAvoidingView
  - ScrollView allows input field visibility
  - Smooth animations and transitions
  - Material Design 3 consistent styling

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
- ✅ **Category Groups Management** (New) - Customize budget category groups
  - Route: `/settings/category-groups` from Profile tab menu
  - View all category groups (Needs, Wants, Savings, custom groups)
  - Rename default category groups (Needs, Wants, Savings, Income)
  - Create custom category groups with name and type (Expense or Income)
  - Delete custom category groups (with validation)
  - Cannot delete default groups (Needs, Wants, Savings, Income)
  - Groups are organized by type (Expense/Income sections)
  - Easy-to-use management UI with edit/delete buttons
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
  - Customizable category groups for flexible budget allocation

### Transaction System (US-014, US-018, & US-020)
- ✅ **Add Transaction Page** - Full form to track income and expenses
  - Type Toggle: Income/Expense with dynamic category filtering
  - Amount Input: Auto-formatting with currency symbol (CHF)
  - Category Dropdown: Grouped by Income/Needs/Wants/Savings/Other
  - Account Selection: Pre-selected default account with balance display
  - Date Input: Custom calendar chip picker with month navigation
    * Calendar auto-scrolls to view when opened
    * Single tap on date closes picker and updates form
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
  - Improved calendar date picker with proper 7-column grid layout
- ✅ **Transaction Validation**:
  - Amount: Required, must be > 0, max 2 decimals
  - Category: Required, filtered by transaction type
  - Account: Required, shows current balance
  - Date: Required, accepts past, present, or future dates (for planning ahead)
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
- ✅ **Category Group Allocation** (New) - Customize budget percentage distribution
  - Route: `/budget/category-group-allocation` - Primary budget setup screen
  - Allocate income across Needs, Wants, and Savings category groups
  - Flexible allocation: 50/30/20 framework OR custom percentages
  - Each category group must total exactly 100% of income
  - Dual input fields: CHF amount and percentage (auto-sync)
  - Quick action buttons:
    - 50/30/20 preset split
    - Equal split (33/33/33)
  - Real-time validation with error messages
  - Pass allocations to detailed category setup
- ✅ **Budget Setup** - Allocate category group budgets to individual categories
  - Route: `/budget/setup` from category group allocation screen
  - Monthly income input with CHF formatting
  - Category allocation with dual CHF/percentage inputs
  - Real-time sync between amount and percentage
  - Grouped by 50/30/20 framework (Needs/Wants/Savings)
  - Respects category group allocations from previous step
- ✅ **Budget Features**
  - Auto-Balance button distributes remaining amount proportionally
  - 50/30/20 Quick Split button applies framework allocation
  - Validation ensures exactly 100% allocation (99.99%-100.01% tolerance)
  - Budget period automatically set from payday settings
- ✅ **Budget Overview** - Track spending against budget
  - Route: `/budget` shows allocated vs spent
  - **Allocated**: Total amount you've assigned to categories
  - **Spent**: Actual expenses recorded in the current period
  - **Remaining**: Unallocated budget (Income - Allocated)
  - Overall progress with visual progress bar showing allocation percentage
  - 50/30/20 summary cards with spent percentages per group
  - Category breakdown with status indicators
  - Edit Budget button to modify allocations (goes to category group allocation first)
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
  - Category group allocation first, then category details

### Category Charts & Analytics (US-052)
- ✅ **Analytics Page** - Visual breakdown of spending by category
  - Route: `/analytics` accessible from Dashboard Budget Breakdown widget
  - Beautiful pie chart (donut style) showing category percentages
  - Horizontal bar chart for top categories comparison
  - View toggle: Pie only, Bar only, or Both charts
- ✅ **Date Range Filtering**
  - This Period (current budget period based on payday)
  - Last Period (previous budget period based on payday)
  - This Week (current week, Monday-today)
  - Last 3 Months (last 3 calendar months)
  - Last 6 Months (last 6 calendar months)
  - This Year (January 1 to today)
  - All Time (all transactions ever)
- ✅ **Type Filtering**
  - Expenses (default)
  - Income
- ✅ **Summary Statistics**
  - Total spending/income amount
  - Number of categories used
  - Average per category
  - Top category identification
- ✅ **Category Breakdown Table**
  - Category name with color indicator
  - Amount and percentage
  - Transaction count
  - Visual progress bar
  - Tap to view transactions for that category
- ✅ **Chart Features**
  - Animated chart rendering
  - Color coding by category group (Needs=Blue, Wants=Orange, Savings=Green)
  - Donut center shows total amount
  - Legend with category colors
- ✅ **Empty States**
  - No data message with call-to-action
  - Add Transaction button
- ✅ **Loading States**
  - Skeleton placeholders for charts
  - Shimmer animation

### Income vs Expenses Trend (US-053)
- ✅ **Trends Page** - Visualize financial health over time
  - Route: `/transactions/trends`
  - Monthly income vs expenses trend analysis
  - Dual-bar chart visualization (green=income, red=expenses)
  - Shows pattern recognition for seasonal spending
- ✅ **Summary Cards**
  - Average Monthly Income (in CHF, with label)
  - Average Monthly Expenses (in CHF, with label)
  - Average Monthly Savings (in CHF, net amount, color-coded)
  - Savings Rate (percentage with progress bar visualization)
- ✅ **Time Range Selection**
  - Last 3 Months
  - Last 6 Months
  - Last 12 Months
  - All Time
  - Quick toggle button to cycle through ranges
- ✅ **Monthly Breakdown Table**
  - Month and year
  - Income amount (green text)
  - Expenses amount (red text)
  - Net savings amount (color-coded, positive=teal, negative=red)
  - Monthly data sorted newest first
  - Precise numbers for verification
  - **Drill-Down**: Tap any row to view transactions for that budget period
    - Correctly filters by budget period dates (not calendar month)
    - Example: "25 Dec 2025 - 24 Jan 2026" shows transactions from Dec 25 to Jan 24
    - Works with any payday setting (1st, 25th, or custom)
- ✅ **Chart Features**
  - Animated chart rendering (FadeIn effect)
  - Proportional scaling to max value in range
  - Clean bar visualization for comparing months
  - Legend identifying income/expense colors
  - Month labels on X-axis
  - Responsive layout
- ✅ **Data Aggregation**
  - Accurate monthly income/expense totals
  - Savings calculation (income - expenses)
  - Savings rate percentage (net / income * 100)
  - Identifies best and worst months
  - Averages across selected time range
- ✅ **Empty States**
  - "Need more data" message when < 2 months available
  - Encourages users to continue tracking

### Import/Export (US-046, US-050)
- ✅ **CSV Import Wizard** - Multi-step process to import transactions
  - Step 1: File Upload - Pick CSV or Excel file from device
  - Step 2: Column Mapping - Auto-detect and manually map columns
  - Step 3: Preview - Review data before importing
  - Automatic category creation for new categories found in import
  - Validation with error reporting (invalid dates, missing amounts)
- ✅ **Supported Formats**
  - CSV (.csv) - Comma-separated values
  - Excel (.xlsx, .xls) - Excel spreadsheets
  - TSV (.tsv) - Tab-separated values (displays as .csv option)
- ✅ **Column Auto-Detection**
  - Automatically detects standard column names:
    - Date: date, datum, time, created, transaction date, trans date, booking date
    - Amount: amount, betrag, value, price, cost, sum, total, inflow, outflow, in, out
    - Type: type, typ, kind, transaction type, trans type, cleared
    - Category: category, kategorie, cat, group, classification, category group/category
    - Note: note, memo, description, desc, comment, remarks, payee, merchant
    - Account: account, konto, bank, wallet, source
    - Category Group: category group, categorygroup, cat group, catgroup, group
- ✅ **Dual-Column Format Support**
  - Handles CSV files with separate Inflow/Outflow columns
  - Auto-detection of transaction type based on column name
  - Users must import twice for dual-column format:
    1. First import with Inflow column → Creates income transactions
    2. Second import with Outflow column → Creates expense transactions
- ✅ **Category Group Mapping** (New)
  - Detects category groups in CSV data (e.g., "Needs", "Wants", "Savings", "Bedarf", "Sparen")
  - Multi-step import wizard with category group mapping step
  - Map CSV category groups to app budget groups (Needs/Wants/Savings/Other)
  - Automatically assigns correct category group when creating new categories
  - Skip category mapping step if no category groups detected
- ✅ **CSV Export** - Export transactions with filters
  - Filter by date range, type (income/expense/all), categories, accounts
  - Format selection (CSV or Excel)
  - Includes all transaction details
- ✅ **Data Validation**
  - Date format support: DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD, MM/DD/YYYY
  - Amount parsing: Handles CHF currency, thousands separators, decimals
  - Invalid rows shown in preview with specific error messages
  - Only valid rows are imported
- ✅ **BOM Handling** - Properly handles UTF-8 BOM character in CSV files
- ✅ **Web & Native Support** - Works on both web (browser) and native (iOS/Android)
  - Uses File API on web
  - Uses expo-file-system and expo-sharing on native

### Dashboard (US-051 - Comprehensive Overview)
- ✅ **Welcome Header** - Personalized greeting with user name, current date, and budget period
- ✅ **Total Balance Card** - Sum of all account balances with clickable link to accounts
- ✅ **This Month Spending Card** - Total expenses for current budget period with percentage
- ✅ **Budget Status Widget** - Comprehensive budget overview with:
  - Total spent vs allocated amount
  - Color-coded progress bar (Green/Yellow/Orange/Red)
  - Status indicators (On Track, Watch Spending, Approaching Limit, Over Budget)
  - Remaining budget amount
  - Period dates
- ✅ **Budget 50/30/20 Breakdown** - Visual progress bars for:
  - Needs (50%) - Housing, groceries, utilities, etc.
  - Wants (30%) - Dining, entertainment, shopping, etc.
  - Savings (20%) - Emergency fund, investments, goals
  - Each category shows spent vs allocated with percentage
- ✅ **Recent Transactions Widget** - Last 5 transactions with:
  - Category icons and colors
  - Transaction amounts (color-coded by type)
  - Relative dates (Today, Yesterday, X days ago)
  - Clickable to view/edit transaction
  - "View All" link to full transaction list
  - Empty state for new users
- ✅ **Accounts List Widget** - Display of 3-4 accounts with:
  - Account name and institution
  - Current balance (color-coded by sign)
  - Default account badge
  - Clickable to view account details
  - "View All" link if more than 4 accounts
  - Empty state with quick add button
- ✅ **Quick Actions Bar** - Three prominent buttons:
  - Add Expense (red)
  - Add Income (green)
  - Add Account (teal)
- ✅ **Skeleton Loaders** - Progressive data loading with:
  - Shimmer animation on placeholder cards
  - Staggered load sequence for visual appeal
  - Loading state for each widget
- ✅ **Empty States** - Helpful prompts for new users:
  - No budget → Prompt to create first budget
  - No accounts → Prompt to add first account
  - No transactions → Prompt to add first transaction
- ✅ **Real-Time Data Refresh** - Auto-refetch on tab focus
- ✅ **Data Aggregation** - Efficient parallel queries with React Query caching
- ✅ **Floating Action Button** - Smart context-aware FAB with automatic behavior:
  - **0 Wallets**: Opens Add Wallet screen directly (guides new users)
  - **Has Wallets**: Opens Add Transaction screen directly (most common action - 1 tap!)
  - **Long Press**: Shows menu with both Add Transaction and Add Wallet options
  - **Icon Menu**: Compact icon-only menu (💳 for transactions, 👛 for wallets)
- ✅ **Budget Reset Notification** - Celebratory banner when budget period resets

### Budget Reset on Payday (US-025)
- ✅ **Automatic Budget Reset** - Resets budget on payday without user intervention
  - Triggers when user loads app after budget period ends
  - Checks current date against household.budgetPeriodEnd
  - Automatically resets for any missed periods
- ✅ **Budget Period Calculation** - Correctly calculates new period based on payday:
  - If payday = 25th: Period runs 25th of current month to 24th of next month
  - If payday = 31st: Auto-adjusts for months with fewer days (Feb, April, etc.)
  - Handles "last day of month" payday configuration
- ✅ **Archive Old Budgets** - Archives previous period budgets (marks as inactive)
  - Preserves budget history for audit trail
  - Doesn't delete old data
- ✅ **Create New Budgets** - Creates fresh budgets for new period:
  - Copies allocation amounts from previous period
  - Resets spent amounts to 0
  - Creates new budget records with updated period dates
- ✅ **Update Budget Summary** - Updates summary with:
  - New period dates
  - Reset total spent to 0
  - Preserves income and allocation amounts
- ✅ **User Notification** - Shows celebratory banner:
  - Message: "🎉 New Budget Period Started!"
  - Subtext: "Your budget has been reset to zero"
  - Dismissible with close button
  - Auto-refreshes dashboard data after reset
- ✅ **Data Refetch** - Automatically refetches all dashboard data:
  - Budget summary
  - Accounts
  - Recent transactions
  - Updated progress bars show 0%
- ✅ **Error Handling** - Gracefully handles edge cases:
  - Missing household data
  - Multiple missed periods
  - Partial reset failures
  - Logs errors without blocking UI

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
- `paydayDay`: Number (1-31, or -1 for last day of month) - Personal payday
- `payFrequency`: String (default: "monthly")
- `budgetPeriodStart`: String (ISO format YYYY-MM-DD) - Personal budget period start
- `budgetPeriodEnd`: String (ISO format YYYY-MM-DD) - Personal budget period end
- `lastBudgetReset`: Number (timestamp of last budget reset)
- `monthlyIncome`: Number (for shared expense calculations)

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
│   ├── analytics/
│   │   ├── _layout.tsx       # Analytics stack layout
│   │   └── index.tsx         # Category charts & analytics page (US-052)
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
│   ├── budget-utils.ts           # Budget calculation utilities (US-034)
│   ├── analytics-api.ts          # Category analytics & aggregation API (US-052)
│   ├── dashboard-helpers.ts      # Dashboard data aggregation & formatting helpers
│   ├── payday-utils.ts           # Payday calculation & budget period utilities
│   ├── biometric-auth.ts         # Biometric authentication utilities
│   └── cn.ts                     # Utility for className merging
└── components/
    ├── Themed.tsx                    # Themed components
    ├── SuccessModal.tsx              # Success celebration modal
    ├── InstitutionPicker.tsx         # Institution selection bottom sheet
    ├── AccountTypePicker.tsx         # Wallet type selection bottom sheet
    ├── SkeletonLoaders.tsx           # Dashboard skeleton loaders with shimmer
    └── DashboardWidgets.tsx          # Dashboard widget components (Welcome, Cards, Lists)
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
| Analytics | `/analytics` | Dashboard > Budget Breakdown > Analytics link |

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

## Recent Updates

### Budget Tab - Edit Button Navigation Fixed (2026-01-24)
- Fixed issue where edit button was routing back to dashboard instead of opening edit screen
- Restructured Budget tab to support nested routes with Stack navigation
- Budget tab is now a folder with `index.tsx` (overview) and `setup.tsx` (edit)
- Edit button navigation updated to `/(tabs)/budget/setup` (was incorrectly pointing to `/budget/setup`)
- Users can now click the pencil icon on Budget tab to edit their budget allocation

### Analytics - Pie Chart Fixed (2026-01-24)
- Fixed pie chart segment click detection using angle-based geometry approach
- **Problem**: Previously stacked multiple Pressable components (each covering full chart), so only topmost received clicks
- **Solution**: Single Pressable wrapper with touch location → angle calculation to detect which segment was tapped
- Calculate angle from chart center to touch point using Math.atan2()
- Find which segment's angle range contains the calculated angle
- Clicking any pie segment correctly navigates to filtered transactions for that category
- Works reliably across all segments (Groceries, Entertainment, Snacks, etc.)

### Language & Date Format Fix (2026-01-24)
- Changed all date formatting to European format (DD/MM/YYYY)
- Locale changed to it-IT for all date/month formatting
- Affected areas: Trends page, Analytics, Transactions, Add/Edit screens, Calendar headers
- **Trends**: Month abbreviations now in English (Jan, Feb, Mar, etc.) instead of Italian
- **Analytics**: Date range display now shows DD/MM/YYYY format (e.g., 24/01/2026 to 24/02/2026)
- **All dates**: Format DD/MM/YYYY with separator "/" (e.g., 24/01/2026)
- Currency formatting (CHF) still uses Swiss locale (de-CH) for proper number formatting

### Trends Monthly Breakdown - Clickable Rows (2026-01-24)
- Made monthly breakdown table rows clickable for easy transaction drill-down
- Click any month row to view transactions for that month
- Visual feedback: row highlights on hover with → arrow icon
- Automatically applies month date filter to transactions page
- Filter chip displays month/year with × to clear
- Enables investigating spending patterns by month
- **Example**: Click "January 2025" row → View all Jan 2025 transactions with month filter applied

### Analytics Period Fix (2026-01-24)
- Fixed analytics date range calculation for "This Period" when viewing before payday
- Now correctly shows period from last payday until today (not paydayDay - 1)
- Example: For payday on 25th, viewing on 24th now shows period ending on 24th (today) instead of 23rd

### Floating Action Button - Improved UX (2026-01-24)
- Enhanced FAB with better shadow styling for visual depth
- Added "Don't have an account? Add one" link in the Add Transaction modal

### Welcome Screen & Invite UX Fixes (2026-01-24)
- **Keyboard Avoidance**: Fixed welcome screen where keyboard was hiding invite code input
  - Wrapped bottom section in KeyboardAvoidingView with ScrollView
  - `keyboardShouldPersistTaps="handled"` allows dismissing keyboard by tapping
  - Input field now remains visible when typing
- **Copy-on-Tap for Invite Codes**: Added clipboard integration in Invite Partner screen
  - Users can tap the large 6-digit code to copy it to clipboard
  - "Invite Code (tap to copy)" label provides clear affordance
  - Confirmation alert shows code was copied successfully
  - Uses expo-clipboard for cross-platform compatibility

### CRITICAL BUG FIX: Invite Role Assignment (2026-01-24)
- **Root Cause**: `createUserProfile` function was automatically creating a household and assigning admin role to ALL new users, even when they had an invite code
- **Result**: Invited users (like Cecilia) were getting their own household with admin role instead of joining the inviter's household as members
- **The Fix**:
  1. Split `createUserProfile` into two functions:
     - `createUserProfile`: Only creates user profile (no household)
     - `createDefaultHousehold`: Creates household and assigns admin role
  2. Updated signup flow to be conditional:
     - **With invite code**: User profile created → Accept invite (join as MEMBER)
     - **Without invite code**: User profile created → Create household (join as ADMIN)
  3. Added comprehensive logging to track role assignment
- **Verification**:
  - Signup WITHOUT invite: Creates 1 household, user is admin ✓
  - Signup WITH invite: Creates 0 households, user joins existing as member ✓
- **Database Cleanup Needed**: Remove duplicate households and incorrect member records from testing

### Floating Action Button - Enhanced Wallet Creation (2026-01-24)
- Link appears below the Account selector for easy wallet creation
- Allows users to quickly add a wallet without closing the transaction form
- FAB maintains menu with both "Add Transaction" and "Add Account" options

### ARCHITECTURE: Personal Budget Periods (2026-01-24)
- **Changed**: Budget period fields moved from `households` table to `householdMembers` table
- **Reason**: Support different paydays for each household member (e.g., Alexander paid on 25th, Cecilia paid on 10th)
- **New Fields on householdMembers**:
  - `paydayDay`: Number (1-31 or -1 for last day)
  - `payFrequency`: String (default: "monthly")
  - `budgetPeriodStart`: String (ISO YYYY-MM-DD)
  - `budgetPeriodEnd`: String (ISO YYYY-MM-DD)
  - `lastBudgetReset`: Number (timestamp)
  - `monthlyIncome`: Number (for future shared expense splits)
- **New API Function**: `getMemberBudgetPeriod(userId, householdId)` returns member's personal budget period
  - Falls back to household period for backward compatibility
  - Returns `{ start, end, paydayDay, source: 'member' | 'household' }`
- **Payday Settings**: Now sets personal payday on `householdMembers` record (not household)
- **Dashboard**: Shows user's own budget period, not household's
- **Budget Setup/Overview**: Uses personal budget period for budget tracking
- **Transactions**: Budget spent amounts tracked against personal budget period
- **Analytics**: Uses personal payday for date range calculations
- **Invited Members**: Join with budget fields null - must set their own payday in settings

### BUG FIX: Members Can Now Create Categories, Budgets, and Category Groups (2026-01-24)
- **Problem**: Invited members (like Cecilia) couldn't create categories, category groups, or budgets
- **Root Cause**: All creation APIs looked up household using `WHERE createdByUserId = userId`, which only works for admins who created the household
- **The Fix**:
  - Created `household-utils.ts` with helper functions:
    - `getUserHouseholdId(userId)` - Get household via `householdMembers` table
    - `getUserHouseholdIdByEmail(email)` - Get household by email
    - `getUserProfileAndHousehold(email)` - Get both user profile and household ID
  - Updated all screens to use `householdMembers` lookup instead of `households.createdByUserId`:
    - `src/app/settings/category-groups.tsx` - Category group management
    - `src/app/settings/categories.tsx` - Category management
    - `src/app/settings/import.tsx` - CSV import
    - `src/app/settings/export.tsx` - CSV export
    - `src/app/budget/category-group-allocation.tsx` - Budget allocation
- **Result**: Both admins and members can now create and manage household data
- **Verified**: Alexander (admin) and Cecilia (member) can both create categories, category groups, and budgets
