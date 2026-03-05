import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function Dashboard() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">대시보드</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: '전체 고객', value: '-', sub: '데이터 이관 후 업데이트' },
          { title: '활성 고객', value: '-', sub: '최근 12개월 거래' },
          { title: '이번 달 매출', value: '-', sub: '거래명세표 기준' },
          { title: '미수금 총액', value: '-', sub: '회수 필요' },
        ].map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-muted-foreground mt-8 text-sm">CRM-006 작업 후 KPI + 차트가 채워집니다.</p>
    </div>
  )
}
