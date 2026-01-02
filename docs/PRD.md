---
type: prd
status: v1
owner: Suyash
product: Interview Conditioning Studio
audience: builder
philosophy: craft
monetization: one-time
opensource: core
created: 2025-01-XX
---

# PRD — Interview Conditioning Studio

> [!note]
> This is an internal product decision document.  
> It is intentionally opinionated and optimized for behavior change, not growth.

---

## 1. Problem Statement

Experienced software engineers frequently fail coding interviews despite being effective at building real systems.

This failure is **not** due to lack of technical ability, but due to insufficient conditioning for interview-specific constraints:

- No tests or execution
- Limited tooling
- Strict time pressure
- Verbal reasoning while coding
- Heuristic, subjective evaluation

Most interview-prep tools optimize for:
- problem volume
- automated correctness
- comparative metrics

These incentives increase cognitive load, encourage grind, and fail to simulate how interviews actually work.

The result is:
- anxiety
- confidence erosion
- wasted preparation effort that does not translate into interview performance

---

## 2. Target User (ICP)

### Primary User
- Senior / staff-leaning software engineers
- Strong production background (backend, infra, platform, systems)
- Comfortable shipping real systems
- Limited preparation bandwidth
- Actively interviewing or anticipating interviews

### Explicit Non-Users
- Beginners learning algorithms or data structures
- Users optimizing for leaderboards or rankings
- Users seeking automated test execution or pass/fail grading
- Users with large amounts of discretionary prep time

> [!important]
> This product is intentionally **not inclusive**.  
> Focus is a feature, not a limitation.

---

## 3. Job To Be Done

**Condition experienced engineers to produce correct code under interview constraints, without the grind, context switching, or motivational tax of traditional interview preparation.**

---

## 4. Core Insight

Coding interviews do **not** evaluate binary correctness.

They evaluate:

- progress toward correct code
- under time pressure
- informed by reasoning, recovery, and judgment

Interviewers:
- do not run exhaustive test suites
- intervene heuristically
- guide candidates away from dead ends
- reward convergence over polish

> [!note]
> Interview preparation should therefore train **behavior under constraint**, not completion metrics.

---

## 5. Product Principles (Non-Negotiable)

> [!important]
> These are **rules**, not aspirations.

- **Code is the primary signal**  
  All other inputs exist only to support correctness under time pressure.

- **Constraints are enforced, not optional**  
  - No tests  
  - Single file  
  - Fixed time box  
  - Silence near the end

- **Guidance prevents wasted time, not wrong answers**  
  Nudges steer trajectory but never supply solutions.

- **Silence is intentional**  
  Once nudges or time are exhausted, the system steps back.

- **Progress is directional, not comparative**  
  No scores, leaderboards, streaks, or global metrics.

---

## 6. The Atomic Session (Core Loop)

A single session is the smallest complete unit of value.

### Session Flow
1. User starts session  
   - Problem is selected automatically to remove decision paralysis.

2. **Invariants phase (required)**  
   - Short comment block capturing assumptions, constraints, invariants.

3. **Timed coding phase**  
   - Single file
   - No tests
   - User verbalizes reasoning while coding

4. **Guided intervention (limited)**  
   Nudges may appear if:
   - progress stalls
   - invariants are violated
   - structural red flags emerge

5. **Endgame silence**  
   - Near the end of the time box, the system becomes silent.
   - User must land the solution independently.

6. **Session summary**  
   - Lightweight qualitative feedback focused on trajectory and behaviors.

> [!note]
> Completion is **optional**.  
> A session can be successful even if the solution is unfinished.

---

## 7. MVP Inputs (Hard Scope Boundary)

### Required Inputs (v1)
- **Invariants** — short textual comment block (pre-coding)
- **Code** — single file, no tests
- **Verbal commentary** — captured during coding

### Explicitly Excluded (v1)
- Written walkthroughs or post-mortems
- Test execution or automated judging
- Numerical scores or percentages
- Leaderboards or comparative analytics
- Large problem libraries

---

## 8. Feedback Model

### During Session
- **Gentle nudges only**, e.g.:
  - Edge-case prompts
  - Invariant consistency checks
  - State or variable coherence prompts

Nudges are:
- contextual
- capped in frequency
- never solution-revealing

### End of Session
- Short qualitative summary across:
  - problem framing
  - execution under time pressure
  - recovery / debugging behavior

> [!important]
> The product does **not** certify correctness.  
> It trains behaviors that lead to correctness.

---

## 9. Success Definition

A session is successful if the user demonstrates **interview-relevant behaviors that move them toward correct code under time pressure**, regardless of final completion.

Observable behaviors:
- invariants written and referenced
- coherent solution strategy
- forward progress within time box
- self-correction or recovery

---

## 10. Non-Goals

This product explicitly does **not** aim to:
- teach algorithms from first principles
- certify intelligence or skill level
- replace interviewers or interviews
- optimize for problem volume
- provide confidence through execution-based validation

---

## 11. MVP Success Criteria (Internal)

v1 is successful if:
- this tool is preferred over LeetCode on weekdays
- sessions feel intense but contained
- confidence entering coding interviews increases
- unfinished solutions still feel productive
- preparation feels sustainable rather than draining

---

## 12. Open Source & Monetization Philosophy

- Core practice loop and mechanics are open source
- Contributors receive free access to hosted offerings
- Monetization (if any) is **one-time payment** for convenience and curation
- The product is designed to help users **leave**, not retain them indefinitely

---

## 13. Risks & Open Questions

- Calibrating nudge frequency
- UX friction around verbal commentary capture
- Trust calibration for heuristic feedback
- Whether execution/testing is ever necessary

---

## Closing Note

This is not a learning platform.

It is an **interview-conditioning environment**.

If users feel slightly uncomfortable, slightly exposed, and more confident afterward, the product is working.