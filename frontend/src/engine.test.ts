import { describe, expect, it } from "vitest";
import { calculate, cosine } from "./engine";
import questions from "./data/questions.json";
import professions from "./data/professions.json";
import type { Profession, Question, RadicalKey } from "./types";

describe("recommendation engine", () => {
  it("assigns exactly six points per scale", () => {
    const answers = Object.fromEntries((questions as Question[]).map((q) => [q.id, true]));
    const result = calculate(answers, questions as Question[], professions as Profession[]);
    result.scales.forEach((scale) => expect(scale.firstScore + scale.secondScore).toBe(6));
  });
  it("returns 0.5 meta similarity for a fully balanced profile", () => {
    const answers = Object.fromEntries((questions as Question[]).map((q, index) => {
      const pair = Math.floor(index / 6);
      const preferFirst = index % 6 < 3;
      const desiredPole = preferFirst
        ? ["motivation_toward", "internal_reference", "active", "options", "global", "associated"][pair]
        : ["motivation_away", "external_reference", "reflective", "procedures", "detail", "dissociated"][pair];
      return [q.id, q.yes_pole === desiredPole];
    }));
    const result = calculate(answers, questions as Question[], professions as Profession[]);
    expect(result.scales.every((scale) => scale.confidence === 0)).toBe(true);
    expect(result.recommendations[0].metaSimilarity).toBe(0.5);
  });
  it("calculates cosine identity as one", () => {
    const vector = { paranoid: .2, schizoid: .2, epileptoid: .2, hysteroid: .2, emotive: .1, anxious: .1 } satisfies Record<RadicalKey, number>;
    expect(cosine(vector, vector)).toBeCloseTo(1);
  });
  it("diversifies the top recommendations", () => {
    const answers = Object.fromEntries((questions as Question[]).map((q) => [q.id, true]));
    const result = calculate(answers, questions as Question[], professions as Profession[]);
    const counts = result.recommendations.reduce<Record<string, number>>((acc, item) => {
      const category = item.profession.category_ru;
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    }, {});
    expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(3);
  });
});
