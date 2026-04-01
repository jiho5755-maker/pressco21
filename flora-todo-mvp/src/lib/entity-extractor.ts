import { entityAliases } from "@/src/config/entity-aliases";

export type ExtractedEntities = {
  people: string[];
  companies: string[];
  projects: string[];
};

function unique(values: string[]) {
  return [...new Set(values)];
}

export function extractNamedEntities(text: string): ExtractedEntities {
  const people: string[] = [];
  const companies: string[] = [];
  const projects: string[] = [];

  for (const entity of entityAliases) {
    const hasAlias = entity.aliases.some((alias) => text.includes(alias));

    if (!hasAlias) {
      continue;
    }

    if (entity.kind === "person") {
      people.push(entity.canonical);
      continue;
    }

    if (entity.kind === "company") {
      companies.push(entity.canonical);
      continue;
    }

    projects.push(entity.canonical);
  }

  return {
    people: unique(people),
    companies: unique(companies),
    projects: unique(projects),
  };
}

export function inferRelatedProject(entities: ExtractedEntities) {
  if (entities.projects.length > 0) {
    return entities.projects[0];
  }

  if (entities.companies.length > 0) {
    return entities.companies[0];
  }

  return null;
}

export function inferWaitingForFromEntities(
  text: string,
  currentWaitingFor: string | null,
  entities: ExtractedEntities,
) {
  if (/연락 대기|회신 대기/.test(text) && entities.people.length > 0) {
    return entities.people[0];
  }

  if (/수신 대기/.test(text) && entities.projects.length > 0) {
    return entities.projects[0];
  }

  if (/수신 대기/.test(text) && entities.companies.length > 0) {
    return entities.companies[0];
  }

  if (/다시 확인|나중에 확인|아직 없음/.test(text) && entities.projects.length > 0) {
    return entities.projects[0];
  }

  if (/다시 확인|나중에 확인|아직 없음/.test(text) && entities.companies.length > 0) {
    return entities.companies[0];
  }

  if (/다시 확인|나중에 확인|아직 없음/.test(text) && entities.people.length > 0) {
    return entities.people[0];
  }

  if (currentWaitingFor) {
    return currentWaitingFor
      .replace(/^(?:회의 후 정리|미팅 후 정리|정리|메모)[:\s-]*/, "")
      .replace(/^(?:관련|건|후속)\s+/, "")
      .trim();
  }

  return null;
}
