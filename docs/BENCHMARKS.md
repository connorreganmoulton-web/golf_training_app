# Where the numbers come from

The default practice plan and its targets are built on published strokes gained
research. This file records the sources so the reasoning can be checked rather
than taken on trust.

## Targets used by the plan engine

Per nine holes, aimed at a mid-handicap working downward:

| Metric | Target | Basis |
|---|---|---|
| Greens hit | 3.5 | 15-handicaps average ~26% GIR; 10-handicaps ~37% |
| Penalty strokes | 1.0 | Penalties are the leading cause of doubles |
| Doubles or worse | 1.0 | Cutting doubles is the fastest available scoring gain |
| Three putts | 1.0 | Three-putt rate separates handicaps; long-putt make rate does not |

## Putting the four categories in the same unit

The plan compares categories to decide which two get extra practice time. Until
#40 it compared them as a fraction of each metric's own target, which is not a
shared unit: greens hit is the only higher-is-better metric here, so its deficit
could never exceed 1.0 while the other three had no ceiling. A player hitting no
greens at all scored 1.0 and lost to anyone two doubles over target.

The categories are now scored in strokes per nine, which is what the findings
below are denominated in anyway:

| Metric | Strokes per unit off target | Basis |
|---|---|---|
| Greens hit | 0.75 | 3 strokes of approach separation per nine, spread over the greens that separate the same two players. See below — the greens figure is not sourced here |
| Penalty strokes | 1.0 | A penalty stroke is one stroke. The lost distance is not counted |
| Doubles or worse | 2.0 | Cutting 4.5 doubles per round to 2.5 saves four strokes |
| Three putts | 1.0 | A three putt is one stroke over a two putt |

**These are coarse approximations and the plan only uses them to rank
categories against each other.** They are not strokes gained and they are not
shown to the user as a number. Three of them are weaker than they look and the
weaknesses are worth stating:

- **The greens-hit cost is the only one that needed a figure this file does not
  have.** Halving the 6-stroke approach separation gives 3 strokes per nine, but
  turning that into a per-green cost needs the GIR of the two players it
  separates, and the only GIR figures recorded above are for 15- and
  10-handicaps. Taking a scratch golfer at roughly two thirds of greens and a
  20-handicap at roughly a fifth puts the gap near 4 greens per nine, which is
  where 0.75 comes from. Those two GIR numbers are not sourced here. Treat 0.75
  as the order of magnitude — under a stroke per green — rather than as a
  measurement.
- **The penalty figure is a deliberate undercount.** A penalty usually costs
  more than the stroke it is named for, and there is no defensible free number
  for how much more.
- **Doubles at 2.0 and penalties at 1.0 double-count.** The same file says
  around 70% of doubles begin with a penalty stroke or a failed recovery, so a
  player is charged twice for some of the same bad decisions. This weight is decisive, not incidental: rescoring doubles
  at 1.0 changes which categories the plan picks in 4.4% of a 40,000-round-set
  sweep of uniformly random integer cards, and fails 7 of the 19 tests in
  `tests/plan.test.ts`. Distributions weighted toward real mid-handicap scoring
  give larger figures, so treat 4.4% as the floor. Both categories
  point at the `sim` block, so `sim` usually survives the change — but the
  second boosted block often does not, and the user is told to practise
  something else. The overlap is real and the 2.0 is not defended by being
  harmless.

## The findings behind the allocation

**Approach play is the biggest category at every level.** The gap between a
scratch golfer and a 20-handicap is roughly 6 strokes on approach versus about
1.4 on putting. This is why iron strike quality gets protected slots.

**Doubles are a decision problem.** Around 70% of double bogeys begin with a
penalty stroke or a failed recovery attempt, not with a bad swing. A player
cutting 4.5 doubles per round to 2.5 saves four strokes without changing
anything mechanical. This is why simulated holes — the only block that
rehearses decisions — is protected.

**Long putting is not where handicaps separate.** From 25 to 39 feet the make
rate difference between scratch and everyone else is about 1%. Beyond 40 feet
there is no measurable difference. The separation lives in three-putt avoidance
(roughly 3% for scratch versus 13% at 25-handicap) and the 3-to-6 foot range.
This is why putting time is weighted heavily toward short putts and lag speed
rather than holing long ones.

**Driver distance usually beats driver accuracy for mid-handicaps.** Short,
defensive tee shots that leave long approaches cost more than missed fairways.
The plan only advises leaving driver in the bag where a miss carries a penalty.

## Breaking a tie between categories

Two categories can cost the same number of strokes — a penalty per nine and a
three putt per nine are both worth one — so the plan has to pick between them on
something. It uses this order: approach, doubles, penalties, putting.

Only the ends of that list come from the numbers above. Approach first is the
6-versus-1.4-strokes finding; putting last is the same finding read from the
other end. **Doubles above penalties is a judgement call and should be recorded
as one.** The research quantifies four strokes for cutting doubles and puts no
figure on penalties, so the quantified lever goes first. Read the causal claim
the other way — penalties are the leading cause of doubles, so fixing penalties
is fixing doubles upstream — and the pair swaps. Nothing here settles it.

Because of that, the UI says the tie was broken on a general ordering of what
usually costs a mid-handicap most. It does not cite this file as research
proving the pick, and it still discloses the tie, because the ordering is a
statement about golfers in general and never about the player in front of it.

## A caveat the UI must preserve

**The practice-variability research is contested.** Random and variable practice
generally outperforms blocked practice on retention and transfer tests, and the
plan is built on that. But a meta-analysis found limited evidence for a lasting
performance advantage in sport specifically, and some researchers report that
excessive contextual interference overwhelms learners so the benefit never
appears.

The blocked-then-random progression in the plan is a reasonable reading of the
evidence. It is not settled science, and UI copy should not imply that it is.
