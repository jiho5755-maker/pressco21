export type EntityKind = "person" | "company" | "project";

export type EntityAlias = {
  kind: EntityKind;
  canonical: string;
  aliases: string[];
};

export const entityAliases: EntityAlias[] = [
  { kind: "person", canonical: "안소영", aliases: ["안소영"] },
  { kind: "person", canonical: "큰누나", aliases: ["큰누나"] },
  { kind: "company", canonical: "레지너스", aliases: ["레지너스"] },
  { kind: "company", canonical: "사방넷", aliases: ["사방넷"] },
  { kind: "company", canonical: "로켓배송", aliases: ["로켓배송"] },
  { kind: "project", canonical: "로고 개선안", aliases: ["로고 개선안"] },
  { kind: "project", canonical: "화담숲 릴스", aliases: ["화담숲 릴스", "화담숲"] },
  { kind: "project", canonical: "자사몰 개편", aliases: ["자사몰 개편", "자사몰 상세페이지"] },
  { kind: "project", canonical: "사방넷 창고관리 교육", aliases: ["사방넷 창고관리 교육", "창고관리 교육"] },
];
