import hashlib
import hmac
import json
import math
import os
import uuid
import urllib.error
import urllib.request
from base64 import urlsafe_b64encode
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import psycopg
from cryptography.fernet import Fernet
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator
from psycopg.types.json import Jsonb

DATA_DIR = Path(__file__).parent / "data"
QUESTIONS = json.loads((DATA_DIR / "questions.json").read_text())
PROFESSIONS = json.loads((DATA_DIR / "professions.json").read_text())
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://adam:adam@localhost:5432/adam")
ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "")
PRIVACY_SECRET = os.environ.get("PRIVACY_SECRET", "change-me")
DATA_ENCRYPTION_KEY = os.environ.get("DATA_ENCRYPTION_KEY", "change-me")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-5")
REPORTS_DIR = Path(os.environ.get("REPORTS_DIR", "/tmp/adam-reports"))
MAX_REPORT_BYTES = int(os.environ.get("MAX_REPORT_BYTES", str(15 * 1024 * 1024)))
ALGORITHM_VERSION = "2026.1"

PAIRS = [
    ("motivation_toward", "motivation_away"), ("internal_reference", "external_reference"),
    ("active", "reflective"), ("options", "procedures"), ("global", "detail"),
    ("associated", "dissociated"),
]
RADICALS = ["paranoid", "schizoid", "epileptoid", "hysteroid", "emotive", "anxious"]
MATRIX = {
    "motivation_toward": [3, 1, 0, 2, 0, 0], "motivation_away": [0, 0, 2, 0, 1, 3],
    "internal_reference": [3, 2, 1, 0, 0, 0], "external_reference": [0, 0, 0, 3, 2, 1],
    "active": [3, 0, 1, 2, 0, 0], "reflective": [0, 3, 0, 0, 1, 2],
    "options": [1, 3, 0, 2, 0, 0], "procedures": [0, 0, 3, 0, 1, 2],
    "global": [3, 2, 0, 1, 0, 0], "detail": [0, 0, 3, 0, 1, 2],
    "associated": [1, 0, 0, 2, 3, 0], "dissociated": [0, 3, 2, 0, 0, 1],
}
MAXIMUM = dict(zip(RADICALS, [14, 14, 12, 12, 9, 11]))


class Answer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    questionId: int = Field(ge=1, le=36)
    value: bool


class AssessmentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    language: str = "ru"
    answers: list[Answer]

    @field_validator("language")
    @classmethod
    def language_is_supported(cls, value: str) -> str:
        if value not in {"ru", "kk"}:
            raise ValueError("Unsupported language")
        return value

    @field_validator("answers")
    @classmethod
    def answers_are_complete(cls, value: list[Answer]) -> list[Answer]:
        ids = [item.questionId for item in value]
        if len(value) != 36 or set(ids) != set(range(1, 37)):
            raise ValueError("Exactly one answer for every question is required")
        return value


class InterpretationScale(BaseModel):
    model_config = ConfigDict(extra="forbid")
    first: str = Field(max_length=32)
    second: str = Field(max_length=32)
    firstScore: int = Field(ge=0, le=6)
    secondScore: int = Field(ge=0, le=6)


class InterpretationIntelligence(BaseModel):
    model_config = ConfigDict(extra="forbid")
    key: str = Field(max_length=32)
    name_ru: str = Field(max_length=80)
    name_kk: str = Field(max_length=80)
    score: Optional[int] = Field(default=None, ge=0, le=100)


class InterpretationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answers: list[Answer] = Field(min_length=36, max_length=36)
    scales: list[InterpretationScale] = Field(min_length=6, max_length=6)
    intelligences: list[InterpretationIntelligence] = Field(default_factory=list, max_length=9)

    @field_validator("answers")
    @classmethod
    def interpretation_answers_are_complete(cls, value: list[Answer]) -> list[Answer]:
        if {item.questionId for item in value} != set(range(1, 37)):
            raise ValueError("Exactly one answer for every question is required")
        return value


INTERPRETATION_SCHEMA = {
    "type": "object",
    "properties": {
        "summary_ru": {"type": "string"}, "summary_kk": {"type": "string"},
        "strengths_ru": {"type": "array", "items": {"type": "string"}},
        "strengths_kk": {"type": "array", "items": {"type": "string"}},
        "next_step_ru": {"type": "string"}, "next_step_kk": {"type": "string"},
        "intro_ru": {"type": "string"}, "intro_kk": {"type": "string"},
        "style_details_ru": {"type": "array", "minItems": 6, "maxItems": 6, "items": {"type": "object", "properties": {"title": {"type": "string"}, "text": {"type": "string"}}, "required": ["title", "text"], "additionalProperties": False}},
        "style_details_kk": {"type": "array", "minItems": 6, "maxItems": 6, "items": {"type": "object", "properties": {"title": {"type": "string"}, "text": {"type": "string"}}, "required": ["title", "text"], "additionalProperties": False}},
        "attention_ru": {"type": "string"}, "attention_kk": {"type": "string"},
        "conclusion_ru": {"type": "string"}, "conclusion_kk": {"type": "string"},
        "intelligence_analysis_ru": {"type": "string"}, "intelligence_analysis_kk": {"type": "string"},
    },
    "required": ["summary_ru", "summary_kk", "strengths_ru", "strengths_kk", "next_step_ru", "next_step_kk", "intro_ru", "intro_kk", "style_details_ru", "style_details_kk", "attention_ru", "attention_kk", "conclusion_ru", "conclusion_kk", "intelligence_analysis_ru", "intelligence_analysis_kk"],
    "additionalProperties": False,
}

def cosine(a: dict, b: dict) -> float:
    dot = sum(a[key] * b[key] for key in RADICALS)
    norm_a = math.sqrt(sum(a[key] ** 2 for key in RADICALS))
    norm_b = math.sqrt(sum(b[key] ** 2 for key in RADICALS))
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0


def calculate(answer_list: list[Answer]) -> dict:
    answers = {answer.questionId: answer.value for answer in answer_list}
    raw = {pole: 0 for pair in PAIRS for pole in pair}
    for question in QUESTIONS:
        pole = question["yes_pole"] if answers[question["id"]] else question["no_pole"]
        raw[pole] += 1
    scales = [{"first": a, "second": b, "firstScore": raw[a], "secondScore": raw[b],
               "confidence": abs(raw[a] - raw[b]) / 6} for a, b in PAIRS]
    poles = {key: value / 6 for key, value in raw.items()}
    normalized = {}
    for radical_index, radical in enumerate(RADICALS):
        weighted = sum(poles[pole] * MATRIX[pole][radical_index] for pole in poles)
        normalized[radical] = weighted / MAXIMUM[radical]
    total = sum(normalized.values())
    shares = {key: normalized[key] / total for key in RADICALS}
    ranked = []
    for profession in PROFESSIONS:
        confidence_sum = sum(scale["confidence"] for scale in scales)
        distance = sum(scale["confidence"] * abs(poles[scale["first"]] - profession["meta"][scale["first"]]) for scale in scales)
        meta_similarity = 1 - distance / confidence_sum if confidence_sum else .5
        radical_similarity = cosine(shares, profession["radicals"])
        contradictions = 0
        for scale in scales:
            if scale["confidence"] >= .67:
                preferred = scale["first"] if scale["firstScore"] >= scale["secondScore"] else scale["second"]
                contradictions += int(profession["meta"][preferred] <= .25)
        penalty = contradictions * 7
        score = max(0, min(100, 100 * (.75 * radical_similarity + .25 * meta_similarity) - penalty))
        matches = sorted((
            {"pole": scale["first"] if scale["firstScore"] >= scale["secondScore"] else scale["second"],
             "value": 1 - abs(poles[scale["first"]] - profession["meta"][scale["first"]])}
            for scale in scales
        ), key=lambda item: item["value"], reverse=True)[:3]
        ranked.append({"profession": profession, "metaSimilarity": meta_similarity,
                       "radicalSimilarity": radical_similarity, "penalty": penalty,
                       "score": score, "matches": [item["pole"] for item in matches]})
    ranked.sort(key=lambda item: item["score"], reverse=True)
    seen, counts, recommendations = set(), {}, []
    for item in ranked:
        profession = item["profession"]
        normalized_name = "".join(char for char in profession["name_ru"].lower() if char.isalnum())
        category = profession["category_ru"]
        if normalized_name in seen or counts.get(category, 0) >= 3:
            continue
        seen.add(normalized_name)
        counts[category] = counts.get(category, 0) + 1
        recommendations.append(item)
        if len(recommendations) == 15:
            break
    return {"scales": scales, "poles": poles, "radicalShares": shares, "recommendations": recommendations}


def public_result(result: dict) -> dict:
    """Expose only the fields required by the result screen.

    The full calculation is retained server-side for auditability, while internal
    weights and profession profiles never leave the API.
    """
    return {
        "scales": [
            {
                "first": scale["first"],
                "second": scale["second"],
                "firstScore": scale["firstScore"],
                "secondScore": scale["secondScore"],
            }
            for scale in result["scales"]
        ],
        "professions": [
            {
                "id": item["profession"]["id"],
                "name_ru": item["profession"]["name_ru"],
                "name_kk": item["profession"]["name_kk"],
                "category_ru": item["profession"]["category_ru"],
                "category_kk": item["profession"]["category_kk"],
            }
            for item in result["recommendations"][:10]
        ],
    }


def db():
    return psycopg.connect(DATABASE_URL)


def encryption():
    # The deployment secret may be any high-entropy string. SHA-256 produces the
    # exact key length Fernet requires without ever storing the source secret.
    key = urlsafe_b64encode(hashlib.sha256(DATA_ENCRYPTION_KEY.encode()).digest())
    return Fernet(key)


def encrypt_answers(answer_list: list[Answer]) -> bytes:
    serialized = json.dumps(
        [item.model_dump() for item in answer_list], separators=(",", ":")
    ).encode()
    return encryption().encrypt(serialized)


def validate_secrets():
    if ENVIRONMENT == "production":
        invalid = {
            "ADMIN_API_KEY": ADMIN_API_KEY,
            "PRIVACY_SECRET": PRIVACY_SECRET,
            "DATA_ENCRYPTION_KEY": DATA_ENCRYPTION_KEY,
        }
        weak = [name for name, value in invalid.items() if len(value) < 32 or value == "change-me"]
        if weak:
            raise RuntimeError(f"Missing or weak production secrets: {', '.join(weak)}")


@asynccontextmanager
async def lifespan(_: FastAPI):
    validate_secrets()
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    with db() as connection, connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS assessments (
              id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              language VARCHAR(2) NOT NULL, answers_encrypted BYTEA NOT NULL,
              result JSONB NOT NULL, algorithm_version VARCHAR(32) NOT NULL,
              visitor_hash CHAR(64) NOT NULL, delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)
        # One-time, non-destructive migration from the earlier demo schema.
        cursor.execute("ALTER TABLE assessments ADD COLUMN IF NOT EXISTS answers_encrypted BYTEA")
        cursor.execute("ALTER TABLE assessments ADD COLUMN IF NOT EXISTS algorithm_version VARCHAR(32)")
        cursor.execute("""SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'assessments' AND column_name = 'answers'
        )""")
        if cursor.fetchone()[0]:
            cursor.execute("SELECT id, answers FROM assessments WHERE answers_encrypted IS NULL")
            for assessment_id, old_answers in cursor.fetchall():
                encrypted = encryption().encrypt(json.dumps(old_answers, separators=(",", ":")).encode())
                cursor.execute(
                    "UPDATE assessments SET answers_encrypted = %s, algorithm_version = %s WHERE id = %s",
                    (encrypted, ALGORITHM_VERSION, assessment_id),
                )
        cursor.execute("UPDATE assessments SET algorithm_version = %s WHERE algorithm_version IS NULL", (ALGORITHM_VERSION,))
        cursor.execute("ALTER TABLE assessments ALTER COLUMN answers_encrypted SET NOT NULL")
        cursor.execute("ALTER TABLE assessments ALTER COLUMN algorithm_version SET NOT NULL")
        cursor.execute("ALTER TABLE assessments DROP COLUMN IF EXISTS answers")
        cursor.execute("CREATE INDEX IF NOT EXISTS assessments_created_at_idx ON assessments (created_at DESC)")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS stored_reports (
              id UUID PRIMARY KEY, subject_id VARCHAR(128) NOT NULL,
              file_name VARCHAR(255) NOT NULL, sha256 CHAR(64) NOT NULL,
              size_bytes BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS stored_reports_created_at_idx ON stored_reports (created_at DESC)")
    yield


app = FastAPI(title="ADAM Future API", docs_url=None, redoc_url=None, lifespan=lifespan)


@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}


@app.post("/interpretations")
def create_interpretation(payload: InterpretationInput):
    """Create a short bilingual explanation without sending personal data."""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="AI interpretation is not configured")
    answer_map = {item.questionId: item.value for item in payload.answers}
    response_evidence = [
        {
            "question_id": question["id"],
            "question_ru": question["text_ru"],
            "question_kk": question["text_kk"],
            "answer": "yes" if answer_map[question["id"]] else "no",
        }
        for question in QUESTIONS
    ]
    safe_result = {
        "responses": response_evidence,
        "calculated_scales": [item.model_dump() for item in payload.scales],
        "calculated_learning_preferences": [item.model_dump() for item in payload.intelligences],
    }
    request_body = {
        "model": OPENAI_MODEL,
        "store": False,
        "input": [
            {"role": "system", "content": (
                "Ты опытный профориентолог, работающий со старшеклассниками Казахстана. Проанализируй только "
                "36 предоставленных ответов и рассчитанные по ним шкалы. Пиши как бережный профессиональный "
                "комментарий к способам учиться, принимать решения, начинать задачу, работать с информацией и "
                "обратной связью. Не диагностируй личность, не оценивай ответы как хорошие или плохие, не предсказывай "
                "успех и не делай выводов о семье, здоровье, характере или личной жизни. Не называй и не рекомендуй "
                "профессии. Не выбирай один главный тип: если несколько шкал имеют одинаковую выраженность, опиши их "
                "равноправно. Каждый вывод должен иметь прямую опору в ответах или рассчитанной шкале; ничего не выдумывай. "
                "Подготовь две смыслово одинаковые версии: естественный современный русский и грамотный казахский. "
                "summary — связный анализ из 4 коротких предложений; strengths — ровно 3 коротких наблюдения; "
                "next_step — одно безопасное упражнение для самонаблюдения. intro — вводный абзац на 2–3 предложения. "
                "style_details — ровно шесть элементов, по одному для каждой рассчитанной пары шкал: краткий живой "
                "заголовок и объяснение на 2–3 предложения. Не нумеруй заголовки и не называй ни один способ главным: "
                "одинаковые баллы трактуй равноправно. attention — один конкретный развивающий абзац без запугивания. "
                "conclusion — профессиональный итог на 2–3 предложения только о способах работы, без профессий. "
                "intelligence_analysis — один связный абзац из 5–7 коротких предложений. Сопоставь все 36 ответов с "
                "calculated_learning_preferences: назови 2–3 наиболее подтверждённых способа учиться, поясни конкретно, "
                "какие паттерны ответов их поддерживают, укажи полезное сочетание между ними и предложи один способ "
                "проверить вывод на учебной задаче. Не пересказывай проценты, не перечисляй все типы и не называй "
                "показатели интеллектом, способностью или IQ: это только индикаторы учебных предпочтений из текущей анкеты. "
                "Обращайся на 'ты', спокойно, точно и уважительно."
            )},
            {"role": "user", "content": json.dumps(safe_result, ensure_ascii=False)},
        ],
        "text": {"format": {"type": "json_schema", "name": "career_interpretation", "strict": True, "schema": INTERPRETATION_SCHEMA}},
    }
    api_request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(request_body).encode(),
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(api_request, timeout=20) as response:
            data = json.loads(response.read())
        output_text = next(
            content["text"]
            for item in data.get("output", []) if item.get("type") == "message"
            for content in item.get("content", []) if content.get("type") == "output_text"
        )
        parsed = json.loads(output_text)
        parsed["source"] = "openai"
        return JSONResponse(content=parsed, headers={"Cache-Control": "no-store"})
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, StopIteration, KeyError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=502, detail="AI interpretation is temporarily unavailable") from error


@app.post("/assessments", status_code=status.HTTP_201_CREATED)
def create_assessment(payload: AssessmentInput, request: Request):
    result = calculate(payload.answers)
    forwarded = request.headers.get("x-forwarded-for", "")
    source = forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")
    visitor_hash = hmac.new(PRIVACY_SECRET.encode(), source.encode(), hashlib.sha256).hexdigest()
    assessment_id = uuid.uuid4()
    with db() as connection, connection.cursor() as cursor:
        cursor.execute(
            """INSERT INTO assessments
               (id, language, answers_encrypted, result, algorithm_version, visitor_hash)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (assessment_id, payload.language, encrypt_answers(payload.answers), Jsonb(result), ALGORITHM_VERSION, visitor_hash),
        )
    # Result is returned only in this POST response; there is intentionally no public GET endpoint.
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=public_result(result),
        headers={"Cache-Control": "no-store", "Pragma": "no-cache"},
    )


def require_admin(authorization: str | None = Header(default=None)):
    expected = f"Bearer {ADMIN_API_KEY}"
    if not ADMIN_API_KEY or not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.post("/admin/reports/{subject_id}", dependencies=[Depends(require_admin)], status_code=status.HTTP_201_CREATED)
async def store_report(subject_id: str, request: Request):
    """Persist an already generated PDF in the private reports volume."""
    if not subject_id or len(subject_id) > 128 or not all(char.isalnum() or char in "-_" for char in subject_id):
        raise HTTPException(status_code=400, detail="Invalid subject id")
    if request.headers.get("content-type", "").split(";", 1)[0].strip().lower() != "application/pdf":
        raise HTTPException(status_code=415, detail="Expected application/pdf")
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_REPORT_BYTES:
                raise HTTPException(status_code=413, detail="Report is too large")
        except ValueError as error:
            raise HTTPException(status_code=400, detail="Invalid Content-Length") from error
    payload = await request.body()
    if len(payload) > MAX_REPORT_BYTES:
        raise HTTPException(status_code=413, detail="Report is too large")
    if not payload.startswith(b"%PDF-") or b"%%EOF" not in payload[-2048:]:
        raise HTTPException(status_code=400, detail="Invalid PDF file")
    report_id = uuid.uuid4()
    file_name = f"{report_id}.pdf"
    digest = hashlib.sha256(payload).hexdigest()
    temporary = REPORTS_DIR / f".{file_name}.tmp"
    destination = REPORTS_DIR / file_name
    temporary.write_bytes(payload)
    os.replace(temporary, destination)
    with db() as connection, connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO stored_reports (id, subject_id, file_name, sha256, size_bytes) VALUES (%s, %s, %s, %s, %s)",
            (report_id, subject_id, file_name, digest, len(payload)),
        )
    return {"id": str(report_id), "subjectId": subject_id, "sha256": digest, "sizeBytes": len(payload)}


@app.get("/admin/reports", dependencies=[Depends(require_admin)])
def list_reports():
    with db() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT id, subject_id, sha256, size_bytes, created_at FROM stored_reports ORDER BY created_at DESC LIMIT 500")
        rows = cursor.fetchall()
    return [{"id": str(row[0]), "subjectId": row[1], "sha256": row[2], "sizeBytes": row[3], "createdAt": row[4].isoformat()} for row in rows]


@app.get("/admin/reports/{report_id}", dependencies=[Depends(require_admin)])
def download_report(report_id: uuid.UUID):
    with db() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT file_name, subject_id FROM stored_reports WHERE id = %s", (report_id,))
        row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    path = REPORTS_DIR / row[0]
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Report file is missing")
    return FileResponse(path, media_type="application/pdf", filename=f"adam-report-{row[1]}.pdf")


@app.get("/admin/stats", dependencies=[Depends(require_admin)])
def stats():
    with db() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT count(*), count(*) FILTER (WHERE created_at >= now() - interval '24 hours') FROM assessments")
        total, last_24_hours = cursor.fetchone()
    return {"completedTests": total, "last24Hours": last_24_hours}
