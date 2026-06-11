// 팀 학습 질문, 오늘의 토론거리, 추천 아침 루틴 패널.
interface Props {
  teamQuestions: string[];
  discussionTopics: string[];
  recommendedRoutine: string[];
}

export default function LearningPanels({
  teamQuestions,
  discussionTopics,
  recommendedRoutine
}: Props) {
  return (
    <div className="learning-area">
      <section className="panel" aria-labelledby="teamQHeading">
        <h2 id="teamQHeading" className="section-title">
          팀 학습 질문
        </h2>
        <ul className="panel__list">
          {teamQuestions.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="discussHeading">
        <h2 id="discussHeading" className="section-title">
          오늘의 토론거리
        </h2>
        <ul className="panel__list">
          {discussionTopics.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="routineHeading">
        <h2 id="routineHeading" className="section-title">
          추천 아침 루틴
        </h2>
        <ol className="panel__list panel__list--ordered">
          {recommendedRoutine.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
