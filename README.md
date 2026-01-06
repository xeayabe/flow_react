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
- `createdAt`: Timestamp

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
│   │   └── two.tsx           # Profile screen
│   ├── accounts/
│   │   ├── add.tsx           # Add Wallet modal (Material Design 3)
│   │   └── index.tsx         # Wallets list screen
│   ├── settings/
│   │   ├── index.tsx         # Settings home page with menu
│   │   └── categories.tsx    # Categories management page
│   ├── _layout.tsx           # Root layout with auth routing
│   ├── welcome.tsx           # Welcome screen (first screen)
│   ├── signup.tsx            # Passwordless signup screen
│   └── login.tsx             # Passwordless login with biometric quick-login
├── lib/
│   ├── db.ts                 # InstantDB configuration & schema
│   ├── auth-api.ts           # Auth API with rate limiting & lockout
│   ├── accounts-api.ts       # Account management API
│   ├── categories-api.ts     # Categories management API
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

1. **Dashboard** (`/` or `/(tabs)`)
   - Main app screen showing all wallets
   - Settings button (⚙️) in top-right corner
   - Click to access Settings menu

2. **Settings** (`/settings`)
   - User profile section with avatar and email
   - Menu items:
     - **Wallets** → `/accounts` - Manage bank accounts and wallets
     - **Categories** → `/settings/categories` - Organize income/expense categories
     - **Profile** → Coming soon
   - Sign Out button at bottom

3. **Categories Management** (`/settings/categories`)
   - View all categories organized by type (Income, Needs, Wants, Savings, Other)
   - Add new category button (+) in top-right
   - Click category to edit (custom categories only)
   - Delete custom categories (default categories are read-only)
   - Back button returns to Settings

### Quick Access Paths

| Screen | Route | How to Access |
|--------|-------|---------------|
| Dashboard | `/` | App default/home |
| Settings | `/settings` | Settings icon on Dashboard |
| Categories | `/settings/categories` | Settings > Categories |
| Wallets | `/accounts` | Settings > Wallets |

## Design Principles

- **Premium iOS Design**: Follows Apple's Human Interface Guidelines
- **Calm & Empathetic**: Deep teal (#006A6A) and sage green color palette
- **Material Design 3**: Modern rounded corners, subtle shadows, and smooth interactions
- **Mobile-first**: Designed specifically for iOS with touch-optimized interactions
- **Generous Whitespace**: Clean, uncluttered layouts that breathe
- **Smooth Animations**: React Native Reanimated for fluid, delightful micro-interactions
- **Accessible**: Proper form labels, error messages, and keyboard handling

## Next Steps

- [ ] Add expense tracking functionality (transactions/expenses with categories)
- [ ] Implement household member invitations
- [ ] Add receipt attachment to expenses
- [ ] Build settlement/splitting logic for shared expenses
- [ ] Add notifications for new expenses
- [ ] Implement forgot password flow
- [ ] Add email verification for additional security
- [ ] Create expense reports and analytics
- [ ] Phase 2: Implement shareable categories for household splitting
