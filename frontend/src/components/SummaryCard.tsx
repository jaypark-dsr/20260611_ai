// 오늘의 핵심 요약 영역.
import type { DailySummary } from "../types";

export default function SummaryCard({ summary }: { summary: DailySummary }) {
  return (
    <section className="summary" aria-labelledby="summaryHeading">
      <h2 id="summaryHeading" className="section-title">
        오늘의 핵심 요약
      </h2>
      <p className="summary__headline">{summary.headline}</p>
      <ul className="summary__points">
        {summary.points.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>
    </section>
  );
}
