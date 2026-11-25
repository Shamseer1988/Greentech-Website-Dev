from datetime import date, datetime, timedelta, timezone

# Qatar has no summer time.
QATAR = timezone(timedelta(hours=3))


def now() -> datetime:
    return datetime.now(QATAR)


def today() -> date:
    return now().date()
