from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.schemas.common import Input

KINDS = ("view", "whatsapp", "call", "brochure", "favourite")


class TrackIn(Input):
    kind: Literal["view", "whatsapp", "call", "brochure", "favourite"]
    code: Annotated[str, Field(max_length=20)] = ""


class UnansweredIn(Input):
    text: Annotated[str, Field(min_length=1, max_length=300)]


class Totals(BaseModel):
    view: int = 0
    whatsapp: int = 0
    call: int = 0
    brochure: int = 0
    favourite: int = 0
    enquiry: int = 0
    viewing: int = 0


class DayRow(BaseModel):
    day: date
    views: int
    leads: int


class PropertyReport(Totals):
    code: str
    title: str
    status: str


class SourceReport(BaseModel):
    source: str
    enquiries: int
    viewings: int


class AgentReport(BaseModel):
    name: str
    enquiries: int
    answered: int
    average_hours: float | None
    closed: int
    viewings: int


class QuestionReport(BaseModel):
    id: int
    text: str
    count: int
    last_at: datetime


class Report(BaseModel):
    days: int
    totals: Totals
    before: Totals
    daily: list[DayRow]
    properties: list[PropertyReport]
    sources: list[SourceReport]
    agents: list[AgentReport]
    questions: list[QuestionReport]
