# Pricing — Eat Out Better (2026-10-12)

## Status: no recommendation

The first version of this file recommended a $24.99 founding price, $34.99 after 90 days, and a November pre-order test of $24.99 against $34.99. **That recommendation is withdrawn.** It rested on a price range ($5.08 to $34.97) that the simulated buyers produced *after* reading the pitch's "$39.99 a year" and "$29.99 launch offer". Van Westendorp only works if the buyer has not been told a price. Half the panel gave the same round numbers around $39.99 (too cheap $5, a bargain $15, getting expensive $30, too expensive $40–45), so the range measured the price it was supposed to test. [pricing-curve.md](pricing-curve.md) is kept for the record and is labelled anchored. Separately, the $5.08 floor was a calculation bug: when nobody's "too cheap" answer is above anybody's "too expensive" one, the tool took the first price where the curves touched instead of the middle of the stretch. Re-run with the fix, the same anchored answers give $8.51 to $34.97.

**Next step:** write `founder/pitch-no-price.md` and re-run the price questions (`founder-consumer` with `--price-pitch`). The tools now ask them in a separate brief and refuse a price pitch that still shows a price. Then choose the two November test prices from that, the competitor prices and the margins below.

## What still holds

- **Competitors:** annual plans run from $19.99 (Dishup, MenuFit) to $39.99 (Fig), with a median around $29.99 ([competitors.md](competitors.md)). At $39.99, Eat Out Better would be the most expensive menu scanner while being the newest, with zero ratings. This comes from competitors' own prices, not the panel.
- **Margin (CFO tool, Apple's 15% scaling with the price):** year 1 profit at plan is $16,616 at $24.99, $22,035 at $29.99, $27,453 at $34.99 and $32,872 at $39.99. Contribution per annual is $16.44, $20.69, $24.94 and $29.19. Variable cost is $8.55 to $10.80 per annual subscription, so every candidate clears it comfortably.
- **Price is not why the panel said no.** 0 of 20 bought, and only 2 of the 20 said price was the reason. They passed on habit (7), trust (5), need (4) and convenience (2). A lower price won't fix that.
- **The rungs, without prices:** Free (first scan fully unlocked, then the top 3 picks on every menu); Plus annual (every dish, "What to ask for", history, scanning at home from a menu link or PDF); a one-time Lifetime option for buyers who refuse auto-renewal (3 of 20 named it); a non-renewing week pass, deferred to Phase 3 as in growth-plan.md.
- **Opening offer rules:** a founding price for waitlist members and the first 90 days, held for as long as the subscription continues, no fake "was" price, and a trial reminder 2 days before the charge.

## The panel's price objections (verbatim, for marketing)

1. "I wouldn't pay $39.99 a year for something I can mostly get by asking ChatGPT with a photo of the menu." (P001)
2. "Another subscription for something I use twice a month." (P018)
3. "I also cancel anything that auto-renews after a trial." (P007)
