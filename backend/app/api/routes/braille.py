"""
Braille Routes
POST /braille/convert — convert plain text → Unicode Braille
"""

from __future__ import annotations

import logging
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, validator

from app.api.deps import get_braille_service

logger = logging.getLogger("sparshvaani.routes.braille")
router = APIRouter()


class BrailleRequest(BaseModel):
    text: str
    language: Literal["en", "hi", "mr"] = "en"

    @validator("text")
    def text_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("text must not be empty")
        if len(v) > 10_000:
            raise ValueError("text too long (max 10,000 characters)")
        return v


class BrailleResponse(BaseModel):
    original: str
    braille: str
    language: str


@router.post("/convert", response_model=BrailleResponse, summary="Convert text to Braille")
async def convert_to_braille(body: BrailleRequest):
    """
    Convert plain text to Unicode Braille for the given language.
    Supports English (Grade 1), Hindi, and Marathi (Bharati Braille).
    """
    svc = get_braille_service()
    try:
        braille = svc.convert(body.text, body.language)
        return BrailleResponse(
            original=body.text,
            braille=braille,
            language=body.language,
        )
    except Exception as e:
        logger.error(f"Braille conversion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
