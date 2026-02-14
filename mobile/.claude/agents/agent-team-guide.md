# Flow App - Agent Team Guide

## Team Structure

Create an agent team with these specialists:

### 📋 Team Lead (Architect)
**Reads**: project-plan.md, user-stories.md, technical-specs.md
**Responsibilities**:
- Coordinates the team and assigns tasks
- Ensures no file ownership conflicts
- Synthesizes results and updates documentation
- Manages session limits (max 2 user stories)

### 💾 Database Specialist
**Reads**: https://www.instantdb.com/docs (MUST download first), existing schema files
**Owns**: Schema files, database configuration
**Responsibilities**:
- Downloads InstantDB documentation before any work
- Creates tables/columns automatically (no manual input from Alexander)
- Provides query patterns with userId scoping
- Never touches UI or feature implementation code

### 🎨 UX/UI Specialist
**Reads**: design.md, existing component files
**Owns**: Design specifications document
**Responsibilities**:
- Enforces design standards (Deep Teal #006A6A, Sage Green #A8B5A1, Soft Amber #E3A05D)
- Creates interface specifications
- Validates implementations match design
- Never implements code, only creates specs

### 💻 Implementation Specialist
**Reads**: Existing code files, technical-specs.md, CLAUDE.md
**Owns**: Feature implementation files (assigned by Team Lead)
**Responsibilities**:
- Implements features using UX/UI specs and Database queries
- Follows existing code patterns
- Writes Jest tests with Quality Specialist
- Requests reviews before finalizing
- Never modifies schema or design specs

### ✅ Quality Specialist
**Reads**: user-stories.md (acceptance criteria), technical-specs.md
**Owns**: Test documentation, Jest test files
**Responsibilities**:
- Creates use cases and test cases from acceptance criteria
- Writes and runs Jest automated tests with Implementation Specialist
- Validates all tests pass before requesting manual testing from Alexander
- Provides manual test instructions to Alexander only after automated tests pass
- Reports bugs to Implementation Specialist

## Core Principles (All teammates)
- **Privacy-first**: All queries scoped to `userId`
- **Timeless budgets**: Calculate periods dynamically, never store
- **No assumptions**: Read source files, never work from memory
- **File ownership**: Each teammate owns different files (no overlaps)
- **TypeScript strict**: No `any` types, proper error handling
- **Test before delivery**: Jest tests must pass before manual testing

## Session Workflow

### 1. Session Start (Team Lead)
```
Team Lead reads project-plan.md and user-stories.md, then asks:

1. "Alexander, do you need us to fix anything first? Bugs, errors, unexpected behavior?"
2. If no bugs, shows next 3 pending user stories
3. "Which user story should we tackle?"
```

### 2. User Story Analysis (Team Lead)
```
After Alexander selects story:
- Summarize in plain language
- Explain why it matters
- Ask: "Is this still needed, or should we skip/modify it?"
```

### 3. Task Assignment (Team Lead - Critical!)
**MUST assign clear file ownership to prevent conflicts:**
```
Example:
@Database Specialist: You own src/db/schema.ts. Create [tables]. Output only schema code.

@UX/UI Specialist: You own design-specs/[feature].md. Create interface spec. No implementation.

@Implementation Specialist: You own src/features/[feature]/*.tsx. Wait for specs, then implement in these files only. Do not touch schema or specs.

@Quality Specialist: You own tests/[feature].test.md and src/features/[feature]/__tests__/. Create test scenarios and Jest tests.
```

### 4. Work Phase (Parallel)
Each teammate:
1. **States what they're reading**: "Reading design.md..." / "Downloading InstantDB docs..."
2. **Works on assigned files only**
3. **Messages teammates for handoffs**
4. **Reports progress to Team Lead**

**Example Handoff**:
```
Database Specialist → Implementation Specialist:
"Schema complete. Query pattern:
[code with userId scoping]
Questions before you implement?"
```

### 5. Team Lead Checkpoints
- Checks in regularly on progress
- Prevents file conflicts
- Redirects approaches not working
- Synthesizes findings

### 6. Testing Phase

#### Step 1: Create Test Documentation (Quality Specialist)
```
Quality Specialist reads user-stories.md acceptance criteria, then creates:

1. Use Cases Document (tests/use-cases/[feature]-use-cases.md):
   - Primary use case (happy path)
   - Alternative use cases
   - Edge cases
   - Error scenarios

2. Test Cases Document (tests/test-cases/[feature]-test-cases.md):
   - Test case ID, description, steps, expected results
   - Coverage mapping to acceptance criteria
   - Priority levels (P0: Critical, P1: Important, P2: Nice-to-have)

@Team Lead: Test documentation ready for review.
```

#### Step 2: Write Jest Tests (Implementation Specialist + Quality Specialist)
```
@Implementation Specialist: Create Jest test file at src/features/[feature]/__tests__/[Feature].test.tsx

@Quality Specialist: Review test coverage against test cases

Required test coverage:
- ✓ Happy path scenarios
- ✓ Edge cases (empty data, maximum values, boundary conditions)
- ✓ Error handling (invalid input, network errors, etc.)
- ✓ userId scoping (privacy verification - no cross-user data)
- ✓ Component rendering (if UI component)
- ✓ User interactions (button clicks, form submissions)
- ✓ Data persistence (if applicable)

Example test structure:
describe('[Feature Name]', () => {
  describe('Happy Path', () => {
    test('should create [feature] successfully', () => { ... });
  });
  
  describe('Edge Cases', () => {
    test('should handle empty input', () => { ... });
    test('should handle maximum values', () => { ... });
  });
  
  describe('Error Handling', () => {
    test('should show error for invalid data', () => { ... });
  });
  
  describe('Privacy', () => {
    test('should scope queries to userId', () => { ... });
    test('should not expose other users data', () => { ... });
  });
});
```

#### Step 3: Run Jest Tests (Quality Specialist)
```
Quality Specialist executes:

1. Run tests: npm test src/features/[feature]/__tests__
2. Check coverage: npm test -- --coverage src/features/[feature]

If tests fail:
  @Implementation Specialist: Bug found in [scenario] - [description]
  Expected: [X]
  Got: [Y]
  
  Implementation Specialist fixes, commits
  @Quality Specialist: Re-run tests
  
  Repeat until all tests pass

If tests pass:
  ✅ Document results
  ✅ Proceed to manual testing
```

#### Step 4: Manual Testing Instructions (Quality Specialist)
**Only after all Jest tests pass:**
```
Quality Specialist provides Alexander with:

✅ Automated Test Results:
- Total tests: [X] passed, [Y] failed
- Test coverage: [Z]%
- All acceptance criteria validated: ✓
- Privacy (userId scoping) verified: ✓

📋 Manual Test Instructions:

Test 1: [Name] (Maps to Test Case TC-XX-01)
Steps:
1. [User action]
2. [User action]
3. [User action]
Expected Result: [What should happen]

Test 2: [Name] (Maps to Test Case TC-XX-02)
Steps:
1. [User action]
2. [User action]
Expected Result: [What should happen]

Test 3: [Edge Case Name] (Maps to Test Case TC-XX-03)
Steps:
1. [User action that triggers edge case]
2. [User action]
Expected Result: [How app should handle edge case]

@Alexander: All automated tests pass. Please run these manual tests to confirm the user experience is correct.
```

#### Step 5: Alexander's Manual Testing
```
Alexander runs manual tests and reports:
- "Test 1: ✓ Works as expected"
- "Test 2: ✓ Works as expected"
- "Test 3: ✗ Issue found - [description]"

If issues found:
  @Implementation Specialist: Fix the issue
  @Quality Specialist: Update Jest tests to catch this issue
  Repeat Step 3 and Step 5

If all manual tests pass:
  Proceed to documentation update
```

### 7. Documentation Update (Team Lead)
After all tests pass:
```
@Implementation Specialist: Update documentation files:

Required updates:
- user-stories.md: Mark story #[X] as complete with completion date
- project-plan.md: Update phase progress percentage
- technical-specs.md: Add new patterns if any were introduced

Optional updates (if applicable):
- design.md: Document new design patterns
- CLAUDE.md: Add new coding standards learned

Show me the diff before committing.
```

### 8. Story Completion (Team Lead)
```
Team Lead confirms:
✅ Feature implemented
✅ Jest tests written and passing
✅ Manual tests completed by Alexander
✅ Documentation updated

User Story #[X] Complete!

Alexander, would you like to:
1. Tackle a second user story this session?
2. Wrap up here and start fresh next time?
```

### 9. Session Limits

#### After 1st Story
```
Team Lead: "Story #[X] complete! Continue with 2nd story or wrap up?"
```

#### After 2nd Story
```
Team Lead: "Session limit reached (2 user stories completed)."

Team debrief:

@Database Specialist: Any schema patterns to document?
@UX/UI Specialist: Any design patterns to standardize?
@Implementation Specialist: Any code improvements for next session?
@Quality Specialist: Any testing gaps we should address?

[Agents provide insights]

Alexander:
1. Do you foresee any NEW user stories based on what we built?
2. Should we draft new user stories for your review?

Recommendation: Start fresh session for next stories to maintain clean context.

Shutting down agent team now. Create new team for next session.
```

## Communication Protocol

### Required Format
- **Tag teammates**: @Database Specialist, @Implementation Specialist
- **State sources**: "Reading design.md..." / "Downloading InstantDB docs..." / "Checking [file]..."
- **Explicit handoffs**: "Here's what I did, here's what you need"
- **File ownership**: "Working on src/features/budget/BudgetScreen.tsx"

### File Conflict Prevention
```
GOOD:
Team Lead: "@Implementation Specialist: You own src/components/Budget*.tsx"
           "@Database Specialist: You own src/db/schema.ts"
           "@Quality Specialist: You own src/components/__tests__/Budget*.test.tsx"
           
BAD:
Team Lead: "Everyone work on the budget feature"
(Results in file overwrites!)
```

### Testing Communication
```
GOOD:
Quality Specialist: "@Implementation Specialist: Jest test failing in TC-42-03. 
                     Expected userId scoping, but query returns all users.
                     Fix needed in src/features/budget/queries.ts line 45."

Implementation Specialist: "@Quality Specialist: Fixed userId scoping.
                           Re-run tests please."

BAD:
Quality Specialist: "Tests are broken, fix it."
```

## Special Rules

### For Team Lead
- **Prevent file conflicts** by assigning clear ownership
- Monitor progress, don't let team run unattended too long
- Check in after each teammate completes their part
- Limit sessions to 2 user stories maximum
- Ensure testing phase completes before manual testing

### For Database Specialist
- **ALWAYS download https://www.instantdb.com/docs first**
- Create schema automatically (Alexander does NOT manually edit DB)
- Provide complete query examples with userId scoping
- Never touch UI code or test files

### For UX/UI Specialist
- **ALWAYS read design.md first**
- Create complete interface specifications
- Review Implementation Specialist's UI code
- Never implement code, only create specs
- Ensure accessibility standards (44px minimum touch targets)

### For Implementation Specialist
- **NEVER modify schema files** - use Database Specialist's queries
- **NEVER create design specs** - use UX/UI Specialist's specs
- **ALWAYS write Jest tests** with Quality Specialist
- Request reviews before finalizing
- Follow CLAUDE.md coding standards
- Fix bugs found in testing immediately

### For Quality Specialist
- **Create use cases and test cases FIRST** before any testing
- **Write Jest tests** with Implementation Specialist
- **All automated tests must pass** before requesting manual testing from Alexander
- Provide test coverage report with manual test instructions
- Never skip automated testing phase
- Map manual tests to test cases for traceability

### For Alexander (Non-Developer)
- All explanations in simple language
- Manual testing instructions provided step-by-step only after Jest tests pass
- Breaking changes are warned before implementation
- Can interact with individual teammates directly
- Does NOT need to understand Jest tests, only run manual tests

## Emergency Stops

Team Lead stops and asks Alexander before:
- Potential data loss scenarios
- Major architectural changes
- Breaking changes to existing features
- Unclear requirements or conflicting docs
- Test coverage below 80%

## Documentation References

### Project Docs (in repo)
- **project-plan.md**: Roadmap and phase status
- **user-stories.md**: All stories and acceptance criteria
- **technical-specs.md**: Technical requirements and patterns
- **design.md**: Design system, color palette, component standards
- **CLAUDE.md**: Coding standards and best practices

### External Docs
- **InstantDB**: https://www.instantdb.com/docs (Database Specialist must download)

### Test Docs (created during testing)
- **tests/use-cases/[feature]-use-cases.md**: Use case scenarios
- **tests/test-cases/[feature]-test-cases.md**: Detailed test cases
- **src/features/[feature]/__tests__/**: Jest test files

## Testing Standards

### Minimum Requirements
- **Test coverage**: Minimum 80% for new code
- **Test types**: Unit tests, integration tests, component tests
- **Privacy tests**: Every feature must have userId scoping tests
- **Error handling**: All error scenarios must be tested

### Test Case Template
```
Test Case ID: TC-[StoryNumber]-[SequenceNumber]
Priority: P0/P1/P2
Title: [Clear description of what is being tested]
Preconditions: [Setup required]
Steps:
  1. [Action]
  2. [Action]
  3. [Action]
Expected Result: [What should happen]
Actual Result: [Filled during testing]
Status: Pass/Fail
Maps to Acceptance Criteria: [AC-XX]
```

### Jest Test Naming Convention
```
File: src/features/[feature]/__tests__/[FeatureName].test.tsx

Test names should be descriptive:
✓ test('should create recurring expense with monthly frequency', ...)
✗ test('test1', ...)

Group related tests:
describe('RecurringExpenses', () => {
  describe('Creation', () => { ... });
  describe('Editing', () => { ... });
  describe('Deletion', () => { ... });
  describe('Privacy', () => { ... });
});
```

## Example Complete Workflow

### User Story #42: Add Recurring Expense Tracking

#### Team Lead Assignment
```
@Database Specialist: 
  You own: src/db/schema.ts
  Task: Add recurring_expenses table with columns: id, userId, name, amount, frequency, startDate
  Download InstantDB docs first

@UX/UI Specialist:
  You own: design-specs/recurring-expenses.md
  Task: Design interface for creating, editing, viewing recurring expenses
  Read design.md for standards

@Implementation Specialist:
  You own: src/features/recurring/*.tsx
  Task: Wait for Database and UX/UI specs, then implement feature
  Read technical-specs.md and CLAUDE.md

@Quality Specialist:
  You own: tests/use-cases/recurring-expenses-*.md, tests/test-cases/recurring-expenses-*.md, 
           src/features/recurring/__tests__/
  Task: Create use cases, test cases, and Jest tests
  Read user-stories.md for acceptance criteria
```

#### Database Specialist Work
```
💾 DATABASE SPECIALIST: Downloading InstantDB docs from https://www.instantdb.com/docs...

Reading sections:
- Schema design
- Relationships
- Query patterns

Creating schema:

// src/db/schema.ts
export const recurringExpenses = {
  id: uuid(),
  userId: string(),
  name: string(),
  amount: number(),
  frequency: string(), // 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'
  dayOfWeek: number().optional(), // for weekly
  dayOfMonth: number().optional(), // for monthly
  startDate: string(),
  endDate: string().optional(),
  createdAt: date(),
  updatedAt: date()
}

Privacy check: ✓ All queries will filter by userId

@Implementation Specialist: Schema ready. Use this query pattern:

const { data, isLoading, error } = db.useQuery({
  recurringExpenses: {
    $: {
      where: {
        userId: currentUserId
      }
    }
  }
});

Questions?
```

#### UX/UI Specialist Work
```
🎨 UX/UI DESIGNER: Reading design.md for standards...

Design Specifications for Recurring Expenses:

Colors:
- Primary actions: Deep Teal #006A6A
- Success states: Sage Green #A8B5A1
- Amount display: Soft Amber #E3A05D

Layout:
1. List View (RecurringExpenseList.tsx)
   - Card-based layout with glassmorphism
   - Each card shows: name, amount (CHF format), frequency badge, next occurrence
   - Swipe actions: Edit (left), Delete (right)
   - Touch target: 56px minimum height

2. Create/Edit Form (RecurringExpenseForm.tsx)
   - Fields: Name (text), Amount (number), Frequency (picker), Start Date (date)
   - Real-time validation with empathetic messaging
   - Save button: Deep Teal, 44px min height
   - Progressive disclosure: Show frequency-specific fields only when needed

3. Frequency Badge Component
   - Pill shape with rounded corners
   - Text: "Monthly" / "Weekly" / etc.
   - Size: 12px font, 8px vertical padding

Transitions:
- Card swipe: 200ms ease-out
- Form field focus: 150ms ease-in-out
- Badge appearance: fade-in 100ms

@Implementation Specialist: Complete UI specs ready. Questions before you implement?
```

#### Implementation Specialist Work
```
💻 IMPLEMENTATION SPECIALIST: Reading existing code patterns in src/features/expenses/...

Following patterns from ExpenseForm.tsx and ExpenseList.tsx

Implementation plan:
1. Create RecurringExpenseForm.tsx using UX/UI specs
2. Create RecurringExpenseList.tsx with swipe actions
3. Create RecurringExpenseBadge.tsx component
4. Integrate Database Specialist's queries with userId scoping

@UX/UI Designer: Component structure:
src/features/recurring/
  ├── RecurringExpenseForm.tsx
  ├── RecurringExpenseList.tsx
  ├── RecurringExpenseBadge.tsx
  └── types.ts

Matches your design specs?

@Database Specialist: Using your query pattern with userId scoping:
const { data: recurringExpenses } = db.useQuery({
  recurringExpenses: {
    $: {
      where: { userId: auth.user.id }
    }
  }
});

Correct?
```

#### Quality Specialist Creates Test Documentation
```
✅ QUALITY SPECIALIST: Reading user-stories.md acceptance criteria for Story #42...

Created Use Cases (tests/use-cases/recurring-expenses-use-cases.md):

UC-42-01: Create Monthly Recurring Expense
Actor: User
Preconditions: User is logged in
Main Flow:
  1. User navigates to Expenses screen
  2. User taps "Add Recurring Expense"
  3. User enters name "Rent"
  4. User enters amount 1500
  5. User selects frequency "Monthly"
  6. User selects day of month "1"
  7. User taps "Save"
Expected: Recurring expense created and appears in list

UC-42-02: Edit Recurring Expense Amount
UC-42-03: Delete Recurring Expense
UC-42-04: View Next Occurrence Date
[... more use cases ...]

Created Test Cases (tests/test-cases/recurring-expenses-test-cases.md):

TC-42-01: Create Monthly Recurring Expense (Happy Path)
Priority: P0
Maps to: AC-42.1, AC-42.2
Steps:
  1. Tap "Add Recurring Expense"
  2. Enter name: "Rent"
  3. Enter amount: 1500
  4. Select frequency: "Monthly"
  5. Select day: 1
  6. Tap "Save"
Expected: Expense saved, shown in list with "Monthly" badge

TC-42-02: Validate Required Fields
Priority: P0
Maps to: AC-42.3
Steps:
  1. Tap "Add Recurring Expense"
  2. Leave name empty
  3. Tap "Save"
Expected: Empathetic error message "Please enter an expense name"

TC-42-03: Verify userId Scoping (Privacy)
Priority: P0
Maps to: Privacy requirement
Steps:
  1. Create recurring expense as User A
  2. Switch to User B
  3. View recurring expenses list
Expected: User B should NOT see User A's recurring expenses

[... 15 total test cases covering all acceptance criteria ...]

@Implementation Specialist: Ready to write Jest tests together?
```

#### Jest Testing Phase
```
💻 IMPLEMENTATION SPECIALIST: Creating test file src/features/recurring/__tests__/RecurringExpense.test.tsx

✅ QUALITY SPECIALIST: Reviewing test coverage against test cases...

Tests created:

describe('RecurringExpense', () => {
  describe('Creation (Happy Path)', () => {
    test('should create monthly recurring expense', async () => {
      // Maps to TC-42-01
      render(<RecurringExpenseForm />);
      fireEvent.changeText(screen.getByTestId('name-input'), 'Rent');
      fireEvent.changeText(screen.getByTestId('amount-input'), '1500');
      fireEvent.press(screen.getByText('Monthly'));
      fireEvent.press(screen.getByText('Save'));
      
      await waitFor(() => {
        expect(mockDB.transact).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Rent',
            amount: 1500,
            frequency: 'monthly',
            userId: 'test-user-id'
          })
        );
      });
    });
  });

  describe('Validation', () => {
    test('should show error for empty name', () => {
      // Maps to TC-42-02
      render(<RecurringExpenseForm />);
      fireEvent.press(screen.getByText('Save'));
      
      expect(screen.getByText('Please enter an expense name')).toBeTruthy();
    });
    
    test('should show error for zero amount', () => {
      // Maps to TC-42-05
      render(<RecurringExpenseForm />);
      fireEvent.changeText(screen.getByTestId('amount-input'), '0');
      fireEvent.press(screen.getByText('Save'));
      
      expect(screen.getByText('Amount must be greater than zero')).toBeTruthy();
    });
  });

  describe('Privacy (userId Scoping)', () => {
    test('should only query current user recurring expenses', () => {
      // Maps to TC-42-03
      const currentUserId = 'user-123';
      render(<RecurringExpenseList userId={currentUserId} />);
      
      expect(mockDB.useQuery).toHaveBeenCalledWith({
        recurringExpenses: {
          $: {
            where: { userId: currentUserId }
          }
        }
      });
    });
    
    test('should not expose other users data', async () => {
      // Maps to TC-42-03
      const userAId = 'user-a';
      const userBId = 'user-b';
      
      // Create expense as user A
      await createRecurringExpense({ userId: userAId, name: 'User A Expense' });
      
      // Query as user B
      const { data } = await queryRecurringExpenses(userBId);
      
      expect(data).not.toContainEqual(
        expect.objectContaining({ name: 'User A Expense' })
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle maximum amount value', () => { ... });
    test('should handle long expense names', () => { ... });
    test('should handle future start dates', () => { ... });
  });

  describe('Component Rendering', () => {
    test('should render frequency badge correctly', () => { ... });
    test('should render CHF amount with apostrophe separator', () => { ... });
  });
});

✅ QUALITY SPECIALIST: Running tests...

npm test src/features/recurring/__tests__/RecurringExpense.test.tsx

Results:
 PASS  src/features/recurring/__tests__/RecurringExpense.test.tsx
  RecurringExpense
    Creation (Happy Path)
      ✓ should create monthly recurring expense (45ms)
    Validation
      ✓ should show error for empty name (23ms)
      ✓ should show error for zero amount (19ms)
    Privacy (userId Scoping)
      ✓ should only query current user recurring expenses (12ms)
      ✓ should not expose other users data (67ms)
    Edge Cases
      ✓ should handle maximum amount value (18ms)
      ✓ should handle long expense names (21ms)
      ✓ should handle future start dates (15ms)
    Component Rendering
      ✓ should render frequency badge correctly (34ms)
      ✓ should render CHF amount with apostrophe separator (28ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
Snapshots:   0 total
Time:        2.456s
Coverage:    92.3%

✅ All automated tests pass!
✅ All acceptance criteria validated
✅ Privacy (userId scoping) verified

@Alexander: Automated testing complete!
```

#### Manual Testing Phase
```
✅ QUALITY SPECIALIST: Providing manual test instructions...

@Alexander: All Jest tests pass (10/10, 92.3% coverage). Please run these manual tests to confirm user experience:

📋 Manual Test Instructions:

Test 1: Create Monthly Recurring Expense (Maps to TC-42-01)
Steps:
1. Open Flow app and navigate to Expenses screen
2. Tap the "Add Recurring Expense" button
3. Enter name: "Rent"
4. Enter amount: 1500 (should format as CHF 1'500)
5. Select frequency: "Monthly"
6. Select day of month: "1"
7. Tap "Save"
Expected Result: 
- Recurring expense appears in the list
- Shows "Monthly" badge in Sage Green
- Displays "Next: 1 Mar 2026" (or appropriate next occurrence)
- Amount shows as "CHF 1'500"

Test 2: Validate Required Field Error (Maps to TC-42-02)
Steps:
1. Tap "Add Recurring Expense"
2. Leave name field empty
3. Enter amount: 500
4. Tap "Save"
Expected Result:
- Empathetic error message appears: "Please enter an expense name"
- Form does not submit
- Amount remains in field (not cleared)

Test 3: Edit Recurring Expense (Maps to TC-42-06)
Steps:
1. Swipe left on "Rent" recurring expense
2. Tap "Edit" action
3. Change amount from 1500 to 1600
4. Tap "Save"
Expected Result:
- Amount updates to CHF 1'600
- List refreshes showing new amount
- Next occurrence date unchanged

Test 4: Delete Recurring Expense (Maps to TC-42-07)
Steps:
1. Swipe right on "Rent" recurring expense
2. Tap "Delete" action
3. Confirm deletion if prompted
Expected Result:
- Recurring expense removed from list
- Smooth fade-out animation (200ms)
- No errors in console

Please confirm: Do all manual tests work as expected?
```

#### Alexander Tests and Reports
```
Alexander: 
"Test 1: ✓ Works perfectly! Love the CHF formatting.
Test 2: ✓ Error message is clear and friendly.
Test 3: ✓ Editing works smoothly.
Test 4: ✗ Issue found - Delete swipe is too sensitive, triggers accidentally when scrolling"
```

#### Bug Fix
```
💻 IMPLEMENTATION SPECIALIST: @Quality Specialist - Found the issue.

Root cause: Swipe threshold is set to 10px, should be 50px to prevent accidental triggers.

Fix applied in RecurringExpenseList.tsx line 78:
- const SWIPE_THRESHOLD = 10;
+ const SWIPE_THRESHOLD = 50;

✅ QUALITY SPECIALIST: Adding regression test...

test('should not trigger delete on small swipes', () => {
  render(<RecurringExpenseList />);
  const item = screen.getByText('Rent');
  
  // Simulate 30px swipe (below 50px threshold)
  fireEvent(item, 'swipe', { translationX: 30 });
  
  expect(screen.queryByText('Delete')).toBeNull();
});

Re-running all tests...
✅ All 11 tests pass

@Alexander: Fix complete. Please re-test Test 4.
```

#### Alexander Re-Tests
```
Alexander: "Test 4: ✓ Much better! No accidental triggers now."
```

#### Documentation Update
```
📋 TEAM LEAD: All tests passing!

@Implementation Specialist: Update documentation:

Documentation updates:
1. user-stories.md:
   - Mark Story #42 as ✅ Complete
   - Completion date: 2026-02-14
   - Test coverage: 92.3%

2. project-plan.md:
   - Phase 2 progress: 45% → 52%
   - Recurring expenses feature: ✅ Complete

3. technical-specs.md:
   - Added pattern: Swipe gesture thresholds (50px minimum)
   - Added pattern: CHF formatting with apostrophe separators

Show diff before committing.
```

#### Story Complete
```
📋 TEAM LEAD: User Story #42 Complete! ✓

Summary:
✅ Recurring expense feature implemented
✅ Jest tests: 11/11 passing, 92.3% coverage
✅ Manual tests: 4/4 passing
✅ Documentation updated
✅ Bug fix for swipe sensitivity included

Alexander, would you like to:
1. Tackle a second user story this session? (Story #43: Budget pace tracking)
2. Wrap up here and start fresh next time?
```