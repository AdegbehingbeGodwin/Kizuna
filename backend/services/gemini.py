"""
Google Gemini AI Service
"""

import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from absolute path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

async def generate_reminder(pet_name: str, owner_name: str, clinic_name: str, reminder_type: str, booking_url: str, tone: str = "friendly") -> str:
    """Generate a friendly WhatsApp reminder message"""
    # Force re-configuration to ensure the latest key is used
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    genai.configure(api_key=api_key)
    
    # Standard model selection with fallback
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
    except:
        model = genai.GenerativeModel("gemini-pro")

    prompt = f"""
    You are an AI assistant for a veterinary clinic called {clinic_name}.
    Draft a {tone}, professional, and concise WhatsApp reminder for {owner_name}, the owner of {pet_name}.
    The reminder is for: {reminder_type}.
    Include this booking link: {booking_url}
    
    Guidelines:
    - Keep it under 200 characters.
    - Use emojis to make it relevant to the tone.
    - Sound {tone} and caring.
    - Mention the pet's name.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating reminder: {e}")
        return f"Hi {owner_name}, this is a friendly reminder that {pet_name} is due for a {reminder_type} at {clinic_name}. Book here: {booking_url} 🐾"

async def get_analytics_summary(stats: dict) -> str:
    """Generate AI-powered analytics summary"""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = f"""
    Summarize these veterinary clinic performance stats and provide one actionable tip to improve revenue or retention:
    {json.dumps(stats)}
    
    Keep the summary encouraging and under 3 sentences.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating analytics: {e}")
        return "Your clinic is performing well! Consider sending more reminders to increase bookings."

async def extract_data_from_image(image_data: bytes, mime_type: str) -> dict:
    """Extract pet data from a photo of a vaccination card"""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = """
    Look at this veterinary record/vaccination card and extract the following information in JSON format:
    {
        "pet_name": string,
        "species": string,
        "breed": string,
        "owner_name": string,
        "last_vaccination": date (YYYY-MM-DD),
        "next_vaccination": date (YYYY-MM-DD),
        "notes": string
    }
    If any field is missing, use null. Re-check the dates carefully.
    """
    
    try:
        response = model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": image_data}
        ])
        
        text = response.text
        import re
        json_match = re.search(r'\{[\s\S]*\}', text)
        if json_match:
            return json.loads(json_match.group())
        return None
    except Exception as e:
        print(f"Error extracting data from image: {e}")
        return None

async def process_voice_note(audio_data: bytes, mime_type: str) -> dict:
    """Transcribe a voice note and extract pet information"""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = """
    Listen to this voice note from a veterinarian or clinic staff and extract pet information in JSON format:
    {
        "pet_name": string,
        "owner_name": string,
        "owner_phone": string,
        "species": string,
        "action": "reminder" | "add_pet" | "update",
        "details": string
    }
    """
    
    try:
        response = model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": audio_data}
        ])
        
        text = response.text
        import re
        json_match = re.search(r'\{[\s\S]*\}', text)
        if json_match:
            return json.loads(json_match.group())
        return None
    except Exception as e:
        print(f"Error processing voice note: {e}")
        return None

async def process_batch_text(text: str) -> list:
    """Extract multiple pet entries from a single text block"""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = """
    You are a veterinary assistant. Extract all pet and owner information from the following text and return it as a JSON list of objects.
    
    Text:
    \"\"\"
    {text}
    \"\"\"
    
    Each object in the list should have:
    {
        "name": string (pet name),
        "ownerName": string,
        "ownerPhone": string,
        "species": string (e.g. Dog, Cat),
        "breed": string,
        "age": string,
        "status": string (Healthy, Due Soon, Overdue),
        "nextVaccinationDate": string (YYYY-MM-DD or null)
    }
    
    Return ONLY the raw JSON list. No markdown, no explanations.
    """
    
    try:
        response = model.generate_content(prompt.format(text=text))
        content = response.text.strip()
        
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
            
        return json.loads(content)
    except Exception as e:
        print(f"Error in batch processing: {e}")
        return []
