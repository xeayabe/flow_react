# MAINTENANCE.md
*Documentation Synchronization & Update Guide*

**Purpose**: Keep project documentation aligned with the actual codebase  
**Owner**: Alexander (Flow Project Lead)  
**Last Updated**: February 8, 2026  
**Review Frequency**: Weekly (Every Monday)

---

## 📚 Documentation Files Overview

### Core Documentation Files

| File | Purpose | Update Frequency | Priority |
|------|---------|------------------|----------|
| **project-plan.md** | Roadmap, phases, milestones | After completing features/sprints | 🔴 High |
| **user-stories.md** | Requirements, acceptance criteria | When adding/completing stories | 🔴 High |
| **technical-specs.md** | Architecture, database schema, API | When schema/architecture changes | 🔴 Critical |
| **CLAUDE.md** | AI coding guidelines, patterns | When establishing new patterns | 🟡 Medium |
| **technical-debt.md** | Known issues, workarounds, TODOs | After bug fixes, during audits | 🟢 Low |

---

## 🔔 Triggers for Documentation Updates

### Immediate Updates (Do Right Away)

#### ✅ Database Schema Changes → Update `technical-specs.md`

**Triggers**:
- Adding new entity/table to `db.ts`
- Adding/removing fields from existing entities
- Changing field types or constraints
- Adding/removing relationships (links)

**Example**:
```typescript
// Added new field to transactions entity
transactions: i.entity({
  // ... existing fields
  isExcludedFromBudget: i.boolean().optional(), // 🆕 NEW FIELD
})
```

**Action Required**:
1. Update "Database Structure" section in `technical-specs.md`
2. Add field to the relevant entity documentation
3. Document business rules for the new field
4. Update any affected API examples

---

#### ✅ New Feature Completed → Update `user-stories.md` + `project-plan.md`

**Triggers**:
- Feature marked as complete (all acceptance criteria met)
- New user story added mid-sprint
- User story scope changes

**Action Required**:
1. **user-stories.md**: Change status emoji from 🚧 to ✅
2. **user-stories.md**: Update "Phase X Status" section with completion %
3. **project-plan.md**: Update phase completion percentage
4. **project-plan.md**: Update "What We've Built" section

---

#### ✅ Architecture Change → Update `technical-specs.md`

**Triggers**:
- Changing data flow patterns
- Modifying API layer structure
- Switching libraries/dependencies
- Major refactoring (e.g., "Timeless Budgets" change)

**Action Required**:
1. Update "Architecture Overview" section
2. Update relevant data flow diagrams (ASCII art)
3. Document migration path if breaking change
4. Add to "Critical Changes" section with explanation

---

#### ✅ New Coding Pattern Established → Update `CLAUDE.md`

**Triggers**:
- Creating reusable component pattern (e.g., GlassCard)
- Establishing new API function pattern
- Discovering better way to handle common task
- Fixing recurring bug with pattern change

**Action Required**:
1. Add to "Coding Standards" or relevant section
2. Provide code example (✅ CORRECT vs ❌ WRONG)
3. Explain why pattern is preferred
4. Add to "Common Mistakes to Avoid" if fixing bug

---

### Weekly Updates (During Scheduled Review)

#### 📊 Sprint Progress → Update `project-plan.md`

**Triggers** (review weekly):
- Multiple features completed
- Phase progress changed significantly (>10%)
- Priorities shifted

**Action Required**:
1. Update "Current Status" section
2. Update phase completion percentages
3. Update "On the Horizon" if priorities changed
4. Update "Timeline" if dates shifted

---

#### 🐛 Bug Fixes → Update `technical-debt.md`

**Triggers**:
- Critical bug fixed
- Workaround implemented
- Technical debt identified during development

**Action Required**:
1. If bug fixed: Move from "Known Issues" to "Resolved Issues"
2. If workaround added: Add to "Current Workarounds" with TODO
3. If new debt: Add to "Technical Debt Backlog"

---

## ✅ Documentation Update Checklist

### Step-by-Step Update Process

#### When You Complete a Feature

**Step 1: Identify What Changed**
- [ ] Did database schema change? → Check `db.ts`
- [ ] Did API functions change? → Check `lib/*-api.ts`
- [ ] Did new pattern emerge? → Review code for reusable patterns
- [ ] Did user story fully complete? → Review acceptance criteria

**Step 2: Gather Update Information**
- [ ] List all files modified (use git: `git diff --name-only`)
- [ ] Note any schema changes (compare current `db.ts` to last docs update)
- [ ] Note any new dependencies added (`package.json` changes)
- [ ] Screenshot or note any UX changes

**Step 3: Update Documentation Files**
- [ ] **technical-specs.md**: Update database schema if changed
- [ ] **user-stories.md**: Mark story as ✅ complete
- [ ] **project-plan.md**: Update phase completion %
- [ ] **CLAUDE.md**: Add new pattern if established
- [ ] **technical-debt.md**: Update if bug fixed or debt added

**Step 4: Verify Documentation Accuracy**
- [ ] Schema in docs matches `db.ts` exactly
- [ ] API examples in docs use correct field names
- [ ] User story acceptance criteria all checked off
- [ ] No references to removed features/fields

---

### Verification Checklist (Use This to Check Accuracy)

#### Verify `technical-specs.md` Matches Code

```bash
# 1. Check if schema documented correctly
# Open: mobile/src/lib/db.ts
# Compare against: technical-specs.md "Database Structure" section

# 2. Check for undocumented entities
# In db.ts, count entities in i.schema({ entities: { ... }})
# In technical-specs.md, count documented entities
# Numbers should match!

# 3. Check for undocumented fields
# For each entity, compare fields in db.ts vs technical-specs.md
# Look for fields marked with i.string(), i.number(), etc.
```

**Quick Test**:
- [ ] Open `db.ts` and count entities (e.g., 12 entities)
- [ ] Open `technical-specs.md` and count documented entities
- [ ] If counts don't match → Missing documentation!

---

#### Verify `user-stories.md` Matches Reality

**Quick Test**:
- [ ] Filter stories by status: Count ✅ completed stories
- [ ] Test each completed story in app manually
- [ ] If story feature doesn't work → Mark as 🐛 instead of ✅
- [ ] If story works but incomplete → Mark as 🚧 instead of ✅

**Phase Completion Verification**:
```
Phase 1: Count total stories (e.g., 36 stories)
Phase 1: Count ✅ completed stories (e.g., 28 stories)
Calculation: 28 / 36 = 77.8% ≈ 78%
Compare to documented %: Should say "Phase 1: 78% complete"
```

---

## 📅 Scheduled Reviews

### Weekly Review (Every Monday - 30 minutes)

**Before You Start Development Each Week:**

#### 1. Documentation Accuracy Check (10 mins)

- [ ] Open `technical-specs.md` → Compare "Database Structure" to `db.ts`
- [ ] Check for any mismatches in field names, types, or entities
- [ ] Verify example queries still work with current schema

#### 2. User Story Status Update (10 mins)

- [ ] Review last week's completed features
- [ ] Update status emojis in `user-stories.md`
- [ ] Recalculate phase completion percentages
- [ ] Update `project-plan.md` with new percentages

#### 3. Technical Debt Review (10 mins)

- [ ] Review bugs fixed last week
- [ ] Move resolved issues from "Known Issues" to "Resolved"
- [ ] Add any new technical debt discovered
- [ ] Prioritize top 3 debt items for next sprint

---

### Bi-Weekly Deep Review (Every Other Monday - 1 hour)

**Every 2 weeks, do a thorough documentation audit:**

#### Week 1 Focus: Architecture & Specs

- [ ] **technical-specs.md**: Full read-through
  - [ ] Database schema matches `db.ts` exactly
  - [ ] All API examples use correct syntax
  - [ ] Architecture diagrams accurate
  - [ ] File structure matches actual `/src` folder
  - [ ] Technology versions up-to-date

- [ ] **CLAUDE.md**: Pattern review
  - [ ] All code examples still follow current patterns
  - [ ] No outdated patterns referenced
  - [ ] "Common Mistakes" section still relevant

#### Week 2 Focus: Planning & Stories

- [ ] **project-plan.md**: Roadmap review
  - [ ] Phase dates still realistic
  - [ ] "What We've Built" section current
  - [ ] "On the Horizon" reflects actual priorities
  - [ ] Timeline adjusted for any delays

- [ ] **user-stories.md**: Requirements review
  - [ ] All completed stories actually work in app
  - [ ] Acceptance criteria still accurate
  - [ ] Time estimates reflect reality (adjust if needed)
  - [ ] Dependencies still correct

---

## 🤖 Commands to Request Documentation Updates

### Copy-Paste Prompts for Claude

**Use these exact prompts to request documentation updates:**

---

#### Update Database Schema Documentation

```
I made changes to the database schema in `mobile/src/lib/db.ts`. 

Changes made:
- [Describe what changed, e.g., "Added isExcludedFromBudget field to transactions entity"]
- [Add more changes if multiple]

Please:
1. Review the current `mobile/src/lib/db.ts` file
2. Update the "Database Structure" section in `technical-specs.md` to match
3. Add documentation for the new field(s) including:
   - Field name, type, and whether it's optional
   - Business rules for when/how it's used
   - Example usage in queries
4. Show me the specific changes before I commit them
```

---

#### Update User Story Status

```
I completed user story US-XXX: [Story Title]

Please:
1. Review the acceptance criteria for US-XXX in `user-stories.md`
2. Change the status emoji from 🚧 to ✅
3. Recalculate the Phase X completion percentage
4. Update the "Phase X Status" section with new percentage
5. Update `project-plan.md` with the new phase completion
6. Show me a summary of what changed
```

---

#### Update After Architecture Change

```
I made a significant architecture change: [Describe change, e.g., "Changed how budget periods are calculated - removed periodStart/periodEnd from database"]

Please:
1. Update the "Architecture Overview" section in `technical-specs.md`
2. Add this to "Critical Architectural Changes" section with explanation
3. Update any affected code examples
4. Update the "Database Structure" section if schema changed
5. Add migration notes if this is a breaking change
6. Show me the changes before I commit
```

---

#### Update Coding Pattern in CLAUDE.md

```
I established a new coding pattern: [Describe pattern, e.g., "Created reusable LoadingScreen component that should be used everywhere instead of inline spinners"]

Please:
1. Add this pattern to the relevant section in `CLAUDE.md`
2. Provide ✅ CORRECT vs ❌ WRONG examples
3. Explain why this pattern is preferred
4. Add to "Common Mistakes to Avoid" if it fixes a recurring issue
5. Show me the additions before I commit
```

---

#### Update Technical Debt

```
I [fixed a bug / added a workaround / discovered technical debt]: [Brief description]

Bug/Issue: [Describe the problem]
Solution: [What was done]

Please:
1. Update `technical-debt.md` appropriately:
   - If bug fixed: Move from "Known Issues" to "Resolved Issues"
   - If workaround: Add to "Current Workarounds" with TODO for proper fix
   - If new debt: Add to "Technical Debt Backlog" with priority
2. Show me the changes
```

---

#### Weekly Documentation Sync

```
It's Monday! Let's sync documentation with the codebase.

Please review and update:
1. Compare `mobile/src/lib/db.ts` to the "Database Structure" section in `technical-specs.md`
   - Report any mismatches (missing fields, wrong types, undocumented entities)
2. Review user stories I marked as complete last week
   - Update status emojis in `user-stories.md`
   - Recalculate phase completion percentages
3. Update `project-plan.md` with current phase percentages
4. Provide a summary of all changes made

Completed last week:
- [List features/stories completed, or say "None"]
```

---

#### Bi-Weekly Deep Documentation Audit

```
It's time for the bi-weekly documentation audit. 

This week's focus: [Architecture & Specs OR Planning & Stories]

Please:
1. Do a thorough review of [technical-specs.md + CLAUDE.md OR project-plan.md + user-stories.md]
2. Check for:
   - Outdated information
   - Mismatches with current codebase
   - Broken examples or references
   - Missing documentation for new features
3. Provide a detailed report of issues found
4. Suggest specific updates needed
5. Prioritize issues by severity (Critical / High / Medium / Low)

Do NOT make changes yet - just provide the audit report first.
```

---

#### Quick Schema Verification

```
Quick check: Does the database schema documentation match reality?

Please:
1. Count entities in `mobile/src/lib/db.ts`
2. Count entities documented in `technical-specs.md` "Database Structure" section
3. List any entities present in code but missing from docs
4. List any entities documented but not in code
5. For [specific entity name], compare fields in code vs docs

Provide a simple ✅ or ❌ for each check.
```

---

#### Verify User Story Completion

```
Please verify that user story US-XXX is truly complete.

Check:
1. All acceptance criteria are met
2. Feature works as described in the story
3. No dependencies blocking completion
4. Tests written (if required)
5. Documentation updated

Provide a ✅ or ❌ for each item, and explain any ❌ items.
If all ✅, confirm I can mark the story as complete.
```

---

## 📋 Quick Reference Checklists

### After Completing ANY Code Work

```
□ Did schema change? → Update technical-specs.md
□ Did API change? → Update technical-specs.md examples
□ New pattern established? → Update CLAUDE.md
□ User story completed? → Update user-stories.md + project-plan.md
□ Bug fixed? → Update technical-debt.md
□ Dependencies added? → Update technical-specs.md "Technology Stack"
```

---

### Before Starting a New Sprint

```
□ Review project-plan.md → Confirm priorities
□ Review user-stories.md → Verify next stories are clear
□ Check technical-debt.md → Plan time for debt reduction
□ Verify technical-specs.md → Ensure schema is current
□ Check CLAUDE.md → Review coding standards
```

---

### Monthly Health Check (1st Monday of Month)

```
□ All documentation files reviewed in last 4 weeks
□ No critical mismatches between docs and code
□ All completed user stories tested and working
□ Technical debt backlog prioritized
□ Project plan timeline adjusted if needed
□ Dependencies/versions updated in technical-specs.md
```

---

## 🚨 Red Flags (Urgent Documentation Updates Needed)

**Stop development and update documentation immediately if:**

1. ⛔ **Schema change not documented within 24 hours**
   - Risk: Future AI-generated code will use wrong schema
   - Fix: Use "Update Database Schema Documentation" prompt above

2. ⛔ **Completed feature not marked done after 1 week**
   - Risk: Lose track of actual progress, double-work on features
   - Fix: Use "Update User Story Status" prompt above

3. ⛔ **Critical bug fixed but not documented**
   - Risk: Bug will be reintroduced in future code
   - Fix: Use "Update Technical Debt" prompt above

4. ⛔ **Architecture change without documentation**
   - Risk: Future code will use old patterns, causing inconsistency
   - Fix: Use "Update After Architecture Change" prompt above

5. ⛔ **New pattern used 3+ times without documentation**
   - Risk: Pattern will be implemented inconsistently
   - Fix: Use "Update Coding Pattern in CLAUDE.md" prompt above

---

## 🎯 Documentation Quality Metrics

**Track these to measure documentation health:**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Schema Accuracy** | 100% match | Compare `db.ts` entities count to docs |
| **Story Status Accuracy** | >95% accurate | Test completed stories in app |
| **Update Frequency** | Weekly | Check git commit dates on docs |
| **Time Since Last Audit** | <14 days | Check last "Bi-Weekly Review" date |
| **Critical Mismatches** | 0 | Run verification checklist |

---

## 📝 Documentation Update Log

**Track your documentation updates here:**

| Date | Files Updated | Reason | Completed By |
|------|--------------|--------|--------------|
| 2026-02-08 | technical-specs.md, user-stories.md, CLAUDE.md | Initial creation | Alexander |
| _[Next update]_ | | | |

**How to use this log**:
1. After updating documentation, add a row
2. List which files were updated
3. Brief reason (e.g., "Completed US-061", "Schema change")
4. Sign off with your name

**Benefits**:
- Quick history of documentation changes
- Easy to see when last update was
- Accountability for keeping docs current

---

**Document Version**: 1.0  
**Created**: February 8, 2026  
**Next Scheduled Review**: February 17, 2026 (Bi-Weekly Deep Review)  
**Maintained By**: Alexander

---

*Remember: Documentation is not a one-time task - it's an ongoing practice that ensures your AI assistant (Claude) always has accurate context for generating code. Outdated docs = buggy code generation.*

**Weekly habit**: Every Monday before development, run the "Weekly Documentation Sync" prompt. It takes 5 minutes and prevents hours of debugging later.
