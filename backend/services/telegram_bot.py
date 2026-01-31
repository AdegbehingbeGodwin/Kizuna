import os
import asyncio
import threading
import uuid
import json
from datetime import datetime
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from dotenv import load_dotenv

load_dotenv()

from services.sqlite_db import get_db_connection
from services.gemini import extract_data_from_image, process_voice_note, process_batch_text

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    welcome_text = """
🌟 *Welcome to Kizuna AI* 🌟
_Your Premium Veterinary Companion_

I'm ready to help you digitize your clinic! You can use me for:

📸 *Photo Entry*: Snap a picture of medical records.
🎙️ *Voice Notes*: Say "Add a dog named Max, owner is Sarah..."
✍️ *Text Entry*: Paste or type multiple pet records (e.g., "1. Max, Golden, Sarah, 0801... 2. Bella, Cat, John...")

I will process your records and they will appear on your dashboard instantly! 🚀
    """
    await update.message.reply_text(welcome_text, parse_mode="Markdown")

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    help_text = """
📖 *How to use Kizuna AI*
    
*Batch Entry*: Just type details for multiple pets in one message. For example:
"Add Bingo, Dog, breed German Shp, owner Samuel Okafor, 08012345678, due Dec 15. Also add Fluffy, Cat, owner Amaka, 08098765432."
    
*Voice*: Send a voice note describing the patients.
    
*Photo*: Send a photo of a vaccination card.
    """
    await update.message.reply_text(help_text, parse_mode="Markdown")

def save_pet_to_db(pet_data):
    """Save a single pet record to SQLite"""
    try:
        new_id = str(uuid.uuid4())
        conn = get_db_connection()
        conn.execute(
            """INSERT INTO pets (id, name, species, breed, age, owner_name, owner_phone, status, next_vaccination_date) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                new_id, 
                pet_data.get('name', 'Unknown'), 
                pet_data.get('species', 'Dog'), 
                pet_data.get('breed', 'Unknown'), 
                pet_data.get('age', 'Unknown'), 
                pet_data.get('ownerName', 'Unknown'), 
                pet_data.get('ownerPhone', 'Unknown'), 
                pet_data.get('status', 'Healthy'), 
                pet_data.get('nextVaccinationDate')
            )
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"DB Error: {e}")
        return False

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle text messages for batch entry"""
    text = update.message.text
    if len(text) < 10: return # Simple filter
    
    await update.message.reply_text("Processing your request... ✍️")
    
    pets = await process_batch_text(text)
    
    if pets and isinstance(pets, list):
        count = 0
        for pet in pets:
            if save_pet_to_db(pet):
                count += 1
        
        if count > 0:
            await update.message.reply_text(f"✅ Successfully added {count} patients to your dashboard!")
        else:
            await update.message.reply_text("❌ Failed to save entries. Please check the format.")
    else:
        await update.message.reply_text("🤔 I couldn't extract patient data from that. Try being more specific with names and details.")

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle photo messages (OCR)"""
    await update.message.reply_text("Analyzing the image... one moment please 🔍")
    
    try:
        photo = update.message.photo[-1]
        file = await context.bot.get_file(photo.file_id)
        photo_bytes = await file.download_as_bytearray()
        
        extracted_data = await extract_data_from_image(bytes(photo_bytes), "image/jpeg")
        
        if extracted_data:
            # Map extraction to DB format
            pet_record = {
                "name": extracted_data.get("pet_name"),
                "ownerName": extracted_data.get("owner_name"),
                "ownerPhone": extracted_data.get("owner_phone", "Unknown"),
                "species": extracted_data.get("species", "Dog"),
                "breed": extracted_data.get("breed", "Unknown"),
                "nextVaccinationDate": extracted_data.get("next_vaccination")
            }
            
            if save_pet_to_db(pet_record):
                response_text = "✅ Record saved to dashboard!\n\n"
                response_text += f"Pet: {pet_record['name']}\n"
                response_text += f"Owner: {pet_record['ownerName']}\n"
                response_text += f"Next Due: {pet_record['nextVaccinationDate'] or '?'}"
                await update.message.reply_text(response_text)
            else:
                await update.message.reply_text("Failed to save the extracted data.")
        else:
            await update.message.reply_text("I couldn't read much from that photo. Try taking a clearer one! 📸")
    except Exception as e:
        print(f"Photo error: {e}")
        await update.message.reply_text("Sorry, something went wrong while processing the image.")

async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle voice messages"""
    await update.message.reply_text("Listening to your voice note... 👂")
    
    try:
        voice = update.message.voice
        file = await context.bot.get_file(voice.file_id)
        voice_bytes = await file.download_as_bytearray()
        
        extracted_data = await process_voice_note(bytes(voice_bytes), "audio/ogg")
        
        if extracted_data:
            # For voice notes, if it's a list, process each. Gemini might return a list or single.
            # Here we assume process_voice_note might return data that needs mapping.
            pet_record = {
                "name": extracted_data.get("pet_name"),
                "ownerName": extracted_data.get("owner_name"),
                "ownerPhone": extracted_data.get("owner_phone"),
                "status": "Healthy"
            }
            
            if save_pet_to_db(pet_record):
                await update.message.reply_text(
                    f"✅ Added {pet_record['name']} (Owner: {pet_record['ownerName']}) to your dashboard!"
                )
            else:
                 await update.message.reply_text("Extracted info but failed to save.")
        else:
            await update.message.reply_text("I couldn't understand that voice note. Can you try again? 🎙️")
    except Exception as e:
        print(f"Voice error: {e}")
        await update.message.reply_text("Sorry, problem hearing that voice note.")

def run_bot():
    """Run the bot in a separate thread"""
    if not TELEGRAM_BOT_TOKEN:
        print("⚠️ TELEGRAM_BOT_TOKEN missing. Telegram bot disabled.")
        return
    
    async def main():
        app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
        
        # Add handlers
        app.add_handler(CommandHandler("start", start_command))
        app.add_handler(CommandHandler("help", help_command))
        app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
        app.add_handler(MessageHandler(filters.VOICE, handle_voice))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
        
        print("🤖 Telegram bot started...")
        # Polling is blocking and won't return until stopped
        await app.initialize()
        await app.start()
        await app.updater.start_polling(allowed_updates=Update.ALL_TYPES)
        
        # Wait until stop signal
        stop_event = asyncio.Event()
        await stop_event.wait()
    
    # Use a new event loop for this thread
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(main())
    finally:
        loop.close()

def start_telegram_bot():
    """Start the Telegram bot in a background thread"""
    if TELEGRAM_BOT_TOKEN:
        bot_thread = threading.Thread(target=run_bot, daemon=True)
        bot_thread.start()
        print("🤖 Telegram bot thread started")
    else:
        print("⚠️ TELEGRAM_BOT_TOKEN missing. Telegram bot disabled.")
