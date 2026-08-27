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

## A caveat the UI must preserve

**The practice-variability research is contested.** Random and variable practice
generally outperforms blocked practice on retention and transfer tests, and the
plan is built on that. But a meta-analysis found limited evidence for a lasting
performance advantage in sport specifically, and some researchers report that
excessive contextual interference overwhelms learners so the benefit never
appears.

The blocked-then-random progression in the plan is a reasonable reading of the
evidence. It is not settled science, and UI copy should not imply that it is.
