# Build a Basic CI Pipeline: Lecture Answer Key

Companion to `Github_MarketPlace-1.pdf`. It follows the PDF in order. Each part has the answer, the code, and **🎤 Say this** notes to use while teaching.

---

## 0. The big picture (2-minute intro)

**🎤 Say this:**
> "CI means every time we push code, a robot machine checks out our code, installs it, tests it, and tells us if something broke. GitHub Actions is that robot. We describe what it should do in a YAML file inside `.github/workflows/`."

The four building blocks (draw this on the board):

| Block | Meaning | Analogy |
|---|---|---|
| `on:` | **When** to run (trigger) | The alarm clock |
| `jobs:` | **What** groups of work to do | The to-do list |
| `runs-on:` | **Where** to run (the machine) | The kitchen you cook in |
| `steps:` | **How**: commands/actions run top to bottom | The recipe steps |

A **step** does one of two things:
- `uses:` runs a ready-made **action** from the Marketplace, for example `actions/checkout@v4`
- `run:` runs a **shell command**, for example `npm test`

---

## Part 1: Project setup

`package.json`:

```json
{
  "name": "ci-pipeline-assignment",
  "version": "1.0.0",
  "scripts": {
    "test": "echo 'All tests passed successfully!' && exit 0"
  }
}
```

**🎤 Say this:** "`exit 0` means success and any non-zero exit code means failure. GitHub Actions only looks at the exit code to decide green ✅ or red ❌. Later we change it to `exit 1` to fake a failing test."

> ⚠️ **Copy/paste trap:** The PDF shows curly quotes (`’ ’`). Students must type straight quotes (`'`). Curly quotes break JSON, YAML and JavaScript.

---

## Part 2: Warm-up (break it on purpose)

`.github/workflows/warmup.yml`:

```yaml
name: Warm-Up (Broken Runner)

on:
  push:
    branches: [main]

jobs:
  broken:
    runs-on: windows-1999
    steps:
      - name: Say hello
        run: echo "This will never run."
```

### Answers to the 5 warm-up questions

**Q1. Did the job start at all, or did it fail before any step ran?**
> No, the job never started. No step ran, so "This will never run." is never printed. GitHub could not find a machine called `windows-1999`, so the job never got a runner.

**Q2. What error message does GitHub show? Copy it exactly.**
> Students should copy the message from their own screen. You will usually see one of these:
> - The job stays **Queued** with: `Waiting for a runner to pick up this job...`
> - Or, after it is cancelled or times out, something like: `The job was not started because no runner with the label 'windows-1999' was found` / `No runner matching the specified labels was found: windows-1999`.
>
> ⚠️ **Lecturer tip:** The PDF says it "fails immediately", but GitHub often leaves the job **queued and waiting** (it can wait up to 24 hours before it is cancelled). Run the warm-up yourself before the lecture so you know what students will see. If the job sits in the queue, that is a teaching point too: GitHub is searching for a machine that does not exist. You can cancel the run by hand.

**Q3. Which part of the YAML caused the problem: `on:`, `jobs:`, `runs-on:`, or `steps:`?**
> **`runs-on:`**. The trigger (`on:`) worked because the run did appear in the Actions tab. The job definition and steps were valid. Only the runner label was wrong.

**Q4. What is a GitHub-hosted runner? (one sentence)**
> A GitHub-hosted runner is a fresh virtual machine (Linux, Windows or macOS) that GitHub creates for each job, with common tools already installed, and deletes when the job finishes.

**Q5. What would have happened with `runs-on: ubuntu-latest`?**
> GitHub would have started a fresh Ubuntu Linux VM, run the "Say hello" step, printed `This will never run.`, and the run would show a green checkmark ✅.

**Fix and push:**
```bash
# change windows-1999 → ubuntu-latest
git add .github/workflows/warmup.yml
git commit -m "Fix runner to ubuntu-latest"
git push
```

**🎤 Key takeaway to say:** "`runs-on` picks the machine. Valid GitHub-hosted labels include `ubuntu-latest`, `windows-latest` and `macos-latest`. If you ask for a machine that doesn't exist, none of your steps ever run."

---

## Part 3: The real tasks (`.github/workflows/ci.yml`)

### ✅ Final complete solution (all 5 tasks)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      issues: write

    steps:
      # ---------- Task 1: Checkout ----------
      - name: Checkout code
        uses: actions/checkout@v4

      # ---------- Task 2: Cache ----------
      - name: Cache npm dependencies
        uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-npm-${{ hashFiles('package.json') }}
          restore-keys: |
            ${{ runner.os }}-npm-

      # ---------- Task 3: Install, test, upload ----------
      - name: Install & Test
        run: npm install && npm test > test-output.txt

      - name: Upload test results
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-output.txt

      # ---------- Task 5: Image artifact ----------
      - name: Install ImageMagick
        run: sudo apt-get update && sudo apt-get install -y imagemagick

      - name: Generate image
        run: convert -size 200x100 xc:white -gravity center -pointsize 24 -annotate 0 "CI Pipeline" ci-image.png

      - name: Upload image
        uses: actions/upload-artifact@v4
        with:
          name: ci-image
          path: ci-image.png

      # ---------- Task 4: Issue on failure (MUST be last) ----------
      - name: Create issue on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const runUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Workflow failed on ${context.ref.replace('refs/heads/', '')}`,
              body: `The workflow **${context.workflow}** failed.\n\n- **Commit:** ${context.sha}\n- **Branch:** ${context.ref.replace('refs/heads/', '')}\n- **Run:** [View logs](${runUrl})`
            });
```

> ⚠️ **Two things the PDF gets wrong when copied:**
> 1. The JavaScript in Task 4 must use **backticks** (`` ` ``) for template strings, not the curly `‘ ’` shown in the PDF. Without backticks, `${...}` is not replaced.
> 2. The PDF cuts off the `convert` command at the page edge. The full command ends with `"CI Pipeline" ci-image.png`.

---

### Task 1: Checkout code

**Answer:**
```yaml
- name: Checkout code
  uses: actions/checkout@v4
```

**🎤 Say this:** "The runner starts as an **empty** machine and does not have our code. `actions/checkout` runs `git clone` on our repo into the runner. Without this step, `npm test` would fail because there is no `package.json`."

- `@v4` is the **version pin**. Always pin a version so your pipeline doesn't break when the action changes.

**Marketplace teaching moment:** Open https://github.com/marketplace/actions/checkout and point out:
- The **blue "verified creator" badge** next to *GitHub*, which tells you the action is trustworthy
- The **README** with usage examples
- The **"Use latest version"** button, which shows the exact `uses:` line to copy

---

### Task 2: Cache dependencies

**Answer:**
```yaml
- name: Cache npm dependencies
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('package.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

**Explain each line:**

| Line | Meaning |
|---|---|
| `path: ~/.npm` | The folder to save/restore. npm keeps downloaded packages here. |
| `key:` | The cache's unique name. If the key matches a saved cache, it is restored (a **cache hit**). |
| `runner.os` | `Linux`, `Windows` or `macOS`, so caches from different operating systems don't mix. |
| `hashFiles('package.json')` | A fingerprint of `package.json`. When dependencies change, the fingerprint changes and a new cache is made. |
| `restore-keys:` | Fallback. If there is no exact match, use the most recent cache that starts with `Linux-npm-`. |

**🎤 Say this:** "First run: cache **miss**, so it downloads everything and saves the cache at the end. Second run: cache **hit**, so it's faster. Show them the 'Post Cache npm dependencies' step in the logs where it saves."

> Note: this project has no real dependencies yet, so the speed-up is tiny. The goal is to learn the pattern. In real projects you'd usually hash `package-lock.json`.

---

### Task 3: Upload test results

**Answer:**
```yaml
- name: Install & Test
  run: npm install && npm test > test-output.txt

- name: Upload test results
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: test-output.txt
```

**🎤 Say this:**
- "`>` sends the output into a file instead of the screen."
- "The runner VM is **deleted** after the job. Anything we want to keep has to be uploaded as an **artifact**."
- "Artifacts appear at the **bottom of the run summary page**. You can download them as a `.zip`."

**Expected content of `test-output.txt`:**
```
> ci-pipeline-assignment@1.0.0 test
> echo 'All tests passed successfully!' && exit 0

All tests passed successfully!
```

> 💡 **Extra question to ask the class:** "If the test fails, does the artifact still get uploaded?" **No.** Later steps are skipped after a failure. To always upload, add `if: always()` to the upload step.

---

### Task 4: Create an issue on failure

**Answer:** see the last step of the full solution above. You also need this block at the job level:

```yaml
permissions:
  contents: read
  issues: write
```

**Explain:**

| Piece | Meaning |
|---|---|
| `if: failure()` | Run this step **only** if an earlier step failed. Normally steps after a failure are skipped. |
| `actions/github-script` | Lets you write JavaScript that calls the GitHub API, already logged in. |
| `github.rest.issues.create(...)` | API call that opens a new issue. |
| `context` | Info about the current run: repo owner/name, commit `sha`, branch `ref`, `runId`, workflow name. |
| `permissions: issues: write` | The automatic `GITHUB_TOKEN` is read-only by default. We must allow it to write issues, otherwise the call fails with **403 Resource not accessible by integration**. |

**🎤 Say this:** "Why must it be the **last** step? `failure()` checks whether anything *before* it failed. If it sat at the top, nothing would have failed yet."

> Why add `contents: read`? Once you set `permissions:`, every permission you don't list becomes **none**. `actions/checkout` needs `contents: read` to clone the repo. (On a public repo checkout still works without it, but it's good practice to include it.)

---

### Task 5: Upload an image artifact

**Answer:**
```yaml
- name: Install ImageMagick
  run: sudo apt-get update && sudo apt-get install -y imagemagick

- name: Generate image
  run: convert -size 200x100 xc:white -gravity center -pointsize 24 -annotate 0 "CI Pipeline" ci-image.png

- name: Upload image
  uses: actions/upload-artifact@v4
  with:
    name: ci-image
    path: ci-image.png
```

**Explain the `convert` command:**

| Flag | Meaning |
|---|---|
| `-size 200x100` | 200px wide, 100px tall |
| `xc:white` | Blank white canvas |
| `-gravity center` | Put the text in the middle |
| `-pointsize 24` | Font size 24 |
| `-annotate 0 "CI Pipeline"` | Write the text, rotated 0° |
| `ci-image.png` | Output file name |

**🎤 Say this:** "The runner is a full Linux machine where we have `sudo` and can install anything with `apt-get`. Many tools are already installed; the list is in the `actions/runner-images` repo. `-y` answers 'yes' automatically, because no one is there to type it."

---

## Part 4: Verification and grading rubric

### 1. Warm-up run
- [ ] `windows-1999` run appears in Actions and does **not** run any steps (queued or failed)
- [ ] Exact error message written down
- [ ] After fixing to `ubuntu-latest` → ✅ green
- [ ] All 5 questions answered (see answers above)

### 2. Green path (success)
- [ ] All steps ✅
- [ ] Artifact **`test-results`** → contains `All tests passed successfully!`
- [ ] Artifact **`ci-image`** → white 200×100 image saying "CI Pipeline"
- [ ] **No** new issue created (the "Create issue on failure" step shows as **skipped**, greyed out)

### 3. Red path (failure)
Change `package.json`:
```json
"test": "echo 'Tests failed!' && exit 1"
```
- [ ] Workflow ❌ fails at **"Install & Test"**
- [ ] Steps after it (upload, ImageMagick, image upload) are **skipped**
- [ ] **"Create issue on failure"** runs ✅
- [ ] New issue **"Workflow failed on main"** appears in the Issues tab, with commit SHA, branch and a log link
- [ ] Clean up: change back to `exit 0`, push, close the issue

> 🎤 Point out: the overall run is still red ❌ even though the issue step succeeded. One failed step marks the whole job as failed.

---

## What to submit (expected commit history)

```
1. Add broken warm-up workflow         ← windows-1999
2. Fix runner to ubuntu-latest
3. Add CI pipeline                     ← ci.yml, green run
4. Break tests on purpose              ← exit 1, issue created
5. Restore passing tests               ← exit 0
```
Plus written answers to the 5 warm-up questions.

---

## Common student mistakes (troubleshooting cheat sheet)

| Symptom | Cause | Fix |
|---|---|---|
| Workflow doesn't appear in Actions | File not in `.github/workflows/` or wrong extension | Must be `.yml` or `.yaml` in exactly that folder |
| `Invalid workflow file` / YAML error | Tabs or wrong indentation | YAML uses **spaces only**; keep indentation consistent |
| `npm ERR! enoent ... package.json` | Forgot checkout step | Add `actions/checkout@v4` first |
| Issue step: `403 Resource not accessible by integration` | Missing permission | Add `permissions: issues: write` |
| Issue title shows `${context.ref...}` literally | Used quotes instead of backticks | Use `` ` `` template strings |
| `JSON.parse` / npm error on package.json | Curly quotes copied from PDF | Retype with straight quotes |
| Issue step never runs on failure | Missing `if: failure()` or step isn't last | Add the condition and move the step to the bottom |
| Artifact missing on red path | Steps after a failure are skipped | Expected. Use `if: always()` to upload anyway |
| Run on push didn't trigger | Pushed to a branch other than `main` | Trigger is `branches: [main]` only |

---

## Quick-fire recap questions to end the lecture

1. What does `runs-on` control? → *Which machine runs the job.*
2. Why do we need `actions/checkout`? → *The runner starts empty with no code.*
3. What makes the cache key change? → *A change to `package.json` (its hash) or the OS.*
4. Where do artifacts live after the VM is deleted? → *On GitHub, attached to the run, downloadable as a zip.*
5. Why does the issue step need `permissions`? → *The default token can't write issues.*
6. How do you spot a trustworthy Marketplace action? → *Verified creator badge, the official `actions/` org, stars/usage, good README, pinned versions.*
