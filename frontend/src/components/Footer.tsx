// 사이트 푸터. 마지막 갱신과 한국어/전체 건수를 표시한다.
import type { Dashboard } from "../types";

export default function Footer({ meta }: { meta: Dashboard["meta"] }) {
  let txt = meta.lastUpdated ? `마지막 갱신 ${meta.lastUpdated}` : "";
  if (meta.koCount && meta.total) {
    txt += ` · 한국어 ${meta.koCount} / 전체 ${meta.total}건`;
  }
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container">
        <p>전산팀 내부용 지식 허브 · 매일 아침 RSS 자동 수집 · 제목·출처·링크·요약만 저장합니다.</p>
        <p className="site-footer__update">{txt}</p>
      </div>
    </footer>
  );
}
