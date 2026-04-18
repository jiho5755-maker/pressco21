import { useState, useEffect, useMemo, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchMe } from "@/lib/api";
import {
  fetchHrTodayStats,
  fetchHrMonthlySummary,
  getHrReportCsvUrl,
} from "@/lib/hrApi";
import type { HrTodayStats, StaffDayStatus, HrMonthlySummary, StaffMonthlySummary } from "@/lib/hrApi";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  Building2,
  Home,
  Camera,
  FileText,
  Users,
  Clock,
  CalendarDays,
} from "lucide-react";

const ADMIN_NAMES = ["이진선", "장지호"];

const STATUS_CONFIG: Record<StaffDayStatus["status"], { label: string; color: string; bg: string }> = {
  working: { label: "근무중", color: "text-green-700", bg: "bg-green-100 dark:bg-green-900/30" },
  done: { label: "퇴근", color: "text-muted-foreground", bg: "bg-muted" },
  not_yet: { label: "미출근", color: "text-orange-700", bg: "bg-orange-100 dark:bg-orange-900/30" },
  on_leave: { label: "휴가", color: "text-blue-700", bg: "bg-blue-100 dark:bg-blue-900/30" },
};

function WorkModeIcon({ mode }: { mode?: string }) {
  if (mode === "remote") return <Home className="h-3.5 w-3.5 text-muted-foreground" />;
  if (mode === "field") return <Camera className="h-3.5 w-3.5 text-muted-foreground" />;
  return <Building2 className="h-3.5 w-3.5 text-muted-foreground" />;
}

function formatTime(timeStr?: string | null): string {
  if (!timeStr) return "-";
  return timeStr;
}

function getMonthStr(offset: number, base?: string): string {
  const d = base ? new Date(base + "-01") : new Date();
  d.setMonth(d.getMonth() + offset);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  return y + "년 " + Number(m) + "월";
}

function minutesToHM(min?: number): string {
  if (!min) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h + "시간 " + (m > 0 ? m + "분" : "");
}

/* ── 오늘 탭 ── */

function TodayTab() {
  const [stats, setStats] = useState<HrTodayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHrTodayStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          {error ?? "데이터를 불러올 수 없습니다"}
        </CardContent>
      </Card>
    );
  }

  const clockedRatio = stats.totalStaff > 0
    ? Math.round(((stats.clockedIn + stats.clockedOut) / stats.totalStaff) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* 출근 현황 프로그레스 */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">출근 현황</span>
            </div>
            <span className="text-xs text-muted-foreground">{stats.date}</span>
          </div>

          {/* 프로그레스바 */}
          <div className="mb-3">
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-2xl font-bold text-primary">
                {stats.clockedIn + stats.clockedOut}
                <span className="text-base font-normal text-muted-foreground">/{stats.totalStaff}명</span>
              </span>
              <span className="text-xs text-muted-foreground">{clockedRatio}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: clockedRatio + "%" }}
              />
            </div>
          </div>

          {/* 상태 요약 숫자 */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "근무중", value: stats.clockedIn, color: "text-green-600" },
              { label: "퇴근", value: stats.clockedOut, color: "text-muted-foreground" },
              { label: "미출근", value: stats.notYet, color: stats.notYet > 0 ? "text-orange-600" : "" },
              { label: "휴가", value: stats.onLeave, color: "text-blue-600" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className={`text-lg font-bold ${item.color || "text-foreground"}`}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 직원 카드 목록 */}
      <div className="space-y-2">
        {stats.staffStatus.map((staff) => {
          const cfg = STATUS_CONFIG[staff.status];
          return (
            <Card key={staff.staffId} className="border-border/60">
              <CardContent className="p-3 flex items-center gap-3">
                {/* 아바타 */}
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">
                    {staff.staffName.slice(-2)}
                  </span>
                </div>

                {/* 이름 + 근무형태 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold">{staff.staffName}</span>
                    <WorkModeIcon mode={staff.workMode} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {staff.clockInAt && (
                      <span className="text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-0.5" />
                        {formatTime(staff.clockInAt)}
                      </span>
                    )}
                    {staff.clockOutAt && (
                      <span className="text-[11px] text-muted-foreground">
                        ~ {formatTime(staff.clockOutAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 상태 뱃지 */}
                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${cfg.color} ${cfg.bg} border-0`}>
                  {cfg.label}
                </Badge>
              </CardContent>
            </Card>
          );
        })}

        {stats.staffStatus.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">직원 데이터가 없습니다</p>
        )}
      </div>
    </div>
  );
}

/* ── 월간 탭 ── */

function MonthlyTab({ isAdmin }: { isAdmin: boolean }) {
  const [month, setMonth] = useState(() => getMonthStr(0));
  const [selectedStaff, setSelectedStaff] = useState<string | undefined>(undefined);
  const [data, setData] = useState<HrMonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchHrMonthlySummary(month, selectedStaff)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [month, selectedStaff]);

  useEffect(() => { load(); }, [load]);

  const currentSummary: StaffMonthlySummary | null = useMemo(() => {
    if (!data || data.staffSummaries.length === 0) return null;
    if (selectedStaff) return data.staffSummaries.find((s) => s.staffId === selectedStaff) ?? data.staffSummaries[0];
    return data.staffSummaries[0];
  }, [data, selectedStaff]);

  // 달력 그리드 계산
  const calendarGrid = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const startDow = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const recordMap = new Map<string, DayRecord>();
    if (currentSummary) {
      for (const rec of currentSummary.dailyRecords) {
        recordMap.set(rec.date, rec);
      }
    }

    const cells: Array<{ day: number; record?: DayRecord; isWeekend: boolean } | null> = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = month + "-" + String(d).padStart(2, "0");
      const dow = (startDow + d - 1) % 7;
      cells.push({
        day: d,
        record: recordMap.get(dateStr),
        isWeekend: dow === 0 || dow === 6,
      });
    }
    return cells;
  }, [month, currentSummary]);

  return (
    <div className="space-y-4">
      {/* 월 선택기 */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(getMonthStr(-1, month))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold min-w-[120px] text-center">{formatMonthLabel(month)}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(getMonthStr(1, month))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 관리자: 직원 선택 */}
      {isAdmin && data && data.staffSummaries.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            type="button"
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !selectedStaff ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setSelectedStaff(undefined)}
          >
            전체
          </button>
          {data.staffSummaries.map((s) => (
            <button
              key={s.staffId}
              type="button"
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedStaff === s.staffId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
              onClick={() => setSelectedStaff(s.staffId)}
            >
              {s.staffName}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card className="border-border/60">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && currentSummary && (
        <>
          {/* 달력 그리드 */}
          <Card className="border-border/60">
            <CardContent className="p-3">
              <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                  <span key={d} className={`text-[10px] font-medium py-1 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"}`}>
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {calendarGrid.map((cell, idx) => {
                  if (!cell) return <div key={idx} />;
                  const { day, record, isWeekend } = cell;
                  let dotColor = "";
                  if (record) {
                    if (currentSummary?.workType === "deemed_hours") {
                      dotColor = "bg-blue-500";
                    } else if (record.clockIn) {
                      dotColor = "bg-green-500";
                    } else if (!isWeekend) {
                      dotColor = "bg-red-400";
                    }
                  }
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col items-center justify-center py-1.5 rounded-md ${
                        isWeekend ? "bg-muted/50" : ""
                      }`}
                    >
                      <span className={`text-[11px] ${isWeekend ? "text-muted-foreground/60" : "text-foreground"}`}>
                        {day}
                      </span>
                      {dotColor && (
                        <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColor}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 범례 */}
              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border/40">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] text-muted-foreground">출근</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-[10px] text-muted-foreground">결근</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] text-muted-foreground">간주근무</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 요약 카드 */}
          <Card className="border-border/60">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-primary" />
                {currentSummary.staffName} 월간 요약
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">출근일</p>
                  <p className="text-lg font-bold text-primary">{currentSummary.attendedDays}일</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">결근일</p>
                  <p className={`text-lg font-bold ${currentSummary.absentDays > 0 ? "text-destructive" : "text-foreground"}`}>
                    {currentSummary.absentDays}일
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">평균 근무시간</p>
                  <p className="text-sm font-semibold">{minutesToHM(currentSummary.avgWorkMinutes)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">근무형태</p>
                  <p className="text-sm font-semibold">{currentSummary.workType}</p>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span>사무실 {currentSummary.officeDays}일</span>
                </div>
                <div className="flex items-center gap-1">
                  <Home className="h-3 w-3 text-muted-foreground" />
                  <span>재택 {currentSummary.remoteDays}일</span>
                </div>
                <div className="flex items-center gap-1">
                  <Camera className="h-3 w-3 text-muted-foreground" />
                  <span>현장 {currentSummary.fieldDays}일</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && !error && !currentSummary && (
        <p className="text-center text-sm text-muted-foreground py-8">해당 월의 데이터가 없습니다</p>
      )}
    </div>
  );
}

/* ── 리포트 탭 ── */

function ReportTab({ isAdmin }: { isAdmin: boolean }) {
  const [month, setMonth] = useState(() => getMonthStr(0));

  if (!isAdmin) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">관리자만 리포트를 다운로드할 수 있습니다</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 월 선택기 */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(getMonthStr(-1, month))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold min-w-[120px] text-center">{formatMonthLabel(month)}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(getMonthStr(1, month))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* CSV 다운로드 */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">근태 리포트 다운로드</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {formatMonthLabel(month)} 전 직원 출퇴근 기록을 CSV 파일로 다운로드합니다.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              const url = getHrReportCsvUrl(month);
              window.open(url, "_blank");
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV 다운로드
          </Button>
        </CardContent>
      </Card>

      {/* 과거 리포트 안내 */}
      <Card className="border-border/60 border-dashed">
        <CardContent className="p-4 text-center">
          <FileText className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            과거 리포트 목록은 준비 중입니다.
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            MinIO 저장소 연동 후 이용 가능합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── 메인 페이지 ── */

export function HrPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchMe()
      .then((me) => {
        if (me && ADMIN_NAMES.includes(me.name)) {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <Header title="근태 관리" showBack />
      <main className="max-w-[480px] mx-auto px-4 py-5">
        <Tabs defaultValue="today">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="today">오늘</TabsTrigger>
            <TabsTrigger value="monthly">월간</TabsTrigger>
            <TabsTrigger value="report">리포트</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <TodayTab />
          </TabsContent>

          <TabsContent value="monthly">
            <MonthlyTab isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="report">
            <ReportTab isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
