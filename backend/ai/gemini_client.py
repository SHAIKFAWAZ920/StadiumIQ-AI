import os
import base64
import time
import logging
from typing import List, Dict, Tuple, Optional
from google import genai
from google.genai import types
from google.genai.errors import APIError

logger = logging.getLogger("stadium_iq.ai")

API_KEY = os.getenv("GEMINI_API_KEY")
client = None

if API_KEY:
    try:
        client = genai.Client(api_key=API_KEY)
        logger.info("Gemini API Client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini Client: {e}")
else:
    logger.warning("GEMINI_API_KEY not found. Operating in Mock AI fallback mode.")

# 1. Simple In-Memory Conversation Memory Cache
# Maps user_id -> List of (user_msg, bot_msg)
CONVERSATION_MEMORY: Dict[int, List[Tuple[str, str]]] = {}
MAX_MEMORY_HISTORY = 5

def get_conversation_history(user_id: int) -> List[Tuple[str, str]]:
    return CONVERSATION_MEMORY.get(user_id, [])

def save_conversation_exchange(user_id: int, user_msg: str, bot_msg: str):
    if user_id not in CONVERSATION_MEMORY:
        CONVERSATION_MEMORY[user_id] = []
    history = CONVERSATION_MEMORY[user_id]
    history.append((user_msg, bot_msg))
    # Keep only the last N exchanges
    if len(history) > MAX_MEMORY_HISTORY:
        history.pop(0)

# 2. Rate Limiting Cache
# Maps user_id -> List of timestamps
RATE_LIMIT_CACHE: Dict[int, List[float]] = {}
LIMIT_WINDOW_SECONDS = 60
LIMIT_MAX_REQUESTS = 15 # Max 15 requests per minute

def check_rate_limit(user_id: int) -> bool:
    """
    Checks if a user has exceeded the GenAI rate limit.
    Returns True if request is allowed, False if blocked.
    """
    now = time.time()
    if user_id not in RATE_LIMIT_CACHE:
        RATE_LIMIT_CACHE[user_id] = []
    
    timestamps = RATE_LIMIT_CACHE[user_id]
    # Filter out timestamps outside the current window
    timestamps = [t for t in timestamps if now - t < LIMIT_WINDOW_SECONDS]
    RATE_LIMIT_CACHE[user_id] = timestamps

    if len(timestamps) >= LIMIT_MAX_REQUESTS:
        return False
        
    timestamps.append(now)
    return True

# 3. Prompt Templates
PROMPT_TEMPLATES = {
    "incident_summary": (
        "Analyze the following stadium incident report. Generate a concise, clear one-sentence executive summary. "
        "Keep it under 15 words.\n\n"
        "Incident Title: {title}\n"
        "Incident Description: {description}"
    ),
    "volunteer_checklist": (
        "Generate a direct, safety-first 3-step action checklist for a stadium volunteer handling the following issue:\n"
        "Category: {category}\n"
        "Details: {description}\n\n"
        "Format the output strictly as 3 numbered points."
    ),
    "analytics_insights": (
        "You are the Operations Control Analyst. Review these telemetry indicators and generate exactly 3 "
        "high-level executive recommendations for resource management and queue balances.\n\n"
        "Current KPIs: {stats}"
    )
}

def generate_chat_response(prompt: str, role_prompt: str, user_id: int, image_bytes: bytes = None, mime_type: str = "image/jpeg") -> str:
    """
    Generates a chat response using Gemini, incorporating rate limiting and conversation memory.
    """
    # Rate Limit enforcement
    if not check_rate_limit(user_id):
        return "⚠️ [RATE LIMIT EXCEEDED] You are sending too many requests. Please wait a moment before trying again."

    # Build memory context
    history = get_conversation_history(user_id)
    history_context = ""
    if history:
        history_context = "CONVERSATION HISTORY:\n"
        for user_msg, bot_msg in history:
            history_context += f"User: {user_msg}\nAssistant: {bot_msg}\n"
        history_context += "\n"

    role_prompt_with_history = f"{role_prompt}\n\n{history_context}"

    bot_response = ""
    if client:
        try:
            contents = []
            if image_bytes:
                img_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                contents.append(img_part)
            
            contents.append(prompt)
            
            config = types.GenerateContentConfig(
                system_instruction=role_prompt_with_history,
                temperature=0.7,
                max_output_tokens=1000
            )
            
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=config
            )
            bot_response = response.text
        except APIError as e:
            logger.error(f"Gemini API Error: {e}")
            bot_response = "I encountered a configuration limit with the Gemini API. Please retry shortly."
        except Exception as e:
            logger.error(f"Gemini Exception: {e}")
            bot_response = "I had trouble generating a response. Please check your network connection."
    else:
        # Fallback Mock Mode Response
        bot_response = get_mock_chat_response(prompt, role_prompt_with_history)

    # Save to history
    save_conversation_exchange(user_id, prompt, bot_response)
    return bot_response

def summarize_incident(title: str, description: str) -> str:
    """
    Generates a brief summary using a structured prompt template.
    """
    prompt = PROMPT_TEMPLATES["incident_summary"].format(title=title, description=description)
    system_instruction = "You are a stadium safety dispatch assistant. Keep summaries under 15 words."
    
    if client:
        try:
            config = types.GenerateContentConfig(system_instruction=system_instruction, temperature=0.3)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error summarizing incident: {e}")
            
    return f"Active Incident: {title} reported. Response team dispatched."

def generate_volunteer_instructions(category: str, description: str) -> str:
    """
    Generates a step-by-step checklist using prompt templates.
    """
    prompt = PROMPT_TEMPLATES["volunteer_checklist"].format(category=category, description=description)
    system_instruction = "You are an operations manager. Generate simple, direct safety-first instructions."
    
    if client:
        try:
            config = types.GenerateContentConfig(system_instruction=system_instruction, temperature=0.4)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error generating instructions: {e}")
            
    mocks = {
        "medical": "1. Stay with the person and keep them calm.\n2. Do NOT attempt to move them if they are injured.\n3. Direct the arriving medical staff to your location.",
        "fire": "1. Keep calm and direct visitors away from the immediate area.\n2. Guide visitors to the nearest fire exit.\n3. Keep concourses clear for emergency crews.",
        "security": "1. Do NOT engage with aggressive individuals.\n2. Establish a safety perimeter of 10 meters.\n3. Await instructions from stadium security.",
        "trash": "1. Restrict access to avoid slipping hazards.\n2. Mark the bin with caution signs.\n3. Await sanitization team.",
        "obstacle": "1. Guide pedestrian flow around the block.\n2. Assist wheelchair users along the secondary ramp.\n3. Do not attempt to lift heavy structures alone."
    }
    return mocks.get(category.lower(), "1. Assess the situation safely.\n2. Alert nearby staff.\n3. Keep paths clear.")

def translate_text(text: str, target_lang: str) -> str:
    lang_names = {
        "es": "Spanish", "fr": "French", "ar": "Arabic", 
        "hi": "Hindi", "ur": "Urdu", "pt": "Portuguese", "en": "English"
    }
    target_name = lang_names.get(target_lang, "English")
    prompt = f"Translate the following text exactly into {target_name}. Output ONLY the translated text:\n\n{text}"
    
    if client:
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error translating text: {e}")
            
    return f"[{target_name.upper()}] {text}"

def generate_operational_insights(stats: dict) -> str:
    prompt = PROMPT_TEMPLATES["analytics_insights"].format(stats=stats)
    system_instruction = "You are a Smart Stadium Operations Analyst."
    
    if client:
        try:
            config = types.GenerateContentConfig(system_instruction=system_instruction, temperature=0.5)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error generating insights: {e}")
            
    return (
        "1. Open auxiliary lanes at Gate C to relieve the current 25-minute queue delay.\n"
        "2. Dispatch transport shuttles from Lot A to Metro Station South to manage outflow spike.\n"
        "3. Transition floodlights in Section B to low-power conservation mode (9% carbon savings)."
    )

def analyze_stadium_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    prompt = (
        "Analyze this stadium photo. Identify if there is an active issue in any of the categories: "
        "'crowd', 'obstacle', 'trash_overflow', 'medical_incident'. "
        "Format your answer as a JSON dict with keys: 'issue_detected' (bool), 'category' (string or null), "
        "'severity' ('low', 'medium', 'high' or null), 'description' (string description), "
        "'recommendation' (string check instructions). Output ONLY valid JSON."
    )
    
    if client:
        try:
            img_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2
            )
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[img_part, prompt],
                config=config
            )
            import json
            return json.loads(response.text.strip())
        except Exception as e:
            logger.error(f"Error analyzing image: {e}")
            
    return {
        "issue_detected": True,
        "category": "trash_overflow",
        "severity": "medium",
        "description": "CCTV feed exhibits significant trash accumulation and plastic debris blocking the concourse near Section 104.",
        "recommendation": "Dispatch cleaning volunteer team to Section 104 immediately and replace filled recycling bins."
    }

def get_mock_chat_response(prompt: str, role_prompt: str) -> str:
    p_lower = prompt.lower()
    role = "fan"
    if "security" in role_prompt.lower():
        role = "security"
    elif "volunteer" in role_prompt.lower():
        role = "volunteer"
    elif "medical" in role_prompt.lower():
        role = "medical"
    elif "operations" in role_prompt.lower() or "manager" in role_prompt.lower():
        role = "operations"
    elif "transport" in role_prompt.lower():
        role = "transport"

    if "gate c" in p_lower or "where is gate c" in p_lower:
        if role == "fan":
            return "Gate C is located on the East side of the stadium. From your current location, follow the blue pathway indicators past Food Court 2. The estimated walk time is 4 minutes."
        return "Gate C is on the East sector. Current crowd status: High (850 visitors/min). Direct incoming fans to Gate B or Gate D to balance the flow."

    if "halal" in p_lower or "halal food" in p_lower:
        return "The nearest Halal certified food vendor is 'Green FIFA Grills' located at Concourse North, near Section 108. They serve shawarma, chicken rice bowls, and vegan options. Walking time: 2 minutes."

    if "restroom" in p_lower or "toilet" in p_lower or "washroom" in p_lower:
        return "Restrooms are located every 50 meters along the main concourses. The nearest is near Section 112, which currently has a very short queue (approx. 1 min wait). Ramps are available for wheelchair access."

    if "dizzy" in p_lower or "medical emergency" in p_lower or "feel sick" in p_lower:
        return "⚠️ EMERGENCY NOTICE: Medical support has been alerted. Please stay where you are. First aid station #2 is 45 meters away in Section 109. A volunteer is heading to your position."

    if "fire" in p_lower or "smoke" in p_lower:
        return "🚨 ALERT: Fire incident detected. Please exit immediately through Emergency Exit Gate 4 (North Side). Follow the glowing green indicators. Do not use elevators."

    return (
        f"Hi! As a StadiumIQ {role.capitalize()} Assistant, I'm here to help. "
        f"I can assist with navigation, emergency procedures, sustainability stats, and real-time updates. "
        f"What can I do for you?"
    )
