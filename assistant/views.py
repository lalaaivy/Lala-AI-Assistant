from google.genai import types 
import json
import os
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST
from google import genai

client = genai.Client(api_key=settings.GEMINI_API_KEY)


def index(request):
    return render(request, "assistant/index.html")


@require_POST
def ask(request):
    try:
        prompt = json.loads(request.body).get("prompt", "").strip()
        if not prompt:
            return JsonResponse({"error": "Empty prompt"}, status=400)
        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "Your name is Lala. You are a friendly class assistant "
                    "for students. If asked who you are, say you are Lala, "
                    "a study helper. Match the length to the request: give "
                    "short answers to simple questions, but when the student "
                    "asks for an essay, report, or long explanation, write "
                    "the full piece at the length they ask for (1000 words "
                    "or more) with a clear introduction, body paragraphs, "
                    "and conclusion. Never cut an answer short."
                ),
                max_output_tokens=8192,
                thinking_config=types.ThinkingConfig(thinking_level="low"),
            ),
        )
        return JsonResponse({"reply": response.text})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": f"AI request failed: {e}"}, status=500)


def service_worker(request):
    path = os.path.join(
        settings.BASE_DIR, "assistant", "static", "assistant", "sw.js"
    )
    with open(path, "rb") as f:
        return HttpResponse(f.read(), content_type="application/javascript")

        