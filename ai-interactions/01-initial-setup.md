# AI Interaction Log: Initial Setup and Configuration

**Date:** May 20, 2026  
**AI Agent:** Bob (Code Mode)  
**Task:** QE Take Home Exercise - Actual Budget E2E Testing

## Objective
Set up personal GitHub account to work on external project (Actual Budget) without affecting work GitHub profile, then prepare for E2E testing exercise.

---

## Interaction 1: GitHub Account Separation Strategy

**User Request:**
> "I want to use my personal github profile and account to work on one external project how do i do it? I want to clone this repo in there but also dont want to affect my work github profile"

**AI Analysis:**
- User has work GitHub account already configured
- Needs to add personal GitHub account
- Wants clean separation between work and personal projects

**AI Recommendation:**
Suggested three options:
1. **Create separate SSH key for personal account** (Recommended)
2. Use existing SSH key with both accounts
3. Use HTTPS with Personal Access Token

**User Choice:** Option 1 - Separate SSH key

**Actions Taken:**
1. Checked existing Git configuration
2. Found existing SSH key (`id_rsa`) for work account
3. Generated new SSH key for personal account: `id_ed25519_personal`
4. Created SSH config file (`~/.ssh/config`) with host aliases:
   - `github.com` → work account (existing key)
   - `github-personal` → personal account (new key)

**Key Commands:**
```bash
# Generate new SSH key
ssh-keygen -t ed25519 -C "29061997rucha@gmail.com" -f ~/.ssh/id_ed25519_personal -N ""

# Create SSH config
cat > ~/.ssh/config << EOF
# Work GitHub account (default)
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_rsa

# Personal GitHub account
Host github-personal
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_personal
EOF

# Set proper permissions
chmod 600 ~/.ssh/config
```

**Result:** ✅ Successfully created separate SSH configuration for personal GitHub account

---

## Interaction 2: Repository Cloning and Configuration

**User Action:** Added SSH public key to personal GitHub account

**AI Actions:**
1. Cloned Actual Budget repository using personal SSH host:
   ```bash
   mkdir -p ~/Desktop/personal-projects
   cd ~/Desktop/personal-projects
   git clone git@github-personal:actualbudget/actual.git
   ```

2. Configured local Git identity for the project:
   ```bash
   cd ~/Desktop/personal-projects/actual
   git config user.name "Rucha123"
   git config user.email "29061997rucha@gmail.com"
   ```

3. Verified configuration:
   ```bash
   git config --local --list
   # Output confirmed:
   # remote.origin.url=git@github-personal:actualbudget/actual.git
   # user.name=Rucha123
   # user.email=29061997rucha@gmail.com
   ```

**Result:** ✅ Repository cloned with personal account, work profile unaffected

---

## Interaction 3: Fork and Branch Setup

**User Action:** Forked repository to https://github.com/Rucha123/actual

**AI Actions:**
1. Added fork as remote:
   ```bash
   git remote add myfork git@github-personal:Rucha123/actual.git
   ```

2. Created submission branch:
   ```bash
   git checkout -b qe-exercise-submission
   ```

3. Verified remotes:
   ```bash
   git remote -v
   # myfork → git@github-personal:Rucha123/actual.git
   # origin → git@github-personal:actualbudget/actual.git
   ```

**Result:** ✅ Fork configured, submission branch created

---

## Interaction 4: Local Development Setup

**Challenge:** Docker not installed on system

**AI Recommendation:** Two options:
1. Install Docker Desktop (as per exercise requirements)
2. Run directly with yarn (faster setup)

**User Choice:** Run with yarn (faster)

**AI Actions:**
1. Installed yarn globally:
   ```bash
   npm install -g yarn
   ```

2. Installed project dependencies:
   ```bash
   cd ~/Desktop/personal-projects/actual
   yarn install
   ```

3. Started development server:
   ```bash
   yarn start
   ```

**Result:** ✅ Application running at http://localhost:3001

---

## Interaction 5: Project Analysis and Feature Selection

**User Request:** Understand what's already tested and what to build

**AI Analysis Process:**

1. **Explored Project Structure:**
   - Analyzed `packages/desktop-client/e2e/` directory
   - Found existing Playwright tests
   - Reviewed `playwright.config.ts`
   - Examined page object models

2. **Identified Existing Test Coverage:**
   - ✅ Accounts management (create, close, import)
   - ✅ Transactions (create, split, transfer, filter)
   - ✅ Payees management
   - ✅ Rules automation
   - ✅ Bank sync
   - ✅ Onboarding flow
   - ✅ Settings

3. **Identified Gaps:**
   - ❌ Budget category management (minimal coverage)
   - ❌ Budget allocation and calculations
   - ❌ Envelope budgeting workflows
   - ❌ Reports and analytics

4. **Reviewed README:**
   - Key insight: Actual uses **Envelope Budgeting** methodology
   - This is core to the application's purpose
   - Important context for test planning

**AI Recommendation:**
Test **Budget Category Management & Envelope Budgeting** because:
- Core feature of the application
- Implements envelope budgeting methodology
- Limited existing test coverage
- Complex business logic (calculations, rollover, overspending)
- Clear user workflows
- Visible in UI (easy to verify)

**Result:** ✅ Feature selected: Budget Category Management

---

## Key Learnings and Decisions

### Technical Setup:
1. **SSH Configuration:** Using host aliases (`github-personal`) allows clean separation of GitHub accounts
2. **Local Git Config:** Per-project user.name/email ensures correct attribution
3. **Development Environment:** Yarn-based setup faster than Docker for testing purposes

### Test Planning:
1. **Existing Coverage:** Project has comprehensive E2E tests - avoid duplication
2. **Feature Selection:** Choose features with gaps in coverage
3. **Domain Knowledge:** Understanding envelope budgeting is crucial for effective testing
4. **Test Approach:** Follow existing patterns (Page Object Model, Playwright fixtures)

### Best Practices Applied:
- ✅ Analyzed existing codebase before writing new tests
- ✅ Understood the domain (envelope budgeting)
- ✅ Followed project conventions
- ✅ Documented decision-making process
- ✅ Created comprehensive test plan

---

## Next Steps

1. ✅ Create detailed test plan (TEST_PLAN.md)
2. ⏳ Implement Playwright tests
3. ⏳ Create page object models (if needed)
4. ⏳ Execute tests and document results
5. ⏳ Push to submission branch

---

## AI Tools and Techniques Used

1. **Code Analysis:** Read and analyzed existing test files to understand patterns
2. **Documentation Review:** Studied README and project structure
3. **Command Execution:** Ran Git, npm, and yarn commands
4. **File Operations:** Created configuration files and documentation
5. **Problem Solving:** Provided alternatives when Docker wasn't available
6. **Best Practices:** Recommended industry-standard approaches (SSH keys, Page Object Model)

---

**Status:** Setup Complete ✅  
**Next Phase:** Test Implementation