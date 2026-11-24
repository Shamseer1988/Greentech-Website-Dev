import re
from typing import Annotated

from fastapi import Path
from pydantic import AfterValidator, BaseModel, ConfigDict

MAX_INT = 2_147_483_647
CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")


def no_control_characters(value: str) -> str:
    # Browsers send Windows line ends from text boxes.
    value = value.replace("\r\n", "\n")
    if CONTROL_CHARS.search(value):
        raise ValueError("Contains characters that are not allowed")
    return value


CleanStr = Annotated[str, AfterValidator(no_control_characters)]
Id = Annotated[int, Path(ge=1, le=MAX_INT)]


class Input(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
