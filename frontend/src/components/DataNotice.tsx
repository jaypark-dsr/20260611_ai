// 데이터 로드 실패 시 표시하는 안내 배너. API 서버가 꺼져 있을 때 등에 나타난다.
interface Props {
  onClose: () => void;
}

export default function DataNotice({ onClose }: Props) {
  return (
    <div className="notice" role="alert">
      <span className="notice__icon" aria-hidden="true">
        ⚠️
      </span>
      <div className="notice__body">
        <strong>데이터를 불러오지 못했습니다.</strong> API 서버에 연결할 수 없습니다. 백엔드가 실행 중인지
        확인하세요. 개발 모드에서는 <code>backend</code>에서 <code>npm run dev</code>, 프론트엔드에서{" "}
        <code>npm run dev</code>를 함께 실행해야 합니다.
      </div>
      <button type="button" className="notice__close" aria-label="안내 닫기" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}
