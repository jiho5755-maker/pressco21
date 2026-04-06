/* 프로젝트 목록 관리 — 고정 + 사용자 추가(localStorage) */

const CUSTOM_PROJECTS_KEY = "pressco21-custom-projects";

export interface Project {
  id: string;
  name: string;
  isFixed: boolean;
}

/** 고정 프로젝트 (대표 확정) */
const FIXED_PROJECTS: Project[] = [
  { id: "proj-renewal", name: "홈페이지 리뉴얼", isFixed: true },
  { id: "proj-coupang", name: "쿠팡 로켓배송", isFixed: true },
  { id: "proj-partner", name: "파트너클래스", isFixed: true },
  { id: "proj-photo", name: "상품/촬영", isFixed: true },
  { id: "proj-ship", name: "출고/배송", isFixed: true },
  { id: "proj-sns", name: "SNS/마케팅", isFixed: true },
  { id: "proj-admin", name: "정산/관리", isFixed: true },
];

function getCustomProjects(): Project[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PROJECTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

function saveCustomProjects(projects: Project[]): void {
  try {
    localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(projects));
  } catch { /* ignore */ }
}

/** 전체 프로젝트 목록 (고정 + 사용자 추가) */
export function getAllProjects(): Project[] {
  return [...FIXED_PROJECTS, ...getCustomProjects()];
}

/** 사용자가 프로젝트를 추가 */
export function addCustomProject(name: string): Project {
  const customs = getCustomProjects();
  const newProj: Project = {
    id: "proj-custom-" + Date.now().toString(36),
    name: name.trim(),
    isFixed: false,
  };
  customs.push(newProj);
  saveCustomProjects(customs);
  return newProj;
}

/** 사용자 추가 프로젝트 삭제 */
export function removeCustomProject(id: string): void {
  const customs = getCustomProjects().filter((p) => p.id !== id);
  saveCustomProjects(customs);
}

/** 사용자 추가 프로젝트 이름 수정 */
export function renameCustomProject(id: string, newName: string): void {
  const customs = getCustomProjects().map((p) =>
    p.id === id ? { ...p, name: newName.trim() } : p
  );
  saveCustomProjects(customs);
}

/** 프로젝트 이름으로 색상 결정 (일관된 해시) */
export function getProjectColor(name: string): string {
  const colors = [
    { bg: "bg-primary/10", border: "border-primary/30", text: "text-primary", bar: "bg-primary" },
    { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", bar: "bg-orange-500" },
    { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", bar: "bg-blue-500" },
    { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", bar: "bg-purple-500" },
    { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", bar: "bg-pink-500" },
    { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", bar: "bg-teal-500" },
    { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", bar: "bg-amber-500" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return JSON.stringify(colors[Math.abs(hash) % colors.length]);
}

export type ProjectColorSet = { bg: string; border: string; text: string; bar: string };

export function getProjectColorSet(name: string): ProjectColorSet {
  return JSON.parse(getProjectColor(name)) as ProjectColorSet;
}
