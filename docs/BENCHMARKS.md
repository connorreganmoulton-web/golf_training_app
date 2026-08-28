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

Every target above except greens hit is 1.0, so two categories the player is
equally bad at produce identical gaps, and the plan has to pick between them on
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
