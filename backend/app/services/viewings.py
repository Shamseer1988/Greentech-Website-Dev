"""Which times a visitor can book."""

from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SiteSetting, Viewing, ViewingStatus
from app.schemas.viewing import DaySlots, ViewingSettings
from app.services import qatar

KEY = "viewing"
ACTIVE = (ViewingStatus.REQUESTED, ViewingStatus.CONFIRMED)


def get_settings(db: Session) -> ViewingSettings:
    saved = db.get(SiteSetting, KEY)
    return ViewingSettings.model_validate(saved.value) if saved else ViewingSettings()


def times_of_day(rules: ViewingSettings) -> list[str]:
    def minutes(text: str) -> int:
        return int(text[:2]) * 60 + int(text[3:])

    first, last = minutes(rules.start), minutes(rules.end) - rules.minutes
    return [f"{m // 60:02}:{m % 60:02}" for m in range(first, last + 1, rules.minutes)]


def free_slots(db: Session, property_id: int) -> list[DaySlots]:
    rules = get_settings(db)
    if not rules.enabled:
        return []
    now = qatar.now()
    earliest = now + timedelta(hours=rules.lead_hours)
    last_day = now.date() + timedelta(days=rules.days_ahead)
    taken: set[tuple[date, str]] = set(
        db.execute(
            select(Viewing.day, Viewing.time).where(
                Viewing.property_id == property_id,
                Viewing.status.in_(ACTIVE),
                Viewing.day >= now.date(),
            )
        ).tuples()
    )
    result = []
    day = now.date()
    while day <= last_day:
        if day.weekday() in rules.days and day not in rules.closed:
            times = [
                time
                for time in times_of_day(rules)
                if datetime.combine(day, datetime.strptime(time, "%H:%M").time(), qatar.QATAR)
                >= earliest
                and (day, time) not in taken
            ]
            if times:
                result.append(DaySlots(day=day, times=times))
        day += timedelta(days=1)
    return result
