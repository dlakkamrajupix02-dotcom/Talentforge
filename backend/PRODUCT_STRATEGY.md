# TalentForge (JD Forge / Air Flow) — Product Strategy & Go-To-Market Report

**Date:** 2026-08-11
**Basis:** Deep exploration of the backend (`C:\Users\pmannem\Documents\SABA`), the React frontend (`C:\Users\pmannem\Documents\Frontend`), live API testing as an Admin user (`john@example.com`), and the prior security audit (`SECURITY_AUDIT.md`).

---

## 0. How This Was Assessed

I logged into the live system (backend running at `127.0.0.1:8000`) as an Admin and exercised the actual product:

- Login (single-session policy verified — previous session was force-logged-out)
- `GET /auth/me`, JD list, templates, models, members, managers, workflows, sessions, analytics, orgs, CSOD status, images, notifications
- **AI JD generation** — generated a real "Frontend Developer" JD in **7.3s** with weighted competencies (sums to 100), structured sections, EEO statement
- **DEI scan** — correctly flagged "young energetic" (ageism), "He must be" (gender bias), "rockstar coder" / "coding ninja" (coded language) with rephrasing suggestions
- **Compliance scan** — correctly flagged ADEA age discrimination, gendered pronouns, unprofessional language against US law
- **Workflow engine** — started a 2-step approval workflow on the generated JD; JD routed to approver with comments trail + version history

Everything below is grounded in what I saw working, what returned empty, and what the code reveals.

---

## 1. What This Product Actually Is

In plain business language:

> **An AI-powered job description factory with an enterprise approval workflow and direct publishing to hiring systems (Cornerstone/Saba).**

HR teams currently spend hours writing, revising, and chasing approvals for job descriptions. This product replaces that manual loop:

1. **Create** — an HR person types a role title and a few skills (or picks a template).
2. **Generate** — AI writes a complete, structured, weighted, compliant job description in ~7 seconds.
3. **Review** — it flows through a configurable multi-step approval chain (Manager 1 → Manager 2 → …) with comments, delegation, SLA tracking, and full version history.
4. **Publish** — approved JDs are pushed to Cornerstone (CSOD) or Saba, surfaced as public job openings, and candidates can apply inside the system.
5. **Comply** — a DEI scan and regional compliance scan catch ageist, biased, or legally risky language *before* a JD goes live.

Underneath this sit: SSO (Google/Microsoft/LinkedIn/Cornerstone), MFA with org-level policy, session management, notifications (WebSocket), an end-user experience (job openings, applications, digital signatures, appraisals), a Super-Admin tenant layer (organizations, broadcasts, cross-tenant analytics), and analytics dashboards.

The stack: React (Vite/Tailwind) frontend; FastAPI + PostgreSQL + Redis + async background tasks backend; multiple LLM models (phenomecloud + lexy families) behind a single generation API.

---

## 2. Who Should Buy It

**Ideal first customer: SMB / mid-market employers (roughly 100–2,000 employees) with regulated or compliance-sensitive hiring — healthcare, finance, government contractors, staffing agencies/RPOs — who already use (or will use) Cornerstone OnDemand or Saba.**

Why this segment:
- They have enough hiring volume that JD writing is a real cost (an HR generalist spends 2–4 hours per JD today).
- They are legally exposed (EEO/OFCCP in the US; Equality Act in the UK; age/gender bias law) — compliance is a *must-have*, not a nice-to-have.
- They already pay for Cornerstone/Saba, so "publish straight into our HR system" is a compelling add-on.
- They are small enough to adopt a focused tool (Workday customers are too locked into the suite; Cornerstone/Saba customers have a genuine gap).

**Second: RPOs and staffing agencies** that write hundreds of JDs for different clients and need velocity + template reuse.

Ranking (who to sell to first):

| Segment | Problem | Current Solution | Pain | Willingness to Pay | Fit |
|---|---|---|---|---|---|
| Mid-market Cornerstone/Saba HR teams | Slow, inconsistent, risky JDs + manual approval | Word docs + email + generic AI writers | High | High | **Best — target first** |
| Staffing agencies / RPOs | Volume JD writing, client brand consistency | In-house templates + copywriters | High | Medium | Good — second |
| Regulated enterprises (healthcare/finance/gov) | Compliance risk, audit trails | Legal review of every JD | High | High | Good — longer sales cycle |
| SMBs (<100 employees) | Ad-hoc hiring | Free AI writers / Word | Medium | Low | Weak — avoid initially |

**Do not target "everyone."** The single first customer segment is: **mid-market HR/TA leaders at Cornerstone/Saba shops in regulated industries.**

---

## 3. What Problem It Solves

The actual business pain (evidenced by the product's own design):

1. **Time:** A manager requests a JD → HR drafts → 2–4 managers each edit → email ping-pong → legal checks. Days to weeks. The product collapses drafting to ~7 seconds and gives the approval process structure (steps, SLAs, delegation).
2. **Inconsistency:** Every JD from a different author looks different. Templates + AI generation + weighted competency structure produce consistent, professional output.
3. **Risk:** Biased language ("young", "He", "rockstar") and missing EEO/regional statements create legal exposure. The DEI + compliance scanners catch this before posting.
4. **Loss of control / no audit trail:** Who approved what, when, and why? The workflow engine records comments, decisions, versions, and delegation — a defensible record.
5. **Publishing friction:** Approved JDs must be copied into the ATS manually. Direct CSOD/Saba push removes that step.
6. **No candidate-to-role closure:** Published openings, applications, and end-user review/acknowledgement bring the loop inside one system.

---

## 4. Current Product Strengths (verified working)

- **AI generation is genuinely good and fast.** 7.3s for a complete, structured JD with weighted key duties/competencies (sums to 100), required vs preferred qualifications, and a proper EEO statement. 21 models behind one endpoint with fallback logic.
- **Compliance/DEI scanning works and is a real differentiator.** Accurate findings with concrete rephrasings, scored output, and one-click apply.
- **The approval workflow engine works end-to-end.** Multi-step, per-step approver, SLA, delegation (recursive), comments trail, version history, current-step tracking. This is more than most competitors offer.
- **Deep, coherent auth/security layer:** MFA (TOTP + org policy), SSO (Google/Microsoft/LinkedIn/Cornerstone), single-session enforcement, session audit, rate limiting, org-scoped access control, Redis-backed token/session management.
- **A working Super-Admin tenant layer** (organizations, broadcasts, cross-tenant analytics) — rare in a prototype; this is an enterprise-credibility feature.
- **Premium, consistent UI** — glassmorphism, animations, role-based workspaces, version-compare view, rich text editing, drag-and-drop weighted lists. The *look* is sellable.
- **Version compare + restore** (sentence-level diffing) is a polished, impressive feature.
- **Prepared for compliance scale:** regional compliance library, EEO statement builder, country context.

---

## 5. Current Product Weaknesses (what prevents selling)

1. **No self-serve onboarding.** The `/signup` route redirects to `/login` (`App.jsx:202`); the demo login is "Coming Soon" (`AuthLayout.jsx:57`). A prospect literally cannot start without an admin creating them. There is no trial.
2. **Templates are empty in the live org** (`GET /templates/` → `total: 0`). The "start from a template" flow — a core selling story — has zero content to show.
3. **CSOD/Saba connections are unconfigured** (`{"connected":false,"message":"No CSOD connection configured."}`). The headline integration can't be demoed without setup.
4. **The compliance panel in the frontend is decorative/hardcoded** (75% progress bar, canned suggestions) even though the backend scanner is excellent. The wow capability is not surfaced in the UI.
5. **No MFA UI despite backend support** (`mfa` flag returned by login, `requiresMfa:true` stops the frontend). Enterprise buyers checking the box will notice.
6. **Heavy test-data pollution.** Live org contains junk: workflows named "aaasad", JDs titled "Offline creation" with content like "this is my next of this project", encoding garbage (`salary_symbol":"�?1"`), duplicate sections. A prospect demo will see this.
7. **Massive frontend dead code / monoliths.** ~1,300 commented lines in `GenerateJD.jsx`, ~970 in `JDForm.jsx`, a fully commented `Navbar.jsx`, empty stub files (`AssignJD.jsx`, `UserSelectionDrawer.jsx` — both 0 bytes), 10 files >100 KB (largest 241 KB). This is a maintenance and velocity risk, and signals pre-release.
8. **Unreachable/gated features** (Appraisal Center "Version 2.0" overlay, MyPerformance "Coming Soon", iCIMS integration "Next Release") — scope is broader than what ships.
9. **Security findings from the audit** (unauthenticated `/private/uploads`, presence-only `/static` token check, weak 15-char `SECRET_KEY`, plaintext MFA backup codes) — a serious enterprise buyer will run a penetration test and find them.
10. **No tests, no CI, outdated docs** (PROJECT_GUIDE describes mock auth + localStorage; README is the stock Vite template). Credibility gap for engineering buyers.
11. **Analytics partially fabricated in the UI** (hardcoded defaults like `clarityScore || 75`, `aiAcceptanceRate || 70`; decorative +12% trends). Reporting can't be trusted yet.

---

## 6. Current Selling Point (what you can sell today)

> **"Write a compliant, approval-ready job description in 10 minutes instead of 3 days — with version history and one-click publishing to Cornerstone."**

This is honest and defensible *today*: the AI generation, the scanners, and the workflow engine all demonstrably work. Everything needed to close a pilot sits on top of those three.

## 7. Recommended Selling Point (what it should become known for)

> **"The compliance-first job description lifecycle platform for regulated hiring."**

Position TalentForge as the tool that makes a job description **defensible** — not just generated. The moat is the combination: AI writing **+** bias/compliance scanning **+** governed multi-step approval **+** ATS publishing **+** full audit trail. Generic AI writers (ChatGPT, Notion AI, most "JD generator" SaaS) write text but give you none of the governance. That governance story is what a Head of HR will pay for.

---

## 8. Missing Features (ranked by business value)

| Rank | Feature | Why it matters commercially |
|---|---|---|
| 1 | **Self-serve trial + onboarding** (working signup, sample org, guided setup) | Nothing sells without it; it's the blocker for *every* sale |
| 2 | **Seed template library** (50–100 role templates incl. healthcare/finance) | The "start from template" story is empty today |
| 3 | **Wire the working compliance engine into the UI** (live score, one-click fix, evidence panel) | Turns a hidden strength into the headline demo |
| 4 | **CSOD/Saba one-click demo connection** (sandbox credentials + connection test) | The integration is the close — it must demo instantly |
| 5 | **MFA UI + admin policy screens** | Enterprise trust checkbox |
| 6 | **Clean demo tenant** (curated JDs, workflows, users, no junk) | First impression |
| 7 | **Real, honest analytics** (generation time, approval cycle time, rejection rate, compliance score over time) | Reporting = the ROI proof HR leaders need |
| 8 | **Self-serve template authoring** (HR builds org templates from approved JDs) | Locks in org standards; retention |
| 9 | **PDF/Word brand kit exports** (org logo, consistent formatting) | Practical daily value, easy |
| 10 | **Audit export** (who approved what, when; downloadable) | Compliance buyers need it |

---

## 9. Top 5 "WOW" Features (demo-impact ranked)

### 1. Live compliance + DEI scan with one-click fix (Build — the ROI moment)
- **What:** Paste/generate a JD → see a bias/compliance score → click "apply fix" → clean version.
- **Why it matters:** It converts legal risk into a visible, measurable action. Nothing a generic AI writer does.
- **Who uses it:** HR + legal/compliance.
- **Competitors weaker:** Textio/Ongig focus on inclusive-language scoring but not regional law compliance or one-click rewriting; they don't sit inside an approval workflow.
- **Difficulty:** Low backend (already works), Medium frontend (currently hardcoded — replace with live data).
- **Demo:** Generate a deliberately biased JD in front of the buyer, scan it, fix it live.

### 2. The 7-second AI generation with weighted competencies (Show — the "wow" opener)
- **What:** Title + 3 skills → full structured JD in seconds, with competencies weighted to 100.
- **Why it matters:** Instant visible productivity.
- **Difficulty:** Already built. Just demo it.
- **Demo:** Type "Frontend Developer, React, TypeScript" → show the generated result.

### 3. Governed multi-step approval with delegation + version compare (Show — the "control" story)
- **What:** JD routed through approvers with SLAs, delegation, full version history, sentence-level diffing and restore.
- **Why it matters:** This is what Excel/Word/email cannot do. It's the retention story.
- **Difficulty:** Already built.
- **Demo:** Start a workflow, show the manager's review screen, the change-highlighting, and the audit trail.

### 4. One-click publish to Cornerstone/Saba (Build-on — the integration close)
- **What:** Approved JD → push to CSOD/Saba with status tracking and history.
- **Why it matters:** It removes the last manual step and justifies itself against "we'll just use Word."
- **Difficulty:** Medium — needs a working sandbox connection and a clean push UI.
- **Demo:** Approve → push → show it appear in the ATS.

### 5. Candidate job openings with applications (Show — the closed loop)
- **What:** Published JDs surface as public openings; candidates browse and apply; end-users get tasks.
- **Why it matters:** Shows the product isn't just a writer — it owns the hiring loop.
- **Difficulty:** Built; needs cleanup + a demo candidate account.

---

## 10. Features NOT Worth Building

Be critical — would a customer pay more because this exists?

- **Appraisal Center / Performance ("EndUser" performance & appraisal)** — Unrelated to job descriptions. It's a feature looking for a problem. **Don't build; remove or park.** It dilutes the pitch.
- **Broadcasts (Super Admin)** — Internal-communication noise; zero revenue impact. **Don't build further.**
- **iCIMS / generic ATS integrations** — Nice later, but Cornerstone/Saba is the wedge. **Don't build until the wedge closes deals.**
- **More AI models / model tuning UI** — Users don't care about 21 models; they care about output quality. Hide the model picker. **Don't invest here.**
- **Dark mode, custom theming, more animation** — Polish is already ahead of the product. **Stop.**
- **Generic notification preferences, chat, presence/typing** — Internal chat is undifferentiated. **Park.**
- **More compliance regions** — Only add regions you have buyers for. US → UK → then one EU country. **Do not boil the ocean.**
- **Pagination/UX tweaks** — Fine to fix bugs, but not a differentiator. **Low priority.**

---

## 11. Target Customer (who to approach first)

**Mid-market HR/Talent Acquisition leaders (Director/VP HR, Head of TA) at companies of 100–2,000 employees in regulated industries (healthcare, financial services, staffing/RPO), who run Cornerstone or Saba or plan to.**

Approach channels:
- Cornerstone/Saba partner/ecosystem programs (an add-on app).
- HR/TA community referrals and case studies from 2–3 pilot customers.
- RPO vendors who manage hiring for multiple clients.

Proof target: **3 pilot customers** in one vertical (healthcare is strongest — licensure, EEO, and volume all apply) who will pay for the compliance + workflow + publishing package.

---

## 12. Competitive Advantage

| Alternative | Weakness vs. TalentForge |
|---|---|
| Word/email/Excel | No structure, no audit, no compliance, no speed |
| ChatGPT / generic AI writers | Generates text but no governance: no bias scanning, no approval flow, no ATS publish, no version history |
| Textio / Ongig | Inclusion scoring only — no regional law compliance, no workflow, no publishing; expensive |
| SHRM / generic JD templates | Static text, no generation, no lifecycle |
| Workday/Cornerstone native tools | Generic; JD writing is not their focus; still manual |
| Build internally | Months of work; no LLM/vision infra; hard to replicate compliance + workflow |

**Honest caveat:** the generic "AI writes a JD" capability is **not** differentiated in 2026 — every vendor can bolt on an LLM. The differentiation is real only when you sell the *combination* (compliance + workflow + ATS + audit), and only the compliance scanner + workflow engine are currently strong enough to carry that claim. The other two pillars (templates, ATS publishing) are built but unpopulated/unconfigured in the demo.

---

## 13. Monetization Strategy

**Model: tiered subscription (per-organization, with a per-seat component), because the buyer is the organization (HR/TA), not individuals.**

- **Free / Trial (14 days):** 1 admin + up to 5 users, 10 AI generations, all scanning features, sample template library, no ATS publishing, no MFA policy. Goal: let them generate + scan something great in the first session.
- **Professional:** Unlimited AI generations, org template library + authoring, approval workflows, version history, DEI + compliance scanning, CSOD/Saba publishing, notifications, standard support. This is the default purchase.
- **Enterprise:** SSO (SAML — not yet built), MFA enforcement, audit export, custom compliance regions, dedicated support, Super-Admin multi-org management, data residency, SLAs.
- **Add-ons:** RPO/multi-client workspaces; extra compliance regions; training/setup fee (one-time) — an onboarding fee is standard for this buyer.

Do not invent absolute prices here — validate with 3 pilot buyers. A reasonable anchor: Professional priced per month per org with a small per-seat increment; Enterprise negotiated.

---

## 14. 10-Minute Sales Demo (exact sequence)

Setup: clean demo tenant, 1 generated JD pre-loaded, CSOD sandbox connected.

1. **0:00–0:45 — The problem.** "Today a JD takes 2–4 hours and crosses 3 managers by email. Nothing is tracked; biased language slips through." One sentence each.
2. **0:45–2:30 — Generate (WOW).** Type a role + 3 skills → AI produces a complete, weighted JD in ~7 seconds. Point to the structure (duties, competencies weighted to 100, required vs preferred, EEO).
3. **2:30–4:00 — Compliance (WOW).** Scan it → show the score → click "apply fix" → show the cleaned text. "This is the risk your current process silently carries."
4. **4:00–5:30 — Approve.** Submit to a 2-step workflow; show the manager's review screen with change-highlighting and the audit trail.
5. **5:30–6:30 — Publish.** Approve → push to Cornerstone → show the opening live and a candidate applying.
6. **6:30–8:00 — Governance.** Show version history, delegation, session/MFA settings (enterprise box).
7. **8:00–9:00 — ROI.** Show cycle time and volume analytics (honest numbers once fixed).
8. **9:00–10:00 — Close.** "You'll have this live for your TA team in 2 weeks. Pilot pricing is X; here's what we need to start."

---

## 15. Product Roadmap

### Phase 1 — Make It Sellable (must-have; weeks)
| Feature | Customer value | Business value | Complexity |
|---|---|---|---|
| Working self-serve signup + 14-day trial + guided onboarding | Can try it today | Removes #1 sales blocker | Low (backend exists; fix route + UI) |
| Seed 50–100 role templates (healthcare/finance first) | Instant "start here" value | Makes the core flow demo-able | Medium (content effort) |
| Wire live compliance engine into UI (replace hardcoded panel) | Real scores, one-click fixes | Headline feature visible | Medium |
| Clean demo tenant + junk data removal | Professional first impression | Close rate | Low |
| CSOD/Saba sandbox + connection test UX | Integration actually demos | The close | Medium |
| Fix security audit Critical/High items | Passes buyer pen-test | Enterprise trust | Medium |
| MFA UI + policy screens | Enterprise box-tick | Credibility | Medium |

### Phase 2 — Differentiation (P1; months 1–3)
| Feature | Customer value | Business value | Complexity |
|---|---|---|---|
| Template authoring from approved JDs ("save as org template") | Org standards compound | Lock-in + retention | Medium |
| Compliance evidence pack / audit export | Legal-ready record | Enterprise sale | Medium |
| Branded PDF/Word export kit | Daily practical value | Churn reduction | Low |
| Honest analytics (cycle time, compliance score trend, volume) | ROI proof | Renewals | Medium |

### Phase 3 — Retention (P2; months 2–4)
| Feature | Customer value | Business value | Complexity |
|---|---|---|---|
| Workflow SLA escalations + reminders | Faster approvals | Daily value | Medium |
| Candidate experience polish (apply flow, status) | Closed loop | Expansion | Medium |
| Webhooks/API for downstream tools | Fits existing stack | Expands surface | Medium |

### Phase 4 — Enterprise (P3)
| Feature | Customer value | Business value | Complexity |
|---|---|---|---|
| SAML SSO | Single sign-on | Required for mid-market | Medium |
| Audit-log export + retention policy | Compliance | Enterprise deals | Medium |
| Custom compliance regions | Global HR | Price power | Medium |
| Advanced RBAC + roles | Control | Enterprise deals | Low-Medium |

### Phase 5 — Scale
| Feature | Customer value | Business value | Complexity |
|---|---|---|---|
| Multi-tenant billing + metering | — | Revenue ops | Medium |
| Usage analytics for resellers/RPO | — | Channel | Medium |
| Horizontal deployment (stateless workers) | Uptime | Enterprise reliability | Medium |

---

## 16. Technical Roadmap (what the codebase needs)

**Backend (FastAPI):**
- Fix the security audit Criticals first: auth-guard `/private/uploads` (`main.py:335`), fully validate tokens + org ownership on `/static` (`main.py:312-332`), rotate/strengthen `SECRET_KEY`, hash MFA backup codes (`auth_routes.py:421`), hash OTPs (`otp_service.py`).
- Add a **seed/migration** for the template library and a `DEMO_MODE` seeding script for a clean tenant.
- Add **signup→trial tenant provisioning** (org + admin + sample data + expiry on `access_valid_until`).
- Add **SAML SSO** and an **audit-log export** endpoint (both new auth surface, reuse existing org/session machinery).
- Add **honest analytics queries** (the repos already count most metrics) — stop the frontend from fabricating defaults.
- Add **tests + CI** (pytest is already in requirements) — zero tests today is a blocker for enterprise buyers.
- Consider making the compliance engine an async, cacheable service (it works sync now; fine at this scale).

**Frontend (React):**
- Unblock `/signup` (`App.jsx:202`) and build the trial onboarding flow (the SignUp page already exists and is polished).
- Replace the hardcoded compliance panel (`CompliancePanel.jsx`, 75% bar in `GenerateJD.jsx`) with live backend scan results.
- Delete dead code at scale (commented blocks, dead `Navbar.jsx`, empty stubs `AssignJD.jsx`/`UserSelectionDrawer.jsx`, dead mock imports) and split the 10 >100 KB files.
- Add MFA screens (backend flag already returned on login).
- Add a sample-template library UI with category filtering (search/filter infra exists in `Templates.jsx`).
- Add the CSOD connection test + demo-connection UI (frontend page exists: `CSODConnection.jsx`).

**Infrastructure:**
- Add CI (lint + tests + build). Add `SECRET_KEY`/`CSOD_ENCRYPTION_KEY` length validation at startup. Keep the existing Redis/Postgres architecture — no Kafka/K8s needed at this stage.

**No rewrites.** The architecture (FastAPI + PostgreSQL + Redis + LLM gateway + React) is appropriate. Extend it.

---

## 17. Final Product Verdict

**The product is a strong prototype with a credible, differentiated core — but today it is unsellable as-is because a prospect cannot try it, the flagship demo surfaces (templates, ATS publishing, compliance UI) are empty or hardcoded, and the demo data is junk.**

**If I were responsible for selling this, the FIRST thing I would change: make the product instantly experienceable.** Specifically: unblock signup, seed a real template library + clean demo tenant, and wire the already-working compliance scanner into the UI. That one change turns "an impressive engineering demo" into "a product a Head of HR can evaluate in 15 minutes" — and it's mostly configuration and frontend wiring, not new engineering.

The honest product-market-fit verdict: **promising but unproven.** The technology outpaces the product surface. There is strong evidence of a real pain being solved (generation, compliance, governance), but no evidence in this repo of paying users, a funnel, or product-market validation. That must be the next investment.

---

## TOP 10 ACTIONS (ranked)

1. **Unblock self-serve signup + 14-day trial with guided onboarding**
   → Customer: can try instantly. Business: removes the #1 sales blocker. Technical: fix `/signup` route, add tenant provisioning + expiry. Priority: **P0**. Complexity: **Medium**.
2. **Seed a template library (50–100 roles, healthcare/finance first) + clean demo tenant**
   → Customer: instant "start here" value. Business: makes the demo flow coherent. Technical: seed migration + demo seeding script. Priority: **P0**. Complexity: **Medium**.
3. **Replace the hardcoded compliance panel with live scan results + one-click fix**
   → Customer: real, defensible risk reduction. Business: the headline differentiator becomes visible. Technical: frontend wiring; backend exists. Priority: **P0**. Complexity: **Medium**.
4. **Fix security audit Critical/High items** (private uploads auth, static token validation, SECRET_KEY strength, backup-code hashing)
   → Customer: passes a buyer's pen-test. Business: enterprise trust. Technical: main.py + auth_service + crypto. Priority: **P0**. Complexity: **Medium**.
5. **Wire CSOD/Saba demo connection + connection test UX**
   → Customer: the integration close works. Business: closes deals. Technical: sandbox creds + test endpoint already exist. Priority: **P0**. Complexity: **Medium**.
6. **Add MFA UI + admin MFA-policy screens**
   → Customer: enterprise security box-tick. Business: credibility. Technical: frontend; backend exists. Priority: **P1**. Complexity: **Medium**.
7. **Replace fabricated analytics with real metrics** (cycle time, compliance score trend, volume)
   → Customer: ROI proof. Business: renewal story. Technical: query layer + remove hardcoded defaults. Priority: **P1**. Complexity: **Medium**.
8. **Add tests + CI** (lint, pytest, build)
   → Customer: engineering confidence. Business: procurement credibility. Technical: config + test suite. Priority: **P1**. Complexity: **Medium**.
9. **Delete dead code and split monolithic files** (commented blocks, dead Navbar, empty stubs)
   → Customer: faster features. Business: team velocity. Technical: frontend refactor. Priority: **P2**. Complexity: **Large** (careful, high risk of regressions).
10. **Remove/park non-core scope** (Appraisal Center, Performance, Broadcasts)
    → Customer: clearer product. Business: sharper pitch. Technical: gate or delete. Priority: **P2**. Complexity: **Small**.

---

## Call to Action

This report is a plan, not a promise. The fastest path to a real answer is **three pilot customers** in one vertical (healthcare is the strongest candidate) using the Phase-1 build. Their feedback — not the roadmap — should determine Phase 2.
