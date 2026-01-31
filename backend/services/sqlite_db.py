import sqlite3
import os
import uuid
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "kizuna.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Enhanced Pets Table with age and more details
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS pets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        species TEXT,
        breed TEXT,
        sex TEXT,
        color TEXT,
        age TEXT,
        weight TEXT,
        owner_name TEXT NOT NULL,
        owner_phone TEXT NOT NULL,
        status TEXT DEFAULT 'Healthy',
        birthday TEXT, -- YYYY-MM-DD
        last_vaccination_date TEXT,
        next_vaccination_date TEXT,
        last_deworming_date TEXT,
        last_checkup_date TEXT,
        medical_history TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Campaigns Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        message TEXT NOT NULL,
        target_audience TEXT,
        status TEXT DEFAULT 'draft',
        sent_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Drafts Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS drafts (
        id TEXT PRIMARY KEY,
        pet_id TEXT,
        type TEXT,
        draft_message TEXT,
        status TEXT DEFAULT 'pending_review',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pet_id) REFERENCES pets (id)
    )
    ''')
    
    # Settings Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    ''')
    
    # Initialize default settings if they don't exist
    default_settings = [
        ('clinic_name', 'Kizuna Vet Center'),
        ('booking_url', 'https://book.vet/kizuna'),
        ('kapso_api_key', ''),
        ('kapso_phone_id', ''),
        ('telegram_token', ''),
        ('ai_tone', 'friendly')
    ]
    for key, value in default_settings:
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, value))
    
    # 🕵️ Migration: Check for missing columns in case table already existed
    cursor.execute("PRAGMA table_info(pets)")
    columns = [row[1] for row in cursor.fetchall()]
    
    missing_columns = {
        "sex": "TEXT",
        "color": "TEXT",
        "age": "TEXT",
        "weight": "TEXT",
        "last_deworming_date": "TEXT",
        "last_checkup_date": "TEXT",
        "medical_history": "TEXT DEFAULT '[]'"
    }
    
    for col, col_type in missing_columns.items():
        if col not in columns:
            print(f"📦 Migrating: Adding missing column '{col}' to 'pets' table.")
            cursor.execute(f"ALTER TABLE pets ADD COLUMN {col} {col_type}")

    conn.commit()
    conn.close()
    print("🚀 SQLite Schema checks complete.")
