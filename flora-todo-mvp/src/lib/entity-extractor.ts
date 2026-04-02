import { EntityAlias, entityAliases } from "@/src/config/entity-aliases";

export type ExtractedEntities = {
  people: string[];
  companies: string[];
  projects: string[];
};

export type MatchedEntity = {
  kind: EntityAlias["kind"];
  canonical: string;
  alias: string;
  index: number;
  priority: number;
};

const projectContextPattern = /(프로젝트|관련|개편|교육|콘텐츠|캠페인|세팅|릴스|개선안|기획|런칭)/;
const personWaitingPattern = /(연락|회신|답변|피드백|확인|전달|정리)\s*(대기|요청|필요|예정)?/;
const companyWaitingPattern = /(답변|회신|견적|확인|발주|승인|수신)\s*(대기|요청|필요)?/;

function unique(values: string[]) {
  return [...new Set(values)];
}

function sortMatches(left: MatchedEntity, right: MatchedEntity) {
  if (left.index !== right.index) {
    return left.index - right.index;
  }

  if (left.priority !== right.priority) {
    return right.priority - left.priority;
  }

  return right.alias.length - left.alias.length;
}

export function extractNamedEntityMatches(text: string) {
  const matches: MatchedEntity[] = [];

  for (const entity of entityAliases) {
    const sortedAliases = [...entity.aliases].sort((left, right) => right.length - left.length);

    for (const alias of sortedAliases) {
      const index = text.indexOf(alias);

      if (index === -1) {
        continue;
      }

      matches.push({
        kind: entity.kind,
        canonical: entity.canonical,
        alias,
        index,
        priority: entity.priority ?? 0,
      });

      break;
    }
  }

  return matches.sort(sortMatches);
}

function groupMatches(matches: MatchedEntity[]): ExtractedEntities {
  return {
    people: unique(matches.filter((match) => match.kind === "person").map((match) => match.canonical)),
    companies: unique(matches.filter((match) => match.kind === "company").map((match) => match.canonical)),
    projects: unique(matches.filter((match) => match.kind === "project").map((match) => match.canonical)),
  };
}

export function extractNamedEntities(text: string): ExtractedEntities {
  return groupMatches(extractNamedEntityMatches(text));
}

function pickBestMatch(matches: MatchedEntity[]) {
  return [...matches].sort(sortMatches)[0] ?? null;
}

export function inferRelatedProject(text: string, entities: ExtractedEntities, matches: MatchedEntity[] = []) {
  const projectMatches = matches
    .filter((match) => match.kind === "project")
    .map((match) => {
      let score = match.priority;

      if (projectContextPattern.test(match.alias)) {
        score += 20;
      }

      if (text.includes(`${match.alias} 관련`) || text.includes(`${match.alias} 프로젝트`)) {
        score += 15;
      }

      if (text.includes("관련") && match.index <= text.indexOf("관련")) {
        score += 10;
      }

      return {
        ...match,
        score,
      };
    })
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return sortMatches(left, right);
    });

  if (projectMatches.length > 0) {
    return projectMatches[0]?.canonical ?? null;
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
  matches: MatchedEntity[] = [],
) {
  const currentWaitingForMatches = currentWaitingFor
    ? matches.filter((match) => currentWaitingFor.includes(match.alias) || currentWaitingFor.includes(match.canonical))
    : [];

  if ((/연락 대기|회신 대기|답변 대기/.test(text) || personWaitingPattern.test(text)) && entities.people.length > 0) {
    return pickBestMatch(
      currentWaitingForMatches.filter((match) => match.kind === "person").length > 0
        ? currentWaitingForMatches.filter((match) => match.kind === "person")
        : matches.filter((match) => match.kind === "person"),
    )?.canonical ?? entities.people[0];
  }

  if ((/수신 대기|답변 대기|회신 대기/.test(text) || companyWaitingPattern.test(text)) && entities.companies.length > 0) {
    return pickBestMatch(
      currentWaitingForMatches.filter((match) => match.kind === "company").length > 0
        ? currentWaitingForMatches.filter((match) => match.kind === "company")
        : matches.filter((match) => match.kind === "company"),
    )?.canonical ?? entities.companies[0];
  }

  if (/수신 대기/.test(text) && entities.projects.length > 0) {
    return pickBestMatch(
      currentWaitingForMatches.filter((match) => match.kind === "project").length > 0
        ? currentWaitingForMatches.filter((match) => match.kind === "project")
        : matches.filter((match) => match.kind === "project"),
    )?.canonical ?? entities.projects[0];
  }

  if (/다시 확인|나중에 확인|아직 없음/.test(text) && entities.projects.length > 0) {
    return inferRelatedProject(text, entities, matches);
  }

  if (currentWaitingFor) {
    return currentWaitingFor
      .replace(/^(?:회의 후 정리|미팅 후 정리|정리|메모)[:\s-]*/, "")
      .replace(/^(?:관련|건|후속)\s+/, "")
      .trim();
  }

  return null;
}
