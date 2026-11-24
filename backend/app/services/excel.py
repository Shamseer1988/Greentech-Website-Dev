import io
from collections.abc import Iterable
from datetime import datetime, timedelta, timezone

from openpyxl import Workbook
from openpyxl.cell import WriteOnlyCell
from openpyxl.styles import Font

QATAR = timezone(timedelta(hours=3))


def workbook(title: str, headers: list[str], rows: Iterable[list]) -> bytes:
    book = Workbook(write_only=True)
    sheet = book.create_sheet(title)
    sheet.freeze_panes = "A2"
    for i, header in enumerate(headers):
        letter = chr(ord("A") + i)
        sheet.column_dimensions[letter].width = max(14, len(header) + 4)

    def cell(value: object, bold: bool = False) -> WriteOnlyCell:
        if isinstance(value, datetime):
            # Excel cannot store time zones: write Qatar time.
            value = value.astimezone(QATAR).replace(tzinfo=None)
        result = WriteOnlyCell(sheet, value)
        if isinstance(value, str):
            # Always text: a visitor's "=..." must never run as a formula.
            result.data_type = "s"
        if bold:
            result.font = Font(bold=True)
        return result

    sheet.append([cell(h, bold=True) for h in headers])
    for row in rows:
        sheet.append([cell(value) for value in row])
    out = io.BytesIO()
    book.save(out)
    return out.getvalue()
