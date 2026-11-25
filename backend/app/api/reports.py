"""Anonymous counts from the website, and the report for the office."""

import re
from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import Date, case, cast, delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import require_admin
from app.models import (
    ChatQuestion,
    DailyCount,
    Enquiry,
    EnquiryStatus,
    Property,
    User,
    Viewing,
    ViewingStatus,
)
from app.schemas.common import CONTROL_CHARS, Id
from app.schemas.report import (
    AgentReport,
    DayRow,
    PropertyReport,
    QuestionReport,
    Report,
    SourceReport,
    Totals,
    TrackIn,
    UnansweredIn,
)
from app.services import qatar
from app.services.properties import is_public
from app.services.rate_limit import RateLimiter

router = APIRouter(tags=["public"])
admin = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])
Db = Annotated[Session, Depends(get_db)]
limiter = RateLimiter(200, 600)
MAX_QUESTIONS = 500


def allowed(request: Request) -> bool:
    return not limiter.check(request.client.host if request.client else "unknown")


@router.post("/track", status_code=status.HTTP_204_NO_CONTENT)
def track(data: TrackIn, request: Request, db: Db) -> None:
    if not allowed(request):
        return
    code = data.code.upper().replace("\x00", "")
    if code:
        if db.scalar(select(Property.id).where(Property.code == code, is_public())) is None:
            return
    elif data.kind not in ("whatsapp", "call"):
        return
    row = insert(DailyCount).values(day=qatar.today(), kind=data.kind, code=code, count=1)
    db.execute(
        row.on_conflict_do_update(
            index_elements=["day", "kind", "code"], set_={"count": DailyCount.count + 1}
        )
    )
    db.commit()


def without_private(text: str) -> str:
    """Hide emails and long numbers: visitors sometimes write their phone in the chat."""
    text = CONTROL_CHARS.sub(" ", text)
    text = re.sub(r"\S+@\S+", "[email]", text)
    text = re.sub(r"\+?\d[\d\s().\-]{5,}\d", "[number]", text)
    return " ".join(text.lower().split())[:200]


@router.post("/chat/unanswered", status_code=status.HTTP_204_NO_CONTENT)
def unanswered(data: UnansweredIn, request: Request, db: Db) -> None:
    text = without_private(data.text)
    if not text or not allowed(request):
        return
    now = datetime.now(UTC)
    row = insert(ChatQuestion).values(text=text, count=1, last_at=now)
    db.execute(
        row.on_conflict_do_update(
            index_elements=["text"], set_={"count": ChatQuestion.count + 1, "last_at": now}
        )
    )
    keep = select(ChatQuestion.id).order_by(ChatQuestion.last_at.desc()).limit(MAX_QUESTIONS)
    db.execute(delete(ChatQuestion).where(ChatQuestion.id.not_in(keep)))
    db.commit()


# --- admin ----------------------------------------------------------------


def local_day(column):
    return cast(func.timezone("Asia/Qatar", column), Date)


def totals(db: Session, first: date, last: date) -> Totals:
    counts = dict(
        db.execute(
            select(DailyCount.kind, func.sum(DailyCount.count))
            .where(DailyCount.day.between(first, last))
            .group_by(DailyCount.kind)
        )
        .tuples()
        .all()
    )
    for name, model in (("enquiry", Enquiry), ("viewing", Viewing)):
        counts[name] = (
            db.scalar(
                select(func.count(model.id)).where(local_day(model.created_at).between(first, last))
            )
            or 0
        )
    return Totals.model_validate(counts)


@admin.get("/reports")
def report(db: Db, days: Literal["7", "30", "90", "365"] = "30") -> Report:
    length = int(days)
    last = qatar.today()
    first = last - timedelta(days=length - 1)
    in_time = DailyCount.day.between(first, last)

    views = dict(
        db.execute(
            select(DailyCount.day, func.sum(DailyCount.count))
            .where(in_time, DailyCount.kind == "view")
            .group_by(DailyCount.day)
        )
        .tuples()
        .all()
    )
    leads: dict[date, int] = {}
    per_property: dict[str, dict[str, int]] = {}
    per_source: dict[str, dict[str, int]] = {}
    for name, model in (("enquiry", Enquiry), ("viewing", Viewing)):
        day = local_day(model.created_at)
        inside = day.between(first, last)
        for when, n in db.execute(select(day, func.count()).where(inside).group_by(day)):
            leads[when] = leads.get(when, 0) + n
        for code, n in db.execute(
            select(Property.code, func.count())
            .join(model, model.property_id == Property.id)
            .where(inside)
            .group_by(Property.code)
        ):
            per_property.setdefault(code, {})[name] = n
        for source, n in db.execute(
            select(model.source, func.count()).where(inside).group_by(model.source)
        ):
            per_source.setdefault(source or "direct", {}).setdefault(name, 0)
            per_source[source or "direct"][name] += n
    for code, kind, n in db.execute(
        select(DailyCount.code, DailyCount.kind, func.sum(DailyCount.count))
        .where(in_time, DailyCount.code != "")
        .group_by(DailyCount.code, DailyCount.kind)
    ):
        per_property.setdefault(code, {})[kind] = n

    known = {p.code: p for p in db.scalars(select(Property).where(Property.code.in_(per_property)))}
    top = [
        PropertyReport(
            code=code, title=known[code].title_en, status=known[code].status.value, **counts
        )
        for code, counts in per_property.items()
        if code in known
    ]
    top.sort(key=lambda p: (-p.view, -(p.enquiry + p.viewing), p.code))
    sources = [
        SourceReport(
            source=source, enquiries=counts.get("enquiry", 0), viewings=counts.get("viewing", 0)
        )
        for source, counts in per_source.items()
    ]
    sources.sort(key=lambda s: (-(s.enquiries + s.viewings), s.source))

    return Report(
        days=length,
        totals=totals(db, first, last),
        before=totals(db, first - timedelta(days=length), first - timedelta(days=1)),
        daily=[
            DayRow(day=day, views=views.get(day, 0), leads=leads.get(day, 0))
            for day in (first + timedelta(days=i) for i in range(length))
        ],
        properties=top[:15],
        sources=sources[:12],
        agents=agents(db, first, last),
        questions=[
            QuestionReport(id=q.id, text=q.text, count=q.count, last_at=q.last_at)
            for q in db.scalars(
                select(ChatQuestion)
                .order_by(ChatQuestion.count.desc(), ChatQuestion.last_at.desc())
                .limit(30)
            )
        ],
    )


def agents(db: Session, first: date, last: date) -> list[AgentReport]:
    answered = Enquiry.first_response_at.is_not(None)
    seconds = func.extract("epoch", Enquiry.first_response_at - Enquiry.created_at)
    rows = db.execute(
        select(
            User.id,
            User.full_name,
            func.count(Enquiry.id),
            func.count(case((answered, 1))),
            func.avg(case((answered, seconds))),
            func.count(case((Enquiry.status == EnquiryStatus.CLOSED, 1))),
        )
        .join(Enquiry, Enquiry.assigned_to_id == User.id)
        .where(local_day(Enquiry.created_at).between(first, last))
        .group_by(User.id, User.full_name)
    ).all()
    visits = dict(
        db.execute(
            select(Viewing.assigned_to_id, func.count())
            .where(Viewing.status == ViewingStatus.DONE, Viewing.day.between(first, last))
            .group_by(Viewing.assigned_to_id)
        )
        .tuples()
        .all()
    )
    found = [
        AgentReport(
            name=name,
            enquiries=total,
            answered=done,
            average_hours=None if average is None else round(float(average) / 3600, 1),
            closed=closed,
            viewings=visits.pop(user_id, 0),
        )
        for user_id, name, total, done, average, closed in rows
    ]
    for user_id, count in visits.items():
        user = db.get(User, user_id) if user_id else None
        if user:
            found.append(
                AgentReport(
                    name=user.full_name,
                    enquiries=0,
                    answered=0,
                    average_hours=None,
                    closed=0,
                    viewings=count,
                )
            )
    return sorted(found, key=lambda a: (-a.enquiries, a.name))


@admin.delete("/chat-questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: Id, db: Db) -> None:
    question = db.get(ChatQuestion, question_id)
    if question is None:
        raise HTTPException(404, "Question not found")
    db.delete(question)
    db.commit()
