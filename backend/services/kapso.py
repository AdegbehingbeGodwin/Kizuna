"""
Kapso WhatsApp Service
"""

import os
import httpx
from dotenv import load_dotenv

# Load environment variables from absolute path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

async def send_whatsapp_reminder(to: str, message: str) -> dict:
    """Send a WhatsApp message via Kapso API"""
    
    # Refresh environment to ensure latest keys are used
    api_key = os.getenv("KAPSO_API_KEY", "").strip()
    phone_id = os.getenv("KAPSO_PHONE_NUMBER_ID", "").strip()
    version = os.getenv("KAPSO_VERSION", "v21.0").strip()
    
    # Secure logging
    print(f"[DEBUG] Kapso Sending: PhoneID={phone_id}, Version={version}")
    print(f"[DEBUG] Auth Header: Bearer {api_key[:4]}***")

    is_placeholder = lambda x: not x or "your_" in x or "id_here" in x
    
    if is_placeholder(api_key):
        return {"success": False, "error": "KAPSO_API_KEY is missing or contains placeholder text in .env"}
    if is_placeholder(phone_id):
        return {"success": False, "error": "KAPSO_PHONE_NUMBER_ID is missing or contains placeholder text in .env"}
    
    # Clean recipient number
    clean_to = to.replace("+", "").replace("whatsapp:", "").strip()
    
    url = f"https://api.kapso.ai/meta/whatsapp/{version}/{phone_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_to,
        "type": "text",
        "text": {"body": message}
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                return {"success": True, "sid": data.get("messages", [{}])[0].get("id")}
            else:
                print(f"Kapso API Error ({response.status_code}): {response.text}")
                return {"success": False, "error": response.text}
    except Exception as e:
        print(f"Kapso Connection Error: {e}")
        return {"success": False, "error": str(e)}
