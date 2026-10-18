import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const SKILL_DIR = "/Users/sunggat/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations";
const workspaceDir = "/Users/sunggat/Documents/ADAM";
const TMP_DIR = path.join(workspaceDir, ".build_road_monitoring");
const FINAL_PPTX = path.join(workspaceDir, "output", "PhD_семинар_интеллектуальный_контроль_инфраструктуры.pptx");
const RUNTIME_PYTHON = "/Users/sunggat/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const { makeNativeBulletParagraphs, applyPresentationChartFont, finalizePresentation } = await import(
  pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href,
);

await fs.mkdir(TMP_DIR, { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });

const W = 1280;
const H = 720;
const FONT = "Arial";
const C = {
  navy: "#071926",
  navy2: "#0D2A3C",
  cyan: "#18C7D8",
  cyan2: "#8DE9F0",
  amber: "#F5A623",
  red: "#E85D5D",
  green: "#4CC38A",
  white: "#F7FAFC",
  paper: "#F4F7F8",
  ink: "#102A3A",
  muted: "#557080",
  line: "#C8D7DE",
  pale: "#E7F5F7",
};

const pres = Presentation.create({ slideSize: { width: W, height: H } });

function shape(slide, x, y, w, h, fill = "none", radius = "rect", line = "none") {
  return slide.shapes.add({
    geometry: radius,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { fill: line, width: line === "none" ? 0 : 1 },
  });
}

function text(slide, txt, x, y, w, h, opts = {}) {
  const s = shape(slide, x, y, w, h, opts.fill ?? "none", opts.geometry ?? "rect", opts.line ?? "none");
  s.text = txt;
  s.text.style = {
    typeface: FONT,
    fontSize: opts.size ?? 24,
    bold: opts.bold ?? false,
    color: opts.color ?? C.ink,
    alignment: opts.align ?? "left",
    verticalAlignment: opts.valign ?? "top",
    autoFit: "none",
    wrap: "square",
    ...opts.style,
  };
  s.text.insets = opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 };
  return s;
}

function bulletList(slide, items, x, y, w, h, opts = {}) {
  const s = shape(slide, x, y, w, h, "none", "rect", "none");
  s.text = makeNativeBulletParagraphs(items, {
    marginLeftPoints: opts.marginLeftPoints ?? 20,
    hangingPoints: opts.hangingPoints ?? 10,
    spaceAfterPoints: opts.spaceAfterPoints ?? 8,
  });
  s.text.style = {
    typeface: FONT,
    fontSize: opts.size ?? 23,
    color: opts.color ?? C.ink,
    autoFit: "none",
    wrap: "square",
  };
  s.text.insets = { left: 0, right: 0, top: 0, bottom: 0 };
  return s;
}

function title(slide, txt, dark = false) {
  text(slide, txt, 58, 37, 1100, 62, { size: 34, bold: true, color: dark ? C.white : C.ink });
  shape(slide, 58, 104, 74, 5, C.cyan);
}

function footer(slide, n, dark = false, source = "") {
  if (source) text(slide, source, 58, 683, 1040, 20, { size: 11, color: dark ? "#BDD0DB" : C.muted });
  text(slide, String(n).padStart(2, "0"), 1190, 679, 38, 22, { size: 12, bold: true, color: dark ? C.cyan2 : C.muted, align: "right" });
}

function addNotes(slide, notes) {
  slide.speakerNotes.textFrame.setText(notes);
}

async function addImage(slide, filePath, x, y, w, h, fit = "cover", alt = "") {
  const bytes = new Uint8Array(await fs.readFile(filePath));
  slide.images.add({ blob: bytes, contentType: "image/png", alt, fit, position: { left: x, top: y, width: w, height: h } });
}

function label(slide, txt, x, y, w, color = C.cyan, dark = false) {
  const s = shape(slide, x, y, w, 30, color, "roundRect", "none");
  s.text = txt;
  s.text.style = { typeface: FONT, fontSize: 13, bold: true, color: dark ? C.navy : C.white, alignment: "center", verticalAlignment: "middle", autoFit: "none" };
  s.text.insets = { left: 8, right: 8, top: 2, bottom: 2 };
  return s;
}

// 1. Cover
{
  const s = pres.slides.add();
  s.background.fill = C.navy;
  await addImage(s, path.join(workspaceDir, "presentation_assets", "astana_cv_cover.png"), 0, 0, W, H, "cover", "Сгенерированная иллюстрация видеомониторинга дорог Астаны");
  shape(s, 0, 0, 710, H, { color: C.navy, transparency: 8 });
  label(s, "PhD-СЕМИНАР", 64, 62, 165, C.cyan, true);
  text(s, "Интеллектуальная система цифрового контроля объектов дорожной инфраструктуры", 64, 142, 610, 220, { size: 43, bold: true, color: C.white });
  text(s, "Видеоаналитика автомобильных регистраторов для оценки состояния и формирования отчётов", 66, 392, 535, 86, { size: 22, color: "#D6E5EC" });
  shape(s, 66, 512, 220, 4, C.amber);
  text(s, "Астана  •  2026", 66, 538, 280, 35, { size: 17, bold: true, color: C.white });
  text(s, "Иллюстрация концепции, создана с помощью генеративной модели", 66, 672, 580, 18, { size: 10, color: "#A9BEC9" });
  addNotes(s, "Обложка: сгенерированная иллюстрация для презентации. Не является фотографической фиксацией конкретного участка Астаны.");
}

// 2. Problem and opportunity
{
  const s = pres.slides.add();
  s.background.fill = C.paper;
  title(s, "Проблема и доступный городской ресурс");
  text(s, "Город уже производит видеоданные", 60, 145, 500, 42, { size: 28, bold: true, color: C.ink });
  bulletList(s, [
    "Регистраторы городских служб и жителей ежедневно фиксируют дороги и объекты вдоль маршрутов",
    "Записи содержат географические и временные свидетельства о состоянии инфраструктуры",
    "Объём данных превышает возможности ручного просмотра и систематизации",
  ], 64, 205, 500, 250, { size: 21, spaceAfterPoints: 11 });

  shape(s, 620, 144, 590, 390, C.navy, "roundRect", "none");
  text(s, "Поток видео превращается в управленческий цикл", 660, 177, 500, 50, { size: 27, bold: true, color: C.white });
  const nodes = [
    ["Видео + GPS", "регистраторы"],
    ["Анализ", "объекты и дефекты"],
    ["Карта состояния", "история"],
    ["Отчёт и задача", "приоритет ремонта"],
  ];
  nodes.forEach((d, i) => {
    const x = 655 + i * 137;
    shape(s, x, 270, 112, 122, i === 3 ? C.amber : C.navy2, "roundRect", i === 3 ? C.amber : "#335466");
    text(s, String(i + 1).padStart(2, "0"), x + 12, 282, 40, 22, { size: 13, bold: true, color: C.cyan2 });
    text(s, d[0], x + 12, 308, 90, 55, { size: 17, bold: true, color: C.white });
    text(s, d[1], x + 12, 370, 90, 18, { size: 10, color: i === 3 ? C.navy : "#B9CED8" });
    if (i < 3) shape(s, x + 118, 322, 16, 26, C.cyan, "chevron", "none");
  });
  text(s, "Ключевой разрыв", 65, 497, 180, 28, { size: 16, bold: true, color: C.amber });
  text(s, "Сегодня данные существуют отдельно от реестров объектов, регламентов обследования и процессов ремонта.", 65, 532, 535, 80, { size: 25, bold: true, color: C.ink });
  footer(s, 2);
  addNotes(s, "Проблематика и актуальность сформулированы на основе текста пользователя. Числовые оценки объёма видеоданных не приводятся, поскольку исходные значения не предоставлены.");
}

// 3. Goal and hypothesis
{
  const s = pres.slides.add();
  s.background.fill = C.white;
  title(s, "Цель и основная гипотеза");
  shape(s, 60, 150, 555, 395, C.pale, "roundRect", "none");
  label(s, "ЦЕЛЬ", 88, 177, 92, C.cyan, true);
  text(s, "Создать систему, которая оценивает функциональное состояние дорожной инфраструктуры по видео автомобильных регистраторов и автоматически формирует отчёты.", 88, 236, 480, 220, { size: 29, bold: true, color: C.ink });
  shape(s, 665, 150, 555, 395, C.navy, "roundRect", "none");
  label(s, "ГИПОТЕЗА", 693, 177, 120, C.amber, true);
  text(s, "Если известны координаты объектов мониторинга, то повторные наблюдения из движущихся автомобилей позволяют определить их состояние с помощью моделей машинного обучения.", 693, 236, 480, 220, { size: 28, bold: true, color: C.white });
  text(s, "Единица результата", 88, 584, 200, 26, { size: 16, bold: true, color: C.muted });
  text(s, "объект + координаты + время + класс состояния + достоверность + фотофрагмент", 300, 580, 870, 40, { size: 21, bold: true, color: C.ink });
  footer(s, 3);
  addNotes(s, "Цель и гипотеза приведены в редакции, сохраняющей смысл исходного текста пользователя.");
}

// 4. Scientific framing for the dissertation
{
  const s = pres.slides.add();
  s.background.fill = C.paper;
  title(s, "Научная постановка исследования");
  const framing = [
    ["Объект исследования", "Процесс цифрового мониторинга функционального состояния объектов дорожной инфраструктуры по мобильным видеоданным."],
    ["Предмет исследования", "Методы обнаружения, географического сопоставления и агрегирования наблюдений для оценки состояния конкретного объекта."],
  ];
  framing.forEach((d, i) => {
    const y = 150 + i * 170;
    text(s, d[0], 64, y, 260, 34, { size: 20, bold: true, color: i === 0 ? C.cyan : C.amber });
    text(s, d[1], 64, y + 45, 510, 100, { size: 24, bold: true, color: C.ink });
  });
  shape(s, 630, 145, 590, 405, C.navy, "roundRect", "none");
  text(s, "Исследовательские вопросы", 666, 176, 500, 40, { size: 28, bold: true, color: C.white });
  const rqs = [
    ["RQ1", "Как обеспечить устойчивое распознавание при снеге, дожде, темноте и различной высоте камеры?"],
    ["RQ2", "Как сопоставить обнаружение в кадре с объектом городского реестра при погрешности GPS?"],
    ["RQ3", "Как объединить повторные проезды в воспроизводимую оценку функционального состояния?"],
  ];
  rqs.forEach((d, i) => {
    const y = 246 + i * 92;
    text(s, d[0], 666, y, 58, 28, { size: 16, bold: true, color: i === 2 ? C.amber : C.cyan2 });
    text(s, d[1], 742, y, 420, 66, { size: 18, color: C.white });
  });
  text(s, "Проверяемый результат", 64, 584, 230, 28, { size: 17, bold: true, color: C.muted });
  text(s, "метрики на уровне кадра, события и физического объекта", 307, 579, 820, 42, { size: 22, bold: true, color: C.ink });
  footer(s, 4);
  addNotes(s, "Научная постановка сформулирована для диссертационного семинара. Термины и границы объекта и предмета исследования следует синхронизировать с утвержденной темой и паспортом специальности.");
}

// 5. Scientific evidence
{
  const s = pres.slides.add();
  s.background.fill = C.paper;
  title(s, "Научное подтверждение на данных Астаны");
  text(s, "4260", 64, 145, 220, 72, { size: 54, bold: true, color: C.cyan });
  text(s, "размеченных кадров", 64, 213, 250, 32, { size: 19, bold: true, color: C.ink });
  text(s, "Ночная съёмка с видеорегистраторов: 1494 кадров при ясной погоде, 1524 при снегопаде, 1242 при дожде.", 64, 270, 330, 135, { size: 21, color: C.ink });
  text(s, "Классы: опоры и светильники\nРазделение: 75% / 10% / 15%", 64, 425, 330, 70, { size: 18, bold: true, color: C.muted });

  const chart = s.charts.add("bar", {
    position: { left: 430, top: 150, width: 760, height: 405 },
    categories: ["Precision", "Recall", "F1", "mAP"],
    series: [
      { name: "YOLOv8m", values: [0.823, 0.756, 0.788, 0.791], fill: "#93A9B5" },
      { name: "YOLO-CSE", values: [0.824, 0.794, 0.808, 0.798], fill: C.cyan },
    ],
    hasLegend: true,
    legend: { position: "bottom" },
    barOptions: { direction: "column", grouping: "clustered", gapWidth: 80 },
    yAxis: { minimumScale: 0.65, maximumScale: 0.85, majorUnit: 0.05, numberFormatCode: "0.00" },
    dataLabels: { showValue: true, position: "outEnd", numberFormatCode: "0.000" },
    chartFill: "#F4F7F8",
    chartLine: { fill: "none", width: 0 },
    plotAreaFill: "#F4F7F8",
    plotAreaLine: { fill: "none", width: 0 },
  });
  applyPresentationChartFont(chart, { fontFamily: FONT });
  text(s, "YOLO‑CSE улучшает полноту обнаружения и F1 относительно сильнейшей базовой модели YOLOv8m.", 430, 565, 740, 58, { size: 20, bold: true, color: C.ink });
  footer(s, 5, false, "Источник: Aiymbay et al., Symmetry 2025, 17(8), 1294");
  addNotes(s, "Источник: Aiymbay, S.; Zhumadillayeva, A.; Matson, E.T.; Matkarimov, B.; Mukhametzhanova, B. Applying Computer Vision for the Detection and Analysis of the Condition and Operation of Street Lighting. Symmetry 2025, 17, 1294. https://doi.org/10.3390/sym17081294\nЗначения таблицы: YOLOv8m precision 0.823, recall 0.756, F1 0.788, mAP 0.791; YOLO-CSE precision 0.824, recall 0.794, F1 0.808, mAP 0.798.");
}

// 6. Industrial analogue: SoftLogic
{
  const s = pres.slides.add();
  s.background.fill = C.navy;
  title(s, "Промышленный аналог подтверждает востребованность", true);
  label(s, "ПО ДАННЫМ ПРОИЗВОДИТЕЛЯ", 64, 143, 240, C.amber, true);
  const stats = [
    ["500 км", "возможный объём ежедневного автоматического мониторинга"],
    ["> 50", "видов детектируемых административных нарушений"],
    ["5 лет", "заявленной промышленной эксплуатации"],
  ];
  stats.forEach((d, i) => {
    const x = 64 + i * 250;
    text(s, d[0], x, 205, 220, 55, { size: 38, bold: true, color: i === 1 ? C.amber : C.cyan2 });
    text(s, d[1], x, 269, 220, 78, { size: 16, color: "#C4D5DD" });
  });
  text(s, "Заявленная схема работы", 64, 397, 320, 35, { size: 25, bold: true, color: C.white });
  const pipe = [
    ["Анализ", "GPU обрабатывает изображение"],
    ["Оценка", "нейросеть выявляет дефекты"],
    ["Геометка", "GPS/ГЛОНАСС, дата"],
    ["Передача", "LTE и облачная платформа"],
  ];
  pipe.forEach((d, i) => {
    const x = 64 + i * 187;
    shape(s, x, 455, 162, 125, i === 3 ? C.amber : C.navy2, "roundRect", i === 3 ? C.amber : "#315166");
    text(s, d[0], x + 14, 474, 134, 30, { size: 20, bold: true, color: i === 3 ? C.navy : C.white });
    text(s, d[1], x + 14, 517, 134, 48, { size: 13, color: i === 3 ? C.navy : "#BCD0DA" });
    if (i < 3) shape(s, x + 168, 500, 13, 24, C.cyan, "chevron", "none");
  });
  shape(s, 845, 145, 365, 435, "#102E42", "roundRect", "#315166");
  text(s, "Заявленные классы", 875, 177, 300, 32, { size: 24, bold: true, color: C.white });
  bulletList(s, [
    "дефекты покрытия и разметки",
    "летняя и зимняя уборка дорог",
    "неисправное уличное освещение",
    "остановки, знаки и благоустройство",
    "мусор и нарушения парковки",
  ], 875, 237, 295, 240, { size: 17, color: C.white, spaceAfterPoints: 8 });
  text(s, "Практический аналог показывает реализуемость мобильного формата, но не заменяет экспериментальную проверку диссертационных гипотез.", 875, 500, 295, 60, { size: 15, bold: true, color: C.amber });
  footer(s, 6, true, "Источник: SoftLogic.ai, «Автономный комплекс ИИ»");
  addNotes(s, "Источник и заявления производителя: https://softlogic.ai/solution/kontrol_odx\nСайт сообщает о возможном мониторинге до 500 км в день, более чем 50 видах нарушений и пяти годах промышленной эксплуатации. Эти показатели не верифицировались независимо и представлены как заявления компании. На сайте описана последовательность: анализ изображения, оценка состояния, добавление GPS/ГЛОНАСС-геометки и даты, передача по LTE в облачную платформу.");
}

// 7. Research gap
{
  const s = pres.slides.add();
  s.background.fill = C.white;
  title(s, "Исследовательский разрыв");
  text(s, "Промышленный продукт", 64, 145, 360, 38, { size: 27, bold: true, color: C.ink });
  text(s, "Диссертационное исследование", 670, 145, 490, 38, { size: 27, bold: true, color: C.ink });
  shape(s, 605, 140, 2, 430, C.line);
  const rows = [
    ["Специализированный сертифицированный мобильный комплекс", "Использование разнородных регистраторов уже существующего городского транспорта"],
    ["Широкий набор нарушений и административная фиксация", "Функциональное состояние конкретного объекта и история повторных наблюдений"],
    ["На странице отсутствуют открытые метрики качества по классам и погодным условиям", "Воспроизводимая оценка precision, recall, F1, mAP и ошибки географического сопоставления"],
    ["Работа и нормативная база описаны для городов России", "Адаптация к реестрам, климату и эксплуатационным условиям Астаны"],
  ];
  rows.forEach((d, i) => {
    const y = 215 + i * 100;
    text(s, String(i + 1).padStart(2, "0"), 64, y, 42, 28, { size: 16, bold: true, color: i < 2 ? C.cyan : C.amber });
    text(s, d[0], 120, y, 440, 68, { size: 18, color: C.muted });
    text(s, d[1], 670, y, 500, 68, { size: 18, bold: true, color: C.ink });
    if (i < 3) {
      shape(s, 120, y + 79, 440, 1, C.line);
      shape(s, 670, y + 79, 500, 1, C.line);
    }
  });
  shape(s, 64, 620, 1105, 2, C.cyan);
  text(s, "Научная задача заключается в формализации, измерении и проверке перехода от видеокадра к состоянию физического объекта.", 64, 640, 1100, 38, { size: 21, bold: true, color: C.ink });
  footer(s, 7, false, "Сопоставление выполнено по публичному описанию SoftLogic.ai");
  addNotes(s, "Сравнение опирается только на публичную страницу https://softlogic.ai/solution/kontrol_odx. Отсутствие описания на странице не означает отсутствие функции в продукте. Слайд фиксирует различие между публично описанным коммерческим решением и проверяемой научной постановкой диссертации.");
}

// 8. Reel reference
{
  const s = pres.slides.add();
  s.background.fill = C.white;
  title(s, "Видеореференс расширяет класс задач");
  shape(s, 58, 150, 620, 430, C.navy, "roundRect", "none");
  await addImage(s, path.join(workspaceDir, "presentation_assets", "instagram_reel_frame.png"), 72, 164, 592, 402, "contain", "Кадр демонстрации сегментации дефектов дороги из Instagram");
  label(s, "ДЕМОНСТРАЦИЯ", 725, 155, 150, C.amber, true);
  text(s, "Сегментация дорожного покрытия", 725, 207, 450, 78, { size: 31, bold: true, color: C.ink });
  bulletList(s, [
    "выбоины и локальные разрушения",
    "трещины дорожного покрытия",
    "ливневые решётки и элементы водоотведения",
  ], 725, 307, 450, 160, { size: 22, spaceAfterPoints: 10 });
  shape(s, 725, 500, 440, 2, C.line);
  text(s, "Ролик подтверждает практический формат выдачи модели. Автор сообщает о стабильной версии сегментации, но не публикует метрики в подписи.", 725, 520, 450, 100, { size: 18, color: C.muted });
  footer(s, 8, false, "Референс: Instagram @santiagsanchezr, ролик от 1 июля 2026");
  addNotes(s, "Источник видеореференса: https://www.instagram.com/santiagsanchezr/reel/DaRQP1vBLLu/\nПодпись автора: новый вариант модели сегментации выбоин, трещин и решёток; метрики обещаны позднее. Кадр используется как иллюстрация интерфейса распознавания, а не как доказательство точности.");
}

// 6. Monitoring scope
{
  const s = pres.slides.add();
  s.background.fill = C.paper;
  title(s, "Объекты цифрового контроля");
  const items = [
    ["01", "Освещение", "опора, светильник, включение, повреждение"],
    ["02", "Покрытие", "выбоина, трещина, просадка, люк и решётка"],
    ["03", "Разметка", "наличие, видимость, износ, закрытие снегом"],
    ["04", "Зимнее состояние", "снег, лёд, колея, очистка проезжей части"],
    ["05", "Остановки и знаки", "наличие, целостность, доступность обзора"],
    ["06", "Дорожная обстановка", "авария, затор, препятствие, перекрытие"],
  ];
  items.forEach((d, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 64 + col * 588;
    const y = 145 + row * 155;
    text(s, d[0], x, y + 7, 58, 48, { size: 27, bold: true, color: i < 2 ? C.cyan : C.amber });
    text(s, d[1], x + 72, y, 470, 40, { size: 27, bold: true, color: C.ink });
    text(s, d[2], x + 72, y + 49, 470, 62, { size: 18, color: C.muted });
    if (row < 2) shape(s, x + 72, y + 126, 470, 1, C.line);
  });
  text(s, "Модульная архитектура позволяет вводить классы поэтапно, начиная с освещения и дорожного покрытия.", 64, 628, 1090, 42, { size: 21, bold: true, color: C.ink });
  footer(s, 9);
  addNotes(s, "Перечень классов сформирован из описания пользователя и видеореференса. Финальный состав классов следует уточнить с владельцами городских реестров и регламентов обследования.");
}

// 10. Scientific novelty and research tasks
{
  const s = pres.slides.add();
  s.background.fill = C.paper;
  title(s, "Предполагаемая научная новизна");
  const novelty = [
    ["01", "Объектный уровень", "Оценка относится к конкретному элементу реестра, а не только к отдельному кадру."],
    ["02", "Неопределённая геопривязка", "Сопоставление учитывает GPS, курс, калибровку камеры и вероятностный допуск."],
    ["03", "Повторные наблюдения", "Несколько проездов объединяются с учётом качества кадра, времени и согласованности."],
    ["04", "Локальная адаптация", "Модели и критерии состояния проверяются для климата, дорог и реестров Астаны."],
  ];
  novelty.forEach((d, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 64 + col * 590, y = 150 + row * 160;
    text(s, d[0], x, y, 50, 32, { size: 18, bold: true, color: i < 2 ? C.cyan : C.amber });
    text(s, d[1], x + 68, y, 470, 36, { size: 24, bold: true, color: C.ink });
    text(s, d[2], x + 68, y + 49, 470, 70, { size: 18, color: C.muted });
  });
  shape(s, 64, 486, 1100, 1, C.line);
  text(s, "Задачи исследования", 64, 520, 280, 36, { size: 25, bold: true, color: C.ink });
  const tasks = ["сформировать набор данных", "разработать модели", "решить сопоставление", "построить индекс", "провести эксперимент"];
  tasks.forEach((v, i) => {
    const x = 64 + i * 220;
    shape(s, x, 578, 192, 62, i === 4 ? C.amber : C.white, "roundRect", i === 4 ? C.amber : C.line);
    text(s, String(i + 1), x + 12, 594, 24, 24, { size: 14, bold: true, color: C.cyan });
    text(s, v, x + 39, 587, 140, 40, { size: 15, bold: true, color: C.ink });
  });
  footer(s, 10);
  addNotes(s, "Формулировки научной новизны являются рабочими. Перед диссертационным семинаром их следует согласовать с научным руководителем и привести в соответствие с фактически полученными результатами.");
}

// 11. Architecture
{
  const s = pres.slides.add();
  s.background.fill = C.navy;
  title(s, "Архитектура системы", true);
  const blocks = [
    ["1", "Сбор", "MP4, GPS, время, маршрут"],
    ["2", "Подготовка", "кадры, качество, деперсонализация"],
    ["3", "Аналитика", "детекция, сегментация, состояние"],
    ["4", "Привязка", "сопоставление с реестром объектов"],
    ["5", "Агрегация", "несколько проездов и оценка доверия"],
    ["6", "Выдача", "карта, отчёт, API, задача службе"],
  ];
  blocks.forEach((d, i) => {
    const x = 54 + i * 202;
    shape(s, x, 205, 174, 250, i === 5 ? C.amber : C.navy2, "roundRect", i === 5 ? C.amber : "#315166");
    text(s, d[0], x + 18, 224, 45, 34, { size: 18, bold: true, color: i === 5 ? C.navy : C.cyan2 });
    text(s, d[1], x + 18, 280, 138, 54, { size: 24, bold: true, color: C.white });
    text(s, d[2], x + 18, 354, 138, 76, { size: 16, color: i === 5 ? C.navy : "#BED0DA" });
    if (i < 5) shape(s, x + 181, 313, 14, 25, C.cyan, "chevron", "none");
  });
  shape(s, 54, 505, 1185, 2, "#315166");
  text(s, "Сквозные сервисы", 54, 535, 210, 28, { size: 18, bold: true, color: C.cyan2 });
  text(s, "хранилище видеоданных     реестр моделей и версий     контроль качества     журнал решений", 270, 532, 920, 45, { size: 20, color: C.white });
  footer(s, 11, true);
  addNotes(s, "Предлагаемая архитектура. Компоненты и границы интеграции необходимо уточнить после обследования существующих городских ИС и реестров.");
}

// 8. Geospatial fusion
{
  const s = pres.slides.add();
  s.background.fill = C.white;
  title(s, "Связь обнаружения с реальным объектом");
  text(s, "Ключ к проверке гипотезы", 64, 151, 420, 42, { size: 27, bold: true, color: C.ink });
  text(s, "Система должна объединить координаты реестра, траекторию автомобиля и положение объекта в кадре.", 64, 208, 490, 100, { size: 24, color: C.muted });
  const steps = [
    ["A", "Кандидат", "модель находит объект в кадре"],
    ["B", "Проекция", "GPS, курс и калибровка камеры задают область поиска"],
    ["C", "Сопоставление", "ближайший объект реестра получает наблюдение"],
    ["D", "Подтверждение", "несколько проездов повышают достоверность"],
  ];
  steps.forEach((d, i) => {
    const x = 610;
    const y = 142 + i * 115;
    shape(s, x, y, 56, 56, i === 3 ? C.amber : C.cyan, "ellipse", "none");
    text(s, d[0], x, y + 9, 56, 32, { size: 20, bold: true, color: C.navy, align: "center" });
    text(s, d[1], x + 84, y, 220, 34, { size: 24, bold: true, color: C.ink });
    text(s, d[2], x + 84, y + 38, 470, 46, { size: 18, color: C.muted });
    if (i < 3) shape(s, x + 27, y + 64, 2, 42, C.line);
  });
  shape(s, 64, 359, 460, 176, C.pale, "roundRect", "none");
  text(s, "Результат на уровне объекта", 90, 383, 390, 34, { size: 22, bold: true, color: C.ink });
  text(s, "ID SL-004182\n51.1286° N, 71.4304° E\nсостояние: вероятная неисправность\nдоверие: 0,86  •  3 наблюдения", 90, 432, 390, 94, { size: 19, color: C.ink });
  footer(s, 12);
  addNotes(s, "Пример ID, координат и значения доверия иллюстративный. Он показывает требуемую структуру результата, а не реальный объект.");
}

// 9. Functional state index
{
  const s = pres.slides.add();
  s.background.fill = C.paper;
  title(s, "Оценка функционального состояния");
  label(s, "ПРЕДЛАГАЕМАЯ МЕТОДИКА", 64, 143, 225, C.cyan, true);
  text(s, "S = Σ (вес × оценка × доверие)", 64, 205, 760, 70, { size: 38, bold: true, color: C.ink });
  text(s, "Индекс рассчитывается для объекта и временного окна. Вес признака задаёт профильная служба, а доверие учитывает качество кадра и согласованность нескольких проездов.", 64, 296, 760, 105, { size: 22, color: C.muted });
  const states = [
    [C.green, "Норма", "S ≥ 0,80", "плановый контроль"],
    [C.amber, "Требует проверки", "0,55 ≤ S < 0,80", "назначить инспекцию"],
    [C.red, "Критично", "S < 0,55", "приоритетная задача"],
  ];
  states.forEach((d, i) => {
    const y = 160 + i * 145;
    shape(s, 870, y, 16, 102, d[0], "roundRect", "none");
    text(s, d[1], 910, y, 270, 35, { size: 24, bold: true, color: C.ink });
    text(s, d[2], 910, y + 40, 270, 30, { size: 18, bold: true, color: d[0] });
    text(s, d[3], 910, y + 74, 270, 28, { size: 16, color: C.muted });
  });
  shape(s, 64, 468, 745, 118, C.white, "roundRect", C.line);
  text(s, "Пример для освещения", 89, 492, 240, 30, { size: 20, bold: true, color: C.ink });
  text(s, "наличие опоры 0,25   работа светильника 0,45   повреждение 0,20   видимость 0,10", 89, 536, 680, 34, { size: 18, color: C.muted });
  footer(s, 13);
  addNotes(s, "Формула, веса и пороги являются предложением для пилота. Их необходимо калибровать по регламентам городских служб и экспертной разметке.");
}

// 10. User products
{
  const s = pres.slides.add();
  s.background.fill = C.navy;
  title(s, "Пользовательские продукты", true);
  // dashboard mockup
  shape(s, 55, 145, 735, 455, "#102E42", "roundRect", "#315166");
  text(s, "Карта состояния инфраструктуры", 82, 170, 500, 40, { size: 25, bold: true, color: C.white });
  // map-like canvas
  shape(s, 82, 230, 465, 330, "#E7EFF2", "roundRect", "none");
  [[120,275,360,8],[160,330,325,7],[105,410,395,8],[250,250,7,270],[360,245,8,290]].forEach((r,i)=>shape(s,r[0],r[1],r[2],r[3],i<3?"#B9CAD2":"#C6D5DC","roundRect","none"));
  [[170,320,C.green],[275,387,C.amber],[390,305,C.red],[448,475,C.amber],[235,475,C.green]].forEach(p=>shape(s,p[0],p[1],18,18,p[2],"ellipse","none"));
  text(s, "Слои", 575, 235, 150, 24, { size: 16, bold: true, color: C.cyan2 });
  ["освещение", "покрытие", "разметка", "зимнее состояние"].forEach((v,i)=>{
    shape(s, 578, 278+i*52, 14, 14, [C.cyan,C.amber,C.green,C.white][i], "ellipse", "none");
    text(s, v, 605, 272+i*52, 145, 28, { size: 16, color: C.white });
  });
  text(s, "87 объектов требуют проверки", 575, 510, 170, 46, { size: 18, bold: true, color: C.amber });

  text(s, "Выходные формы", 845, 152, 320, 40, { size: 28, bold: true, color: C.white });
  const outs = [
    ["Еженедельный отчёт", "динамика, список отклонений, фотофрагменты"],
    ["Карточка объекта", "история наблюдений и подтверждений"],
    ["API и выгрузка", "GeoJSON, CSV, интеграция с диспетчерской"],
    ["Задача службе", "приоритет, координаты, срок проверки"],
  ];
  outs.forEach((d,i)=>{
    const y=220+i*98;
    text(s, d[0], 845, y, 345, 30, { size: 21, bold: true, color: i===3?C.amber:C.white });
    text(s, d[1], 845, y+35, 345, 46, { size: 16, color: "#BCD0DA" });
    if(i<3) shape(s,845,y+86,340,1,"#315166");
  });
  footer(s, 14, true);
  addNotes(s, "Макет интерфейса иллюстративный. Форматы отчётности и интеграций следует согласовать с заказчиком пилота.");
}

// 11. Validation design
{
  const s = pres.slides.add();
  s.background.fill = C.white;
  title(s, "Экспериментальная проверка");
  const phases = [
    ["1", "Эталон", "эксперты размечают выборку маршрутов и объектов"],
    ["2", "Слепой прогон", "модель обрабатывает видео без ручной коррекции"],
    ["3", "Сопоставление", "оценка на уровне кадра, события и объекта"],
    ["4", "Полевой аудит", "служба проверяет критические случаи на месте"],
  ];
  phases.forEach((d,i)=>{
    const x=62+i*298;
    shape(s,x,150,265,210,i===3?C.pale:"#F4F7F8","roundRect",i===3?C.cyan:C.line);
    text(s,d[0],x+20,170,40,28,{size:16,bold:true,color:C.cyan});
    text(s,d[1],x+20,220,220,34,{size:24,bold:true,color:C.ink});
    text(s,d[2],x+20,275,220,65,{size:17,color:C.muted});
  });
  text(s, "Метрики принятия решения", 64, 410, 400, 40, { size: 27, bold: true, color: C.ink });
  const metrics = [
    ["Качество модели", "precision, recall, F1, mAP"],
    ["Геопривязка", "ошибка координат и доля верных соответствий"],
    ["Эксплуатация", "ложные тревоги и время формирования отчёта"],
    ["Полезность", "доля подтверждённых дефектов и сокращение ручной проверки"],
  ];
  metrics.forEach((d,i)=>{
    const col=i%2,row=Math.floor(i/2),x=64+col*590,y=475+row*76;
    text(s,d[0],x,y,180,27,{size:18,bold:true,color:i<2?C.cyan:C.amber});
    text(s,d[1],x+190,y,360,46,{size:17,color:C.ink});
  });
  footer(s, 15);
  addNotes(s, "Целевые пороги метрик следует установить после базового замера на локальных данных. В презентации намеренно не указаны вымышленные нормативы.");
}

// 12. Pilot roadmap
{
  const s = pres.slides.add();
  s.background.fill = C.paper;
  title(s, "Пилот в Астане на 12 недель");
  const roadmap = [
    ["1–2", "Контур данных", "маршруты, согласия, формат видео и GPS"],
    ["3–5", "Набор и разметка", "освещение и покрытие на выбранных коридорах"],
    ["6–9", "Модели и геопривязка", "обучение, сопоставление с реестром, тест"],
    ["10–12", "Проверка в эксплуатации", "карта, отчёт, аудит службой, решение о масштабировании"],
  ];
  roadmap.forEach((d,i)=>{
    const x=64+i*292;
    shape(s,x,165,250,72,i===3?C.amber:C.navy,"roundRect","none");
    text(s,"НЕДЕЛИ "+d[0],x+18,184,210,30,{size:18,bold:true,color:i===3?C.navy:C.white});
    shape(s,x+124,240,2,55,C.line);
    shape(s,x,305,250,235,C.white,"roundRect",C.line);
    text(s,d[1],x+20,330,210,60,{size:23,bold:true,color:C.ink});
    text(s,d[2],x+20,412,210,95,{size:17,color:C.muted});
  });
  text(s, "Контрольная точка", 64, 585, 190, 28, { size: 17, bold: true, color: C.cyan });
  text(s, "После пилота заказчик получает измеренные метрики, перечень интеграций и расчёт ресурсов для городского масштаба.", 267, 579, 920, 50, { size: 21, bold: true, color: C.ink });
  footer(s, 16);
  addNotes(s, "Срок 12 недель является проектным предложением. Он зависит от доступности видеоданных, качества GPS, готовности реестра объектов и скорости экспертной разметки.");
}

// 13. Risks
{
  const s = pres.slides.add();
  s.background.fill = C.white;
  title(s, "Риски и меры управления");
  const risks = [
    ["Персональные данные", "лица и номера могут попадать в кадр", "обезличивание до хранения, разграничение доступа, сроки удаления"],
    ["Погода и сезонность", "снег, блики и темнота меняют качество", "раздельные тестовые наборы, контроль дрейфа, переобучение"],
    ["Ошибочная тревога", "модель может неверно назначить критичность", "порог доверия, повторные проезды, подтверждение оператором"],
    ["Слабая геопривязка", "GPS и курс не всегда точны", "калибровка камеры, карта объектов, допуск и вероятностное сопоставление"],
    ["Организационный разрыв", "отчёт не превращается в действие", "владелец процесса, SLA проверки, интеграция с диспетчерской"],
  ];
  risks.forEach((d,i)=>{
    const y=143+i*99;
    text(s,String(i+1).padStart(2,"0"),64,y+5,50,34,{size:18,bold:true,color:i<2?C.red:C.amber});
    text(s,d[0],130,y,250,34,{size:22,bold:true,color:C.ink});
    text(s,d[1],395,y,320,58,{size:17,color:C.muted});
    text(s,d[2],750,y,450,58,{size:17,bold:true,color:C.ink});
    if(i<4) shape(s,130,y+76,1070,1,C.line);
  });
  footer(s, 17);
  addNotes(s, "Правовые основания обработки видеоданных и требования к хранению необходимо проверить с юридической и информационной безопасностью заказчика до начала пилота.");
}

// 14. Conclusion and sources
{
  const s = pres.slides.add();
  s.background.fill = C.navy;
  title(s, "Ожидаемый результат", true);
  text(s, "Пилот должен доказать связь между наблюдением из автомобиля и проверяемым состоянием конкретного городского объекта.", 64, 143, 760, 120, { size: 35, bold: true, color: C.white });
  const res = [
    ["Данные", "локальный размеченный набор для Астаны"],
    ["Модели", "освещение и дорожное покрытие"],
    ["Система", "геопривязка, индекс состояния, карта и отчёт"],
    ["Решение", "измеренные показатели для масштабирования"],
  ];
  res.forEach((d,i)=>{
    const x=64+(i%2)*420,y=315+Math.floor(i/2)*125;
    text(s,d[0],x,y,160,30,{size:18,bold:true,color:i%2===0?C.cyan2:C.amber});
    text(s,d[1],x,y+39,365,55,{size:21,bold:true,color:C.white});
  });
  shape(s, 900, 145, 315, 430, "#102E42", "roundRect", "#315166");
  text(s, "Основные источники", 928, 174, 255, 35, { size: 22, bold: true, color: C.white });
  text(s, "Aiymbay et al.\nSymmetry, 2025\nDOI 10.3390/sym17081294", 928, 232, 255, 75, { size: 16, color: C.cyan2 });
  shape(s, 928, 322, 250, 1, "#315166");
  text(s, "SoftLogic.ai\nАвтономный комплекс ИИ\nпубличное описание продукта", 928, 340, 255, 72, { size: 16, color: C.white });
  shape(s, 928, 427, 250, 1, "#315166");
  text(s, "Santiago Sanchez\nInstagram Reel\n1 июля 2026", 928, 445, 255, 70, { size: 16, color: C.amber });
  text(s, "Следующий шаг: согласовать владельца пилота, два приоритетных класса объектов и тестовые маршруты.", 64, 610, 1080, 50, { size: 23, bold: true, color: C.white });
  footer(s, 18, true);
  addNotes(s, "Основная статья: https://www.mdpi.com/2073-8994/17/8/1294 и https://doi.org/10.3390/sym17081294\nПромышленный аналог: https://softlogic.ai/solution/kontrol_odx\nВидеореференс: https://www.instagram.com/santiagsanchezr/reel/DaRQP1vBLLu/\nВсе проектные сроки, формулы индекса и примеры объектов в презентации обозначены как предложения или иллюстрации.");
}

const stagingDir = path.join(workspaceDir, ".codex-finalizer-road-monitoring");
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, "candidate.pptx");
await (await PresentationFile.exportPptx(pres)).save(candidatePath);

const requirements = {
  explicitTotalSlideCount: 18,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [5],
  materializeLiteralChartWorkbooks: true,
};
const result = await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
  ],
  requiredNativeTableOwnerSlides: [],
  fontPolicy: { basis: "design", families: [FONT] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, `${path.basename(FINAL_PPTX)}.validation.json`),
});
console.log(JSON.stringify({ final: FINAL_PPTX, result }, null, 2));
