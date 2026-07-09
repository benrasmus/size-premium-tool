export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Methodology</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          This page is written to be excerpted into a valuation workpaper or report. It documents data sources,
          computation methodology, and known limitations relative to Kroll&apos;s Cost of Capital Navigator
          (formerly the Ibbotson/Duff &amp; Phelps size premium studies referenced in Shannon Pratt&apos;s valuation
          texts).
        </p>
      </div>

      <Section title="What this tool is">
        <p>
          This is an independent, self-hosted estimate of the equity size premium, built entirely from free, public,
          CRSP-derived data. It is <strong>not</strong> Kroll&apos;s Cost of Capital Navigator, is not affiliated
          with Kroll, Duff &amp; Phelps, or Ibbotson Associates, and does not attempt to reproduce their published
          figures exactly. It reproduces the same general methodology &mdash; ranking companies by size, computing
          beta and return statistics per size group, and fitting a cross-sectional regression of the size premium
          against log(size) &mdash; using a different, coarser, and shorter data foundation.
        </p>
      </Section>

      <Section title="Data sources">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Ken French Data Library</strong> (Dartmouth Tuck School of Business, publicly available at{" "}
            <span className="font-mono text-xs">mba.tuck.dartmouth.edu/pages/faculty/ken.french</span>), specifically
            the &ldquo;Portfolios Formed on Size&rdquo; dataset (monthly value-weighted returns, number of firms, and
            average firm size for 10 size-decile portfolios of NYSE/AMEX/NASDAQ common stocks) and the
            &ldquo;Fama/French 3 Factors&rdquo; dataset (monthly market excess return and risk-free rate). Both are
            derived from the CRSP database &mdash; the same underlying data source Ibbotson/Duff &amp; Phelps use
            &mdash; but distributed by French in an aggregated, portfolio-level form rather than individual
            stock-level form.
          </li>
          <li>
            The historical risk-free rate used throughout the study is French&apos;s own monthly{" "}
            <span className="font-mono text-xs">RF</span> series (a one-month T-bill rate, itself originally sourced
            from Ibbotson Associates through May 2024 and ICE BofA thereafter) &mdash; never a live/current rate. A
            separate, user-entered current risk-free rate is used only on the Cost of Equity Lookup page, for the
            final build-up applied to a subject company today.
          </li>
        </ul>
      </Section>

      <Section title="Why we didn't rank today's public companies and backfill their history">
        <p>
          An easier-looking approach would be to take the current roster of publicly traded companies, rank them by
          today&apos;s market cap, and pull each one&apos;s historical returns. We deliberately avoided this because
          it introduces two serious biases: <strong>survivorship bias</strong> (companies that went bankrupt, were
          delisted, or were acquired are simply missing from &ldquo;today&apos;s roster,&rdquo; which mechanically
          inflates historical small-cap returns since the failures are excluded) and{" "}
          <strong>look-ahead bias</strong> (a company that is large today might have been small at various points in
          its history, so sorting it into a &ldquo;large-cap&rdquo; bucket using its current size and then crediting
          it with its entire return history misattributes returns it earned while small to the large-cap bucket).
          The Ken French portfolios avoid both problems: they are formed at each historical point in time using the
          size each company actually had then, and delisted/failed companies remain in the sample for the periods
          they existed.
        </p>
      </Section>

      <Section title="How the numbers are computed">
        <ol className="list-decimal pl-5 space-y-2">
          <li>Monthly excess return for each decile portfolio = portfolio return &minus; historical risk-free rate.</li>
          <li>
            Beta = slope from an OLS regression of the portfolio&apos;s monthly excess return on the market&apos;s
            monthly excess return (Mkt-RF), over the selected sample window.
          </li>
          <li>Annualized arithmetic return = monthly mean return &times; 12.</li>
          <li>Annualized geometric return = compounded monthly growth, annualized: (&prod;(1+r))^(12/n) &minus; 1.</li>
          <li>Annualized standard deviation = monthly standard deviation &times; &radic;12.</li>
          <li>
            Market equity risk premium = annualized arithmetic mean of the market&apos;s monthly excess return
            (Mkt-RF) over the same window.
          </li>
          <li>CAPM-indicated premium = beta &times; market equity risk premium.</li>
          <li>
            Premium over CAPM = annualized portfolio excess return &minus; CAPM-indicated premium. This is the size
            premium: the return a portfolio earned above and beyond what its own beta says it should have earned
            under CAPM.
          </li>
          <li>
            Smoothed premium over CAPM: a cross-sectional OLS regression, across the 10 decile portfolios, of
            premium over CAPM (y) against log(average firm size) (x):{" "}
            <span className="font-mono text-xs">Premium = a + b &times; log(Size)</span>. This fitted line is what
            the Cost of Equity Lookup page uses to interpolate a size premium for a private company&apos;s estimated
            equity value.
          </li>
        </ol>
      </Section>

      <Section title="Known limitations vs. Kroll/Ibbotson">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>10 portfolios, not 25.</strong> Ken French&apos;s public size-only sort tops out at deciles;
            there is no free equivalent of Duff &amp; Phelps&apos; finer 25-portfolio breakdown. In back-testing
            against the textbook&apos;s 1963&ndash;2004 exhibit, this tool&apos;s smallest decile (which still
            averages roughly 2,000+ companies) shows a materially <em>smaller</em> premium over CAPM than the
            textbook&apos;s smallest of 25 portfolios (which isolates a much narrower, more extreme slice of
            micro-cap companies). This tool is likely to <strong>understate</strong> the size premium for very small
            or micro-cap subject companies. Treat any size premium this tool produces for a very small equity value
            as a conservative floor, not a precise estimate, and apply judgment.
          </li>
          <li>
            <strong>Portfolio definitions differ</strong> from Duff &amp; Phelps&apos; proprietary breakpoints and
            weighting conventions in ways beyond just the count of portfolios.
          </li>
          <li>
            <strong>Size proxy is a portfolio average, not a bespoke market value.</strong> The independent variable
            in the regression is each decile&apos;s average firm size (in $ millions) over the selected sample
            window, as published by French &mdash; not a fitted continuous market-value curve built from individual
            companies.
          </li>
          <li>
            <strong>Static decile boundaries within a chosen sample window</strong> are themselves formed annually by
            French/CRSP using point-in-time size (this part <em>does</em> match Ibbotson&apos;s point-in-time
            methodology), but this tool&apos;s regression coefficients are estimated once per sample window rather
            than updated every year the way a full annual Ibbotson-style study would.
          </li>
          <li>
            The size effect itself is time-varying and has been <strong>weak or reversed</strong> in recent
            historical windows (10, 20, and 30 years back from today) &mdash; the largest decile has recently earned
            a small <em>positive</em> premium over CAPM, while smaller deciles earned <em>negative</em> premiums,
            flipping the regression slope positive. This is a real, measured result, not a defect in this tool
            &mdash; see the next section for how to check whether it&apos;s driven by a handful of mega-cap
            companies or is a broader pattern.
          </li>
        </ul>
      </Section>

      <Section title="Why this can't reliably value very small businesses on its own -- and what to do instead">
        <p>
          The size premium itself is genuinely contested. Damodaran (NYU) argues it hasn&apos;t existed in the data
          for roughly 40 years; the ASA runs a continuing-education course literally titled &ldquo;The Size Premium:
          Fact or Fiction&rdquo;; and yet surveys find the large majority of practitioners (on the order of 94%)
          still use it, largely because it&apos;s defensible when it&apos;s the market norm. There is no clean
          consensus, and this tool doesn&apos;t resolve that debate. What it can do is show you, concretely, where
          the public-market approach (the Dashboard/default regression above) breaks down.
        </p>
        <p>
          Take a genuinely small business: $400,000 EBITDA/SDE at a 2.5x multiple, no debt, so a $1,000,000 equity
          value. The public-market regression above puts the size premium at roughly <strong>1.4%</strong> at that
          size &mdash; because $1M sits about four log-units below the smallest decile this study actually observes
          (which still averages in the tens of millions of dollars). Compare that to Galbraith (2025, Journal of
          Entrepreneurial Finance), a regression fit directly on <em>private business transaction data</em> rather
          than public markets: <span className="font-mono text-xs">Size Premium = 25% &minus; 2.45% &times; ln(equity value in $M)</span>,
          which puts the same $1M company&apos;s size premium at roughly <strong>25%</strong> &mdash; a ~17x
          difference on the same subject company, from two defensible-looking regressions. That gap is the whole
          problem in one number: none of the public-market decile portfolios contain anything resembling a
          $1M owner-operated business, so a regression fit on them has no real evidentiary basis once extrapolated
          that far. The tool now surfaces this directly &mdash; the Lookup page&apos;s extrapolation warning scales
          with how many log-units outside the observed range the subject company falls, and lets you switch to the
          Galbraith source as an alternative built on more comparable data.
        </p>
        <p>
          There&apos;s a second, independent way to see the same problem: work the build-up backward through a
          perpetual-growth (Gordon Growth) model. A ~13&ndash;18% cost of equity (roughly what the public-market
          build-up above produces for a small subject company, even with a meaningful company-specific risk premium
          added) implies a cash-flow multiple of roughly <strong>6&ndash;9x</strong> at a modest growth assumption.
          But market transaction databases (BizBuySell, DealStats, BIZCOMPS) show businesses this size actually
          trading at roughly <strong>2&ndash;3.5x SDE</strong> &mdash; which, worked backward, implies discount rates
          in the <strong>32&ndash;40%+</strong> range. No plausible risk-free rate, beta, or size premium (even
          Galbraith&apos;s much larger one) closes that gap on its own. The Lookup page now computes and displays
          this implied multiple next to a user-entered market-comparable range, so the mismatch is visible on every
          run rather than something you have to compute by hand.
        </p>
        <p>
          Two honest interpretations, and this tool doesn&apos;t pick one for you: either the size premium needs to
          be far larger than any public-market study supports at this scale, or perpetual-growth DCF is structurally
          the wrong tool for a small owner-operated business &mdash; which, unlike a public company, is not
          reasonably modeled as generating cash flow forever; many don&apos;t survive an ownership transition intact.
          Practically, for small subject companies, <strong>weight a market-multiple (comparable transaction)
          approach as primary and treat the DCF/build-up figures as a secondary sanity check</strong>, not the other
          way around. The Lookup page flags this automatically below a configurable equity-value threshold (default
          $2M) and lets you enter your own comparable multiple range to check against.
        </p>
      </Section>

      <Section title="Value-weighted vs. equal-weighted: a diagnostic for recent-period reversals">
        <p>
          The Dashboard, Lookup, and Export pages all include a toggle between two weighting schemes for the same
          10 decile portfolios:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Value-weighted</strong> (the default, and the primary convention used throughout this tool):
            each company&apos;s contribution to its decile&apos;s return is proportional to its own market cap. This
            matches the Ibbotson/Kroll convention and how an actual market-cap-weighted portfolio behaves &mdash;
            but it also means a handful of enormous companies (e.g. mega-cap tech stocks sitting in Decile 10) can
            dominate that decile&apos;s aggregate return.
          </li>
          <li>
            <strong>Equal-weighted</strong> (a diagnostic, not a replacement): every company in a decile counts the
            same regardless of size. This dramatically dilutes the influence of the very largest names within a
            decile, isolating whether a result is driven by a few giant companies or reflects the decile more
            broadly.
          </li>
        </ul>
        <p>
          Running both weightings side by side on this data produces a genuinely informative, somewhat
          counterintuitive result: in the long-run windows (since 1963, 1963&ndash;2004), equal-weighting makes the
          classic negative size-premium slope <em>stronger</em> &mdash; consistent with the historical size effect
          being broad-based across small companies, not an artifact of weighting mechanics. But in the recent 10-
          and 20-year windows, the regression slope stays <strong>positive under both weightings</strong> (and is
          slightly more positive under equal-weighting in the 10-year window). In other words: the recent-period
          reversal of the size premium does <strong>not</strong> appear to be simply a few mega-cap stocks skewing a
          value-weighted average &mdash; it shows up even when every company in the decile counts equally, which
          points to a broader, decile-wide phenomenon (e.g. structural headwinds for small caps generally, such as
          higher rate-sensitivity, less passive-index buying pressure, and a shrinking public small-cap universe as
          more companies stay private longer) rather than a handful of outliers.
        </p>
      </Section>

      <Section title="Upgrade path">
        <p>
          A closer approximation to true Kroll/Ibbotson granularity would require point-in-time,
          survivorship-bias-free stock-level data (individual companies&apos; market caps and returns at each
          historical date, including delisted companies) rather than French&apos;s pre-aggregated portfolios. True
          CRSP access is priced and licensed for institutions (typically five to six figures annually via WRDS).
          Lower-cost commercial alternatives exist (e.g. Norgate Data, roughly $600&ndash;800/year,
          survivorship-bias-free US equities back to 1950) that could be used to rebuild this study with a finer,
          ~25-portfolio breakdown in a future version.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">{title}</h2>
      <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}
