import { useMemo } from "react";

interface DayInfo {
  total: number;
  urgent: boolean;
  high: boolean;
}

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  taskCountByDate: Map<string, DayInfo>;
}

const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];

function dateKey(y: number, m: number, d: number): string {
  return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface CellData {
  date: number;
  key: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isWeekend: boolean;
  fullDate: Date;
  info: DayInfo | null;
}

export function CalendarGrid({ year, month, selectedDate, onSelectDate, taskCountByDate }: CalendarGridProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells = useMemo(() => {
    const result: CellData[] = [];
    const firstDay = new Date(year, month, 1);
    // 월요일 기준 오프셋 (0=월, 6=일)
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    // 이전 달 마지막 며칠
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const fullDate = new Date(prevYear, prevMonth, d);
      const key = dateKey(prevYear, prevMonth, d);
      const dayOfWeek = fullDate.getDay();
      result.push({
        date: d,
        key,
        isCurrentMonth: false,
        isToday: isSameDay(fullDate, today),
        isSelected: isSameDay(fullDate, selectedDate),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        fullDate,
        info: taskCountByDate.get(key) ?? null,
      });
    }

    // 현재 달
    for (let d = 1; d <= daysInMonth; d++) {
      const fullDate = new Date(year, month, d);
      const key = dateKey(year, month, d);
      const dayOfWeek = fullDate.getDay();
      result.push({
        date: d,
        key,
        isCurrentMonth: true,
        isToday: isSameDay(fullDate, today),
        isSelected: isSameDay(fullDate, selectedDate),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        fullDate,
        info: taskCountByDate.get(key) ?? null,
      });
    }

    // 다음 달 (6주 채우기)
    const remaining = 42 - result.length;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let d = 1; d <= remaining; d++) {
      const fullDate = new Date(nextYear, nextMonth, d);
      const key = dateKey(nextYear, nextMonth, d);
      const dayOfWeek = fullDate.getDay();
      result.push({
        date: d,
        key,
        isCurrentMonth: false,
        isToday: isSameDay(fullDate, today),
        isSelected: isSameDay(fullDate, selectedDate),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        fullDate,
        info: taskCountByDate.get(key) ?? null,
      });
    }

    return result;
  }, [year, month, selectedDate, taskCountByDate]);

  return (
    <div>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((name, i) => (
          <div key={name} className={`text-center text-[11px] font-semibold py-1.5 ${
            i >= 5 ? "text-destructive/50" : "text-muted-foreground"
          }`}>
            {name}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell) => (
          <button
            key={cell.key}
            type="button"
            onClick={() => onSelectDate(cell.fullDate)}
            className={`
              relative flex flex-col items-center justify-start py-1.5 rounded-xl
              transition-all duration-150 min-h-[46px]
              ${cell.isSelected
                ? "bg-primary text-primary-foreground shadow-md"
                : cell.isToday
                  ? "bg-primary/10"
                  : "hover:bg-muted/50"
              }
              ${!cell.isCurrentMonth ? "opacity-30" : ""}
            `}
          >
            {/* 날짜 숫자 */}
            <span className={`text-[13px] leading-none font-semibold ${
              cell.isSelected ? "text-primary-foreground" :
              cell.isToday ? "text-primary font-bold" :
              cell.isWeekend ? "text-destructive/70" : "text-foreground"
            }`}>
              {cell.date}
            </span>

            {/* 태스크 인디케이터 도트 */}
            {cell.info && cell.isCurrentMonth && (
              <div className="flex items-center gap-[3px] mt-1">
                {cell.info.urgent && (
                  <span className={`w-[5px] h-[5px] rounded-full ${
                    cell.isSelected ? "bg-primary-foreground" : "bg-destructive"
                  }`} />
                )}
                {cell.info.high && !cell.info.urgent && (
                  <span className={`w-[5px] h-[5px] rounded-full ${
                    cell.isSelected ? "bg-primary-foreground/80" : "bg-orange-500"
                  }`} />
                )}
                {cell.info.total > 0 && !cell.info.urgent && !cell.info.high && (
                  <span className={`w-[5px] h-[5px] rounded-full ${
                    cell.isSelected ? "bg-primary-foreground/70" : "bg-primary/50"
                  }`} />
                )}
                {cell.info.total > 1 && (
                  <span className={`text-[8px] font-bold ${
                    cell.isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}>
                    {cell.info.total}
                  </span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
