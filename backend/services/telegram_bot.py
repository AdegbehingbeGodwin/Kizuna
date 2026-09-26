"""Low-latency Telegram adapter for the shared Kizuna Care assistant."""

import asyncio
import os
import threading
from collections import OrderedDict, deque
from typing import Any, Deque, Dict, List, Optional, Set

from dotenv import load_dotenv
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

from services.care_assistant import assess_owner_message, fallback_owner_assessment
from services.supabase_db import (
    record_care_channel_inbound,
    record_care_channel_outbound,
    upsert_care_case,
)

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_INTAKE_CLINIC_ID = (
    os.getenv("TELEGRAM_INTAKE_CLINIC_ID")
    or os.getenv("TELEGRAM_DEFAULT_CLINIC_ID")
)
TELEGRAM_RESPONSE_TIMEOUT_SECONDS = float(
    os.getenv("TELEGRAM_RESPONSE_TIMEOUT_SECONDS", "10")
)
TELEGRAM_MAX_ACTIVE_CHATS = int(os.getenv("TELEGRAM_MAX_ACTIVE_CHATS", "500"))

SessionMessage = Dict[str, Any]
_session_history: "OrderedDict[str, Deque[SessionMessage]]" = OrderedDict()
_background_tasks: Set[asyncio.Task[Any]] = set()


WELCOME_TEXT = """
Welcome to Kizuna Care.

Tell me what is happening with your pet or farm animal in your own words. Helpful details include:

- Species, breed or production group
- Age and sex
- Main concern and when it started
- Eating, drinking and activity
- Medicines or recent treatment
- How many animals are affected

Kizuna helps organize your information for veterinary care. It does not replace a veterinarian or provide a final diagnosis.
""".strip()


def _remember(chat_id: str, direction: str, content: str) -> List[SessionMessage]:
    history = _session_history.pop(chat_id, deque(maxlen=12))
    history.append({"direction": direction, "content": content})
    _session_history[chat_id] = history
    while len(_session_history) > TELEGRAM_MAX_ACTIVE_CHATS:
        _session_history.popitem(last=False)
    return list(history)


def _run_in_background(coroutine: Any) -> None:
    task = asyncio.create_task(coroutine)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


async def process_telegram_intake(
    *,
    clinic_id: str,
    user_id: str,
    chat_id: str,
    message_id: str,
    text: str,
    display_name: Optional[str] = None,
    username: Optional[str] = None,
    raw_payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Generate a reply without putting persistence on the critical path."""
    del clinic_id, user_id, message_id, display_name, username, raw_payload
    history = _remember(chat_id, "inbound", text)
    try:
        assessment = await asyncio.wait_for(
            assess_owner_message(
                message=text,
                recent_messages=history,
            ),
            timeout=TELEGRAM_RESPONSE_TIMEOUT_SECONDS,
        )
    except (asyncio.TimeoutError, TimeoutError):
        assessment = fallback_owner_assessment(text)
        assessment["provider"] = "kizuna-deadline-fallback"

    _remember(chat_id, "outbound", assessment["reply"])
    return {
        "assessment": assessment,
        "stored": None,
        "persistence_error": None,
    }


async def persist_telegram_exchange(
    *,
    clinic_id: str,
    user_id: str,
    chat_id: str,
    inbound_message_id: str,
    outbound_message_id: str,
    text: str,
    reply: str,
    assessment: Dict[str, Any],
    display_name: Optional[str] = None,
    username: Optional[str] = None,
    raw_payload: Optional[Dict[str, Any]] = None,
) -> None:
    """Mirror a completed exchange into the Care Inbox without delaying Telegram."""

    def persist() -> None:
        stored = record_care_channel_inbound(
            clinic_id=clinic_id,
            channel="telegram",
            external_user_id=user_id,
            external_conversation_id=chat_id,
            external_message_id=inbound_message_id,
            content=text,
            display_name=display_name,
            username=username,
            raw_payload=raw_payload,
        )
        conversation = stored.get("conversation") or {}
        contact = stored.get("contact") or {}
        inbound_message = stored.get("message") or {}
        conversation_id = conversation.get("id")
        if not conversation_id:
            return
        upsert_care_case(
            clinic_id=clinic_id,
            conversation_id=conversation_id,
            contact_id=contact.get("id"),
            inbound_message_id=inbound_message.get("id"),
            assessment=assessment,
        )
        record_care_channel_outbound(
            clinic_id=clinic_id,
            channel="telegram",
            external_user_id=user_id,
            external_message_id=outbound_message_id,
            content=reply,
            contact_id=contact.get("id"),
            conversation_id=conversation_id,
            raw_payload={"telegram_chat_id": chat_id},
        )

    try:
        await asyncio.to_thread(persist)
    except Exception as exc:
        print(f"Telegram background persistence failed: {exc}")


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    del context
    if update.message:
        await update.message.reply_text(WELCOME_TEXT)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    del context
    if update.message:
        await update.message.reply_text(
            "Describe the animal and your concern in one message. "
            "You can continue replying as Kizuna asks for missing information. "
            "For collapse, trouble breathing, seizure, poisoning, heavy bleeding, "
            "or inability to stand, contact a veterinary professional immediately."
        )


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.effective_user or not update.effective_chat:
        return
    text = (update.message.text or "").strip()
    if not text:
        return
    if not TELEGRAM_INTAKE_CLINIC_ID:
        await update.message.reply_text(
            "Kizuna Care is not connected to a receiving veterinary team yet. "
            "Please try again after the service has been configured."
        )
        return

    user = update.effective_user
    chat_id = str(update.effective_chat.id)
    await context.bot.send_chat_action(
        chat_id=update.effective_chat.id,
        action=ChatAction.TYPING,
    )
    result = await process_telegram_intake(
        clinic_id=TELEGRAM_INTAKE_CLINIC_ID,
        user_id=str(user.id),
        chat_id=chat_id,
        message_id=str(update.message.message_id),
        text=text,
        display_name=user.full_name,
        username=user.username,
        raw_payload={
            "telegram_chat_type": update.effective_chat.type,
            "telegram_language_code": user.language_code,
        },
    )
    assessment = result["assessment"]
    reply = assessment["reply"]
    sent = await update.message.reply_text(reply)

    _run_in_background(
        persist_telegram_exchange(
            clinic_id=TELEGRAM_INTAKE_CLINIC_ID,
            user_id=str(user.id),
            chat_id=chat_id,
            inbound_message_id=str(update.message.message_id),
            outbound_message_id=str(sent.message_id),
            text=text,
            reply=reply,
            assessment=assessment,
            display_name=user.full_name,
            username=user.username,
            raw_payload={
                "telegram_chat_type": update.effective_chat.type,
                "telegram_language_code": user.language_code,
            },
        )
    )


async def handle_unsupported(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    del context
    if update.message:
        await update.message.reply_text(
            "Text messages are supported first. Please describe the animal and concern in writing."
        )


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    del update
    print(f"Telegram update error: {context.error}")


def run_bot() -> None:
    if not TELEGRAM_BOT_TOKEN:
        print("TELEGRAM_BOT_TOKEN missing. Telegram bot disabled.")
        return

    async def main() -> None:
        app = (
            Application.builder()
            .token(TELEGRAM_BOT_TOKEN)
            .concurrent_updates(8)
            .build()
        )
        app.add_handler(CommandHandler("start", start_command))
        app.add_handler(CommandHandler("help", help_command))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
        app.add_handler(
            MessageHandler(filters.PHOTO | filters.VOICE | filters.Document.ALL, handle_unsupported)
        )
        app.add_error_handler(error_handler)

        print("Kizuna Telegram care assistant started.")
        await app.initialize()
        await app.start()
        await app.updater.start_polling(
            allowed_updates=Update.ALL_TYPES,
            bootstrap_retries=-1,
            poll_interval=0.25,
            timeout=20,
        )
        await asyncio.Event().wait()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(main())
    finally:
        loop.close()


def start_telegram_bot() -> None:
    if TELEGRAM_BOT_TOKEN:
        bot_thread = threading.Thread(target=run_bot, daemon=True)
        bot_thread.start()
        print("Kizuna Telegram bot thread started.")
    else:
        print("TELEGRAM_BOT_TOKEN missing. Telegram bot disabled.")


if __name__ == "__main__":
    run_bot()
