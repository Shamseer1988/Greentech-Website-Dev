import re
import unicodedata

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import LookingFor

CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")


class EnquiryIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    property_code: str | None = Field(default=None, max_length=20)
    name: str = Field(min_length=2, max_length=120)
    company: str = Field(default="", max_length=160)
    phone: str = Field(max_length=40, examples=["+974 5555 5555"])
    email: EmailStr | None = Field(default=None, max_length=254)
    looking_for: LookingFor | None = None
    area: str = Field(default="", max_length=120, description="Preferred area")
    space_needed: str = Field(
        default="", max_length=120, description="Number of staff / area needed"
    )
    message: str = Field(default="", max_length=3000)
    reply_on_whatsapp: bool = False

    @field_validator("name", "company", "area", "space_needed", "message")
    @classmethod
    def no_control_characters(cls, value: str) -> str:
        if CONTROL_CHARS.search(value):
            raise ValueError("Contains characters that are not allowed")
        return value

    @field_validator("property_code", "email", "looking_for", mode="before")
    @classmethod
    def empty_is_none(cls, value: object) -> object:
        """HTML forms send an empty string for a field left blank."""
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("phone")
    @classmethod
    def normalise_phone(cls, value: str) -> str:
        """Return +<digits>. Accepts Arabic digits; 8 digits alone means a Qatar number."""
        digits = "".join(
            str(unicodedata.decimal(c)) if unicodedata.decimal(c, None) is not None else c
            for c in value
        )
        digits = re.sub(r"[\s().\-‎‏]", "", digits)
        if digits.startswith("00"):
            digits = "+" + digits[2:]
        if re.fullmatch(r"\d{8}", digits):
            digits = "+974" + digits
        if not re.fullmatch(r"\+[1-9]\d{6,14}", digits):
            raise ValueError("Enter a valid phone number, with country code if outside Qatar")
        if digits.startswith("+974") and len(digits) != 12:
            raise ValueError("A Qatar phone number has 8 digits")
        return digits


class EnquiryOut(BaseModel):
    reference: int
