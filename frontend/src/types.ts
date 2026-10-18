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
  description_ru: string;
  nkz_code?: string | null;
  nkz_name?: string | null;
  gop_code: string;
  gop_name: string;
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
  intelligences?: IntelligenceResult[];
  interpretation?: ResultInterpretation;
}

export interface ResultInterpretation {
  summary_ru: string;
  summary_kk: string;
  strengths_ru: string[];
  strengths_kk: string[];
  next_step_ru: string;
  next_step_kk: string;
  intro_ru?: string;
  intro_kk?: string;
  style_details_ru?: InterpretationDetail[];
  style_details_kk?: InterpretationDetail[];
  attention_ru?: string;
  attention_kk?: string;
  conclusion_ru?: string;
  conclusion_kk?: string;
  intelligence_analysis_ru?: string;
  intelligence_analysis_kk?: string;
  source: "local" | "openai";
}

export interface InterpretationDetail {
  title: string;
  text: string;
}

export interface IntelligenceResult {
  key: string;
  name_ru: string;
  name_kk: string;
  score: number | null;
}

export interface DemoUser {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  birthYear: string;
  city: string;
  school: string;
  grade: string;
  phone: string;
  createdAt: string;
  completedAt?: string;
  result?: AssessmentResult;
  consultantNotes?: string;
}

export type DemoSession =
  | { role: "admin" }
  | { role: "user"; userId: string };
