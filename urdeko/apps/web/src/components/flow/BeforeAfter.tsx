"use client";

import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";

export function BeforeAfter({
  beforeUrl,
  afterUrl,
  beforeLabel = "Avant",
  afterLabel = "Après",
}: {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-ambient">
      <ReactCompareSlider
        itemOne={<ReactCompareSliderImage alt={beforeLabel} src={beforeUrl} />}
        itemTwo={<ReactCompareSliderImage alt={afterLabel} src={afterUrl} />}
        keyboardIncrement="5%"
        className="h-[420px] w-full"
      />
      <span className="pointer-events-none absolute left-4 top-4 rounded-full frosted-pane px-3 py-1 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-primary-container px-3 py-1 font-label text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
        {afterLabel}
      </span>
    </div>
  );
}
