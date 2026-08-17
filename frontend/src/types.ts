export type Lang = "ru" | "kk";
export type PoleKey =
  | "motivation_toward" | "motivation_away"
  | "internal_reference" | "external_reference"
  | "active" | "reflective"
  | "options" | "procedures"
  | "global" | "detail"
  | "associated" | "dissociated";
export type RadicalKey =
  | "paranoid" | "schizoid" | "epileptoid"
  | "hysteroid" | "emotive" | "anxious";

export interface Question {
  id: number;
  scale: string;
  text_ru: string;
  text_kk: string;
  yes_pole: PoleKey;
  no_pole: PoleKey;
}

export interface Profession {
  id: number;
  name_ru: string;
  name_kk: string;
  category_ru: string;
  category_kk: string;
  confidence: number;
  confidence_level: string;
  meta: Record<PoleKey, number>;
  radicals: Record<RadicalKey, number>;
}

export interface ScaleResult {
  first: PoleKey;
  second: PoleKey;
  firstScore: number;
  secondScore: number;
  confidence: number;
}

export type PublicScaleResult = Omit<ScaleResult, "confidence">;

export interface Recommendation {
  profession: Profession;
  metaSimilarity: number;
  radicalSimilarity: number;
  penalty: number;
  score: number;
  matches: string[];
}

export interface CalculationResult {
  scales: ScaleResult[];
  poles: Record<PoleKey, number>;
  radicalShares: Record<RadicalKey, number>;
  recommendations: Recommendation[];
}

export interface PublicProfession {
  id: number;
  name_ru: string;
  name_kk: string;
  category_ru: string;
  category_kk: string;
}

export interface AssessmentResult {
  scales: PublicScaleResult[];
  professions: PublicProfession[];
}
