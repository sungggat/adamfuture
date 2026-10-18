import type { AssessmentResult, DemoSession, DemoUser, IntelligenceResult } from "./types";

const USERS_KEY = "adam-demo-users-v2";
const SESSION_KEY = "adam-demo-session-v2";
export const ADMIN_CODE = "ADAM-ADMIN-2026";

const seedUsers: DemoUser[] = [{
  id: "demo-student",
  code: "ADAM-DEMO-001",
  firstName: "",
  lastName: "",
  birthYear: "",
  city: "",
  school: "",
  grade: "",
  phone: "",
  createdAt: new Date().toISOString(),
}];

export function loadUsers(): DemoUser[] {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    if (stored) return JSON.parse(stored) as DemoUser[];
  } catch { /* Reset corrupted local demo state. */ }
  localStorage.setItem(USERS_KEY, JSON.stringify(seedUsers));
  return seedUsers;
}

export function saveUsers(users: DemoUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  window.dispatchEvent(new Event("adam-users-updated"));
}

export function findUser(id: string) {
  return loadUsers().find((user) => user.id === id);
}

export function findUserByCode(code: string) {
  return loadUsers().find((user) => user.code === code.trim().toUpperCase());
}

export function updateUser(id: string, patch: Partial<DemoUser>) {
  const users = loadUsers().map((user) => user.id === id ? { ...user, ...patch } : user);
  saveUsers(users);
  return users.find((user) => user.id === id)!;
}

export function createUser(input: Pick<DemoUser, "firstName" | "lastName" | "grade" | "school">) {
  const users = loadUsers();
  let code = "";
  do {
    code = `ADAM-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  } while (users.some((user) => user.code === code));
  const user: DemoUser = {
    id: crypto.randomUUID(), code,
    firstName: input.firstName, lastName: input.lastName,
    birthYear: "", city: "", school: input.school, grade: input.grade, phone: "",
    createdAt: new Date().toISOString(),
  };
  saveUsers([user, ...users]);
  return user;
}

export function loadSession(): DemoSession | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null") as DemoSession | null; }
  catch { return null; }
}

export function saveSession(session: DemoSession | null) {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("adam-session-updated"));
}

type IntelligenceEvidence = readonly [questionId:number, supportingAnswer:boolean];
type IntelligenceDefinition = readonly [key:string, nameRu:string, nameKk:string, evidence:readonly IntelligenceEvidence[]];

// Learning-preference indicators inferred from the metaprogram questionnaire.
// They are not IQ or ability scores. Explicit answer directions prevent a
// meaningful "Нет" from being incorrectly counted as zero evidence.
const intelligenceDefinitions: readonly IntelligenceDefinition[] = [
  ["existential", "Смысловой", "Мағыналық", [[4,true],[19,true],[25,true],[27,true],[29,true]]],
  ["interpersonal", "Межличностный", "Тұлғааралық", [[7,true],[9,true],[11,true],[13,true],[24,true],[35,true]]],
  ["linguistic", "Лингвистический", "Лингвистикалық", [[8,true],[13,true],[19,true],[29,true],[32,true]]],
  ["visual", "Визуально-пространственный", "Визуалды-кеңістіктік", [[22,true],[25,true],[27,true],[28,true],[30,true]]],
  ["intrapersonal", "Внутриличностный", "Тұлғаішілік", [[3,true],[7,false],[9,false],[10,true],[18,true],[35,false]]],
  ["kinesthetic", "Практико-кинестетический", "Практикалық-қимыл", [[6,true],[13,true],[15,true],[17,true],[31,true],[33,true]]],
  ["logical", "Логико-аналитический", "Логикалық-талдамалық", [[1,true],[14,true],[16,true],[22,true],[26,true],[28,true],[30,true],[32,true],[36,true]]],
];

export function calculateIntelligences(answers: Record<number, boolean>): IntelligenceResult[] {
  return intelligenceDefinitions.map(([key, name_ru, name_kk, evidence]) => ({
    key, name_ru, name_kk,
    score: Math.round(evidence.filter(([id, supportingAnswer]) => answers[id] === supportingAnswer).length / evidence.length * 100),
  }));
}

export function saveResult(userId: string, result: AssessmentResult) {
  return updateUser(userId, { result, completedAt: new Date().toISOString() });
}
