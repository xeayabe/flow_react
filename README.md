# Expense Sharing Application

A modern expense sharing app built with Expo, React Native, and InstantDB.

## Features

### Authentication
- ✅ Email/Password signup with validation
- ✅ Secure password hashing with bcrypt
- ✅ Custom authentication using InstantDB Admin SDK
- ✅ Auto-login after signup
- ✅ Protected routes with auth guards

### User Management
- ✅ User profiles with email and name
- ✅ Default household creation on signup
- ✅ Automatic household member assignment

### Database Schema (InstantDB)

#### Users
- `id`: UUID (primary key)
- `email`: String (unique)
- `passwordHash`: String
- `name`: String
- `emailVerified`: Boolean (default: false)
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
- **Authentication**: Custom email/password with InstantDB Admin SDK
- **Security**: bcryptjs for password hashing

## Project Structure

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigator
│   │   ├── index.tsx         # Dashboard screen
│   │   └── two.tsx           # Profile screen
│   ├── _layout.tsx           # Root layout with auth routing
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

1. **Signup**:
   - User fills signup form with email, password, name
   - Validation rules enforced:
     - Email must be valid format and unique
     - Password minimum 8 characters
     - Password must contain uppercase letter and number
     - Passwords must match
     - Terms must be accepted
   - Password is hashed with bcrypt
   - User record created in InstantDB
   - Default household created automatically
   - HouseholdMember record created linking user to household
   - Auth token generated and user auto-logged in
   - Redirect to dashboard

2. **Login**:
   - User enters email and password
   - Password verified against hash
   - Auth token generated
   - Redirect to dashboard

3. **Auth Guards**:
   - Unauthenticated users redirected to signup
   - Authenticated users redirected to dashboard
   - Auth state managed by InstantDB SDK

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

- **Mobile-first**: Designed for iOS with clean, modern aesthetics
- **User-friendly**: Clear validation messages and intuitive UI
- **Secure**: Password hashing, validation, and protected routes
- **Real-time**: InstantDB enables real-time data sync across devices
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
