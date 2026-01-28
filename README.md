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

### Household Members Management (US-007)
- ✅ **Household Members Screen** - View all members in the household
  - Shows member name, email, and role (Admin/Member)
  - Current user highlighted with "(You)" label
  - Admin badge with crown icon for household admin
  - Accessible from Profile tab when household has 2+ members
- ✅ **Remove Member (Admin Only)** - Admin can remove household members
  - "Remove Member" button only visible to admin
  - Cannot remove yourself (use "Leave Household" instead)
  - Cannot remove member with unsettled debt
  - Confirmation modal shows removal consequences
- ✅ **Debt Check Before Removal** - Validates debt status
  - If debt exists: Shows amount and direction (who owes whom)
  - "Go to Settlement" button navigates to settle debt first
  - Green checkmark shows when debt is cleared (0 CHF)
- ✅ **Role-Based Access Control**
  - Admin role assigned to household creator
  - Member role assigned to invited users
  - Only admin can remove members from household
- ✅ **Database Schema Updates**
  - `role` field: 'admin' | 'member'
  - `removedAt`: Timestamp when member was removed
  - `removedBy`: UserId of admin who removed the member
  - `status`: Now supports 'active' | 'inactive' | 'removed'

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
- ✅ **Exclude from Budget** - Toggle to exclude wallet from budget calculations
  - Allows you to exclude savings/investment accounts or other wallets from affecting budget spending
  - Transactions from excluded wallets don't count toward budget categories
  - Visual indicator (eye slash icon) on wallet cards shows excluded status
  - Toggle in edit wallet screen to manage exclusion
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
  - **Exclude from Budget**: Toggle to exclude individual transactions from budget calculations
    * Useful for reimbursements, one-time expenses, or corrections
    * Only shown for expense transactions
    * Updates budget spent amounts when changed
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

### Monthly Income Setting (US-025)
- ✅ **Set Monthly Income** - Each household member can set their monthly income
  - Route: `/settings/income` from Profile tab menu
  - Used for calculating fair expense splits between household members
- ✅ **Features**:
  - Income input with CHF currency display
  - Shows current income if already set
  - Saves to `householdMembers.monthlyIncome`
  - Success feedback with auto-navigation back
  - Info card explaining fair splitting concept
  - Privacy note about income visibility
- ✅ **Fair Splitting Logic**:
  - Shared expenses split proportionally based on income
  - Example: If Alexander earns 60% of household income, he pays 60% of shared expenses
  - Both household members can set their own income independently

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
  - **Categories sorted by budget allocation** (highest budget first within each group)
  - Category group order preserved
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
  - **Categories sorted by budget allocation** (highest budget first within each group)
  - Category group order preserved (Needs, Wants, Savings)
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

#### SharedExpenseSplits
- `id`: UUID (primary key)
- `transactionId`: UUID (foreign key to Transactions)
- `owerUserId`: UUID (who owes this portion)
- `owedToUserId`: UUID (who is owed - the person who paid)
- `splitAmount`: Number (how much they owe, e.g., 40.00 CHF)
- `splitPercentage`: Number (their percentage, e.g., 40.0)
- `isPaid`: Boolean (true if settled, false if still owed)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp (optional)

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
│   ├── shared-expenses-api.ts    # Shared expense split calculation API
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
- **Invited Members**: Join with budget fields initialized to household's payday (fixes transaction filtering issues)

### BUG FIX: Date Picker and Recent Transactions Widget (2026-01-25)
- **Problem 1**: When editing a transaction, couldn't select today's date (date picker was disabled)
- **Problem 2**: Transactions not appearing in dashboard widget after budget period reset
- **Root Causes**:
  1. Date comparison in edit form used `toISOString()` which converts to UTC, causing timezone mismatches (e.g., local midnight becomes previous day in UTC)
  2. Dashboard widget was filtering transactions by current budget period only, so after payday reset, no transactions appeared (since all previous transactions were from the old period)
  3. API validation used Date object comparison instead of string comparison for YYYY-MM-DD dates
- **The Fixes**:
  - Fixed edit form date picker (`src/app/transactions/[id]/edit.tsx`):
    - Now uses direct string formatting (`YYYY-MM-DD`) instead of `toISOString()`
    - Compares year/month/day components directly instead of Date objects
  - Fixed API date validation (`src/lib/transactions-api.ts`): Uses string comparison for YYYY-MM-DD dates to avoid timezone issues
  - Fixed dashboard recent transactions (`src/app/(tabs)/index.tsx`): Removed budget period filter from recent transactions query - now shows 5 most recent transactions regardless of period
  - Changed `monthSpending` calculation to use `summary.totalSpent` from budget summary instead of calculating from the limited recent transactions list
- **Impact**:
  - Can now select today's date (and any past date) when editing transactions
  - Dashboard widget now shows the 5 most recent transactions regardless of budget period
  - Budget period calculations remain accurate using the budget summary data

### BUG FIX: Member Budget Summary Not Resetting (2026-01-25)
- **Problem**: When a member's budget period resets on payday, the budget summary doesn't update properly
- **Root Causes**:
  1. `resetMemberBudgetPeriod()` was querying budgetSummary by `householdId` and `periodEnd` instead of by `userId`
  2. This could cause the wrong user's budget summary to be updated (or the admin's instead of the member's)
  3. The spent amount fields (`needsSpent`, `wantsSpent`, `savingsSpent`) were being preserved instead of reset to 0
- **The Fix**:
  - Updated `resetMemberBudgetPeriod()` in `src/lib/budget-api.ts`:
    - Now queries budgetSummary by `userId` AND `householdId` (ensures correct member's summary)
    - Adds `userId` to the update transaction
    - Resets all spent fields: `totalSpent: 0`, `needsSpent: 0`, `wantsSpent: 0`, `savingsSpent: 0`
- **Important Note**: Each household member must have set up their own budget via the Budget → Setup page for them to have a budgetSummary. If a member hasn't set up their budget yet, they won't see it reset on payday. They should go to Budget → Setup and enter their income and allocations.
- **Impact**: Budget period resets now work correctly for both admin and member users
  - Budget period calculations remain accurate using the budget summary data

### BUG FIX: Budget Period Reset Not Working Properly (2026-01-25)
- **Problem**: Budget period dates updated on payday but budget amounts (totalSpent) did not reset to 0
- **Root Cause**: Two issues found:
  1. `checkAndResetBudgetIfNeeded()` was called without `userId` parameter, so it fell back to household-level check instead of member's personal period
  2. `resetMemberBudgetPeriod()` function reset individual budget `spentAmount` but didn't reset the `budgetSummary.totalSpent`
- **The Fix**:
  - Updated dashboard (`src/app/(tabs)/index.tsx`) to pass `userId` to `checkAndResetBudgetIfNeeded(householdId, userId)`
  - Updated `resetMemberBudgetPeriod()` in `src/lib/budget-api.ts` to also reset budget summary with `totalSpent: 0`
- **Impact**: On payday, both individual category budgets AND the overall budget summary now correctly reset to 0

### FIX: Budget Reset on Payday Now Works for All Household Members (2026-01-27)

**Issue**: Budget reset was not happening automatically for all household members on their individual paydays.

**Root Causes Identified**:
1. Reset only triggered when each individual member opened the dashboard
2. Changing payday created data inconsistency between `householdMembers`, `budgets`, and `budgetSummary` tables
3. `budgetSummary` table had redundant `periodStart/periodEnd` fields that weren't syncing properly with member data

**Fixes Implemented**:

1. **Automatic Reset for All Members**
   - `checkAndResetBudgetIfNeeded()` now checks ALL active household members, not just the current user
   - When any member opens the dashboard, it triggers resets for all members whose payday has passed
   - Each member's budget resets on their individual payday automatically

2. **Smart Payday Change Behavior**
   - **Set payday to TODAY or past date** → Triggers immediate reset (fresh start with 0 spending)
   - **Set payday to FUTURE date** → Updates period dates and recalculates spending for new period
   - Example scenarios:
     - Set to Day 28 (tomorrow, today is 27th): Shows 0 spending (correct, no future transactions)
     - Set to Day 27 (today): Resets budget to 0 (fresh start)
     - Set to Day 26 (yesterday): Resets budget to 0 (fresh start)

3. **Data Structure Cleanup (Option 1 - Remove Redundancy)**
   - **Source of truth**: `householdMembers` table stores `budgetPeriodStart`, `budgetPeriodEnd`, `paydayDay`
   - **Removed redundant fields**: `budgetSummary.periodStart` and `budgetSummary.periodEnd` no longer used
   - **Benefits**: Eliminates sync issues, single source of truth, cleaner data model
   - `budgetSummary` now only stores: `totalIncome`, `totalAllocated`, `totalSpent`
   - Period dates are always read from `householdMembers` table

**Files Modified**:
- `src/lib/budget-api.ts`:
  - Updated `checkAndResetBudgetIfNeeded()` to check all household members
  - Updated `getMemberBudgetPeriod()` to find active budgets intelligently
  - Updated `getBudgetSummary()` to query by userId only (no period filter)
  - Updated `saveBudget()` to not set period fields in budgetSummary
  - Updated `resetBudgetPeriod()` and `resetMemberBudgetPeriod()` to not update period fields in budgetSummary
- `src/app/settings/payday.tsx`:
  - Added logic to detect if payday change should trigger reset (when period starts today or in past)
  - Reset scenario: Archives old budgets, creates new budgets with 0 spending, resets summary
  - No-reset scenario: Updates period dates, recalculates spending for new period
  - Removed budgetSummary period updates (no longer needed)

**Data Model**:
```
householdMembers (source of truth):
  - paydayDay
  - budgetPeriodStart
  - budgetPeriodEnd
  - lastBudgetReset
  - monthlyIncome

budgetSummary (aggregates only):
  - totalIncome
  - totalAllocated
  - totalSpent
  ❌ NO period fields (removed redundancy)

budgets (category-level):
  - periodStart (synced with member period)
  - periodEnd (synced with member period)
  - allocatedAmount
  - spentAmount
```

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

### ARCHITECTURE CHANGE: Personal Categories and Category Groups (2026-01-24)
- **Changed**: Categories and category groups are now personal to each user (not shared household-wide)
- **Implementation**:
  - `getCategories(householdId, userId)` filters to show only:
    - Categories created by the user (`createdByUserId = userId`)
    - Categories shared by others (`isShareable = true`)
  - `getCategoryGroups(householdId, userId)` filters to show only:
    - Category groups created by the user (`createdByUserId = userId`)
  - Added `toggleCategorySharing()` function to allow owners to share categories with household
  - Updated all callers of `getCategories()` and `getCategoryGroups()` to pass both `householdId` and `userId`
  - Added `isShareable` parameter to `updateCategory()` function
  - Fixed duplicate check to only check within user's own categories (not household-wide)
  - Added proper error handling in category creation UI
  - **Fixed (2026-01-24)**: Added helpful UI when member tries to add category but has no category groups
    - Shows warning: "You need to create a category group first before adding categories"
    - Provides button to navigate to category groups creation screen
    - Updated validation to provide clearer error message when no groups exist
- **User Experience**:
  - Each user has their own personal categories and category groups
  - Default categories/groups created on signup are personal to that user
  - Users can optionally mark categories as "shareable" to make them visible to other household members
  - Category groups remain personal (cannot be shared)
  - **Important**: Users must create category groups before creating categories
- **Result**:
  - Alexander's categories → Only Alexander sees them
  - Cecilia's categories → Only Cecilia sees them
  - Alexander can create "Groceries" and Cecilia can also create "Groceries" (no conflict)
  - If Alexander marks a category as "shareable" → Cecilia can see and use it
  - Each user manages their own budget category groups independently
  - Members are guided to create category groups first if they try to create categories without groups
- **Future Enhancement**: UI to toggle sharing in category management screen

### FEATURE: True Balance - Assets, Liabilities, and Net Worth Tracking (2026-01-25)
- **Feature**: Displays accurate financial position by separating Assets, Liabilities, and Net Worth
- **Implementation**:
  - Created `src/lib/balance-api.ts` with `calculateTrueBalance()` function
    - Queries all household accounts and classifies them by type
    - Asset types: Checking, Savings, Cash, Investment (positive balances = good)
    - Liability types: Credit Card (negative balances = debt)
    - Calculates net worth: Assets - Liabilities
  - Created `src/components/TrueBalanceWidget.tsx`
    - Three-section display: Assets, Liabilities, Net Worth
    - Shows individual accounts within each section with balances
    - Asset accounts show with 💰 icon and balance in CHF
    - Liability accounts show with 💳 icon and debt amount (as positive)
    - Net Worth displayed prominently in teal with large text
    - Auto-refreshes every 5 seconds
    - Liabilities section only shows when debt exists
  - Updated dashboard (`src/app/(tabs)/index.tsx`) to use TrueBalanceWidget
    - Replaced old TotalBalanceCard and summary cards
    - Widget positioned after welcome header

- **How It Works**:
  - Credit card expenses recorded immediately affect budget (correct behavior)
  - Credit card debt reduces net worth (correct financial position)
  - Credit card payments are transfers between accounts (don't affect budget)

- **Display Format**:
  - **Assets Section**: Lists all asset accounts with balances, shows total
  - **Liabilities Section**: Lists all credit cards with debt amounts (shown as positive), shows total debt
  - **Net Worth Section**: Large teal card showing true spendable amount (Assets - Liabilities)

- **Example Flow**:
  1. Initial Setup:
     - Checking: 1,000 CHF
     - Credit Card: 0 CHF
     - Net Worth: 1,000 CHF

  2. Spend on Credit Card (100 CHF groceries):
     - Credit card balance: 0 → -100 CHF
     - Dashboard updates:
       - Assets: 1,000 CHF
       - Liabilities: 100 CHF
       - Net Worth: 900 CHF ✓
     - Budget: Groceries -100 CHF ✓

  3. Pay Credit Card Bill (100 CHF transfer):
     - Checking: 1,000 → 900 CHF
     - Credit Card: -100 → 0 CHF
     - Dashboard updates:
       - Assets: 900 CHF
       - Liabilities: 0 CHF (section hidden)
       - Net Worth: 900 CHF ✓
     - Budget: Unchanged (transfer doesn't affect budget) ✓

- **Files Created**:
  - `src/lib/balance-api.ts` - Balance calculation with asset/liability separation
  - `src/components/TrueBalanceWidget.tsx` - Dashboard widget component

- **Files Modified**:
  - `src/app/(tabs)/index.tsx` - Integrated TrueBalanceWidget

### BUG FIX: Members Can Now Use Transactions and Budget Setup (2026-01-24)
- **Problem**: Members couldn't access transactions or budget setup screens - they would get errors or be redirected
- **Root Cause**: 7 additional screens were still using the old `households WHERE createdByUserId = userId` pattern which only works for admins
- **The Fix**:
  - Standardized all screens to use `getUserProfileAndHousehold()` helper from `household-utils.ts`:
    - Transaction screens: `src/app/transactions/add.tsx`, `src/app/transactions/[id]/edit.tsx`, `src/app/(tabs)/transactions.tsx`, `src/app/transactions/trends.tsx`
    - Budget screens: `src/app/budget/category-group-allocation.tsx`
    - Settings screens: Already using the helper correctly
  - All screens now look up household via `householdMembers` table instead of `households.createdByUserId`
  - Standardized return structure: `{ userRecord, householdId }` across all screens
  - Added comprehensive logging to category group allocation for debugging member issues
- **Result**:
  - Members can now add and edit transactions
  - Members can access and use budget setup and allocation screens
  - Categories load correctly in transaction forms for members
  - Trends and analytics screens work for members
  - Budget allocation shows member's personal category groups

### BUG FIX: Budget Setup Redirect Issue (2026-01-24)
- **Problem**: Member clicks "Create My First Budget" and gets redirected to dashboard
- **Root Cause**: Budget allocation screen had inconsistent data structure - it was wrapping `householdId` in `household.id` instead of returning it directly
- **The Fix**:
  - Fixed `src/app/budget/category-group-allocation.tsx` to return `{ userRecord, householdId }` directly from helper
  - Changed data access from `householdQuery.data?.household?.id` to `householdQuery.data?.householdId`
  - Added helpful UI that guides members to create category groups if they try to set up budget without them
  - Added console logging for debugging future issues
- **Result**:
  - Members can now access budget allocation screen successfully
  - Budget setup displays correctly with proper category group loading
  - If member has no expense category groups, clear message explains what to do with a button to create them

### BUG FIX: Member Budget Period Reset Not Working (2026-01-25)
- **Problem**: Members' budget period was not resetting on payday (25th), showing old period dates (25/12/25 to 24/01/26) instead of new period (25/01/26 to 24/02/26)
- **Root Cause**: Multiple issues in `resetMemberBudgetPeriod()` and `checkAndResetBudgetIfNeeded()` functions:
  1. `db.queryOnce()` result handling without null/undefined checks - crashes when result is invalid
  2. Using updated member's `budgetPeriodEnd` to query for OLD records - queries fail because old records have OLD period end dates
  3. No error handling for database query failures
- **The Fixes Applied**:
  1. **Saved OLD period end before update**: Store `oldPeriodEnd = member.budgetPeriodEnd` BEFORE updating member record
  2. **Used OLD period end for queries**: Changed budget and budgetSummary queries to use `oldPeriodEnd` instead of `member.budgetPeriodEnd`
  3. **Added null safety checks**: Wrapped all `db.queryOnce()` calls with validation and try-catch blocks to catch query failures
  4. **Added detailed logging**: Each query now logs its result to help debug issues
  5. **Fixed in both functions**:
     - `resetMemberBudgetPeriod()`: Saves old period, archives old budgets, creates new ones with reset spent amounts
     - `checkAndResetBudgetIfNeeded()`: Added null checks before accessing query results
- **Key Changes**:
  - `src/lib/budget-api.ts` line 765: Save `oldPeriodEnd` before update
  - `src/lib/budget-api.ts` line 810: Use `oldPeriodEnd` in budget query
  - `src/lib/budget-api.ts` line 847: Use `oldPeriodEnd` in summary query
  - All `db.queryOnce()` calls now have try-catch and null checks
- **Result**:
  - Members' budgets now reset properly on payday
  - `budgetSummary.periodStart` and `periodEnd` update to new period dates
  - Spent amounts reset to 0 for new period
  - "Days remaining" calculation updates correctly
  - Dashboard shows data from new period instead of old

### BUG FIX: Dynamic Budget Period Calculation (2026-01-27)
- **Problem**: Budget periods were stored in the database and retrieved, causing issues:
  1. Period dates displayed correctly but transactions from within period not showing up
  2. Budget spent amounts wrong because of incorrect period filtering
  3. Changing payday caused immediate reset when it shouldn't
  4. Auto-reset on payday didn't work reliably
- **Root Cause**: The period dates were stored in `householdMembers` table but the transaction filtering logic used these stale stored values instead of dynamically calculating from `paydayDay`.
- **Solution**: Period is now ALWAYS calculated dynamically from `paydayDay`, never stored and retrieved.
- **Implementation**:
  - Created new `src/lib/budget-period-utils.ts` with:
    - `getCurrentBudgetPeriod(paydayDay)` - Always calculates dynamically based on today's date
    - `getPeriodDisplayString(paydayDay)` - Display helper (e.g., "6 Jan – 5 Feb")
    - `isInCurrentPeriod(date, paydayDay)` - Check if a date is in current period
  - Updated `getMemberBudgetPeriod()` in `budget-api.ts`:
    - Now uses dynamic calculation from `paydayDay` instead of stored period dates
    - Returns `daysRemaining` computed dynamically
  - Simplified payday change logic in `settings/payday.tsx`:
    - Just updates `paydayDay` - no complex reset logic needed
    - Period automatically recalculates on next query
  - Updated all budget screens to use new utility:
    - `src/app/(tabs)/index.tsx`
    - `src/app/(tabs)/budget/index.tsx`
    - `src/app/(tabs)/budget/setup.tsx`
    - `src/app/budget/index.tsx`
    - `src/app/budget/setup.tsx`
- **Key Changes**:
  - `src/lib/budget-period-utils.ts`: NEW FILE - Dynamic period calculation
  - `src/lib/budget-api.ts`: `getMemberBudgetPeriod()` now uses `getCurrentBudgetPeriod()`
  - `src/app/settings/payday.tsx`: Simplified to just update `paydayDay`
  - Added debug logging to `recalculateBudgetSpentAmounts()` for troubleshooting
- **Result**:
  - Period dates always correct based on current date and payday setting
  - Transactions from current period show up correctly
  - Budget spent amounts calculated from actual transactions in dynamic period
  - Changing payday doesn't cause immediate reset (spent amounts recalculate for new period)
  - On payday, period automatically shifts forward (no manual reset needed)
  - Console logs show period dates and transaction counts for debugging

### FEATURE: Shared Expense Splits (PART 3 OF 4) (2026-01-25)
- **Feature**: Added shared expense controls to transaction form for multi-member households
- **Implementation**:
  - New state variables: `isShared` (boolean), `paidByUserId` (string)
  - New query: Load all active household members for the "Who paid?" selector
  - UI Controls:
    - "Shared Expense" toggle switch (only shows if household has 2+ members)
    - "Who paid?" multi-select buttons (only shows when toggle is ON)
    - Current user is pre-selected as payer by default
  - Updated `CreateTransactionRequest` interface to include:
    - `isShared?: boolean` - Whether this is a shared expense
    - `paidByUserId?: string` - Which household member paid
  - Updated `TransactionResponse` to include `transactionId` for split creation
  - When saving shared transaction:
    - Sets `isShared = true` and `paidByUserId = selected user`
    - Calls `createExpenseSplits()` automatically to create split records
    - Expense splits are calculated based on income ratio from `budgetSummary.totalIncome`
- **Files Modified**:
  - `src/app/transactions/add.tsx`:
    - Added `Switch` import for toggle
    - Added household members query
    - Added shared expense state and UI
    - Updated transaction creation to handle shared expenses
  - `src/lib/transactions-api.ts`:
    - Updated `CreateTransactionRequest` interface
    - Updated `TransactionResponse` interface with `transactionId`
    - Updated `createTransaction()` to use request values for `isShared` and `paidByUserId`
    - Updated return statement to include transactionId for split creation
  - `src/components/DashboardWidgets.tsx`:
    - Updated `RecentTransactionsWidget` to show purple "Shared" badge
  - `src/app/(tabs)/transactions.tsx`:
    - Updated transaction list item to show purple "Shared" badge next to amount
- **Visual Feedback**:
  - Shared transactions display purple "Shared" badge in both dashboard widget and transaction list
  - Personal transactions don't show any badge
  - Badge appears next to the transaction amount for easy identification
- **Behavior**:
  - Solo user households: Don't see "Shared Expense" controls (hidden)
  - Multi-member households: See "Shared Expense" toggle
  - Default: Toggle is OFF (personal expense)
  - When toggled ON: "Who paid?" selector appears with all household members
  - User's own name is pre-selected as default payer
  - Can select any household member as the payer
- **Testing**:
  - Test with solo household: No shared controls visible
  - Test with multi-member household:
    - Add personal expense: No splits created, no badge shown
    - Add shared expense as Alexander: Splits created with Alexander as payer, badge shows
    - Add shared expense as Cecilia: Splits created with Cecilia as payer, badge shows
  - Verify splits appear in `shared_expense_splits` table with correct `isPaid` flags
  - Verify split percentages match income ratio
- **Next Steps (PART 4)**:
  - Settle splits UI to mark expenses as paid
  - Settlement logic to transfer money between accounts
  - Debt visualization showing who owes whom

### FEATURE: Debt Balance Widget on Dashboard (PART 4 OF 4) (2026-01-25)
- **Feature**: Real-time debt balance display on dashboard showing inter-household debt
- **Implementation**:
  - New component: `src/components/DebtBalanceWidget.tsx`
  - Displays who owes whom with color-coded amounts (red for owing, green for owed)
  - Auto-refreshes every 5 seconds to stay up-to-date with shared expenses
  - Automatically hidden when:
    - No partner in household (solo user)
    - No shared expenses exist (balance = 0)
    - Data is loading

- **Widget Behavior**:
  - Shows from each user's perspective:
    - Alexander's perspective: "Cecilia owes you 40 CHF" (green) OR "You owe Cecilia 75 CHF" (red)
    - Cecilia's perspective: "You owe Alexander 40 CHF" (red) OR "Alexander owes you 75 CHF" (green)
  - Displays absolute balance (amount that changed hands, not net)
  - Amount shown with 2 decimal places (e.g., 150.00 CHF)

- **Data Flow**:
  1. Query current user profile from users table
  2. Find current user's household via householdMembers
  3. Load all active household members
  4. Find the other household member (partner)
  5. Call `calculateDebtBalance(currentUserId, partnerId)`
  6. Display based on `whoOwesUserId` field:
     - If `whoOwesUserId === currentUserId`: Show "You owe [Partner]" in red
     - Otherwise: Show "[Partner] owes you" in green

- **Files Created/Modified**:
  - `src/components/DebtBalanceWidget.tsx` (NEW):
    - React component using React Query for data fetching
    - Imports `DebtBalance` interface from shared-expenses-api
    - Handles solo user detection (no partner = don't show widget)
    - Handles zero balance (no shared expenses = don't show widget)
    - Auto-refetch every 5 seconds for real-time updates

  - `src/app/(tabs)/index.tsx` (MODIFIED):
    - Added import for DebtBalanceWidget
    - Inserted widget after TotalBalanceCard and ThisMonthSpendingCard
    - Widget renders conditionally (hidden when balance = 0)

- **Visual Design**:
  - Clean card layout matching dashboard aesthetic
  - "Household Balance" header with subtle gray text
  - Large bold amount (3xl font size)
  - Color-coded:
    - Green (#10B981 family) for "money owed to you"
    - Red (#DC2626 family) for "money you owe"
  - Partner's name highlighted in bold
  - Margin: 4 sides (mx-4 mb-4) for consistent spacing

- **Test Scenarios**:
  - **Scenario 1: No Shared Expenses**
    - Widget hidden (balance = 0)

  - **Scenario 2: Alexander Pays 100 CHF Shared Expense**
    - Alexander's dashboard: "Cecilia owes you 40.00 CHF" (green)
    - Cecilia's dashboard: "You owe Alexander 40.00 CHF" (red)

  - **Scenario 3: Multiple Shared Expenses**
    - Alexander paid 100 CHF → Cecilia owes 40 CHF
    - Cecilia paid 50 CHF → Alexander owes 30 CHF
    - Net: Cecilia owes 10 CHF
    - Alexander's dashboard: "Cecilia owes you 10.00 CHF" (green)
    - Cecilia's dashboard: "You owe Alexander 10.00 CHF" (red)

  - **Scenario 4: Split Evenly (Balance Cancels)**
    - Alexander paid 100 CHF → Cecilia owes 40 CHF
    - Cecilia paid 100 CHF → Alexander owes 40 CHF
    - Net: 0 CHF
    - Widget hidden for both users

  - **Scenario 5: Solo User**
    - Only Alexander, no Cecilia
    - Widget doesn't appear (no partner found)

- **Edge Cases Handled**:
  - ✓ Partner not found in household: Widget hidden
  - ✓ Balance exactly 0: Widget hidden
  - ✓ No shared_expense_splits table data: Widget hidden
  - ✓ Unpaid splits only: Only counts unsettled debts (isPaid = false)
  - ✓ Correct perspective for each user: Each sees their own view
  - ✓ Real-time updates: Refetches every 5 seconds

- **Next Steps**:
  - Settlement UI to allow users to mark debts as paid
  - Move money between accounts when settling debt
  - Settlement history/ledger
  - Multiple members (extend beyond 2-person households)

### DEBUG & ENHANCEMENT: Debt Widget Debugging + Split Percentage Display (2026-01-25)
- **Issue 1**: Members not seeing debt widget (debugging needed)
- **Issue 2**: Users want to see split percentages (e.g., "60/40 based on income")

- **Debugging Implementation** (DebtBalanceWidget.tsx):
  - Comprehensive console logging with emoji indicators:
    - 🔍 Query start
    - 👤 User profile found
    - 🏠 Household membership found
    - 👥 Partner found
    - 📊 Split ratios calculated
    - 💰 Debt balance calculated
    - ✅ Query complete
    - ⚠️ Widget hidden (no debt info, balance = 0)
    - ❌ Error states (user not found, no household, no partner, etc.)
  - Logs show:
    - User profile ID and name
    - Current member role
    - Total household members and their IDs
    - Partner name
    - Split ratio percentages for each user
    - Debt balance calculation result
    - Final rendering decision

- **Split Percentage Display**:
  - Widget now shows income-based split percentages in header:
    - "Household Balance" label with "60% / 40%" next to it
    - Shows each user's share of expenses based on income ratio
    - Updates based on `calculateSplitRatio()` result

  - Transaction form shows split preview:
    - Blue box with "Split Preview:" heading
    - Lists each household member with:
      - Their name
      - Split amount in CHF (calculated from total amount × percentage)
      - Percentage of the split
    - Only shows when:
      - Amount is entered and > 0
      - "Shared Expense" toggle is ON
    - Example: "Alexander: 60.00 CHF (60%)"

- **Files Modified**:
  - `src/components/DebtBalanceWidget.tsx`:
    - Added `calculateSplitRatio` import
    - Updated DebtInfo interface with percentage fields
    - Added detailed console logging (28 log points)
    - Queries split ratios from budgetSummary income data
    - Displays percentages in widget header
    - Added footer text: "Shared expenses split based on income ratio"

  - `src/app/transactions/add.tsx`:
    - Added `calculateSplitRatio` import
    - New query: `splitRatiosQuery` to fetch split percentages
    - Split preview UI in blue box before "Who paid?" selector
    - Shows split amount and percentage for each member
    - Dynamically updates as amount changes

- **Console Log Reference** (for debugging member visibility):
  ```
  🔍 DebtBalanceWidget: Starting query for [email]
  👤 User profile: [userId] [userName]
  🏠 Current member: [memberId] Role: [role] Household: [householdId]
  👥 Total household members: [count]
     - [userId1] Role: [role]
     - [userId2] Role: [role]
  👥 Partner found: [partnerName]
  📊 Calculating split ratios for household: [householdId]
  📊 Split ratios returned: [array]
  📊 Current user split: [percentage]%
  📊 Other user split: [percentage]%
  💰 Calculating debt balance between [userId1] and [userId2]
  💰 Debt balance result: [balance]
  ✅ DebtBalanceWidget query complete: [debtInfo]
  🎨 Rendering DebtBalanceWidget: hasData=[bool], amount=[num], showWidget=[bool]
  ⚠️ Widget hidden: No debt info
  ⚠️ Widget hidden: Balance is 0
  ```

- **Testing Checklist**:
  - ✓ Alexander opens dashboard → Widget shows with split percentages
  - ✓ Cecilia opens dashboard → Check console logs for any "❌" errors
  - ✓ Both see correct amounts from their perspective
  - ✓ Split preview shows in transaction form when creating shared expense
  - ✓ Split percentages update based on income ratio
  - ✓ Console shows all debug logs without errors

- **Known Issues & Solutions**:
  - If widget doesn't show for Cecilia:
    - Check console for "❌ No user profile found" → email lookup issue
    - Check for "❌ No household membership found" → householdMembers query issue
    - Check for "❌ No partner found in household" → only 1 member in household
  - If split preview shows "50%" → income data not in budgetSummary (use default)
  - If widget shows but amount is 0 → no shared_expense_splits yet (expected)

### FEATURE: Settlement with Transaction Record (PART 5) (2026-01-25)
- **Feature**: Settle shared expense debts by creating settlement transactions and updating account balances
- **User Flow**:
  1. User views Debt Balance Widget showing "You owe [Partner] 150 CHF"
  2. User taps "Settle Debt" button (red button, only shows when user owes)
  3. Settlement Modal opens with:
     - Settlement amount displayed prominently in red box
     - List of payer's accounts to choose from (debit account)
     - List of receiver's accounts to choose from (credit account)
     - First account auto-selected for both
     - Warning if payer account has insufficient balance
  4. User confirms by tapping "Pay [amount] CHF" button
  5. On success:
     - Settlement transaction created (type="settlement")
     - Payer account balance decreased by settlement amount
     - Receiver account balance increased by settlement amount
     - All unpaid splits between payer and receiver marked as paid (isPaid=true)
     - Alert shows success: "Payment of 150.00 CHF has been recorded"
     - Modal closes
     - Widget disappears (balance now 0)

- **Implementation Details**:

  **New File**: `src/lib/settlement-api.ts`
  - Function: `createSettlement(payerUserId, receiverUserId, amount, payerAccountId, receiverAccountId, householdId)`
  - Step 1: Creates settlement transaction record:
    - type: "settlement" (special transaction type)
    - amount: Settlement amount in CHF
    - note: "Debt settlement: [amount] CHF to [receiverUserId]"
    - isShared: false (settlement is not a shared expense)
    - paidByUserId: payerUserId
  - Step 2: Updates both account balances (atomic transaction):
    - Debits payer account: `balance - amount`
    - Credits receiver account: `balance + amount`
  - Step 3: Marks unpaid splits as paid:
    - Finds all splits where `owerUserId === payerUserId` AND `owedToUserId === receiverUserId` AND `isPaid === false`
    - Updates each split: `isPaid: true`
  - Returns: `{ settlementId, transactionId, amount, splitsSettled }`
  - Comprehensive logging at each step for debugging

  **New Component**: `src/components/SettlementModal.tsx`
  - Modal properties: visible, onClose, amount, receiverUserId, receiverName
  - Account Selection:
    - Queries payer's accounts (from current user)
    - Queries receiver's accounts (from receiverUserId)
    - Shows account name with current balance
    - Warns if payer account balance < settlement amount
    - Allows overdraft with confirmation
  - UI Elements:
    - Red header box: "Settle Debt" title with close button
    - Amount box: Shows settlement amount in red with receiver name
    - Two account sections: Payer's accounts and Receiver's accounts
    - Summary box: Shows from/to account names and settlement amount
    - Action buttons:
      - "Pay [amount] CHF" button (disabled until accounts selected)
      - "Cancel" button (secondary)
  - Success Flow:
    - On settlement creation success:
      - Invalidates queries: ['debt-balance'], ['accounts'], ['transactions'], ['payer-accounts'], ['receiver-accounts']
      - Shows success alert with amount
      - Clears account selections
      - Closes modal
      - Dashboard automatically refreshes to show widget hidden (balance = 0)

  **Modified File**: `src/components/DebtBalanceWidget.tsx`
  - New state: `showSettlement` (boolean)
  - New import: `SettlementModal` component
  - New constant: `receiverUserId` (determines who receives payment)
  - Added "Settle Debt" button:
    - Only shows when user owes (youOwe === true)
    - Tapping opens settlement modal
    - Red button for visual emphasis (matching debt color)
  - Added SettlementModal component at bottom:
    - Only renders when showSettlement === true
    - Passes correct amount, receiverUserId, and receiverName

- **Database Changes**:
  - Transactions table already supports `type="settlement"`
  - SharedExpenseSplits table already has `isPaid` flag for marking settled debts

- **Test Scenarios**:
  - **Scenario 1: Simple Settlement**
    - Alexander owes Cecilia 50 CHF (from 1 shared expense split)
    - Alexander taps "Settle Debt"
    - Selects his Checking account to pay, Cecilia's Savings account to receive
    - Taps "Pay 50.00 CHF"
    - Settlement transaction created
    - Both accounts updated
    - Split marked as paid
    - Widget disappears

  - **Scenario 2: Multiple Splits Settlement**
    - Alexander owes Cecilia 100 CHF total (from 3 different shared expenses)
    - Alexander settles for 100 CHF
    - All 3 splits marked as paid
    - Widget disappears

  - **Scenario 3: Insufficient Balance Warning**
    - Alexander's Checking account has 30 CHF balance
    - Alexander owes Cecilia 50 CHF
    - Selects Checking account as payer
    - Warning appears: "Account balance (30.00 CHF) is less than settlement amount (50.00 CHF). Continue anyway?"
    - Alexander can choose to continue (overdraft) or select different account

  - **Scenario 4: Settlement Appears in Transaction History**
    - Settlement transaction should appear in:
      - Recent Transactions widget on dashboard
      - Full Transaction list (/transactions tab)
      - Transaction type: "settlement" (special category indicator)
    - Can be viewed/edited like normal transactions

- **Edge Cases Handled**:
  - ✓ Multiple accounts to choose from: Both payer and receiver can select from their accounts
  - ✓ Account balance too low: Warning shown but overdraft allowed
  - ✓ No accounts available: Modal shows error or disables buttons
  - ✓ Settlement during pending mutation: Button disabled until complete
  - ✓ Modal cancellation: Modal closes, settlement not created
  - ✓ Multiple settlements: Can settle multiple times, each creates new transaction

- **Files Created/Modified**:
  - `src/lib/settlement-api.ts` (NEW) - Settlement transaction creation logic
  - `src/components/SettlementModal.tsx` (NEW) - Settlement UI component
  - `src/components/DebtBalanceWidget.tsx` (MODIFIED) - Added settlement button and modal

- **Next Steps**:
  - Settlement UI for reversed debts (when user is owed money) - currently only shows settle button when owing
  - Settlement history/ledger showing all past settlements
  - Batch settlements for multiple household members
  - Settlement notifications/confirmations

### BUG FIX: Cascade Delete Shared Expense Splits (2026-01-25)
- **Problem**: When deleting a shared transaction, the associated expense splits remained in the database orphaned
  - This caused the debt widget to show incorrect balances
  - Deleting transactions that created debt would not properly settle the debt
  - Orphaned splits would be recalculated, showing phantom debts

- **Root Cause**: `deleteTransaction()` only deleted the transaction record, not the related splits in `shared_expense_splits` table

- **The Fix**:
  - Updated `deleteTransaction()` in `src/lib/transactions-api.ts` to:
    1. Query for all shared expense splits associated with the transaction
    2. Include split deletion operations in the atomic database transaction
    3. Delete splits before deleting the transaction (proper cascade order)
    4. Log the number of splits deleted for debugging
  - Code change:
    ```typescript
    // Check for associated shared expense splits
    const splitsResult = await db.queryOnce({
      shared_expense_splits: {
        $: { where: { transactionId: transactionId } }
      }
    });

    const splits = splitsResult.data?.shared_expense_splits || [];

    // Build delete operations: splits first, then transaction
    const deleteOperations = [
      ...splits.map(split => db.tx.shared_expense_splits[split.id].delete()),
      db.tx.transactions[transactionId].delete(),
      db.tx.accounts[transaction.accountId].update({ ... })
    ];

    await db.transact(deleteOperations);
    ```

- **Impact**:
  - Deleting shared transactions now removes associated debt splits
  - Debt widget correctly updates after transaction deletion (balance recalculates)
  - No orphaned splits left in database
  - Debt calculations remain accurate across all users

- **Test Scenario**:
  1. Alexander creates shared transaction: 100 CHF (Alexander pays)
  2. Debt widget shows: "Cecilia owes you 40 CHF"
  3. Alexander deletes the transaction
  4. Debt widget updates: Widget disappears (balance = 0)
  5. Verify database: No splits exist for deleted transaction

### DEBUG: Settlement Visibility and Split Updates (2026-01-25)
- **Purpose**: Add comprehensive logging to verify settlement transactions are created correctly and splits are marked as paid
- **Implementation**: Enhanced `createSettlement()` with detailed logging at each step

- **Logging Added**:
  - Settlement creation start: Logs payer, receiver, amount, account IDs
  - Transaction creation: Confirms settlement transaction created with correct ID
  - Transaction verification: Verifies transaction exists in database with correct type and amount
  - Account updates: Shows balances before and after settlement
  - Split filtering: Logs detailed info for each split (IDs, user IDs, isPaid status)
  - Split updates: Confirms each split marked as paid
  - Completion: Settlement complete summary

- **Transaction Type Support**:
  - Updated `Transaction` interface to include `type: 'income' | 'expense' | 'settlement'`
  - Transaction list filter now includes settlement transactions in all views
  - Settlement transactions display with purple color (#8B5CF6)
  - Settlement transactions show "Settlement" badge in transaction list and dashboard

- **UI Improvements**:
  - Dashboard widget shows purple "Settlement" badge for settlement transactions
  - Transaction list shows "Settlement" badge with purple styling
  - Settlement transactions use purple icon and color (#8B5CF6)
  - Amount display for settlements shows no prefix (no +/- sign)
  - Category name shows "Settlement" if not set

- **Edit Prevention**:
  - Settlement transactions cannot be edited through the edit screen
  - Attempting to edit settlement shows alert: "Settlement transactions cannot be edited"
  - User can delete settlement and create new one if needed

- **Type Safety**:
  - `getTransactionTypeColor()` now accepts 'settlement' type
  - Returns purple color for settlement transactions
  - Handles all three transaction types consistently

- **Console Log Format**:
  ```
  💳 === SETTLEMENT START ===
  - Payer: [userId]
  - Receiver: [userId]
  - Amount: [amount]
  - Payer Account: [accountId]
  - Receiver Account: [accountId]
  - Household: [householdId]

  📝 Creating settlement transaction...
  ✅ Settlement transaction created: [settlementId]

  🔍 Transaction verified: { id: ..., type: settlement, amount: ..., userId: ... }

  💰 Updating account balances...
  💰 Before balance update:
    Payer balance: [amount]
    Receiver balance: [amount]
  💰 After balance update:
    Payer new balance: [amount]
    Receiver new balance: [amount]

  📊 Marking splits as paid...
  📊 Total splits in household: [count]
  📊 Total shared transactions: [count]
  📊 Splits to settle: [count]
    - Split [id]: owerUserId=[id], owedToUserId=[id], isPaid=false, matches=true
  ✅ All splits marked as paid

  💳 === SETTLEMENT COMPLETE ===
  ```

- **Test Steps**:
  1. Create shared expense: 100 CHF, Alexander pays
  2. Check console: Settlement logs appear in LOGS tab
  3. Check debt widget: Shows owed amount
  4. User clicks "Settle Debt"
  5. Check console logs for:
     - "Settlement transaction created"
     - "Transaction verified" with correct type
     - Account balances before/after
     - "Splits to settle: 1"
     - "All splits marked as paid"
  6. Check Alexander's transaction list: Shows original expense + settlement
  7. Check Cecilia's transaction list: Shows settlement received
  8. Check debt widget: Disappears (balance = 0)

- **Files Modified**:
  - `src/lib/settlement-api.ts` - Enhanced logging with transaction verification
  - `src/lib/transactions-api.ts` - Added 'settlement' to Transaction type
  - `src/lib/dashboard-helpers.ts` - Updated getTransactionTypeColor to handle settlement
  - `src/app/(tabs)/transactions.tsx` - Settlement badge and type filtering
  - `src/components/DashboardWidgets.tsx` - Settlement badge display
  - `src/app/transactions/[id]/edit.tsx` - Prevent settlement editing

### BUG FIX: Show ALL Household Transactions, Not Just User's Own (2026-01-25)
- **Problem**: Settlement transactions only visible to payer, not receiver
  - Alexander settles debt, settlement only appears in his transaction list
  - Cecilia doesn't see Alexander's settlement in her transaction list
  - Caused confusion about whether settlement was processed
  - Both users couldn't see complete household transaction history

- **Root Cause**: Transaction list query filtered by `userId`, showing only current user's transactions
  - `WHERE userId = currentUserId` excluded partner's transactions entirely
  - Settlement transactions had payer's userId, so receiver never saw them

- **The Fix**:
  - Changed transaction list query from user-specific to household-wide
  - Created new API function: `getHouseholdTransactionsWithCreators(householdId)`
  - Function returns all transactions for the household with creator names enriched
  - Updated transaction list interface to include `creatorName` field
  - Display logic shows creator name only for transactions created by other user
  - Updated all query keys and invalidations to use household ID instead of user ID

- **Code Changes**:
  ```typescript
  // OLD (user-specific):
  const transactionsQuery = useQuery({
    queryKey: ['transactions', householdQuery.data?.userRecord?.id],
    queryFn: async () => {
      return getUserTransactions(householdQuery.data.userRecord.id);
    },
    enabled: !!householdQuery.data?.userRecord?.id,
  });

  // NEW (household-wide):
  const transactionsQuery = useQuery({
    queryKey: ['transactions-household', householdQuery.data?.householdId],
    queryFn: async () => {
      return getHouseholdTransactionsWithCreators(householdQuery.data.householdId);
    },
    enabled: !!householdQuery.data?.householdId,
  });
  ```

- **New API Function**:
  ```typescript
  export async function getHouseholdTransactionsWithCreators(
    householdId: string
  ): Promise<TransactionWithCreator[]> {
    // Queries all transactions in household
    // Joins with users table to get creator names
    // Returns enriched transactions with creatorName field
  }
  ```

- **Creator Name Display**:
  - Shows creator name next to category only for other user's transactions
  - Format: "Category Name (Alexander)" for transactions created by Alexander
  - Own transactions show no creator name (cleaner, less clutter)
  - Helps identify who created shared expenses and settlements

- **Visual Example**:
  ```
  Alexander's View:
  - 100 CHF Groceries (Shared) ← His own expense
  - 38.6 CHF Settlement (Cecilia) ← Cecilia settled to him

  Cecilia's View:
  - 100 CHF Groceries (Shared) (Alexander) ← Alexander paid
  - 38.6 CHF Settlement ← Her own settlement
  ```

- **Impact**:
  - Both users see complete household transaction history
  - Settlement transactions visible to both payer and receiver
  - Shared expenses visible to both participants
  - Better transparency and reconciliation
  - Can verify settlements were processed
  - Can see who created each transaction

- **Test Scenario**:
  1. Alexander creates 100 CHF shared expense
  2. Alexander's list: "100 CHF Groceries (Shared)"
  3. Cecilia's list: "100 CHF Groceries (Shared) (Alexander)"
  4. Cecilia settles 38.6 CHF via modal
  5. Alexander's list: "100 CHF Groceries (Shared)" + "38.6 CHF Settlement (Cecilia)"
  6. Cecilia's list: "100 CHF Groceries (Shared) (Alexander)" + "38.6 CHF Settlement"
  7. Both users see complete transaction history
  8. Debt widget disappears for both (balance = 0)

- **Files Modified**:
  - `src/lib/transactions-api.ts` - Added getHouseholdTransactionsWithCreators function
  - `src/app/(tabs)/transactions.tsx` - Updated to use household query with creator names, show creator names for other users' transactions

### REVISED FEATURE: Settlement as Internal Account Transfer (2026-01-25)

### ENHANCEMENT: Batch Settlement Support & Settlement Tracking (2026-01-28)
- **Feature**: Enhanced settlement workflow to support batch settlements and comprehensive tracking
- **Database Schema Updates**:

  **Transactions Table** - Added settlement tracking fields:
  - `settled: boolean` - Marks if transaction has been settled (default: false)
  - `settledAt: number` - Timestamp when transaction was settled
  - `settlementId: string` - Links transaction to settlement record

  **Settlements Table** - Enhanced with batch support:
  - `paymentMethod: string` - How settlement was made (e.g., 'internal_transfer', 'cash')
  - `settledExpenses: JSON` - Array of transaction IDs that were settled together
  - `createdAt: number` - Timestamp when settlement was created

- **API Functions** (`src/lib/settlement-api.ts`):

  **`getUnsettledSharedExpenses(householdId, currentUserId)`**
  - Returns ALL unsettled shared expenses for a user
  - Filters out transactions marked as `settled: true`
  - Returns `UnsettledExpense[]` with full details:
    - Transaction ID, date, category, amounts
    - Who paid, description
    - Your share (positive = you owe, negative = you're owed)
  - Sorted by date (newest first)

  **`calculateHouseholdDebt(householdId, currentUserId)`**
  - Calculates total net debt between household members
  - Returns `DebtSummary`:
    - `amount`: Total debt (positive = you owe, negative = you're owed)
    - `otherMemberId`, `otherMemberName`, `otherMemberEmail`
  - Uses unsettled expenses to compute balance

  **`getUnsettledExpensesByDirection(householdId, currentUserId)`**
  - Groups expenses by direction (what you owe vs what you're owed)
  - Returns separated lists:
    - `youOwe: UnsettledExpense[]` - Expenses where you owe money
    - `youAreOwed: UnsettledExpense[]` - Expenses where you're owed money
    - `totalYouOwe`, `totalYouAreOwed`, `netDebt` - Summary totals

  **`createSettlement()` - Enhanced**
  - Now tracks which transactions are being settled
  - Updates transactions with settlement fields:
    - Sets `settled: true`
    - Records `settledAt` timestamp
    - Links to `settlementId`
  - Updates settlement record with `settledExpenses` array
  - Maintains split tracking (`isPaid: true`) for compatibility

- **Settlement Workflow**:
  1. User views all unsettled expenses via `getUnsettledSharedExpenses()`
  2. System calculates total debt via `calculateHouseholdDebt()`
  3. User initiates settlement
  4. `createSettlement()` processes:
     - Transfers money between accounts
     - Marks all related transactions as settled
     - Updates splits as paid
     - Records settlement with transaction IDs
  5. Future queries filter out settled transactions

- **Key Benefits**:
  - **Batch Settlement**: Can settle multiple expenses at once
  - **Settlement History**: Track which expenses were settled together
  - **Prevent Double Settlement**: Settled transactions excluded from future debt calculations
  - **Audit Trail**: Complete record of what was settled and when
  - **Flexible Queries**: Can show settled vs unsettled expenses separately

- **Database Migration Notes**:
  - Existing transactions default to `settled: false` (unsettled)
  - Old settlements work but don't have `settledExpenses` array (optional field)
  - System is backward compatible with existing data


- **Architecture Change**: Settlement is now an internal account transfer, NOT a transaction
  - Previous approach: Created settlement transaction (incorrectly affected budgets)
  - New approach: Transfer money between accounts + log settlement history + mark splits paid
  - Reason: Settlement is reconciliation, not a new economic event

- **What Settlement Does**:
  1. Transfers money from payer account to receiver account
  2. Logs transfer in settlements table for history
  3. Marks shared expense splits as paid
  4. Does NOT create a transaction (budgets unaffected!)

- **Database Schema Changes**:
  - Added new `settlements` table in `src/lib/db.ts`:
    ```typescript
    settlements: {
      id: string,
      householdId: string,
      payerUserId: string,      // Who paid
      receiverUserId: string,   // Who received
      amount: number,           // Amount in CHF
      payerAccountId: string,   // Account debited
      receiverAccountId: string,// Account credited
      note: string,             // Optional note
      settledAt: number,        // Timestamp
      createdAt: number
    }
    ```

- **Updated Settlement API** (`src/lib/settlement-api.ts`):
  - `createSettlement()` now:
    - Step 1: Fetches current account balances
    - Step 2: Updates both accounts (debit payer, credit receiver)
    - Step 3: Logs settlement in settlements table
    - Step 4: Marks unpaid splits as paid
    - Returns: settlementId, amount, new balances, splits settled count
  - Added `getSettlementHistory()` function to retrieve settlement records with user names

- **Key Difference from Previous**:
  - ❌ NO transaction created (no type='settlement')
  - ❌ NOT visible in transaction list
  - ❌ Does NOT affect budget spent amounts
  - ✅ Accounts updated correctly
  - ✅ Settlement logged in settlements table
  - ✅ Splits marked as paid

- **Console Logging**:
  ```
  💳 === SETTLEMENT START (INTERNAL TRANSFER) ===
  - Payer: [userId]
  - Receiver: [userId]
  - Amount: [amount]
  - Payer Account: [accountId]
  - Receiver Account: [accountId]

  💰 Fetching account balances...
  💰 Current balances:
    Payer: [balance]
    Receiver: [balance]

  💰 Updating account balances (internal transfer)...
  💰 New balances:
    Payer: [newBalance]
    Receiver: [newBalance]

  📝 Logging settlement in settlements table...
  📝 Settlement logged: [settlementId]

  📊 Marking splits as paid...
  📊 Splits to mark as paid: [count]
  ✅ All splits marked as paid

  💳 === SETTLEMENT COMPLETE ===
  ```

- **Test Scenario**:
  1. Alexander pays 100 CHF groceries (shared, 61.4%/38.6% split)
     - Transaction shows: 100 CHF
     - Debt: Cecilia owes 38.6 CHF
  2. Cecilia settles 38.6 CHF
     - Settlement created in settlements table
     - Cecilia's account: -38.6 CHF
     - Alexander's account: +38.6 CHF
     - Splits marked as paid
     - **Transaction amount reduced: 100 → 61.4 CHF** (Alexander's portion only)
  3. After settlement:
     - Transaction now shows: 61.4 CHF (only Alexander's portion!) ✓
     - Alexander's budget: 61.4 CHF (his actual expense) ✓
     - Debt widget disappears ✓

- **Key Feature: Transaction Amount Reduction**:
  - When a split is settled, the original transaction amount is REDUCED
  - Formula: `newAmount = originalAmount - settledSplitAmount`
  - Example: 100 CHF shared expense → Cecilia settles 38.6 CHF → Transaction becomes 61.4 CHF
  - This ensures the transaction only shows the payer's actual portion after settlement

- **Comparison**:
  ```
  OLD APPROACH (BROKEN):
  - Creates settlement transaction
  - Shows in transaction list
  - Original transaction stays at 100 CHF
  - Budget shows 100 CHF (wrong!)

  NEW APPROACH (CORRECT):
  - Internal account transfer
  - Hidden from transaction list
  - Original transaction reduced to 61.4 CHF
  - Budget shows 61.4 CHF (correct!) ✓
  ```

- **Files Modified**:
  - `src/lib/db.ts` - Added settlements table
  - `src/lib/settlement-api.ts` - Revised to use account transfer approach + reduce transaction amounts
  - `src/lib/transactions-api.ts` - Removed 'settlement' from Transaction type
  - `src/app/(tabs)/transactions.tsx` - Removed settlement transaction filtering and display
  - `src/components/DashboardWidgets.tsx` - Removed settlement badges and color handling
  - `src/lib/dashboard-helpers.ts` - Removed settlement color handling
  - `src/app/transactions/[id]/edit.tsx` - Removed settlement edit prevention

### FEATURE: Payee/Merchant Field with Smart Category Learning (2026-01-25)
- **Feature**: Added smart payee-category learning system that auto-fills categories based on previous usage
- **Privacy**: Payees and mappings are **personal to each user** (like categories) - not shared across household
- **How It Works**:
  1. **First Use**: User enters "Migros" → Manually selects "Groceries" → Mapping saved to their account
  2. **Second Use**: User enters "Migros" → "Groceries" auto-fills ✨
  3. **Learning**: If user changes category, mapping updates for next time
  4. **Personal**: Each user has their own payees and mappings

- **Database**:
  - Added `payee_category_mappings` table
  - Fields: userId (personal to user), payee (normalized lowercase for matching), displayName (original capitalization), categoryId, lastUsedAt, usageCount, timestamps
  - One mapping per payee per user (unique constraint)
  - displayName preserves user's original capitalization

- **Implementation**:
  - Created `src/lib/payee-mappings-api.ts` with learning logic:
    - `getCategorySuggestion(userId, payee)`: Looks up category for a payee
    - `savePayeeMapping(userId, payee, categoryId)`: Saves or updates payee-category association
  - Updated Add Transaction form with smart auto-fill:
    - Payee input triggers category suggestion
    - Modal picker shows only user's payees
  - Updated Edit Transaction form:
    - Saves updated mapping when category changes
    - Allows learning from edited transactions

- **UI/UX Features**:
  - **Smart Auto-Fill**: Category fills automatically when payee entered
  - **Personal Payees**: Each user sees only their own payees (like categories)
  - **Preserves Capitalization**: Shows payees exactly as you created them (e.g., "MIGROS" if created as "MIGROS")
  - **Case Insensitive Matching**: "Migros" = "migros" = "MIGROS" for lookups, but displays as originally created
  - **Whitespace Handling**: "Migros " = "Migros"
  - **Non-Invasive**: Can override auto-filled category anytime

- **Capitalization Examples**:
  ```
  Create "STARBUCKS" → Shows "STARBUCKS" in picker
  Create "netflix" → Shows "netflix" in picker
  Create "Amazon Prime" → Shows "Amazon Prime" in picker
  Entry "starbucks" matches and displays as "STARBUCKS"
  Entry "NETFLIX" matches and displays as "netflix"
  ```

- **Example Flows**:
  ```
  Test 1 - First Time:
  1. Enter "Migros"
  2. No auto-fill (first time)
  3. Select "Groceries"
  4. Save → Mapping created: "migros" → Groceries (saved to your account)

  Test 2 - Second Time:
  1. Enter "Migros"
  2. Category auto-fills to "Groceries" ✨
  3. Save → Usage count increments

  Test 3 - Different Users:
  1. Alexander adds "Migros" → "Groceries"
  2. Cecilia adds "Migros" → "Shopping" (her preference)
  3. Each user's payee list is independent
  ```

- **Edge Cases Handled**:
  - Empty payee: No mapping created
  - No category selected: No mapping saved
  - Transaction without payee: Works normally
  - First time payee: No auto-fill (learns on save)
  - Personal privacy: Each user's payees are private

- **Files Created**:
  - `src/lib/payee-mappings-api.ts` - Smart learning logic
  - `src/components/PayeePickerModal.tsx` - Full-screen modal picker

- **Files Modified**:
  - `src/lib/db.ts` - Added payee_category_mappings table (userId field)
  - `src/app/transactions/add.tsx` - Modal picker with smart auto-fill (userId-based)
  - `src/app/transactions/[id]/edit.tsx` - Modal picker with learning from edits (userId-based)

### FEATURE: Payee Picker Modal with Search and Create (2026-01-25)
- **Feature**: Enhanced payee selection with full-screen modal picker for better mobile UX
- **Privacy**: Shows only user's personal payees (not household-wide)
- **UI/UX Improvements**:
  - **Full-Screen Modal**: Dedicated search and selection interface
  - **Pressable Button**: Tap "Choose payee..." to open picker (replaces inline input)
  - **Search Bar**: Search existing payees with real-time filtering
  - **Usage Statistics**: Each payee shows usage count (e.g., "5 uses")
  - **Alphabetical Sorting**: Payees sorted A-Z for easy browsing
  - **Create New**: Type to create new payee on the spot with "Create 'X'" button
  - **Clear Button**: Easy clear button when payee selected
  - **Large Touch Targets**: 56px height buttons for mobile-friendly interaction
  - **Auto-Fill Integration**: Category still auto-fills when payee selected
  - **Personal Data**: Each user sees only their own payees

- **Implementation**:
  - Created `PayeePickerModal.tsx` component:
    - Full-screen modal with slide animation
    - Search functionality with autocomplete
    - Loads user's personal payees from both mappings and transactions
    - Displays usage count for each payee
    - Sorts payees alphabetically (A-Z)
    - Creates new payees inline
    - Empty state for first-time users
    - Creates new payees inline
    - Empty state for first-time users
  - Updated Add Transaction form:
    - Replaced inline TextInput with Pressable button
    - Opens modal on tap
    - Shows selected payee or "Choose payee..."
    - Clear button when payee selected
    - Category auto-fills on selection
  - Updated Edit Transaction form:
    - Same modal picker pattern
    - Pre-selects current payee
    - Maintains auto-fill functionality

- **Example Flow**:
  ```
  1. Tap "Choose payee..." button
  2. Modal opens with search bar
  3. See list of YOUR payees sorted alphabetically:
     - "Coop" (8 uses)
     - "Migros" (12 uses)
     - "Netflix" (3 uses)
  4. Type "Star" in search
  5. No matches found
  6. Tap "Create 'Starbucks'" button
  7. Payee filled, modal closes
  8. Category auto-fills if mapping exists ✨
  ```

- **Benefits**:
  - **Faster Entry**: Quick access to YOUR payees with alphabetical sorting
  - **Easy to Find**: A-Z sorting makes it easy to locate specific payees
  - **Consistent Naming**: See existing payees to avoid duplicates (no "Migros" vs "MIGROS")
  - **Mobile-Optimized**: Large touch targets, full-screen focus
  - **Usage Insights**: See how many times you've used each payee
  - **No Keyboard Overlap**: Dedicated modal prevents UI issues
  - **Privacy**: Your payees are private to you

### FEATURE: Payee/Merchant Field for Transactions (2026-01-25)
- **Feature**: Added optional payee/merchant field to track where money was spent
- **Use Cases**: Track specific vendors like "Migros", "Coop", "Netflix", "Restaurant La Piazza", etc.
- **Implementation**:
  - Updated database schema to add `payee` field (optional string)
  - Updated Transaction and CreateTransactionRequest interfaces to support payee
  - Added payee input field in Add Transaction form (after amount, before category)
  - Added payee input field in Edit Transaction form
  - Updated transaction list display to show payee prominently (bold, above category)
  - Updated dashboard Recent Transactions widget to show payee
  - CSV Import/Export now supports payee column
  - Auto-detection patterns: 'payee', 'merchant', 'vendor', 'store', 'shop'

- **UI/UX**:
  - Payee field appears after Amount and before Category
  - Placeholder text: "e.g., Migros, Coop, Netflix..."
  - Helper text: "Where did you spend this money?"
  - Field is optional - can be left blank
  - In transaction lists, payee shows in bold above the category name
  - Makes transactions easier to identify at a glance

- **CSV Import/Export**:
  - Payee column automatically detected from CSV headers
  - Supports common column names: payee, merchant, vendor, store, shop
  - Exported CSVs include Payee column
  - Format: Date, Type, Amount, Category, Account, Payee, Note

- **Files Modified**:
  - `src/lib/db.ts` - Added payee field to transactions schema
  - `src/lib/transactions-api.ts` - Updated interfaces and functions
  - `src/app/transactions/add.tsx` - Added payee input field
  - `src/app/transactions/[id]/edit.tsx` - Added payee input field
  - `src/app/(tabs)/transactions.tsx` - Display payee in list
  - `src/components/DashboardWidgets.tsx` - Display payee in Recent Transactions
  - `src/lib/import-export-api.ts` - CSV import/export support

- **Test Scenarios**:
  1. Add transaction without payee: Works normally ✓
  2. Add transaction with payee "Migros": Shows prominently in list ✓
  3. Edit transaction to add/change payee: Updates correctly ✓
  4. Transaction list shows payee in bold above category ✓
  5. CSV import with payee column: Auto-detects and imports ✓
  6. CSV export: Includes payee column ✓

### FEATURE: True Balance - Assets, Liabilities, and Net Worth Tracking (2026-01-25)
- **Feature**: Displays accurate financial position by separating Assets, Liabilities, and Net Worth
- **IMPORTANT**: Accounts/wallets are personal to each user (not household-wide)
  - Each user sees only their own accounts in the True Balance widget
  - Alexander's checking account ≠ Cecilia's checking account
  - Net Worth is calculated per user, not per household
- **Implementation**:
  - Created `src/lib/balance-api.ts` with `calculateTrueBalance(userId)` function
    - Queries user's personal accounts only (filtered by userId)
    - Asset types: Checking, Savings, Cash, Investment (positive balances = good)
    - Liability types: Credit Card (negative balances = debt)
    - Calculates net worth: Assets - Liabilities
  - Created `src/components/TrueBalanceWidget.tsx`
    - Three-section display: Assets, Liabilities, Net Worth
    - Shows individual accounts within each section with balances
    - Asset accounts show with 💰 icon and balance in CHF
    - Liability accounts show with 💳 icon and debt amount (as positive)
    - Net Worth displayed prominently in teal with large text
    - Auto-refreshes every 5 seconds
    - Liabilities section only shows when debt exists
  - Updated dashboard (`src/app/(tabs)/index.tsx`) to use TrueBalanceWidget
    - Replaced old TotalBalanceCard and summary cards
    - Widget positioned after welcome header

- **How It Works**:
  - Credit card expenses recorded immediately affect budget (correct behavior)
  - Credit card debt reduces net worth (correct financial position)
  - Credit card payments are transfers between accounts (don't affect budget)

- **Display Format**:
  - **Assets Section**: Lists all user's asset accounts with balances, shows total
  - **Liabilities Section**: Lists all user's credit cards with debt amounts (shown as positive), shows total debt
  - **Net Worth Section**: Large teal card showing user's true spendable amount (Assets - Liabilities)

- **Example Flow** (for a single user):
  1. Initial Setup:
     - Checking: 1,000 CHF
     - Credit Card: 0 CHF
     - Net Worth: 1,000 CHF

  2. Spend on Credit Card (100 CHF groceries):
     - Credit card balance: 0 → -100 CHF
     - Dashboard updates:
       - Assets: 1,000 CHF
       - Liabilities: 100 CHF
       - Net Worth: 900 CHF ✓
     - Budget: Groceries -100 CHF ✓

  3. Pay Credit Card Bill (100 CHF transfer):
     - Checking: 1,000 → 900 CHF
     - Credit Card: -100 → 0 CHF
     - Dashboard updates:
       - Assets: 900 CHF
       - Liabilities: 0 CHF (section hidden)
       - Net Worth: 900 CHF ✓
     - Budget: Unchanged (transfer doesn't affect budget) ✓

- **Files Created**:
  - `src/lib/balance-api.ts` - Balance calculation with asset/liability separation (per user)
  - `src/components/TrueBalanceWidget.tsx` - Dashboard widget component

- **Files Modified**:
  - `src/app/(tabs)/index.tsx` - Integrated TrueBalanceWidget

### FEATURE: Category Picker Modal with Search and Usage Stats (2026-01-25)
- **Feature**: Enhanced category selection with full-screen modal picker, replacing inline dropdown
- **UI/UX Improvements**:
  - **Full-Screen Modal**: Dedicated search and selection interface
  - **Search Bar**: Search categories in real-time with instant filtering
  - **Budget Remaining Display**: Shows remaining budget for each category (e.g., "CHF 45.50")
  - **Sorted by Budget**: Categories with most remaining budget appear first
  - **Friendly Group Names**: Category group labels show friendly names (Needs/Wants/Savings) instead of system IDs (custom_...)
  - **Icons**: Shows category icons for visual scanning
  - **Large Touch Targets**: 56px height buttons for mobile-friendly interaction
  - **Current Selection Highlighted**: Selected category shows in teal with border
  - **Type-Aware**: Only shows categories matching transaction type (income/expense)

- **Implementation**:
  - Created `CategoryPickerModal.tsx` component:
    - Full-screen modal with slide animation
    - Search functionality with real-time filtering
    - Loads user's personal categories (not household-wide)
    - Fetches current budget period and budget details for each category
    - Calculates budget remaining (allocatedAmount - spentAmount)
    - Maps category group IDs to friendly names (Needs, Wants, Savings) via getCategoryGroups API
    - Sorts by budget remaining descending (most budget first), then alphabetically
    - Shows friendly category group names as subtitles
    - Filters categories by transaction type (income vs expense)
  - Updated Add Transaction form:
    - Replaced inline category dropdown with modal button
    - Button shows "Select category" or selected category name
    - Opens full-screen modal on tap
    - Closes modal after selection
  - Updated Edit Transaction form:
    - Same modal picker pattern
    - Pre-selects current category
    - Maintains existing functionality

- **Example Flow**:
  ```
  1. Open Add Transaction form
  2. Tap "Select category" button (in Category field)
  3. Full-screen modal opens with search bar
  4. See all categories sorted by budget remaining:
     - "Groceries (CHF 245.50)" [Needs] ← most budget left
     - "Shopping (CHF 150.75)" [Wants]
     - "Entertainment (CHF 89.25)" [Wants]
     - "Utilities (CHF 45.00)" [Needs]
  5. Search: Type "groc" → filters to show only "Groceries"
  6. Tap "Groceries" → Modal closes, category selected
  7. Form shows "Groceries" in category field
  ```

- **Benefits**:
  - **Smart Prioritization**: Categories with more remaining budget appear first (helps allocate spending)
  - **Budget Awareness**: See exactly how much budget is left per category
  - **Clean UI**: Friendly category group names (Needs/Wants/Savings) instead of system IDs
  - **Easy Discovery**: Search filters long category lists instantly
  - **Visual Context**: Icons and category groups help identification
  - **Mobile-Optimized**: Full-screen modal with large touch targets
  - **Type Safety**: Only shows relevant categories for income/expense

- **Files Created**:
  - `src/components/CategoryPickerModal.tsx` - Full-screen modal with search and budget remaining display

- **Files Modified**:
  - `src/app/transactions/add.tsx` - Replaced inline dropdown with modal picker
  - `src/app/transactions/[id]/edit.tsx` - Same modal picker pattern

### FEATURE: Removed Income/Expenses Summary Cards (2026-01-25)
- **Feature**: Removed the two summary cards (Income and Expenses) from the top of the Transactions tab
- **Reason**: Streamlined the UI for a cleaner, simpler transactions list view
- **Files Modified**:
  - `src/app/(tabs)/transactions.tsx` - Removed the summary cards section

### FEATURE: Expense Splitting Settings - Global Split Ratio Management (2026-01-25)
- **Feature**: Create settings screen where users can manage how shared expenses are split between household members
- **Goal**: Allow users to configure split ratios (automatic income-based or manual custom percentages) that apply to all future shared expenses

**Behavior:**
- **Automatic mode**: Calculate split from monthly incomes (e.g., 60/40 based on 5200/3500 CHF incomes)
- **Manual mode**: User sets custom percentages (e.g., 50/50, 70/30)
- **Future-only changes**: Changing split affects ONLY new transactions, existing debt/splits remain unchanged (Option B)
- **Visibility**: Only visible when household has 2+ active members
- **Shared settings**: Both household members see and can edit the same settings

**Database Schema Changes:**
- Added to `households` table:
  - `splitMethod`: `string` (optional) - "automatic" or "manual"
  - `manualSplitRatios`: `json` (optional) - JSON object mapping userId to percentage (e.g., `{ userId1: 60, userId2: 40 }`)

**Implementation:**

1. **Split Settings API** (`src/lib/split-settings-api.ts`):
   - `getSplitSettings(householdId)`: Get current split settings for household
     - Returns `null` if household has < 2 members
     - Returns split method and calculated/manual percentages for each member
   - `updateSplitSettings(householdId, splitMethod, manualRatios?)`: Update split settings
     - Validates manual ratios total 100%
     - Saves to households table
   - `getCurrentSplitRatio(householdId)`: Get split ratio for creating new shared expenses
     - Used by `createExpenseSplits` to apply correct percentages

2. **Shared Expenses API Update** (`src/lib/shared-expenses-api.ts`):
   - Modified `calculateSplitRatio()` to use split settings instead of always calculating from income
   - Now uses `getCurrentSplitRatio()` from split-settings-api
   - Maintains backward compatibility with income field for existing code

3. **Split Settings Screen** (`src/app/settings/split-settings.tsx`):
   - Full-screen settings interface with automatic/manual mode toggle
   - **Current Split Display**: Shows current percentages for each member
   - **Automatic Mode**: Shows income-based split with "Calculated from monthly income ratio" label
   - **Manual Mode Editor**:
     - First person's percentage is editable
     - Second person's percentage auto-calculates (100 - first)
     - Validation: Total must equal 100%
     - Cannot save if validation fails
   - **Toggle Button**: Switch between Automatic and Manual modes
   - **Save Button**: Applies settings to future shared expenses
   - **Info Section**: Explains how automatic/manual modes work

4. **Profile Tab Menu Item** (`src/app/(tabs)/two.tsx`):
   - Added "Expense Splitting" menu item (Users icon)
   - Only visible when household has 2+ active members
   - Positioned after "Payday & Budget Period"
   - Shows description: "Manage how shared expenses are divided"

**User Flows:**

**Test 1 - View Current Split (Automatic):**
1. Alexander opens Profile → Expense Splitting
2. Sees: Alexander 60%, Cecilia 40%
3. Shows "Automatic" mode label
4. Shows "Calculated from monthly income ratio"

**Test 2 - Switch to Manual 50/50:**
1. Tap "Switch to Manual"
2. Mode changes to "Manual"
3. See inputs: Alexander 60%, Cecilia 40%
4. Change Alexander to: 50%
5. Cecilia auto-updates to: 50%
6. Total shows: 100% ✓
7. Tap "Save"
8. Success message shown
9. Future shared expenses use 50/50

**Test 3 - Manual Custom Split:**
1. In manual mode
2. Set Alexander: 70%
3. Cecilia auto-calculates: 30%
4. Save
5. New shared expenses use 70/30

**Test 4 - Back to Automatic:**
1. In manual mode (50/50 set)
2. Tap "Switch to Automatic"
3. Shows income-based: 60/40
4. Save
5. Future expenses use 60/40 (income-based)

**Test 5 - Existing Debt Unchanged:**
1. Current debt: 150 CHF (from old 60/40 splits)
2. Change split to 50/50
3. Debt still shows: 150 CHF ✓
4. Add new 100 CHF shared expense
5. New expense uses 50/50 split
6. Debt increases by 50 CHF (not 40 CHF)

**Test 6 - Solo User:**
1. User with no household members
2. Profile menu does NOT show "Expense Splitting" ✓

**Test 7 - Member Can See/Edit:**
1. Cecilia opens Expense Splitting
2. Can see current split
3. Can change to manual
4. Can save changes
5. Both users see updated split

**Edge Cases Handled:**
- No incomes set (automatic): Defaults to 50/50 even split
- Invalid manual percentages: Cannot save, shows error
- Switching modes doesn't lose data: Settings preserved
- Settings shared across household: Both members see same values
- Only affects future transactions: Existing debt unchanged

**Benefits:**
- **Flexibility**: Choose automatic (fair based on income) or manual (custom arrangement)
- **Simplicity**: Easy percentage editor with auto-calculation
- **Transparency**: Both members see and agree on split settings
- **Stability**: Existing debt unchanged, no retroactive recalculations
- **Smart defaults**: Automatic mode uses income ratios for fair splitting
- **Real-time updates**: Split percentages automatically update when budget income changes

**Implementation Notes:**
- Automatic mode reads from `budgetSummary.totalIncome` (most recent for each user)
- This ensures split percentages always reflect current budget settings
- When users update their monthly income in budget setup, split percentages update automatically
- User names are fetched from `users` table for proper display

**Files Created:**
- `src/lib/split-settings-api.ts` - Split settings management API
- `src/app/settings/split-settings.tsx` - Split settings screen

**Files Modified:**
- `src/lib/db.ts` - Added splitMethod and manualSplitRatios to households schema
- `src/lib/shared-expenses-api.ts` - Updated calculateSplitRatio to use split settings
- `src/app/(tabs)/two.tsx` - Added Expense Splitting menu item (conditional on 2+ members)

### FIX: Restored Debt Balance Widget to Dashboard (2026-01-25)
- **Issue**: Debt settlement widget disappeared from dashboard for all members
- **Fix**: Added `<DebtBalanceWidget />` back to the dashboard, positioned above True Balance Widget
- **Improvement**: Widget now always shows for 2+ member households, even when balance is 0
- **Location**: Dashboard (Home tab) - appears between Welcome Header and True Balance (Assets) section
- **Visibility**:
  - Shows for all households with 2+ members
  - Displays "All settled up!" when balance is 0.00 CHF
  - Shows debt amount and settlement button when balance > 0
- **States**:
  - **Settled (0 CHF)**: Green card showing "All settled up! ✓" with 0.00 CHF balance
  - **Debt exists**: White card showing amount owed with "Settle Debt" button for the payer
  - **Owed to you**: White card showing amount owed to you (no button)
- **Files Modified**:
  - `src/app/(tabs)/index.tsx` - Added DebtBalanceWidget component above TrueBalanceWidget
  - `src/components/DebtBalanceWidget.tsx` - Always show widget for 2+ member households, display "settled" state when balance is 0

### FIX: Members Now Only See Their Own Transactions (2026-01-25)
- **Issue**: Members were seeing transactions from other household members (including admin), even when those transactions were personal
- **Expected Behavior**: Members should only see their own transactions in the Transactions tab
- **Fix**: Updated transaction filtering logic to only show transactions created by the current user
- **Impact**:
  - Members now see ONLY their own transactions (both personal and shared)
  - Members do NOT see other members' transactions, even if marked as shared
  - Each member has a private view of their own spending
  - Shared expenses are still tracked in the debt settlement system
- **Files Modified**:
  - `src/lib/transactions-api.ts` - Updated `getHouseholdTransactionsWithCreators` filter to show only user's own transactions

### FIX: Removed periodStart/periodEnd from Budget Schema - Made Budgets "Timeless" (2026-01-27)

**Critical Bug Fixed**: Budget queries were failing after payday changes, causing budget spent amounts to show as 0 CHF even when expenses existed.

#### Root Cause
The `budgets` and `budgetSummary` tables stored `periodStart` and `periodEnd` fields. When users changed their payday:
1. Budget period was recalculated dynamically (e.g., from "2025-12-25 to 2026-01-24" → "2026-01-06 to 2026-02-05")
2. Existing budgets still had OLD period dates stored (e.g., `periodStart: "2025-12-25"`)
3. Budget queries filtered by NEW period dates (e.g., `periodStart: "2026-01-06"`)
4. No budgets matched → spent amounts showed as 0 CHF

#### Solution: "Timeless" Budgets
Removed `periodStart` and `periodEnd` from the database schema entirely. Budgets now define WHAT to track (allocations per category), not WHEN. Period filtering happens only when querying transactions:

**Before (BROKEN)**:
```typescript
// Budgets table had: periodStart, periodEnd
// Query looked for: budgets WHERE userId AND periodStart="2026-01-06"
// This failed when stored periodStart was "2025-12-25"
```

**After (FIXED)**:
```typescript
// Budgets table: userId, categoryId, allocatedAmount, spentAmount, isActive
// Query uses: budgets WHERE userId AND categoryId AND isActive=true
// Period filtering ONLY on transactions, not budgets
```

#### Schema Changes

**`budgets` table** - Removed:
- `periodStart` (removed)
- `periodEnd` (removed)

**`budgetSummary` table** - Removed:
- `periodStart` (removed)
- `periodEnd` (removed)
- Added: `isActive` (boolean, optional)

#### Code Changes

**Files Modified:**
1. **`src/lib/db.ts`**
   - Removed `periodStart` and `periodEnd` from `budgets` entity
   - Removed `periodStart` and `periodEnd` from `budgetSummary` entity
   - Added `isActive` field to `budgetSummary` entity

2. **`src/lib/budget-api.ts`**
   - `saveBudget()`: Changed budget deletion query from `periodStart` filter to `isActive: true`
   - `saveBudget()`: Removed `periodStart`/`periodEnd` from budget creation
   - `resetBudgetForNewPeriod()`: Changed query to filter by `isActive: true` instead of `periodEnd`
   - `resetMemberBudgetIfNeeded()`: Changed query to filter by `isActive: true` instead of `periodEnd`

3. **`src/lib/transactions-api.ts`**
   - `createTransaction()`: Changed budget query from `periodStart` filter to `isActive: true`
   - `deleteTransaction()`: Changed budget query from `periodStart` filter to `isActive: true`
   - `updateTransaction()`: Changed all budget queries (old category, new category, amount change) from `periodStart` filter to `isActive: true`

4. **`src/lib/settlement-api.ts`**
   - `createSettlement()`: Changed budget query from `periodStart` filter to `isActive: true`

#### How It Works Now

1. **Budget Creation**: User sets allocations per category → budgets created with `isActive: true` (no period dates)
2. **Transaction Created**: System queries `budgets WHERE userId AND categoryId AND isActive: true` → updates `spentAmount`
3. **Spent Calculation**: Filters transactions by date range (from dynamic period calculation) → sums amounts → updates budget
4. **Payday Change**: Period recalculates dynamically → same budgets still match (because query uses `isActive: true`, not period dates)

#### Benefits

✅ **Payday changes work correctly**: Budgets persist across payday changes without showing 0 CHF
✅ **No stale period dates**: Period always calculated dynamically from `paydayDay` setting
✅ **Simpler architecture**: Period is a query-time concern, not a storage concern
✅ **Auto-reset still works**: When new month starts, period shifts forward automatically
✅ **Budget updates work**: Transactions update budget spent amounts correctly regardless of payday setting

#### Testing

After this fix:
- ✅ Changing payday from 27 → 28 → 6 no longer causes budget to show 0 CHF
- ✅ Transactions dated within current period correctly update budget spent amounts
- ✅ Budget period dates display correctly (from dynamic calculation)
- ✅ All budget queries work without period date filters

---

## Recent Changes

### UI/UX Improvements: Shared Expense Toggle Visibility (2026-01-28)

**Problem**: User reported two issues with shared expense feature:
1. Share toggle in Add Transaction screen was too bright/hard to see
2. Edit Transaction screen was missing the share toggle entirely

**The Fix**:

**1. Add Transaction Screen (`src/app/transactions/add.tsx`):**
- Improved shared expense toggle visibility:
  - Changed from border-top design to rounded card with background
  - Added `rounded-xl border-2 border-gray-200 bg-gray-50` styling
  - Updated Switch colors:
    - Inactive (off): `#E5E7EB` (lighter gray, more visible)
    - Active (on): `#059669` (emerald green)
  - Added `ios_backgroundColor="#E5E7EB"` for iOS consistency
  - Result: Toggle now has clear visual separation and better contrast

**2. Edit Transaction Screen (`src/app/transactions/[id]/edit.tsx`):**
- **Added complete shared expense functionality** (was missing):
  - Imported `Switch` and `createExpenseSplits` / `calculateSplitRatio` from shared-expenses-api
  - Added shared expense state: `isShared` and `paidByUserId`
  - Added queries:
    - `householdMembersQuery`: Load all active household members
    - `splitRatiosQuery`: Calculate split percentages
  - Updated FormData interface to include `isShared?` and `paidByUserId?`
  - Pre-fill shared state from transaction data when editing
  - Auto-select current user as payer when members load
  - Updated mutation to save shared expense data and create splits
  - Added UI controls (matching add screen):
    - Shared expense toggle (only for expense type, 2+ members)
    - Split preview box showing percentages
    - "Who paid?" selector with member cards
  - Positioning: Added after recurring controls, before "Exclude from Budget"

**Visual Improvements**:
- Both screens now use consistent card design for shared expense toggle
- Better contrast and visibility with lighter gray background
- Clearer distinction between on/off states
- Professional rounded styling matching app aesthetic

**Files Modified**:
- `src/app/transactions/add.tsx`: Enhanced toggle visibility
- `src/app/transactions/[id]/edit.tsx`: Added full shared expense support
- `README.md`: Documented changes

**Result**:
- ✅ Share toggle now clearly visible in Add Transaction screen
- ✅ Edit Transaction screen now supports editing shared expense properties
- ✅ Users can convert personal expenses to shared (or vice versa) when editing
- ✅ Consistent UX between add and edit flows

### ENHANCEMENT: Settlement Wallet Selection (2026-01-28)

**Feature**: Added wallet selection dropdowns to the Settlement Screen so users can specify which wallets are involved in the settlement transaction.

**Problem**: Previously, the settlement screen automatically selected the first available wallet for both payer and receiver. Users needed the ability to choose specific wallets for the settlement.

**Implementation**:

**1. Settlement Screen (`src/app/settlement.tsx`):**
- Added new state variables:
  - `yourWalletId` - Selected wallet for current user
  - `partnerWalletId` - Selected wallet for partner
  - `showYourWalletPicker` - Modal visibility for your wallet picker
  - `showPartnerWalletPicker` - Modal visibility for partner's wallet picker

- Added new queries:
  - `partnerAccountsData` - Fetches partner's wallets from database
  - Default wallet auto-selection when data loads

- Added wallet selection UI:
  - **Your Wallet dropdown**: Shows current user's wallets with name, balance
  - **Partner's Wallet dropdown**: Shows partner's wallets with name, balance
  - Labels change based on debt direction:
    - If you owe: "Pay From (Your Wallet)" / "Send To (Partner's Wallet)"
    - If you're owed: "Receive In (Your Wallet)" / "From (Partner's Wallet)"

- Added wallet picker modals:
  - Page sheet presentation with close button
  - List of wallets showing: name, institution, balance
  - Selected wallet highlighted with checkmark
  - Teal color for your wallet, blue for partner's wallet

- Updated settlement mutation:
  - Uses selected wallet IDs instead of auto-selecting first wallet
  - Correctly determines payer/receiver based on debt direction
  - Validates both wallets are selected before allowing settlement

- Updated settle button:
  - Text changes based on debt direction: "Pay X CHF" vs "Confirm Received X CHF"
  - Disabled until both wallets are selected

**UI Design**:
```
┌─────────────────────────────────────┐
│ Settlement Details                  │
│                                     │
│ Pay From (Your Wallet):            │
│ ┌─────────────────────────────────┐│
│ │ 💳 UBS Checking                 ▼│
│ │    2,500.00 CHF                 ││
│ └─────────────────────────────────┘│
│                                     │
│ Send To (Alexander's Wallet):      │
│ ┌─────────────────────────────────┐│
│ │ 💳 Revolut                      ▼│
│ │    1,200.00 CHF                 ││
│ └─────────────────────────────────┘│
│                                     │
│ Selected expenses: 3 of 3          │
│ ─────────────────────────────────  │
│ Settlement Amount: 105.36 CHF      │
└─────────────────────────────────────┘
```

**Files Modified**:
- `src/app/settlement.tsx`: Added wallet selection dropdowns and picker modals

**Result**:
- ✅ Users can select which wallet to pay from or receive into
- ✅ Partner's wallets are visible and selectable
- ✅ Clear labels indicate payment direction (pay vs receive)
- ✅ Default wallet auto-selected but changeable
- ✅ Both wallets must be selected to enable settlement button

### ENHANCEMENT: Improved Share Toggle Visibility (2026-01-28)

**Problem**: The share expense toggle was hard to see - too subtle styling.

**The Fix**:

**Both Add and Edit Transaction Screens:**
- Enhanced toggle container with dynamic styling based on state:
  - OFF state: White background, gray border (`border-gray-300 bg-white`)
  - ON state: Teal background, teal border (`border-teal-600 bg-teal-50`)
- Updated text colors to match state:
  - OFF: Gray text (`text-gray-900`, `text-gray-600`)
  - ON: Teal text (`text-teal-700`, `text-teal-600`)
- Improved Switch component colors:
  - Track OFF: `#9CA3AF` (more visible gray)
  - Track ON: `#0D9488` (teal)
  - Thumb changes based on state for better visual feedback

**Files Modified**:
- `src/app/transactions/add.tsx`: Improved toggle styling
- `src/app/transactions/[id]/edit.tsx`: Improved toggle styling (matching)

**Result**:
- ✅ Toggle now has clear visual distinction between on/off states
- ✅ Entire container changes appearance when toggled
- ✅ Much better visibility and contrast
- ✅ Consistent styling across add and edit screens
