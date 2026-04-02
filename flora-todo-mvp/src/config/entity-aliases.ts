export type EntityKind = "person" | "company" | "project";

export type EntityAlias = {
  kind: EntityKind;
  canonical: string;
  aliases: string[];
  priority?: number;
};

export const entityAliases: EntityAlias[] = [
  { kind: "person", canonical: "안소영", aliases: ["안소영"], priority: 100 },
  { kind: "person", canonical: "큰누나", aliases: ["큰누나"], priority: 90 },
  { kind: "company", canonical: "레지너스", aliases: ["레지너스"], priority: 80 },
  { kind: "company", canonical: "사방넷", aliases: ["사방넷"], priority: 85 },
  { kind: "company", canonical: "로켓배송", aliases: ["로켓배송"], priority: 70 },
  { kind: "project", canonical: "로고 개선안", aliases: ["로고 개선안"], priority: 40 },
  { kind: "project", canonical: "화담숲 릴스", aliases: ["화담숲 릴스", "화담숲"], priority: 85 },
  { kind: "project", canonical: "자사몰 개편", aliases: ["자사몰 개편", "자사몰 상세페이지"], priority: 95 },
  { kind: "project", canonical: "사방넷 창고관리 교육", aliases: ["사방넷 창고관리 교육", "창고관리 교육"], priority: 90 },
];
