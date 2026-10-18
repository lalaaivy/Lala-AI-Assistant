import json
import os
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST
from google import genai
from google.genai import types

client = genai.Client(api_key=settings.GEMINI_API_KEY)

MODELS = [
    "gemini-3.8-flash",
]

SYSTEM_PROMPT = (
    "Your name is Lala, a friendly class assistant for students. "
    "If asked who you are, say you are Lala, a study helper. "
    "Keep answers short and simple: under 150 words unless the student "
    "asks for an essay, report or detailed explanation, and then write "
    "the length they ask for. "
    "Use Markdown sparingly: bold key terms and short bullet points. "
    "Write math in LaTeX between $...$ for inline and $$...$$ for "
    "display equations, and only when needed."
)


def index(request):
    return render(request, "assistant/index.html")


@require_POST
def ask(request):
    try:
        prompt = json.loads(request.body).get("prompt", "").strip()
        if not prompt:
            return JsonResponse({"error": "Empty prompt"}, status=400)

        # Short replies by default, longer only when asked
        long_words = ("essay", "report", "words", "detailed", "in depth", "explain fully")
        wants_long = any(w in prompt.lower() for w in long_words)
        max_tokens = 6000 if wants_long else 800

        for model in MODELS:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        max_output_tokens=max_tokens,
                        thinking_config=types.ThinkingConfig(thinking_level="low"),
                    ),
                )
                return JsonResponse({"reply": response.text})
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    continue
                raise

        return JsonResponse({
            "error": "Lala has reached today's free limit. Please try again tomorrow."
        }, status=429)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": "Something went wrong. Please try again."}, status=500)


def service_worker(request):
    path = os.path.join(
        settings.BASE_DIR, "assistant", "static", "assistant", "sw.js"
    )
    with open(path, "rb") as f:
        return HttpResponse(f.read(), content_type="application/javascript")