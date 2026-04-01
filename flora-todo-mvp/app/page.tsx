const checklist = [
  "Postgres 연결 (.env 기반)",
  "Drizzle schema / migration 준비",
  "ingest API로 원문 메모 저장",
  "summary API 기본 집계 응답",
];

export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: "860px",
        margin: "0 auto",
        padding: "72px 24px 96px",
      }}
    >
      <section
        style={{
          border: "1px solid rgba(31, 26, 22, 0.08)",
          borderRadius: "28px",
          padding: "32px",
          background: "rgba(255, 255, 255, 0.72)",
          boxShadow: "0 24px 80px rgba(31, 26, 22, 0.08)",
        }}
      >
        <p
          style={{
            margin: 0,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontSize: "12px",
            color: "#8e6f43",
            fontWeight: 700,
          }}
        >
          Flora Todo MVP
        </p>
        <h1
          style={{
            margin: "16px 0 12px",
            fontSize: "clamp(34px, 5vw, 56px)",
            lineHeight: 1.05,
          }}
        >
          Sprint 1
          <br />
          ingestion-first operating OS
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: "620px",
            fontSize: "18px",
            lineHeight: 1.7,
            color: "rgba(31, 26, 22, 0.78)",
          }}
        >
          UI는 최소화하고, 원문 메모를 안전하게 저장하는 DB/API 경계를 먼저 고정했습니다.
          다음 스프린트에서는 구조화 추출과 Reminder / Follow-up 자동 생성이 이 위에 붙습니다.
        </p>
        <div
          style={{
            marginTop: "28px",
            display: "grid",
            gap: "12px",
          }}
        >
          {checklist.map((item) => (
            <div
              key={item}
              style={{
                padding: "14px 16px",
                borderRadius: "18px",
                background: "#f8f3eb",
                border: "1px solid rgba(142, 111, 67, 0.12)",
              }}
            >
              {item}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: "28px",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "14px",
          }}
        >
          <code>POST /api/ingest</code>
          <code>GET /api/summary</code>
          <code>npm run db:generate</code>
          <code>npm run db:migrate</code>
        </div>
      </section>
    </main>
  );
}
