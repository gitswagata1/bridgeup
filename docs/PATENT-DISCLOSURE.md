# Technical Disclosure — Federated Adaptive Learning for Education

**Working title:** *A Privacy-Preserving Federated Adaptive Learning System in which Learner Data Remains On-Device While a Shared Difficulty Model Improves Globally Through Aggregated Federated Updates*

| | |
|---|---|
| **Inventor** | Swagata Banerjee |
| **Affiliation** | Vellore Institute of Technology (VIT), Vellore |
| **Status** | Invention disclosure + working proof-of-concept (reduction to practice) |
| **Reference implementation** | `js/adaptive.js`, `js/cloud.js`, `supabase/schema.sql` in this repository |
| **Live demonstration** | https://gitswagata1.github.io/bridgeup/ |

> **Note.** This is an engineering disclosure prepared to support a patent filing. It is **not legal advice** and makes **no assertion of granted patentability**. A formal prior-art search and review by a registered patent agent / the VIT Intellectual Property cell are required before filing. The novelty statements below are the inventor's technical position, to be verified against prior art.

---

## 1. Field of the invention

The invention relates to adaptive e-learning systems, and specifically to a method and system for improving the *personalisation* of a learning platform across many learners **without centralising any individual learner's raw behavioural data** — by applying a federated-learning architecture, with differential-privacy perturbation and a device-resident memory layer, to educational difficulty modelling.

## 2. Background and problem

Adaptive learning platforms personalise instruction by observing each learner's behaviour (errors, time-on-task, hint usage, retries) and adjusting difficulty, sequencing, or support. To personalise *well*, such systems conventionally **collect and centralise raw learner-behaviour data** on a server, where models are trained on the pooled data.

This creates three coupled problems, especially acute in **educational** contexts involving minors and institutional data-protection obligations:

1. **Privacy exposure.** Raw, per-learner behavioural traces are transmitted to and stored on a central server, creating a large, sensitive, re-identifiable data surface.
2. **A cold-start vs. privacy trade-off.** A new deployment (or a new learner) has no data, so personalisation is poor until enough raw data is centrally collected — directly pitting personalisation quality against data minimisation.
3. **Institutional friction.** Schools and universities are often unable or unwilling to export student data to a third-party server, blocking adoption of otherwise-useful adaptive tooling.

Federated learning (training on decentralised data without centralising it) is established in domains such as mobile keyboards and healthcare imaging, but is **not conventionally applied to educational difficulty modelling**, and existing edtech adaptivity overwhelmingly relies on centralised raw-data collection.

## 3. Summary of the invention

The invention is a **three-layer Federated Adaptive Learning system** in which:

1. **A local observation layer** on each learner's device records raw struggle signals (quiz errors, challenge retries, hint reveals, code-execution errors) **and never transmits them**.
2. **A federated model layer** periodically derives, from those local signals, a *compact per-module difficulty estimate* — a single scalar plus a bounded weight — optionally perturbed with differential-privacy noise, and contributes **only that derived estimate** to a shared global model via weighted averaging (a federated-averaging / "FedAvg" analogue). The global model therefore contains **only aggregates**; raw events and learner identity are never transmitted or stored centrally.
3. **A context-preserving memory layer**, resident on the device, maintains a per-learner record of the concepts that learner has found difficult, and injects a natural-language summary of it into the context window of an interactive AI tutor agent, so the agent "remembers" the learner across lessons and sessions.

The system adapts using a **blend** of (a) the individual learner's own on-device progress and (b) the shared global difficulty model, to (i) recommend the next module, (ii) surface a privacy-preserving "commonly challenging" signal on hard modules, and (iii) prime the AI tutor. The global model improves as *every* device contributes, so personalisation improves globally while **no learner's raw data ever leaves their device**.

## 4. Detailed description

### 4.1 Architecture overview

```
   DEVICE (browser / client)                         SHARED (server or peer aggregate)
 ┌───────────────────────────────┐
 │ (1) LOCAL OBSERVATION LAYER    │   raw events never leave the device
 │   quiz errors, challenge       │
 │   retries, hint reveals,       │
 │   code-execution errors        │
 │            │                   │
 │            ▼                   │       derived estimate only  ┌────────────────────┐
 │ (2) LOCAL UPDATE               │  { module: (est, weight) }   │ (2') FEDERATED       │
 │   difficulty estimate e∈[0,1]  │ ───────────────────────────► │ AGGREGATION (FedAvg) │
 │   + differential-privacy noise │                              │ weighted average of  │
 │   + bounded weight (clipping)  │ ◄─────────────────────────── │ many devices'        │
 │            │                   │      global model {diff,n}   │ estimates → {diff,n} │
 │            ▼                   │      (aggregate, no identity)└────────────────────┘
 │ (3) ADAPTATION + MEMORY        │
 │   next-module recommendation,  │
 │   "commonly challenging" flag, │
 │   device-resident memory ──────┼──► injected into AI tutor context
 └───────────────────────────────┘
```

### 4.2 Local observation layer (device-only)

For each *module* `m` the device maintains a private record of counts:
`errors`, `hints`, `attempts`, and a boolean `solved`. These are updated as the
learner interacts (a wrong quiz answer increments `errors`; opening a challenge
hint increments `hints`; a failed graded run increments `errors` and `attempts`;
solving sets `solved`). This record is stored **only** in device-local storage and
is never transmitted.

### 4.3 Local difficulty estimate

From the local counts the device computes a saturating difficulty estimate:

```
raw   = 0.30·attempts + 0.20·hints + 0.15·errors
e     = 1 − exp(−raw)              # saturating map into [0,1)
e     = 0.7·e   if the learner eventually solved the module
```

The saturating form bounds any single learner's influence and reflects diminishing
marginal evidence.

### 4.4 Privacy-preserving contribution (the federated update)

Periodically the device contributes, **for modules with new evidence since the last
round only** (so a device is never double-counted), a per-module pair:

```
contribution[m] = { est: DP(e_m),  w: min(Δevidence_m, W_cap) }
```

where:

- **`DP(·)`** applies a differential-privacy perturbation — bounded noise added to
  the estimate before it leaves the device — so the transmitted number is not an
  exact function of the learner's actions. (The reference implementation uses a
  bounded uniform mechanism; this can be strengthened to a formal (ε, δ)-guarantee
  with a Laplace/Gaussian mechanism and a per-round privacy budget.)
- **`w`** is a **clipped** weight (`W_cap`), bounding any single device's per-round
  contribution — a standard robustness/privacy control.

Critically, the contribution contains **no raw events, no timestamps, and no learner
identifier** — only a derived scalar estimate and a bounded weight.

### 4.5 Federated aggregation (FedAvg analogue)

The shared global model holds, per module, a difficulty value `diff` and an effective
sample count `n`. Each incoming contribution is merged by **weighted averaging**:

```
diff' = (diff·n + est·w) / (n + w)
n'    = n + w
```

This is a federated-averaging update on a per-module parametric (scalar) model. It is
associative and order-independent in expectation, converges to the weight-weighted mean
of contributed estimates, and — because it stores only `{diff, n}` — the global model is
a pure aggregate that **cannot be inverted to recover any contributing learner's data**.

Aggregation may run:
- **server-side** (campus deployment): a security-definer database function
  (`contribute_adaptive()` in `supabase/schema.sql`) performs the merge; the client can
  *only* call this function and can never write raw rows; the aggregate table is the only
  thing persisted; or
- **locally** (single-device / peer mode): the device merges into a shared local model,
  demonstrating the identical protocol.

### 4.6 Exposure controls

- **k-anonymity floor.** A module's difficulty is only *exposed* to learners once its
  effective sample count `n` exceeds a threshold (`MIN_SAMPLES`), so an estimate can never
  reflect a single identifiable contributor.
- **Two-tier thresholds.** A conservative public threshold governs the visible
  "commonly challenging" flag; a more sensitive private threshold governs the on-device
  memory layer (§4.8), so public signals are cautious while personal support is responsive.

### 4.7 Adaptation outputs

The device blends the learner's own progress with the global model to produce:

1. **Next-module recommendation** — the next incomplete module, annotated with the
   learner's personal mastery and the federated difficulty signal.
2. **Privacy-preserving difficulty flag** — a "commonly challenging / takes practice"
   marker derived from the aggregate (never from an individual), shown only above the
   k-anonymity floor.
3. **AI-tutor priming** — see §4.8.

### 4.8 Context-preserving memory layer (device-resident)

The device maintains a per-learner memory of modules the learner has found difficult
(captured at the sensitive threshold of §4.6). When the learner opens the interactive
AI tutor agent, a natural-language summary of this memory is injected into the agent's
context window, so the agent adapts its guidance to the learner's history **across
lessons and sessions**. The memory is deliberately **device-resident**, reinforcing the
data-minimisation property: the learner's individual difficulty history is never
centralised even in campus mode.

## 5. Novelty and distinction over prior art

The inventor's position (to be confirmed by formal search) is that the combination is
novel because:

1. **Federated learning applied to educational difficulty modelling.** Federated
   learning is known in mobile text and healthcare imaging, but educational adaptivity
   conventionally centralises raw learner data. Applying a federated-averaging protocol
   specifically to *per-module difficulty estimation* appears novel in the educational
   domain.
2. **Derived-estimate contributions, not gradients or raw data.** Rather than shipping
   raw events (conventional edtech) or model gradients (conventional FL, which can leak),
   the device ships a single bounded, DP-perturbed scalar per module — a minimal,
   non-invertible contribution tailored to difficulty modelling.
3. **A privacy-preserving cold-start solution.** New learners and new deployments
   immediately benefit from the shared aggregate difficulty model without any raw data
   having been centralised — resolving the personalisation-vs-privacy trade-off of §2.
4. **Integration with a context-preserving, device-resident memory layer feeding an
   interactive LLM tutor agent** — combining adaptive modules, an interactive agent, and
   a memory layer under one privacy-preserving architecture.

Each element individually may have analogues; the **specific combination**, in the
**educational** context, with **derived-scalar federated updates + DP + k-anonymity +
device-resident agent memory**, is the claimed inventive contribution.

## 6. Draft claims *(for patent-agent review — illustrative, not final)*

**Independent claim 1 (system).** A computer-implemented adaptive learning system
comprising: a plurality of learner devices, each configured to (a) record, in
device-local storage, behavioural signals indicative of difficulty for one or more
learning modules, without transmitting said signals; (b) compute from said signals a
per-module difficulty estimate and a bounded contribution weight; (c) apply a
privacy-preserving perturbation to the estimate; and (d) transmit only the perturbed
estimate and bounded weight; and an aggregation component configured to merge received
per-module estimates into a shared model by weighted averaging such that the shared model
stores only aggregate difficulty values and sample counts and contains no raw behavioural
signal and no learner identifier; wherein each device adapts a presented learning
sequence using a blend of the learner's local progress and the shared model.

**Independent claim 2 (method).** A method comprising the steps performed by claim 1's
device and aggregation component.

**Dependent claims (illustrative).**
- wherein the perturbation implements a differential-privacy mechanism with a per-round privacy budget;
- wherein a module's aggregate difficulty is exposed to learners only when its sample count exceeds a k-anonymity threshold;
- wherein the contribution for a module reflects only evidence accrued since that device's previous contribution, preventing double-counting;
- wherein the aggregation is performed by a server-side function that clients may invoke but not bypass, and clients cannot write raw records;
- wherein a device-resident memory of difficult modules is injected into the context of an interactive language-model tutor agent;
- wherein the difficulty estimate is a saturating function of weighted error, hint, and attempt counts, attenuated upon eventual success.

## 7. Advantages

- **Data minimisation by construction** — raw learner data never leaves the device; only non-invertible aggregates are shared.
- **Institution-friendly** — enables adaptive tooling where exporting student data to a third party is disallowed.
- **Privacy-preserving cold-start** — new learners/deployments benefit immediately from prior aggregate learning.
- **Low overhead** — a scalar-per-module model; no heavy on-device training; runs entirely in a browser.
- **Regulatory alignment** — supports data-protection principles (minimisation, purpose limitation) relevant to educational data and minors.

## 8. Reduction to practice (working proof-of-concept)

The invention is implemented and demonstrable in this repository:

| Component | File |
|---|---|
| Local observation, estimate, DP, memory, adaptation | `js/adaptive.js` |
| Server-side federated aggregation + RLS (campus mode) | `supabase/schema.sql` (`global_model` table, `contribute_adaptive()` RPC) |
| Client federation adapter | `js/cloud.js` |
| Integration into the live course UI | `js/app.js` |

**To reproduce:** open the live demo, sign in as a student, and struggle on a module
(wrong quiz answers, open a challenge hint, fail a graded run). The device contributes a
derived estimate; the shared difficulty model updates; a second learner then sees a
privacy-preserving "commonly challenging" signal on that module — while inspection of the
shared model shows it contains only `{difficulty, sampleCount}` per module, with no raw
events and no identifier. Campus-mode aggregation was additionally verified against the
`contribute_adaptive()` server function, confirming the shared table stores no student
data or identity.

## 9. Next steps toward filing

1. Formal prior-art / patentability search (FL in edtech; adaptive difficulty modelling; on-device learning-analytics privacy).
2. Review with a registered patent agent and the VIT IP cell; decide provisional vs. complete specification and territory (e.g., India Patent Office).
3. Optionally strengthen the DP mechanism to a formally proven (ε, δ)-guarantee and add secure-aggregation to the claim set.

---

*Prepared as an engineering disclosure to support the above process. Not legal advice; no representation of granted patentability is made.*
