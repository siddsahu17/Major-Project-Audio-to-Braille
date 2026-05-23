"""
Braille Service — Multi-language
- English: Unicode Grade-1 Braille with full punctuation and numerals
- Hindi / Marathi: Bharati Braille (NIVH standard) for Devanagari script
- Tries liblouis (lou_translate) first; falls back to built-in Unicode maps
- All methods are pure-sync (no IO), safe to call from any context
"""

from __future__ import annotations

import logging
import subprocess
from typing import Literal

logger = logging.getLogger("sparshvaani.braille")

Language = Literal["en", "hi", "mr"]

# ---------------------------------------------------------------------------
# English Grade-1 Unicode Braille Map
# ---------------------------------------------------------------------------
_EN_BRAILLE: dict[str, str] = {
    # Lowercase letters
    "a": "⠁", "b": "⠃", "c": "⠉", "d": "⠙", "e": "⠑",
    "f": "⠋", "g": "⠛", "h": "⠓", "i": "⠊", "j": "⠚",
    "k": "⠅", "l": "⠇", "m": "⠍", "n": "⠝", "o": "⠕",
    "p": "⠏", "q": "⠟", "r": "⠗", "s": "⠎", "t": "⠞",
    "u": "⠥", "v": "⠧", "w": "⠺", "x": "⠭", "y": "⠽", "z": "⠵",
    # Digits (Braille Number Indicator ⠼ precedes digit sequences)
    "0": "⠚", "1": "⠁", "2": "⠃", "3": "⠉", "4": "⠙",
    "5": "⠑", "6": "⠋", "7": "⠛", "8": "⠓", "9": "⠊",
    # Common punctuation
    " ": " ", ".": "⠲", ",": "⠂", "?": "⠦", "!": "⠖",
    ";": "⠆", ":": "⠒", "-": "⠤", "'": "⠄", '"': "⠠⠶",
    "(": "⠐⠣", ")": "⠐⠜", "/": "⠸⠌", "\\": "⠸⠡",
    "@": "⠈⠁", "#": "⠼", "&": "⠯", "*": "⠔",
    "\n": "\n", "\t": "  ",
}

# Braille number indicator — placed before a digit sequence
_NUM_INDICATOR = "⠼"
# Braille capital indicator — placed before an uppercase letter
_CAP_INDICATOR = "⠠"


def _en_to_braille(text: str) -> str:
    """Convert English text to Grade-1 Unicode Braille."""
    output: list[str] = []
    in_number = False
    for ch in text:
        if ch.isdigit():
            if not in_number:
                output.append(_NUM_INDICATOR)
                in_number = True
            output.append(_EN_BRAILLE.get(ch, ch))
        else:
            in_number = False
            if ch.isupper():
                output.append(_CAP_INDICATOR)
                output.append(_EN_BRAILLE.get(ch.lower(), ch))
            else:
                output.append(_EN_BRAILLE.get(ch, ch))
    return "".join(output)


# ---------------------------------------------------------------------------
# Bharati Braille Map for Devanagari (Hindi / Marathi)
# Based on: NIVH (National Institute for Visually Handicapped) standard
# Reference: https://en.wikipedia.org/wiki/Bharati_Braille
# ---------------------------------------------------------------------------
_DEVANAGARI_BRAILLE: dict[str, str] = {
    # ── Independent Vowels ──────────────────────────────────────────────
    "अ": "⠁", "आ": "⠜", "इ": "⠊", "ई": "⠔", "उ": "⠥",
    "ऊ": "⠳", "ऋ": "⠐⠗", "ए": "⠑", "ऐ": "⠌", "ओ": "⠕", "औ": "⠪",
    "अं": "⠁⠰", "अः": "⠁⠐⠓",
    # ── Dependent Vowel Signs (Matras) ──────────────────────────────────
    "ा": "⠜", "ि": "⠊", "ी": "⠔", "ु": "⠥", "ू": "⠳",
    "ृ": "⠐⠗", "े": "⠑", "ै": "⠌", "ो": "⠕", "ौ": "⠪",
    # ── Diacritics ───────────────────────────────────────────────────────
    "ं": "⠰",   # Anusvara (nasalisation)
    "ँ": "⠔",   # Chandrabindu
    "ः": "⠐⠓",  # Visarga
    "़": "",    # Nukta (combined with base consonant — swallowed here)
    "्": "⠈",   # Virama / Halant (suppress inherent vowel)
    # ── Velar Consonants ─────────────────────────────────────────────────
    "क": "⠅", "ख": "⠨", "ग": "⠛", "घ": "⠣", "ङ": "⠬",
    # ── Palatal Consonants ───────────────────────────────────────────────
    "च": "⠉", "छ": "⠡", "ज": "⠚", "झ": "⠴", "ञ": "⠒",
    # ── Retroflex Consonants ─────────────────────────────────────────────
    "ट": "⠾", "ठ": "⠺", "ड": "⠫", "ढ": "⠿", "ण": "⠼",
    # ── Dental Consonants ────────────────────────────────────────────────
    "त": "⠞", "थ": "⠹", "द": "⠙", "ध": "⠮", "न": "⠝",
    # ── Labial Consonants ────────────────────────────────────────────────
    "प": "⠏", "फ": "⠖", "ब": "⠃", "भ": "⠘", "म": "⠍",
    # ── Approximants & Sibilants ─────────────────────────────────────────
    "य": "⠽", "र": "⠗", "ल": "⠇", "व": "⠧",
    "श": "⠩", "ष": "⠯", "स": "⠎", "ह": "⠓",
    # ── Nukta forms (Urdu-origin sounds used in Hindi) ────────────────────
    "क़": "⠟", "ख़": "⠈⠨", "ग़": "⠈⠛", "ज़": "⠵",
    "ड़": "⠈⠫", "ढ़": "⠈⠿", "फ़": "⠋",
    # ── Conjuncts ────────────────────────────────────────────────────────
    "क्ष": "⠅⠯", "त्र": "⠞⠗", "ज्ञ": "⠚⠒", "श्र": "⠩⠗",
    # ── Devanagari Digits ────────────────────────────────────────────────
    "०": "⠚", "१": "⠁", "२": "⠃", "३": "⠉", "४": "⠙",
    "५": "⠑", "६": "⠋", "७": "⠛", "८": "⠓", "९": "⠊",
    # ── Punctuation ──────────────────────────────────────────────────────
    "।": "⠲",   # Danda (full stop)
    "॥": "⠲⠲",  # Double Danda
    ",": "⠂", "?": "⠦", "!": "⠖", ";": "⠆", ":": "⠒",
    "-": "⠤", "(": "⠐⠣", ")": "⠐⠜",
    " ": " ", "\n": "\n",
}


def _devanagari_to_braille(text: str) -> str:
    """
    Convert Devanagari script to Bharati Braille (character-by-character).
    Multi-character sequences (conjuncts, combined vowels) are checked first.
    """
    output: list[str] = []
    i = 0
    while i < len(text):
        # Try 2-char sequences (conjuncts like क्ष, matras+anusvara)
        if i + 1 < len(text):
            two_char = text[i] + text[i + 1]
            if two_char in _DEVANAGARI_BRAILLE:
                output.append(_DEVANAGARI_BRAILLE[two_char])
                i += 2
                continue
        ch = text[i]
        output.append(_DEVANAGARI_BRAILLE.get(ch, ch))
        i += 1
    return "".join(output)


# ---------------------------------------------------------------------------
# liblouis integration (optional, best-quality)
# ---------------------------------------------------------------------------
_LIBLOUIS_TABLES = {
    "en": "en-us-g1.ctb",
    "hi": "hi-in-g1.utb",
    "mr": "mr-in-g1.utb",
}


def _try_liblouis(text: str, language: Language) -> str | None:
    table = _LIBLOUIS_TABLES.get(language)
    if not table:
        return None
    try:
        result = subprocess.run(
            ["lou_translate", table],
            input=text.encode("utf-8"),
            capture_output=True,
            timeout=10,
            check=True,
        )
        return result.stdout.decode("utf-8").strip()
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

class BrailleService:
    @staticmethod
    def convert(text: str, language: Language = "en") -> str:
        """
        Convert text to Braille. Tries liblouis first (highest quality),
        falls back to built-in Unicode maps.
        """
        if not text or not text.strip():
            return ""

        liblouis_result = _try_liblouis(text, language)
        if liblouis_result:
            logger.debug(f"Braille via liblouis ({language})")
            return liblouis_result

        logger.debug(f"Braille via built-in map ({language})")
        if language in ("hi", "mr"):
            return _devanagari_to_braille(text)
        return _en_to_braille(text)
