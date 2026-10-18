import { useEffect, useState } from "react";
import { Button, Input, Tag } from "antd";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import professionsData from "./data/professions.json";
import type { DemoUser, Lang, PoleKey, Profession } from "./types";
import { buildLocalInterpretation } from "./interpretation";
import {
  ADMIN_CODE, createUser, findUser, findUserByCode, loadSession, loadUsers,
  saveSession, updateUser,
} from "./portalStore";

const poleNames: Record<Lang, Record<PoleKey, string>> = {
  ru: {
    motivation_toward:"К цели", motivation_away:"Предотвращение рисков",
    internal_reference:"Своё мнение", external_reference:"Обратная связь",
    active:"Действие", reflective:"Анализ", options:"Возможности", procedures:"Порядок",
    global:"Общая картина", detail:"Детали", associated:"Вовлечённость", dissociated:"Объективность",
  },
  kk: {
    motivation_toward:"Мақсатқа ұмтылу", motivation_away:"Тәуекелдің алдын алу",
    internal_reference:"Өз пікірі", external_reference:"Кері байланыс",
    active:"Әрекет", reflective:"Талдау", options:"Мүмкіндіктер", procedures:"Реттілік",
    global:"Жалпы көрініс", detail:"Егжей-тегжей", associated:"Қатысу", dissociated:"Объективтілік",
  },
};
const professionDetails = new Map((professionsData as Profession[]).map((profession) => [profession.id, profession]));
const intelligenceLabels: Record<string, { ru:string; kk:string }> = {
  existential:{ru:"Смысловой",kk:"Мағыналық"}, interpersonal:{ru:"Межличностный",kk:"Тұлғааралық"},
  linguistic:{ru:"Лингвистический",kk:"Лингвистикалық"}, visual:{ru:"Визуально-пространственный",kk:"Визуалды-кеңістіктік"},
  intrapersonal:{ru:"Внутриличностный",kk:"Тұлғаішілік"}, kinesthetic:{ru:"Практико-кинестетический",kk:"Практикалық-қимыл"},
  logical:{ru:"Логико-аналитический",kk:"Логикалық-талдамалық"},
};

function PortalHeader({ title, onExit }: { title: string; onExit?: () => void }) {
  const { i18n } = useTranslation();
  const lang: Lang = i18n.language.startsWith("kk") ? "kk" : "ru";
  const changeLanguage = (next: Lang) => { localStorage.setItem("adam-language", next); void i18n.changeLanguage(next); document.documentElement.lang = next; };
  return <header className="portal-header">
    <Link to="/" className="brand brand-logo"><img src="/adam-logo.svg" alt="ADAM" /></Link>
    <strong>{title}</strong>
    <div className="portal-header-actions"><div className="language"><button className={lang === "kk" ? "active" : ""} onClick={() => changeLanguage("kk")}>ҚАЗ</button><button className={lang === "ru" ? "active" : ""} onClick={() => changeLanguage("ru")}>RU</button></div>
    {onExit ? <Button onClick={onExit}>{lang === "kk" ? "Шығу" : "Выйти"}</Button> : <Link to="/"><Button>{lang === "kk" ? "Басты бет" : "На главную"}</Button></Link>}</div>
  </header>;
}

export function LoginPage() {
  const { i18n } = useTranslation();
  const lang: Lang = i18n.language.startsWith("kk") ? "kk" : "ru";
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const login = () => {
    const normalized = code.trim().toUpperCase();
    if (normalized === ADMIN_CODE) {
      saveSession({ role:"admin" }); navigate("/admin", { replace:true }); return;
    }
    const user = findUserByCode(normalized);
    if (!user) { setError(lang === "kk" ? "Код табылмады. Дұрыс енгізілгенін тексер немесе кәсіби бағдар маманына хабарлас." : "Код не найден. Проверьте написание или обратитесь к профориентологу."); return; }
    saveSession({ role:"user", userId:user.id });
    navigate(user.firstName && user.lastName ? (user.result ? "/results" : "/test") : "/profile", { replace:true });
  };
  return <main className="portal-page login-page">
    <section className="login-card">
      <Link to="/" className="brand brand-logo"><img src="/adam-logo.svg" alt="ADAM" /></Link>
      <p className="eyebrow">{lang === "kk" ? "ЖЕКЕ КАБИНЕТ" : "ЛИЧНЫЙ КАБИНЕТ"}</p>
      <h1>{lang === "kk" ? "Код арқылы кір" : "Войдите по коду"}</h1>
      <p>{lang === "kk" ? "Кәсіби бағдар маманы берген лицензиялық кодты енгіз. Құпиясөз бен тіркелу қажет емес." : "Введите лицензионный код, который выдал профориентолог. Пароль и регистрация не нужны."}</p>
      <Input.Password size="large" value={code} onChange={(e) => { setCode(e.target.value); setError(""); }} onPressEnter={login} placeholder={lang === "kk" ? "Лицензиялық код" : "Лицензионный код"} autoComplete="current-password" />
      {error && <p className="form-error">{error}</p>}
      <Button size="large" type="primary" block onClick={login}>{lang === "kk" ? "Жалғастыру" : "Продолжить"}</Button>
    </section>
  </main>;
}

export function ProfilePage() {
  const { i18n } = useTranslation();
  const lang: Lang = i18n.language.startsWith("kk") ? "kk" : "ru";
  const navigate = useNavigate();
  const session = loadSession();
  const user = session?.role === "user" ? findUser(session.userId) : undefined;
  const [form, setForm] = useState(() => user ?? null);
  if (!user || !form) return <Navigate to="/login" replace />;
  const set = (key: keyof DemoUser, value: string) => setForm({ ...form, [key]:value });
  const submit = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    updateUser(user.id, form); navigate(user.result ? "/results" : "/test", { replace:true });
  };
  return <><PortalHeader title={lang === "kk" ? "Оқушы бейіні" : "Профиль ученика"} onExit={() => { saveSession(null); navigate("/login"); }} />
    <main className="portal-page"><section className="profile-form-card">
      <p className="eyebrow">{lang === "kk" ? "1 / 2 ҚАДАМ" : "ШАГ 1 ИЗ 2"}</p><h1>{lang === "kk" ? "Өзің туралы қысқаша айт" : "Расскажите немного о себе"}</h1>
      <p>{lang === "kk" ? "Бұл деректер тек есепте және кәсіби бағдар маманының кабинетінде көрсетіледі." : "Эти данные будут только в локальном отчёте и кабинете профориентолога."}</p>
      <div className="profile-form-grid">
        <label>{lang === "kk" ? "Аты *" : "Имя *"}<Input size="large" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></label>
        <label>{lang === "kk" ? "Тегі *" : "Фамилия *"}<Input size="large" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></label>
        <label>{lang === "kk" ? "Туған жылы" : "Год рождения"}<Input size="large" inputMode="numeric" value={form.birthYear} onChange={(e) => set("birthYear", e.target.value)} /></label>
        <label>{lang === "kk" ? "Қала" : "Город"}<Input size="large" value={form.city} onChange={(e) => set("city", e.target.value)} /></label>
        <label>{lang === "kk" ? "Мектеп / колледж" : "Школа / колледж"}<Input size="large" value={form.school} onChange={(e) => set("school", e.target.value)} /></label>
        <label>{lang === "kk" ? "Сынып / курс" : "Класс / курс"}<Input size="large" value={form.grade} onChange={(e) => set("grade", e.target.value)} /></label>
        <label>{lang === "kk" ? "Телефон (міндетті емес)" : "Телефон (необязательно)"}<Input size="large" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></label>
      </div>
      <Button type="primary" size="large" disabled={!form.firstName.trim() || !form.lastName.trim()} onClick={submit}>{lang === "kk" ? "Сақтап, тестті бастау" : "Сохранить и начать тест"}</Button>
    </section></main>
  </>;
}

export function AdminPage() {
  const { i18n } = useTranslation();
  const lang: Lang = i18n.language.startsWith("kk") ? "kk" : "ru";
  const navigate = useNavigate();
  const session = loadSession();
  const [users, setUsers] = useState(loadUsers);
  const [selectedId, setSelectedId] = useState(users[0]?.id ?? "");
  const [draft, setDraft] = useState({ firstName:"", lastName:"", grade:"", school:"" });
  useEffect(() => { const sync = () => setUsers(loadUsers()); window.addEventListener("adam-users-updated", sync); return () => window.removeEventListener("adam-users-updated", sync); }, []);
  if (session?.role !== "admin") return <Navigate to="/login" replace />;
  const selected = users.find((user) => user.id === selectedId);
  const completed = users.filter((user) => user.result).length;
  const add = () => {
    const user = createUser(draft); setUsers(loadUsers()); setSelectedId(user.id);
    setDraft({ firstName:"", lastName:"", grade:"", school:"" });
  };
  const saveNotes = (notes: string) => { updateUser(selectedId, { consultantNotes:notes }); setUsers(loadUsers()); };
  return <><PortalHeader title={lang === "kk" ? "Кәсіби бағдар маманының кабинеті" : "Кабинет профориентолога"} onExit={() => { saveSession(null); navigate("/login"); }} />
    <main className="admin-page">
      <section className="admin-hero"><div><h1>{lang === "kk" ? "Оқушылар мен нәтижелер" : "Ученики и результаты"}</h1></div>
        <div className="admin-kpis"><div><strong>{users.length}</strong><span>{lang === "kk" ? "берілген код" : "выдано кодов"}</span></div><div><strong>{completed}</strong><span>{lang === "kk" ? "аяқталған тест" : "тестов завершено"}</span></div><div><strong>{users.length - completed}</strong><span>{lang === "kk" ? "күтіп тұр" : "ожидают"}</span></div></div>
      </section>
      <section className="admin-layout">
        <aside className="admin-sidebar">
          <h2>{lang === "kk" ? "Жаңа пайдаланушы" : "Новый пользователь"}</h2>
          <Input placeholder={lang === "kk" ? "Аты" : "Имя"} value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName:e.target.value })} />
          <Input placeholder={lang === "kk" ? "Тегі" : "Фамилия"} value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName:e.target.value })} />
          <Input placeholder={lang === "kk" ? "Сынып / курс" : "Класс / курс"} value={draft.grade} onChange={(e) => setDraft({ ...draft, grade:e.target.value })} />
          <Input placeholder={lang === "kk" ? "Мектеп" : "Школа"} value={draft.school} onChange={(e) => setDraft({ ...draft, school:e.target.value })} />
          <Button type="primary" block onClick={add}>{lang === "kk" ? "Код жасау" : "Создать код"}</Button>
          <h2>{lang === "kk" ? "Барлық пайдаланушылар" : "Все пользователи"}</h2>
          <div className="student-list">{users.map((user) => <button className={user.id === selectedId ? "active" : ""} onClick={() => setSelectedId(user.id)} key={user.id}>
            <span>{user.firstName || (lang === "kk" ? "Жаңа" : "Новый")} {user.lastName || (lang === "kk" ? "пайдаланушы" : "пользователь")}</span><small>{user.result ? (lang === "kk" ? "Тест аяқталды" : "Тест завершён") : (lang === "kk" ? "Күтіп тұр" : "Ожидает")}</small>
          </button>)}</div>
        </aside>
        <section className="student-detail">{selected ? <>
          <div className="student-title"><div><Tag color={selected.result ? "green" : "orange"}>{selected.result ? (lang === "kk" ? "Аяқталды" : "Завершён") : (lang === "kk" ? "Күтіп тұр" : "Ожидает")}</Tag><h2>{selected.firstName || (lang === "kk" ? "Аты көрсетілмеген" : "Без имени")} {selected.lastName}</h2><code>{selected.code}</code></div>
            {selected.result && <div className="student-actions"><Link to={`/report/${selected.id}`}><Button>{lang === "kk" ? "Есепті ашу" : "Открыть отчёт"}</Button></Link><Link to={`/report/${selected.id}?print=1`}><Button type="primary">{lang === "kk" ? "PDF жүктеу" : "Скачать PDF"}</Button></Link></div>}</div>
          <dl><div><dt>{lang === "kk" ? "Сынып" : "Класс"}</dt><dd>{selected.grade || "—"}</dd></div><div><dt>{lang === "kk" ? "Мектеп" : "Школа"}</dt><dd>{selected.school || "—"}</dd></div><div><dt>{lang === "kk" ? "Қала" : "Город"}</dt><dd>{selected.city || "—"}</dd></div><div><dt>{lang === "kk" ? "Туған жылы" : "Год рождения"}</dt><dd>{selected.birthYear || "—"}</dd></div></dl>
          {selected.result ? <><h3>{lang === "kk" ? "Ұсынылған бағыттар" : "Рекомендованные направления"}</h3><div className="admin-professions">{selected.result.professions.slice(0,6).map((p) => <span key={p.id}>{lang === "kk" ? p.name_kk : p.name_ru}</span>)}</div></> : <div className="empty-result"><b>{lang === "kk" ? "Әзірге нәтиже жоқ" : "Результатов пока нет"}</b><p>{lang === "kk" ? "Пайдаланушыға кодты беріңіз. Тест аяқталған соң нәтиже осында шығады." : "Передайте пользователю код. После прохождения теста результат появится здесь."}</p></div>}
          <label className="notes-field">{lang === "kk" ? "Кәсіби бағдар маманының жазбалары" : "Заметки профориентолога"}<Input.TextArea rows={7} value={selected.consultantNotes ?? ""} onChange={(e) => saveNotes(e.target.value)} placeholder={lang === "kk" ? "Бақылаулар, кеңес сұрақтары, келесі қадамдар…" : "Наблюдения, вопросы для консультации, следующие шаги…"} /></label>
        </> : <p>{lang === "kk" ? "Алғашқы пайдаланушыны жасаңыз." : "Создайте первого пользователя."}</p>}</section>
      </section>
    </main>
  </>;
}

export function ReportPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const session = loadSession();
  const user = findUser(id);
  const allowed = session?.role === "admin" || (session?.role === "user" && session.userId === id);
  const lang: Lang = document.documentElement.lang === "kk" ? "kk" : "ru";
  useEffect(() => {
    if (!allowed || !user?.result || searchParams.get("print") !== "1") return;
    const timer = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timer);
  }, [allowed, searchParams, user]);
  if (!allowed) return <Navigate to="/login" replace />;
  if (!user?.result) return <Navigate to={session?.role === "admin" ? "/admin" : "/test"} replace />;
  const profiles = user.result.scales.map((scale) => {
    const first = scale.firstScore >= scale.secondScore;
    return { label:poleNames[lang][first ? scale.first : scale.second], score:Math.max(scale.firstScore, scale.secondScore), balance:Math.abs(scale.firstScore-scale.secondScore) };
  }).sort((a,b) => b.balance-a.balance);
  const intelligences = (user.result.intelligences ?? [])
    .filter((item) => item.score !== null && intelligenceLabels[item.key])
    .map((item) => ({ ...item, name_ru:intelligenceLabels[item.key].ru, name_kk:intelligenceLabels[item.key].kk }))
    .sort((a,b) => (b.score ?? 0)-(a.score ?? 0));
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const localInterpretation = buildLocalInterpretation(user.result);
  const savedInterpretation = user.result.interpretation;
  const mergedInterpretation = savedInterpretation?.style_details_ru?.length === 6
    ? { ...localInterpretation, ...savedInterpretation }
    : localInterpretation;
  const legacyIntelligenceTerms = /натуралист|музыкаль|экзистенциал|натуралистік|музыкалық|экзистенциал/i;
  const interpretation = {
    ...mergedInterpretation,
    intelligence_analysis_ru:
      savedInterpretation?.intelligence_analysis_ru && !legacyIntelligenceTerms.test(savedInterpretation.intelligence_analysis_ru)
        ? savedInterpretation.intelligence_analysis_ru
        : localInterpretation.intelligence_analysis_ru,
    intelligence_analysis_kk:
      savedInterpretation?.intelligence_analysis_kk && !legacyIntelligenceTerms.test(savedInterpretation.intelligence_analysis_kk)
        ? savedInterpretation.intelligence_analysis_kk
        : localInterpretation.intelligence_analysis_kk,
  };
  const ReportFooter = ({ page }: { page: number }) => <div className="canva-footer"><b>{fullName}</b><span>{page}</span></div>;
  const reportText = lang === "kk" ? {
    back:"Артқа", printHint:"Басып шығару терезесінде «PDF ретінде сақтау» таңдаңыз", download:"PDF жүктеу",
    profile:"Жұмыс тәсілдерің", profileLead:"Бұл баға да, рейтинг те емес. Нәтиже тапсырмаға қалай кірісетініңді көрсетеді.",
    main:"Жұмыс тәсілі", support:"Жұмыс тәсілі", expressive:"Айқын көрінеді", steady:"Тұрақты көрінеді", flexible:"Екі тәсіл де қолжетімді", interpretation:"Сенің жұмыс тәсілдерің",
    strengths:"Жетекші жұмыс тәсілдерің", directions:"", next:"Назар аударатын тұс", conclusion:"Кәсіби бағдар маманының қорытындысы",
    intelligence:"Оқу және ойлау тәсілдері", intelligenceLead:"Жауаптарда байқалған ақпаратты түсіну және тапсырманы игеру тәсілдері.", intelligenceAnalysis:"Нәтижені түсіндіру",
    professions:"Ұсынылатын мамандықтар", professionsLead:"Бұл дайын шешім емес — салыстырып, тәжірибеде тексеруге арналған бағыттар.",
    gop:"Білім беру бағдарламаларының тобы", note:"Нәтиже мамандыққа жарамдылықты өлшемейді және медициналық қорытынды болып табылмайды.",
  } : {
    back:"Назад", printHint:"В окне печати выберите «Сохранить как PDF»", download:"Скачать PDF",
    profile:"Твои способы работы", profileLead:"Это не оценка и не рейтинг. Результат показывает, как тебе естественнее подходить к задачам.",
    main:"Способ работы", support:"Способ работы", expressive:"Выражен явно", steady:"Проявляется устойчиво", flexible:"Доступны обе стратегии", interpretation:"Твои способы работы",
    strengths:"Твои способы работы", directions:"", next:"На что стоит обратить внимание", conclusion:"Вывод профориентолога",
    intelligence:"Способы учиться и мыслить", intelligenceLead:"Способы понимать информацию и осваивать задачи, которые проявились в ответах.", intelligenceAnalysis:"Как читать результат",
    professions:"Рекомендованные профессии", professionsLead:"Это не готовое решение, а направления, которые стоит сравнить и проверить на практике.",
    gop:"Группа образовательных программ", note:"Результат не измеряет пригодность к профессии и не является медицинским заключением.",
  };
  const professionCards = (from: number, to: number) => user.result!.professions.slice(from,to).map((p,i)=>{const detail=professionDetails.get(p.id);return <article className="pdf-profession-card" key={p.id}>
    <div className="pdf-profession-top"><span>{String(from+i+1).padStart(2,"0")}</span><small>{lang === "kk" ? p.category_kk : p.category_ru}</small></div>
    <h3>{lang === "kk" ? p.name_kk : p.name_ru}</h3>
    <p>{lang === "kk" ? `${p.category_kk} саласындағы кәсіби міндеттерді, құралдарды және жұмыс ортасын зерттеуге арналған бағыт.` : detail?.description_ru}</p>
    {detail&&<div className="pdf-gop"><b>{detail.gop_code}</b><em>{lang === "kk" ? reportText.gop : detail.gop_name}</em></div>}
  </article>});
  return <div className="report-view">
    <div className="report-toolbar"><Button onClick={() => navigate(-1)}>{reportText.back}</Button><span>{reportText.printHint}</span><Button type="primary" onClick={() => window.print()}>{reportText.download}</Button></div>
    <article className="report-page canva-cover svg-template-page">
      <img src="/report-template/1.svg" alt="" /><div className="svg-cover-name">{fullName}</div>
    </article>
    <article className="report-page svg-template-page svg-paper-page"><img src="/report-template/2.svg" alt=""/><div className="svg-footer-name">{fullName}</div></article>
    <article className="report-page report-system-page profile-page"><h2>{reportText.profile}</h2><p className="report-lead">{reportText.profileLead}</p><div className="mini-cards answer-profile-cards">{profiles.map((p)=><div key={p.label}><b>{p.label}</b><em>{p.balance >= 4 ? reportText.expressive : p.balance >= 2 ? reportText.steady : reportText.flexible}</em></div>)}</div><div className="mini-bars answer-profile-bars">{profiles.map((p)=><div key={p.label}><b>{p.label}</b><i><em style={{width:`${Math.max(10,p.score/6*100)}%`}}/></i><span>{p.balance >= 4 ? reportText.expressive : p.balance >= 2 ? reportText.steady : reportText.flexible}</span></div>)}</div><ReportFooter page={2}/></article>
    <article className="report-page report-system-page interpretation-page counselor-page"><h2>{reportText.interpretation}</h2><p className="counselor-intro">{lang === "kk" ? interpretation.intro_kk : interpretation.intro_ru}</p><h3>{reportText.strengths}</h3><div className="counselor-grid">{(lang === "kk" ? interpretation.style_details_kk : interpretation.style_details_ru)?.map((item,index)=><section key={`${item.title}-${index}`}><span>{String(index+1).padStart(2,"0")}</span><div><h4>{item.title}</h4><p>{item.text}</p></div></section>)}</div><div className="counselor-closing"><section><h3>{reportText.next}</h3><p>{lang === "kk" ? interpretation.attention_kk : interpretation.attention_ru}</p></section><section><h3>{reportText.conclusion}</h3><p>{lang === "kk" ? interpretation.conclusion_kk : interpretation.conclusion_ru}</p></section></div><ReportFooter page={3}/></article>
    <article className="report-page report-system-page intelligence-page"><h2>{reportText.intelligence}</h2><p className="report-lead">{reportText.intelligenceLead}</p><div className="canva-intelligence-chart qualitative-intelligence">{intelligences.map((item)=><div key={item.key}><b>{lang === "kk" ? item.name_kk : item.name_ru}</b><i><em style={{width:`${item.score}%`}}/></i></div>)}</div><section className="intelligence-ai-analysis"><span>{reportText.intelligenceAnalysis}</span><p>{lang === "kk" ? interpretation.intelligence_analysis_kk : interpretation.intelligence_analysis_ru}</p></section><ReportFooter page={4}/></article>
    <article className="report-page report-system-page pdf-professions-page compact-professions-page"><h2>{reportText.professions}</h2><p className="report-lead">{reportText.professionsLead}</p><div className="pdf-profession-grid">{professionCards(0,10)}</div><ReportFooter page={5}/></article>
    <article className="report-page canva-cover svg-template-page"><img src="/report-template/8.svg" alt="" /><div className="svg-footer-name">{fullName}</div></article>
    <article className="report-page canva-cover svg-template-page"><img src="/report-template/10.svg" alt="" /><div className="svg-footer-name">{fullName}</div></article>
    <article className="report-page canva-cover svg-template-page"><img src="/report-template/12.svg" alt="" /></article>
  </div>;
}
