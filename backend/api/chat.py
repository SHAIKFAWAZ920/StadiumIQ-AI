import base64
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import User, Incident
from backend.api.auth import get_current_user
from backend.ai.rag_engine import RAGEngine
from backend.ai.gemini_client import (
    generate_chat_response, 
    analyze_stadium_image,
    summarize_incident,
    generate_volunteer_instructions
)

logger = logging.getLogger("stadium_iq.chat")
router = APIRouter(prefix="/api/chat", tags=["chat"])

# Request/Response Schemas
class ChatRequest(BaseModel):
    message: str
    location: Optional[str] = "Main Concourse"
    image_base64: Optional[str] = None
    image_url: Optional[str] = None # Firebase Storage URL

class ChatResponse(BaseModel):
    response: str
    language_detected: str
    incident_created: bool = False
    incident_id: Optional[int] = None

# Role-specific system instructions
ROLE_INSTRUCTIONS = {
    "fan": (
        "You are the StadiumIQ Fan Assistant for the FIFA World Cup 2026. "
        "Your goal is to guide fans inside the stadium, locate facilities, seats, restrooms, halal food, and water stations. "
        "Encourage sustainability: remind them that using reusable water bottles at refill stations saves 0.2kg CO2. "
        "Keep responses polite, helpful, and concise. Utilize the RAG context provided to answer questions accurately."
    ),
    "volunteer": (
        "You are the StadiumIQ Volunteer Assistant. "
        "Your goal is to guide tournament volunteers in their daily tasks (e.g., ticket scanning, crowd coordination). "
        "Assist them in logging incidents, resolving FAQs, and answering questions about stadium regulations. "
        "Be encouraging, professional, and safety-focused."
    ),
    "security": (
        "You are the StadiumIQ Security AI Assistant. "
        "Your goal is to provide decision support for security staff. "
        "Focus on crowd control, suspicious object reporting, hazard isolation, and evacuation paths. "
        "Keep responses objective, action-oriented, and focused on stadium safety regulations."
    ),
    "manager": (
        "You are the StadiumIQ Operations Manager AI Assistant. "
        "Your role is to support the tournament operations manager with data analysis, KPI summaries, "
        "resource management (energy/water/waste), and strategic queue balancing recommendations."
    ),
    "medical": (
        "You are the StadiumIQ Medical Staff Assistant. "
        "Your role is to aid first-aid and medical responders. "
        "Provide direct guidelines on first-aid boxes, triage locations, CPR summaries, and emergency procedures. "
        "Be calm, clinical, and precise."
    ),
    "transport": (
        "You are the StadiumIQ Transport Coordinator Assistant. "
        "Provide summaries of bus and train lines, shuttle wait times, parking capacities, "
        "and carbon saving indices. Assist in transit coordination."
    )
}

def parse_base64_image(base64_str: str) -> tuple[bytes, str]:
    """
    Parses a data URL base64 image (e.g. 'data:image/jpeg;base64,abc...') into raw bytes and mime type.
    """
    try:
        if "," in base64_str:
            header, base64_data = base64_str.split(",", 1)
            mime_type = header.split(";")[0].split(":")[1]
        else:
            base64_data = base64_str
            mime_type = "image/jpeg"
            
        image_bytes = base64.b64decode(base64_data)
        return image_bytes, mime_type
    except Exception as e:
        logger.error(f"Error parsing base64 image: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 image format."
        )

@router.post("", response_model=ChatResponse)
def post_chat(
    req: ChatRequest, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    role = current_user.role_name
    lang = current_user.preferred_language
    
    # 1. Retrieve RAG Context
    rag_context = RAGEngine.get_context(req.message)
    
    # 2. Base System Prompt construction
    base_instruction = ROLE_INSTRUCTIONS.get(role, ROLE_INSTRUCTIONS["fan"])
    
    full_system_instruction = (
        f"{base_instruction}\n\n"
        f"USER ROLE: {role}\n"
        f"USER PREFERRED LANGUAGE: {lang}\n"
        f"USER CURRENT LOCATION: {req.location}\n\n"
        f"STADIUM DATA CONTEXT:\n{rag_context}\n\n"
        f"Instructions: "
        f"1. Respond in the user's preferred language ({lang}). If the query is in another language, "
        f"automatically detect it and respond in that language. "
        f"2. Keep the answer highly relevant to their current location: '{req.location}'. "
        f"3. Never guess info. If the context doesn't answer, tell the user politely."
    )
    
    # 3. Handle Image Analysis
    image_bytes = None
    mime_type = None
    incident_created = False
    incident_id = None
    
    if req.image_base64:
        image_bytes, mime_type = parse_base64_image(req.image_base64)
    elif req.image_url:
        import requests
        try:
            img_resp = requests.get(req.image_url, timeout=10)
            img_resp.raise_for_status()
            image_bytes = img_resp.content
            mime_type = img_resp.headers.get("Content-Type", "image/jpeg")
        except Exception as e:
            logger.error(f"Error fetching image URL: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to download image from storage: {str(e)}"
            )
            
    if image_bytes:
        # Use Gemini to analyze the image
        analysis = analyze_stadium_image(image_bytes, mime_type)
        
        # If an issue is detected, create an incident log
        if analysis.get("issue_detected"):
            category = analysis.get("category", "obstacle")
            severity = analysis.get("severity", "medium")
            description = analysis.get("description", "Image submission analysis.")
            recommendation = analysis.get("recommendation", "")
            
            # Formulate AI summary and volunteer checklist
            ai_sum = summarize_incident(category, description)
            vol_inst = generate_volunteer_instructions(category, description)
            
            new_incident = Incident(
                reporter_id=current_user.id,
                category=category,
                title=f"AI Detected: {category.replace('_', ' ').capitalize()}",
                description=description,
                location=req.location,
                status="reported",
                severity=severity,
                ai_summary=ai_sum,
                ai_volunteer_instructions=vol_inst
            )
            db.add(new_incident)
            db.commit()
            db.refresh(new_incident)
            
            incident_created = True
            incident_id = new_incident.id
            
            # Inject incident alert into chat response prompt
            req.message += (
                f"\n\n[SYSTEM UPDATE: I have uploaded a photo showing an active {category}. "
                f"It was filed as Incident #{new_incident.id} ({severity} severity) in {req.location}. "
                f"Please tell me what steps are being taken and give me immediate safety recommendations.]"
            )
    
    # 4. Generate final Chat Response using Gemini API
    ai_response = generate_chat_response(
        prompt=req.message,
        role_prompt=full_system_instruction,
        user_id=current_user.id,
        image_bytes=image_bytes,
        mime_type=mime_type or "image/jpeg"
    )
    
    return ChatResponse(
        response=ai_response,
        language_detected=lang,
        incident_created=incident_created,
        incident_id=incident_id
    )
