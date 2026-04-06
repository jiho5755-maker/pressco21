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
