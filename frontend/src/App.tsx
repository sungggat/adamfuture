import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ArrowRightOutlined, CheckOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Input, Progress, Select, Tag } from "antd";
import questionsData from "./data/questions.json";
import professionsData from "./data/professions.json";
import { calculate } from "./engine";
import { enrichInterpretation } from "./interpretation";
import { calculateIntelligences, findUser, loadSession, saveResult, saveSession } from "./portalStore";
import { AdminPage, LoginPage, ProfilePage, ReportPage } from "./Portal";
import type { AssessmentResult, Lang, PoleKey, Profession, Question } from "./types";

const questions = questionsData as Question[];
const professions = professionsData as Profession[];
const poleLabels: Record<Lang, Record<PoleKey, string>> = {
  ru: {
    motivation_toward: "Движение к цели", motivation_away: "Предотвращение рисков",
    internal_reference: "Своё мнение", external_reference: "Обратная связь",
    active: "Действие", reflective: "Анализ",
    options: "Возможности", procedures: "Порядок",
    global: "Общая картина", detail: "Детали",
    associated: "Вовлечённость", dissociated: "Объективность",
  },
  kk: {
    motivation_toward: "Мақсатқа ұмтылу", motivation_away: "Тәуекелдің алдын алу",
    internal_reference: "Өз пікірі", external_reference: "Кері байланыс",
    active: "Әрекет", reflective: "Талдау",
    options: "Мүмкіндіктер", procedures: "Реттілік",
    global: "Жалпы көрініс", detail: "Егжей-тегжей",
    associated: "Қатысу", dissociated: "Объективтілік",
  },
};

function useLang(): Lang {
  const { i18n } = useTranslation();
  return i18n.language.startsWith("kk") ? "kk" : "ru";
}

function resolveTestEntry() {
  const session = loadSession();
  if (!session) return "/login";
  if (session.role === "admin") return "/admin";
  const user = findUser(session.userId);
  if (!user) return "/login";
  if (!user.firstName.trim() || !user.lastName.trim()) return "/profile";
  return user.result ? "/results" : "/test";
}

function useTestEntry() {
  const location = useLocation();
  const [entry, setEntry] = useState(resolveTestEntry);
  useEffect(() => {
    const sync = () => setEntry(resolveTestEntry());
    sync();
    window.addEventListener("adam-session-updated", sync);
    window.addEventListener("adam-users-updated", sync);
    return () => {
      window.removeEventListener("adam-session-updated", sync);
      window.removeEventListener("adam-users-updated", sync);
    };
  }, [location.pathname]);
  return entry;
}

function Header() {
  const { t, i18n } = useTranslation();
  const lang = useLang();
  const testEntry = useTestEntry();
  const isLoggedIn = Boolean(loadSession());
  const setLanguage = (value: Lang) => {
    i18n.changeLanguage(value);
    localStorage.setItem("adam-language", value);
    document.documentElement.lang = value;
  };
  return <header className="header">
    <Link to="/" className="brand brand-logo"><img src="/adam-logo.svg" alt="ADAM" /></Link>
    <nav>
      <Link to={testEntry}>{t("navTest")}</Link>
      <Link to="/professions">{t("navCatalog")}</Link>
      <a href="/#method">{t("navAbout")}</a>
      <Link to={testEntry} className="header-login">{isLoggedIn ? (lang === "kk" ? "Кабинет" : "Кабинет") : (lang === "kk" ? "Кіру" : "Войти")}</Link>
    </nav>
    <div className="language" aria-label="Language">
      <button className={lang === "kk" ? "active" : ""} onClick={() => setLanguage("kk")}>ҚАЗ</button>
      <button className={lang === "ru" ? "active" : ""} onClick={() => setLanguage("ru")}>RU</button>
    </div>
  </header>;
}

function TestHeader() {
  const { t, i18n } = useTranslation();
  const lang = useLang();
  const setLanguage = (value: Lang) => {
    i18n.changeLanguage(value);
    localStorage.setItem("adam-language", value);
    document.documentElement.lang = value;
  };
  return <header className="header test-header">
    <Link to="/" className="brand brand-logo"><img src="/adam-logo.svg" alt="ADAM" /></Link>
    <div className="test-header-note">{t("testHeaderNote")}</div>
    <div className="language" aria-label="Language">
      <button className={lang === "kk" ? "active" : ""} onClick={() => setLanguage("kk")}>ҚАЗ</button>
      <button className={lang === "ru" ? "active" : ""} onClick={() => setLanguage("ru")}>RU</button>
    </div>
  </header>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const testEntry = useTestEntry();
  return <><Header /><main>{children}</main><footer>FUTURE · 2026 <span>Профориентация с уважением к личности</span><Link to={testEntry}>Личный кабинет</Link></footer></>;
}

function Landing() {
  const { t } = useTranslation();
  const testEntry = useTestEntry();
  const careerCards = [
    { image: "/images/careers/robotics.jpg", code: "AI", title: t("futureAI"), position: "50% 35%" },
    { image: "/images/careers/pexels-biotech.jpg", code: "BIO", title: t("futureBiotechResearcher"), position: "50% 42%" },
    { image: "/images/careers/pexels-climate-scientist.jpg", code: "CLIMATE", title: t("futureClimateScientist"), position: "55% 44%" },
    { image: "/images/careers/green-energy.jpg", code: "ENERGY", title: t("futureEnergy"), position: "72% 45%" },
  ];
  return <Shell>
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">{t("heroEyebrow")}</p>
        <h1>{t("heroTitle")}</h1>
        <p className="lead">{t("heroText")}</p>
        <div className="actions">
          <Link to={testEntry}><Button size="large" type="primary">{t("start")} <ArrowRightOutlined /></Button></Link>
          <Link to="/professions"><Button size="large">{t("explore")}</Button></Link>
        </div>
      </div>
      <div
        className="hero-visual people-accordion"
        aria-label={t("careerMapLabel")}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 18;
          const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 18;
          event.currentTarget.style.setProperty("--shift-x", `${x}px`);
          event.currentTarget.style.setProperty("--shift-y", `${y}px`);
          event.currentTarget.style.setProperty("--shift-x-inverse", `${x * -0.65}px`);
          event.currentTarget.style.setProperty("--shift-y-inverse", `${y * -0.65}px`);
          event.currentTarget.style.setProperty("--shift-x-soft", `${x * 0.35}px`);
          event.currentTarget.style.setProperty("--shift-y-soft", `${y * 0.35}px`);
        }}
        onPointerLeave={(event) => {
          event.currentTarget.style.setProperty("--shift-x", "0px");
          event.currentTarget.style.setProperty("--shift-y", "0px");
          event.currentTarget.style.setProperty("--shift-x-inverse", "0px");
          event.currentTarget.style.setProperty("--shift-y-inverse", "0px");
          event.currentTarget.style.setProperty("--shift-x-soft", "0px");
          event.currentTarget.style.setProperty("--shift-y-soft", "0px");
        }}
      >
        <div className="career-orbit orbit-a" />
        <div className="career-orbit orbit-b" />
        <div className="career-orbit orbit-c" />
        <div className="drone-blueprint" aria-hidden="true">
          <svg viewBox="0 0 160 90">
            <path d="M57 40h46l10 14H47zM69 40l-7-17m29 17 7-17M47 54 29 67m84-13 18 13" />
            <circle cx="25" cy="70" r="13" /><circle cx="135" cy="70" r="13" />
            <circle cx="59" cy="19" r="10" /><circle cx="101" cy="19" r="10" />
            <rect x="70" y="47" width="20" height="13" rx="3" />
          </svg>
        </div>
        <div className="chem-cluster" aria-hidden="true">
          <span><b>C</b><small>12.011</small></span>
          <span><b>H</b><small>1.008</small></span>
          <span><b>O</b><small>15.999</small></span>
        </div>
        {careerCards.map((card) => (
          <article className="people-panel" key={card.code}>
            <img src={card.image} alt="" style={{ objectPosition: card.position }} />
            <div className="people-shade" />
            <div className="people-copy">
              <h3>{card.title}</h3>
            </div>
          </article>
        ))}
        <div className="career-coordinate">43°14′ N · 76°53′ E</div>
      </div>
    </section>
    <section className="stats">
      <div><strong>36</strong><span>{t("statQuestions")}</span></div>
      <div><strong>744</strong><span>{t("statProfessions")}</span></div>
      <div><strong>7–10</strong><span>{t("statTime")}</span></div>
    </section>
    <section id="method" className="method">
      <h2>{t("howTitle")}</h2>
      <div className="steps">
        {[["01", "how1", "how1d"], ["02", "how2", "how2d"], ["03", "how3", "how3d"]].map(([n, a, b]) =>
          <article key={n}><span>{n}</span><h3>{t(a)}</h3><p>{t(b)}</p></article>)}
      </div>
    </section>
    <section className="home-audiences">
      <div className="home-audiences-heading">
        <h2>{t("audienceTitle")}</h2>
        <p>{t("audienceLead")}</p>
      </div>
      <div className="audience-cards">
        <article><span>01</span><h3>{t("audienceStudent")}</h3><p>{t("audienceStudentText")}</p></article>
        <article><span>02</span><h3>{t("audienceParent")}</h3><p>{t("audienceParentText")}</p></article>
      </div>
    </section>
    <section className="home-final-cta">
      <div><h2>{t("finalCtaTitle")}</h2><p>{t("finalCtaText")}</p></div>
      <Link to={testEntry}><Button size="large" type="primary">{t("start")} <ArrowRightOutlined /></Button></Link>
    </section>
  </Shell>;
}

function TestPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const navigate = useNavigate();
  const session = loadSession();
  const activeUser = session?.role === "user" ? findUser(session.userId) : undefined;
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const question = questions[index];
  const choose = (value: boolean) => {
    setSubmitError(false);
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    if (index < 35) window.setTimeout(() => setIndex(index + 1), 260);
  };
  const complete = async () => {
    if (submitting || Object.keys(answers).length !== 36) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const calculation = calculate(answers, questions, professions);
      const baseResult: AssessmentResult = {
        scales: calculation.scales.map(({ first, second, firstScore, secondScore }) => ({
          first, second, firstScore, secondScore,
        })),
        professions: calculation.recommendations.slice(0, 10).map(({ profession }) => ({
          id: profession.id,
          name_ru: profession.name_ru,
          name_kk: profession.name_kk,
          category_ru: profession.category_ru,
          category_kk: profession.category_kk,
        })),
        intelligences: calculateIntelligences(answers),
      };
      const result: AssessmentResult = { ...baseResult, interpretation: await enrichInterpretation(baseResult, answers) };
      if (activeUser) saveResult(activeUser.id, result);
      navigate("/results", { state: { result }, replace: true });
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };
  const answered = Object.keys(answers).length;
  if (!activeUser) return <Navigate to="/login" replace />;
  if (!activeUser.firstName.trim() || !activeUser.lastName.trim()) return <Navigate to="/profile" replace />;
  return <><TestHeader /><main>
    <section className="test-shell">
      <div className="test-story-progress" aria-hidden="true">
        <i style={{ width: `${answered / 36 * 100}%` }} />
        <span>{String(answered).padStart(2, "0")} / 36</span>
      </div>
      <div className="test-top">
        <div><p className="eyebrow">{t("question")} {index + 1} / 36</p><h1>{t("testTitle")}</h1></div>
        <Progress type="circle" percent={Math.round(answered / 36 * 100)} size={74} strokeColor="#286f6a" />
      </div>
      <p className="test-intro">{t("testIntro")}</p>
      <article className="question-card" key={`${lang}-${question.id}`}>
        <span className="question-number">{String(index + 1).padStart(2, "0")}</span>
        <h2>{lang === "kk" ? question.text_kk : question.text_ru}</h2>
        <div className="answer-grid">
          <button className={answers[question.id] === true ? "selected" : ""} onClick={() => choose(true)}>
            <span><CheckOutlined /></span><b>{t("yes")}</b>
          </button>
          <button className={answers[question.id] === false ? "selected" : ""} onClick={() => choose(false)}>
            <span>×</span><b>{t("no")}</b>
          </button>
        </div>
      </article>
      <div className="test-controls">
        <Button disabled={index === 0 || submitting} onClick={() => setIndex(index - 1)}>{t("back")}</Button>
        {index === 35 && answered === 36
          ? <Button type="primary" loading={submitting} onClick={complete}>{t("finish")}</Button>
          : <Button disabled={index === 35} onClick={() => setIndex(index + 1)}>{t("next")}</Button>}
      </div>
      {submitError && <p className="submit-error" role="alert">{t("submitError")}</p>}
    </section>
  </main></>;
}

function ResultsPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const session = loadSession();
  const activeUser = session?.role === "user" ? findUser(session.userId) : undefined;
  const [result] = useState(() => (location.state as { result?: AssessmentResult } | null)?.result ?? activeUser?.result);
  useEffect(() => {
    if (location.state) window.history.replaceState({}, document.title, location.pathname);
  }, [location.pathname, location.state]);
  if (!result) return <Navigate to={activeUser ? "/test" : "/login"} replace />;
  const scaleProfiles = result.scales.map((scale) => {
    const firstLeads = scale.firstScore >= scale.secondScore;
    return {
      key: firstLeads ? scale.first : scale.second,
      label: poleLabels[lang][firstLeads ? scale.first : scale.second],
      value: Math.max(scale.firstScore, scale.secondScore),
      balance: Math.abs(scale.firstScore - scale.secondScore),
    };
  }).sort((a, b) => b.balance - a.balance);
  const maxProfileValue = 6;
  const levelLabel = (balance: number) => lang === "kk"
    ? (balance >= 4 ? "айқын көрінеді" : balance >= 2 ? "тұрақты көрінеді" : "екі тәсіл де қолжетімді")
    : (balance >= 4 ? "выражен явно" : balance >= 2 ? "проявляется устойчиво" : "доступны обе стратегии");
  return <Shell>
    <section className="result-head">
      <h1>{t("resultsTitle")}</h1>
      <p className="result-summary">{lang === "kk"
        ? "Төмендегі бейін жауаптарыңда көрінген жұмыс тәсілдерін көрсетеді. Бірнеше тәсіл бірдей айқын болуы мүмкін — бұл қалыпты жағдай."
        : "Профиль показывает способы работы, которые проявились в твоих ответах. Несколько способов могут быть выражены одинаково — это нормально."}</p>
    </section>
    <section className="work-dashboard">
      <div className="dashboard-heading">
        <div><h2>{t("topProfiles")}</h2></div>
        <p>{lang === "kk" ? "Бұл рейтинг емес. Диаграмма тапсырмаларға қай тәсілмен кірісу саған табиғи екенін көрсетеді." : "Это не оценка и не рейтинг. Диаграмма показывает, какие способы решать задачи даются тебе естественнее."}</p>
      </div>
      <div className="profile-highlights">
        {scaleProfiles.slice(0, 3).map((profile, i) =>
          <article key={profile.key}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <h3>{profile.label}</h3>
            <p>{levelLabel(profile.balance)}</p>
          </article>)}
      </div>
      <div className="work-map">
        {scaleProfiles.map((profile, index) =>
          <div className="work-map-row" key={profile.key}>
            <span className="work-map-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="work-map-label">{profile.label}</span>
            <div className="work-map-track"><i style={{ width: `${Math.max(18, profile.value / maxProfileValue * 100)}%`, animationDelay: `${index * 70}ms` }} /></div>
            <b>{levelLabel(profile.balance)}</b>
          </div>)}
      </div>
    </section>
    <section className="recommendation-section">
      <div className="recommendation-heading"><div><h2>{t("recommendations")}</h2></div>
        <p>{lang === "kk" ? "Алдымен осы бағыттарды зертте: сипаттаманы оқы, маманмен сөйлес және шағын тапсырма жасап көр." : "Начни исследование с этих направлений: изучи задачи, поговори со специалистом и попробуй небольшой проект."}</p></div>
      <div className="recommendations">
        {result.professions.slice(0, 10).map((profession, index) => { const detail = professions.find((item) => item.id === profession.id); return <article className={index < 3 ? "featured" : ""} key={profession.id} style={{ animationDelay: `${index * 55}ms` }}>
            <div className="rec-rank">{String(index + 1).padStart(2, "0")}</div>
            <div className="rec-main"><Tag>{lang === "kk" ? profession.category_kk : profession.category_ru}</Tag>
              <h3>{lang === "kk" ? profession.name_kk : profession.name_ru}</h3>
              <p>{lang === "kk" ? `${profession.category_kk} саласындағы міндеттер мен жұмыс ортасын зерттеуге арналған бағыт.` : detail?.description_ru}</p>
              {detail && <div className="rec-gop"><b>{detail.gop_code}</b><span>{lang === "kk" ? "Білім беру бағдарламаларының тобы" : detail.gop_name}</span></div>}
            </div>
          </article>})}
      </div>
    </section>
    <aside className="disclaimer">{t("disclaimer")}</aside>
    <div className="center result-actions">
      {activeUser && <Button type="primary" onClick={() => navigate(`/report/${activeUser.id}`)}>{lang === "kk" ? "PDF есебін ашу" : "Открыть PDF-отчёт"}</Button>}
      <Button onClick={() => navigate("/test", { replace: true })}>{t("restart")}</Button>
      <Button onClick={() => { saveSession(null); navigate("/login", { replace:true }); }}>{lang === "kk" ? "Шығу" : "Выйти"}</Button>
    </div>
  </Shell>;
}

function Catalog() {
  const { t } = useTranslation();
  const lang = useLang();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const categories = useMemo(() => [...new Set(professions.map((p) => p.category_ru))], []);
  const filtered = professions.filter((profession) => {
    const name = lang === "kk" ? profession.name_kk : profession.name_ru;
    return name.toLowerCase().includes(search.toLowerCase()) && (category === "all" || profession.category_ru === category);
  }).slice(0, 60);
  return <Shell><section className="catalog">
    <div className="catalog-intro"><div><h1>{t("catalogTitle")}</h1><p>{t("catalogLead")}</p></div><strong>{filtered.length}<span>{t("catalogShown")}</span></strong></div>
    <div className="filters catalog-filter-panel">
      <Input size="large" prefix={<SearchOutlined />} placeholder={t("search")} value={search} onChange={(event) => setSearch(event.target.value)} />
      <Select size="large" value={category} onChange={setCategory} options={[
        { value: "all", label: t("all") }, ...categories.map((item) => ({ value: item, label: item })),
      ]} />
    </div>
    <div className="catalog-grid">{filtered.map((profession) =>
      <article className="profession-card" key={profession.id} style={{ animationDelay: `${Math.min(filtered.indexOf(profession), 11) * 35}ms` }}>
        <span className="profession-number">{String(profession.id).padStart(3, "0")}</span>
        <p className="profession-category">{lang === "kk" ? profession.category_kk : profession.category_ru}</p>
        <h2>{lang === "kk" ? profession.name_kk : profession.name_ru}</h2>
        <p className="profession-description">{lang === "kk" ? `${profession.category_kk} саласындағы міндеттерді, құралдарды және жұмыс ортасын зерттеуге арналған кәсіби бағыт.` : profession.description_ru}</p>
        <div className="profession-gop"><b>{profession.gop_code}</b><span>{lang === "kk" ? "Білім беру бағдарламаларының тобы" : profession.gop_name}</span></div>
      </article>)}</div>
  </section></Shell>;
}

export function App() {
  return <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/test" element={<TestPage />} />
    <Route path="/results" element={<ResultsPage />} />
    <Route path="/professions" element={<Catalog />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/admin" element={<AdminPage />} />
    <Route path="/report/:id" element={<ReportPage />} />
  </Routes>;
}
