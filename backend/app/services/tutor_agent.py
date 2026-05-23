"""
TutorAgent — Agentic PDF tutor using OpenAI function calling.
Replaces TutorService for the /voice/tutor endpoint.
7 tools: get_page_content, scroll_page, explain_concept,
         summarize_page, describe_image, find_topic, quiz_student
"""

from __future__ import annotations

import base64
import io
import json
import logging
from collections import defaultdict
from typing import Optional
from pathlib import Path

from openai import AsyncOpenAI

logger = logging.getLogger("sparshvaani.tutor_agent")

_tutor_sessions: dict[str, list[dict]] = defaultdict(list)
_MAX_HISTORY = 20

_SYSTEM_PROMPT = """You are Sparsh Vaani, an expert AI tutor for visually impaired students reading PDF documents.
The student interacts via voice. Your responses are spoken aloud — never use markdown, bullet points, or formatting.
Keep answers concise: 2-4 sentences unless a detailed explanation is requested.

You have tools to navigate the document and answer questions. Use them proactively:
- Call get_page_content to retrieve text from any page before answering questions about it.
- Call scroll_page when the student wants to move forward or backward.
- Call explain_concept for difficult terms or topics.
- Call summarize_page for quick page overviews.
- Call describe_image when a page seems to have diagrams or images.
- Call find_topic to locate where a subject is discussed in the document.
- Call quiz_student when the student wants to be tested.

LANGUAGE RULE — THIS IS ABSOLUTE AND OVERRIDES EVERYTHING:

Detect the language the student is speaking
If the student speaks Hindi: respond entirely in Hindi
using Devanagari script. Every word must be in Hindi.
If the student speaks Marathi: respond entirely in Marathi
using Devanagari script. Every word must be in Marathi.
If the student speaks English: respond in English.
Do NOT mix languages unless the student mixes first.
Do NOT transliterate — always use proper Devanagari script
for Hindi and Marathi responses.
If the PDF content is in English and student asks in Hindi
or Marathi, translate and explain in their language naturally.

Current context: Page {page_num} of the document. Language: {language}.
"""

_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_page_content",
            "description": "Retrieve the text content of a specific page number from the PDF.",
            "parameters": {
                "type": "object",
                "properties": {
                    "page_num": {"type": "integer", "description": "1-indexed page number to retrieve"}
                },
                "required": ["page_num"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "scroll_page",
            "description": "Scroll the PDF viewer forward or backward by one page.",
            "parameters": {
                "type": "object",
                "properties": {
                    "direction": {
                        "type": "string",
                        "enum": ["forward", "backward"],
                        "description": "Direction to scroll",
                    }
                },
                "required": ["direction"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "explain_concept",
            "description": "Provide a clear explanation of a concept or term from the document.",
            "parameters": {
                "type": "object",
                "properties": {
                    "concept": {"type": "string", "description": "The concept or term to explain"},
                    "level": {
                        "type": "string",
                        "enum": ["simple", "intermediate", "detailed"],
                        "description": "Explanation depth",
                    },
                },
                "required": ["concept"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "summarize_page",
            "description": "Generate a spoken summary of a specific page.",
            "parameters": {
                "type": "object",
                "properties": {
                    "page_num": {"type": "integer", "description": "Page number to summarize (1-indexed)"}
                },
                "required": ["page_num"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "describe_image",
            "description": "Use vision AI to describe a diagram, chart, or image on a page.",
            "parameters": {
                "type": "object",
                "properties": {
                    "page_num": {"type": "integer", "description": "Page number containing the image (1-indexed)"}
                },
                "required": ["page_num"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_topic",
            "description": "Search the document to find which pages discuss a given topic.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Topic or keyword to search for"}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "quiz_student",
            "description": "Generate quiz questions about a topic to test the student's understanding.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "Topic to quiz the student on"},
                    "num_questions": {
                        "type": "integer",
                        "description": "Number of questions (1-5)",
                        "minimum": 1,
                        "maximum": 5,
                    },
                },
                "required": ["topic"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "semantic_search",
            "description": "Semantically search the current PDF for pages most relevant to a question or topic. More accurate than keyword search for conceptual questions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Natural-language question or topic to search for"}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_and_load_chapter",
            "description": "Find and load an NCERT chapter or topic by search query and optional class number. Call this when the student asks to read, learn, or open a specific chapter or topic.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The topic, chapter title, or keyword to search for (e.g. 'Chemical Reactions' or 'reproduction').",
                    },
                    "class_number": {
                        "type": "integer",
                        "description": "Optional class number (3 to 10) to narrow the search.",
                    }
                },
                "required": ["query"],
            },
        },
    },
]


class TutorAgent:
    def __init__(self, openai_api_key: str, pdf_service=None, rag_service=None) -> None:
        self.client = AsyncOpenAI(api_key=openai_api_key)
        self.pdf_service = pdf_service
        self.rag_service = rag_service

    async def chat(
        self,
        user_text: str,
        session_id: str,
        page_num: int,
        page_text: str,
        language: str = "en",
        total_pages: int = 1,
        class_number: Optional[int] = None,
    ) -> dict:
        lang = language if language in ("en", "hi", "mr") else "en"
        system = _SYSTEM_PROMPT.format(page_num=page_num, language=lang)

        history = _tutor_sessions[session_id]
        history.append({"role": "user", "content": user_text})
        _trim(history)

        messages = [{"role": "system", "content": system}] + history

        # Tool execution context (mutable across the agentic loop)
        ctx = {
            "page_num": page_num,
            "page_text": page_text,
            "total_pages": total_pages,
            "should_scroll": False,
            "scroll_to_page": None,
            "class_number": class_number,
            "load_pdf": False,
            "pdf_session_id": None,
            "pdf_file_name": None,
            "pdf_class_number": None,
            "pdf_total_pages": None,
        }

        final_response = ""
        max_iters = 5

        for _ in range(max_iters):
            try:
                completion = await self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    tools=_TOOLS,
                    tool_choice="auto",
                    max_tokens=500,
                    temperature=0.5,
                )
            except Exception as e:
                logger.error(f"GPT-4o error (session={session_id}): {e}")
                break

            msg = completion.choices[0].message

            if not msg.tool_calls:
                final_response = (msg.content or "").strip()
                break

            # Execute tool calls
            messages.append(msg)
            for tc in msg.tool_calls:
                result = await self._dispatch(tc.function.name, tc.function.arguments, ctx, session_id)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })

        if not final_response:
            fallbacks = {
                "en": "I'm sorry, I couldn't process that. Please try again.",
                "hi": "मुझे खेद है, मैं इसे प्रोसेस नहीं कर सका। कृपया पुनः प्रयास करें।",
                "mr": "मला माफ करा, मी हे प्रक्रिया करू शकलो नाही. कृपया पुन्हा प्रयत्न करा.",
            }
            final_response = fallbacks.get(lang, fallbacks["en"])

        history.append({"role": "assistant", "content": final_response})
        _trim(history)

        return {
            "response": final_response,
            "should_scroll": ctx["should_scroll"],
            "scroll_to_page": ctx["scroll_to_page"],
            "load_pdf": ctx["load_pdf"],
            "pdf_session_id": ctx["pdf_session_id"],
            "pdf_file_name": ctx["pdf_file_name"],
            "pdf_class_number": ctx["pdf_class_number"],
            "pdf_total_pages": ctx["pdf_total_pages"],
        }

    async def _dispatch(self, name: str, args_json: str, ctx: dict, session_id: str) -> str:
        try:
            args = json.loads(args_json)
        except json.JSONDecodeError:
            args = {}

        if name == "semantic_search":
            return self._tool_semantic_search(args.get("query", ""), session_id)

        if name == "find_and_load_chapter":
            return await self._tool_find_and_load_chapter(
                args.get("query", ""),
                args.get("class_number") or ctx.get("class_number"),
                ctx,
            )

        if name == "get_page_content":
            return self._tool_get_page_content(args.get("page_num", ctx["page_num"]), ctx, session_id)

        if name == "scroll_page":
            return self._tool_scroll_page(args.get("direction", "forward"), ctx)

        if name == "explain_concept":
            return f"Explain concept: {args.get('concept', '')} at level {args.get('level', 'simple')}. Use the page text: {ctx['page_text'][:500]}"

        if name == "summarize_page":
            pn = args.get("page_num", ctx["page_num"])
            text = self._get_page_text(pn, ctx, session_id)
            return f"Summarize this page {pn} content in 3 sentences: {text[:800]}"

        if name == "describe_image":
            return await self._tool_describe_image(args.get("page_num", ctx["page_num"]), session_id)

        if name == "find_topic":
            return self._tool_find_topic(args.get("query", ""), ctx, session_id)

        if name == "quiz_student":
            topic = args.get("topic", "the current page")
            n = args.get("num_questions", 3)
            return f"Generate {n} spoken quiz questions about '{topic}' based on: {ctx['page_text'][:600]}"

        return "Tool not found."

    def _get_page_text(self, page_num: int, ctx: dict, session_id: str) -> str:
        if page_num == ctx["page_num"]:
            return ctx["page_text"]
        if self.pdf_service:
            try:
                return self.pdf_service.get_page_text(session_id, page_num)
            except KeyError:
                pass
        return f"(Page {page_num} text unavailable)"

    def _tool_get_page_content(self, page_num: int, ctx: dict, session_id: str) -> str:
        text = self._get_page_text(page_num, ctx, session_id)
        return f"Page {page_num} content: {text[:1000]}" if text else f"Page {page_num} has no extractable text."

    def _tool_scroll_page(self, direction: str, ctx: dict) -> str:
        ctx["should_scroll"] = True
        if direction == "forward":
            target = min(ctx["page_num"] + 1, ctx["total_pages"])
        else:
            target = max(ctx["page_num"] - 1, 1)
        ctx["scroll_to_page"] = target
        return f"Scrolled {direction} to page {target}."

    async def _tool_describe_image(self, page_num: int, session_id: str) -> str:
        if not self.pdf_service:
            return "Image description unavailable — PDF service not connected."
        try:
            import fitz
            raw = self.pdf_service.get_raw_bytes(session_id)
            doc = fitz.open(stream=raw, filetype="pdf")
            page = doc[page_num - 1]
            mat = fitz.Matrix(2, 2)
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            doc.close()
            b64 = base64.b64encode(img_bytes).decode()
            resp = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe all diagrams, charts, and images on this page for a visually impaired student. Be concise and clear."},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                    ],
                }],
                max_tokens=200,
            )
            return resp.choices[0].message.content or "No images found on this page."
        except Exception as e:
            logger.warning(f"describe_image failed for page {page_num}: {e}")
            return "Could not render image for this page."

    def _tool_find_topic(self, query: str, ctx: dict, session_id: str) -> str:
        if not self.pdf_service or not query:
            return "Topic search requires a PDF to be loaded."
        query_lower = query.lower()
        hits = []
        for page_num in range(1, ctx["total_pages"] + 1):
            try:
                text = self._get_page_text(page_num, ctx, session_id)
                if query_lower in text.lower():
                    hits.append(page_num)
            except Exception:
                continue
        if hits:
            pages_str = ", ".join(str(p) for p in hits[:5])
            return f"Topic '{query}' found on pages: {pages_str}."
        return f"Topic '{query}' was not found in the document."

    async def _tool_find_and_load_chapter(self, query: str, class_number: Optional[int], ctx: dict) -> str:
        from app.services.chapter_finder import find_chapter
        
        # 1. Search for matching chapter
        match = find_chapter(query, class_number)
        if not match:
            # Try searching all classes if search with class_number failed or was restricted
            if class_number is not None:
                match = find_chapter(query, None)
                
        if not match:
            return f"Topic or chapter '{query}' was not found in any class textbooks."
            
        # 2. Match found! Parse and cache the PDF
        file_name = match["file_name"]
        matched_class = match["class"]
        title = match["title"]
        pdf_path = Path(match["pdf_path"])
        
        try:
            with open(pdf_path, "rb") as f:
                content = f.read()
                
            if not self.pdf_service:
                from app.services.pdf_service import PDFService
                self.pdf_service = PDFService()
                
            # Cache the PDF content using the pdf_service
            upload_result = await self.pdf_service.upload_pdf(content, f"{file_name}.pdf")
            
            # Update the context variables
            ctx["load_pdf"] = True
            ctx["pdf_session_id"] = upload_result["session_id"]
            ctx["pdf_file_name"] = file_name
            ctx["pdf_class_number"] = matched_class
            ctx["pdf_total_pages"] = upload_result["total_pages"]
            
            return f"Successfully found and loaded chapter: '{title}' from Class {matched_class}. The document is now open on Page 1."
        except Exception as e:
            logger.error(f"Failed to load PDF for {file_name} from path {pdf_path}: {e}")
            return f"Found chapter '{title}' from Class {matched_class}, but encountered an error loading the file."

    def _tool_semantic_search(self, query: str, session_id: str) -> str:
        if not self.rag_service or not query:
            return "Semantic search is unavailable."
        try:
            hits = self.rag_service.search_pages(query, session_id, top_k=3)
            if not hits:
                return f"No semantically relevant pages found for: '{query}'."
            parts = [f"Page {h['page_num']} (score {h['score']}): {h['snippet'][:200]}" for h in hits]
            return "Relevant pages:\n" + "\n".join(parts)
        except Exception as e:
            logger.warning(f"semantic_search error: {e}")
            return "Semantic search encountered an error."

    def clear_session(self, session_id: str) -> None:
        _tutor_sessions.pop(session_id, None)


def _trim(history: list) -> None:
    limit = _MAX_HISTORY
    if len(history) > limit:
        del history[: len(history) - limit]
