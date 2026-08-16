import hashlib
import hmac
import json
import math
import os
import uuid
from base64 import urlsafe_b64encode
from contextlib import asynccontextmanager
from pathlib import Path

import psycopg
from cryptography.fernet import Fernet
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
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
    yield


app = FastAPI(title="ADAM Future API", docs_url=None, redoc_url=None, lifespan=lifespan)


@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}


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
        content=result,
        headers={"Cache-Control": "no-store", "Pragma": "no-cache"},
    )


def require_admin(authorization: str | None = Header(default=None)):
    expected = f"Bearer {ADMIN_API_KEY}"
    if not ADMIN_API_KEY or not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/admin/stats", dependencies=[Depends(require_admin)])
def stats():
    with db() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT count(*), count(*) FILTER (WHERE created_at >= now() - interval '24 hours') FROM assessments")
        total, last_24_hours = cursor.fetchone()
    return {"completedTests": total, "last24Hours": last_24_hours}
