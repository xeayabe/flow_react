# Flow - Budget Tracker Application

A beautiful iOS mobile app for calm financial control. Track expenses with your household using a premium, minimalist design.

## Features

### Welcome Experience
- ✅ Premium welcome screen with Flow branding
- ✅ Smooth animations with flowing water droplets forming currency symbols
- ✅ Deep teal and sage green aesthetic
- ✅ Material Design 3 filled button with elegant interactions

### Authentication
- ✅ Email magic code signup and login
- ✅ Passwordless authentication (more secure)
- ✅ Email verification required
- ✅ Profile check on login to prevent unauthorized access
- ✅ Auto-login after signup
- ✅ Protected routes with auth guards
- ✅ Material Design 3 signup form with floating labels
- ✅ Material Design 3 login form with FaceID/TouchID support
- ✅ Empathetic error design with calming color palette (no harsh reds)
- ✅ Real-time validation with supportive feedback
- ✅ Password strength suggestions in soft lavender chips
- ✅ Celebratory success modal with confetti animation
- ✅ Smooth onboarding experience with professional animations

### User Management
- ✅ User profiles with email and name
- ✅ Default household creation on signup
- ✅ Automatic household member assignment

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

## Tech Stack

- **Frontend**: Expo SDK 53, React Native 0.76.7
- **Database**: InstantDB (real-time database)
- **Styling**: NativeWind + TailwindCSS v3
- **State Management**: React Query + Zustand
- **Authentication**: Passwordless magic code authentication via InstantDB
- **Security**: Email verification, profile validation

## Project Structure

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigator
│   │   ├── index.tsx         # Dashboard screen
│   │   └── two.tsx           # Profile screen
│   ├── _layout.tsx           # Root layout with auth routing
│   ├── welcome.tsx           # Welcome screen (first screen)
│   ├── signup.tsx            # Signup screen
│   └── login.tsx             # Login screen
├── lib/
│   ├── db.ts                 # InstantDB configuration & schema
│   ├── auth-api.ts           # Authentication API functions
│   └── cn.ts                 # Utility for className merging
└── components/
    └── Themed.tsx            # Themed components
```

## Authentication Flow

1. **Welcome Screen**:
   - Beautiful first impression with Flow branding
   - Animated water droplets forming currency symbols
   - Single "Get Started" button to begin signup flow
   - Automatic redirect to dashboard if already logged in

2. **Signup**:
   - User fills signup form with email and name
   - Validation rules enforced:
     - Email must be valid format
     - Email must not already be registered
     - Name minimum 2 characters
     - Terms must be accepted
   - Magic code sent to email via InstantDB
   - User enters 6-digit verification code
   - Upon verification:
     - User profile created in database
     - Default household created automatically
     - HouseholdMember record created linking user to household
     - User auto-logged in
   - Redirect to dashboard

3. **Login**:
   - User enters email
   - System checks if user profile exists in database:
     - If no profile: Show error "No account found with this email. Please sign up first."
     - If profile exists: Send magic code to email via InstantDB
   - User enters 6-digit verification code
   - Upon successful verification: User logged in → redirect to dashboard
   - **Important**: Users CANNOT receive a login code unless they have already signed up
   - **Security**: Passwordless authentication only - no passwords collected or validated

4. **Auth Guards**:
   - Unauthenticated users redirected to signup
   - Authenticated users redirected to dashboard
   - Auth state managed by InstantDB SDK

## Key Security Features

- **Passwordless Authentication**: Uses InstantDB Magic Codes - more secure than passwords
- **No Password Storage**: No passwords stored in database or transmitted
- **Email Verification Required**: Users must verify email to authenticate
- **Profile Check on Login**: Ensures only registered users can access the app
- **Duplicate Email Prevention**: Checks for existing accounts during signup

## Environment Variables

```
EXPO_PUBLIC_INSTANTDB_APP_ID=your-app-id
INSTANTDB_ADMIN_TOKEN=your-admin-token
```

## Running the App

```bash
bun start
```

## Design Principles

- **Premium iOS Design**: Follows Apple's Human Interface Guidelines
- **Calm & Empathetic**: Deep teal (#006A6A) and sage green color palette
- **Material Design 3**: Modern rounded corners, subtle shadows, and smooth interactions
- **Mobile-first**: Designed specifically for iOS with touch-optimized interactions
- **Generous Whitespace**: Clean, uncluttered layouts that breathe
- **Smooth Animations**: React Native Reanimated for fluid, delightful micro-interactions
- **Accessible**: Proper form labels, error messages, and keyboard handling

## Next Steps

- [ ] Add expense tracking functionality
- [ ] Implement household member invitations
- [ ] Add expense categories and receipts
- [ ] Build settlement/splitting logic
- [ ] Add notifications for new expenses
- [ ] Implement forgot password flow
- [ ] Add email verification
- [ ] Create expense reports and analytics
