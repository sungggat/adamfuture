import type {
  CalculationResult, PoleKey, Profession, Question, RadicalKey,
  Recommendation, ScaleResult,
} from "./types";

export const PAIRS: [PoleKey, PoleKey][] = [
  ["motivation_toward", "motivation_away"],
  ["internal_reference", "external_reference"],
  ["active", "reflective"],
  ["options", "procedures"],
  ["global", "detail"],
  ["associated", "dissociated"],
];

const RADICALS: RadicalKey[] = [
  "paranoid", "schizoid", "epileptoid", "hysteroid", "emotive", "anxious",
];

const MATRIX: Record<PoleKey, Record<RadicalKey, number>> = {
  motivation_toward: { paranoid: 3, schizoid: 1, epileptoid: 0, hysteroid: 2, emotive: 0, anxious: 0 },
  motivation_away: { paranoid: 0, schizoid: 0, epileptoid: 2, hysteroid: 0, emotive: 1, anxious: 3 },
  internal_reference: { paranoid: 3, schizoid: 2, epileptoid: 1, hysteroid: 0, emotive: 0, anxious: 0 },
  external_reference: { paranoid: 0, schizoid: 0, epileptoid: 0, hysteroid: 3, emotive: 2, anxious: 1 },
  active: { paranoid: 3, schizoid: 0, epileptoid: 1, hysteroid: 2, emotive: 0, anxious: 0 },
  reflective: { paranoid: 0, schizoid: 3, epileptoid: 0, hysteroid: 0, emotive: 1, anxious: 2 },
  options: { paranoid: 1, schizoid: 3, epileptoid: 0, hysteroid: 2, emotive: 0, anxious: 0 },
  procedures: { paranoid: 0, schizoid: 0, epileptoid: 3, hysteroid: 0, emotive: 1, anxious: 2 },
  global: { paranoid: 3, schizoid: 2, epileptoid: 0, hysteroid: 1, emotive: 0, anxious: 0 },
  detail: { paranoid: 0, schizoid: 0, epileptoid: 3, hysteroid: 0, emotive: 1, anxious: 2 },
  associated: { paranoid: 1, schizoid: 0, epileptoid: 0, hysteroid: 2, emotive: 3, anxious: 0 },
  dissociated: { paranoid: 0, schizoid: 3, epileptoid: 2, hysteroid: 0, emotive: 0, anxious: 1 },
};

const MAXIMUM: Record<RadicalKey, number> = {
  paranoid: 14, schizoid: 14, epileptoid: 12,
  hysteroid: 12, emotive: 9, anxious: 11,
};

export const ALGORITHM = {
  version: "2026.1-demo",
  radicalWeight: 0.75,
  metaWeight: 0.25,
  contradictionThreshold: 0.67,
  contradictionProfessionMax: 0.25,
  contradictionPenalty: 7,
};

const emptyPoles = (): Record<PoleKey, number> =>
  Object.fromEntries(PAIRS.flat().map((pole) => [pole, 0])) as Record<PoleKey, number>;

export function cosine(a: Record<RadicalKey, number>, b: Record<RadicalKey, number>) {
  const dot = RADICALS.reduce((sum, key) => sum + a[key] * b[key], 0);
  const normA = Math.sqrt(RADICALS.reduce((sum, key) => sum + a[key] ** 2, 0));
  const normB = Math.sqrt(RADICALS.reduce((sum, key) => sum + b[key] ** 2, 0));
  return normA && normB ? dot / (normA * normB) : 0;
}

export function calculate(
  answers: Record<number, boolean>,
  questions: Question[],
  professions: Profession[],
): CalculationResult {
  const raw = emptyPoles();
  questions.forEach((question) => {
    const answer = answers[question.id];
    if (answer !== undefined) raw[answer ? question.yes_pole : question.no_pole] += 1;
  });

  const scales: ScaleResult[] = PAIRS.map(([first, second]) => ({
    first, second,
    firstScore: raw[first],
    secondScore: raw[second],
    confidence: Math.abs(raw[first] - raw[second]) / 6,
  }));
  const poles = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, value / 6]),
  ) as Record<PoleKey, number>;

  const normalizedRadicals = Object.fromEntries(RADICALS.map((radical) => {
    const weighted = (Object.keys(poles) as PoleKey[])
      .reduce((sum, pole) => sum + poles[pole] * MATRIX[pole][radical], 0);
    return [radical, weighted / MAXIMUM[radical]];
  })) as Record<RadicalKey, number>;
  const total = Object.values(normalizedRadicals).reduce((sum, value) => sum + value, 0);
  const radicalShares = Object.fromEntries(
    RADICALS.map((key) => [key, normalizedRadicals[key] / total]),
  ) as Record<RadicalKey, number>;

  const ranked = professions.map((profession): Recommendation => {
    const confidenceSum = scales.reduce((sum, scale) => sum + scale.confidence, 0);
    const distance = scales.reduce((sum, scale) =>
      sum + scale.confidence * Math.abs(poles[scale.first] - profession.meta[scale.first]), 0);
    const metaSimilarity = confidenceSum ? 1 - distance / confidenceSum : 0.5;
    const radicalSimilarity = cosine(radicalShares, profession.radicals);
    let contradictions = 0;
    scales.forEach((scale) => {
      if (scale.confidence < ALGORITHM.contradictionThreshold) return;
      const preferred = scale.firstScore >= scale.secondScore ? scale.first : scale.second;
      if (profession.meta[preferred] <= ALGORITHM.contradictionProfessionMax) contradictions += 1;
    });
    const penalty = contradictions * ALGORITHM.contradictionPenalty;
    const score = Math.max(0, Math.min(100,
      100 * (ALGORITHM.radicalWeight * radicalSimilarity + ALGORITHM.metaWeight * metaSimilarity) - penalty,
    ));
    const matches = scales
      .map((scale) => ({
        pole: scale.firstScore >= scale.secondScore ? scale.first : scale.second,
        value: 1 - Math.abs(poles[scale.first] - profession.meta[scale.first]),
      }))
      .sort((a, b) => b.value - a.value).slice(0, 3).map((item) => item.pole);
    return { profession, metaSimilarity, radicalSimilarity, penalty, score, matches };
  }).sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const counts = new Map<string, number>();
  const recommendations = ranked.filter(({ profession }) => {
    const normalized = profession.name_ru.toLowerCase().replaceAll(/[^а-яa-z0-9]/g, "");
    if (seen.has(normalized)) return false;
    const count = counts.get(profession.category_ru) ?? 0;
    if (count >= 3) return false;
    seen.add(normalized);
    counts.set(profession.category_ru, count + 1);
    return true;
  }).slice(0, 15);

  return { scales, poles, radicalShares, recommendations };
}
