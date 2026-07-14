import os
import sqlite3

# Define database file path in the app directory
APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(APP_DIR, "revivecode.db")

def get_db_connection():
    """
    Creates and returns a connection to the SQLite database.
    Configures row factory to allow dict-like access.
    """
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """
    Initializes the database schema if tables do not exist.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # 2. Create reviews table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id TEXT PRIMARY KEY,
            user_id INTEGER,
            code TEXT NOT NULL,
            language TEXT NOT NULL,
            score INTEGER NOT NULL,
            issues TEXT NOT NULL, -- JSON serialized issues list
            embedding TEXT, -- JSON serialized CodeBERT embedding float list
            surprise_scores TEXT, -- JSON serialized line surprise scores
            category_scores TEXT, -- JSON serialized category-wise scores
            summary TEXT, -- Text review summary
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
    """)
    
    # Run migrations for existing databases
    try:
        cursor.execute("ALTER TABLE reviews ADD COLUMN embedding TEXT;")
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute("ALTER TABLE reviews ADD COLUMN surprise_scores TEXT;")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE reviews ADD COLUMN category_scores TEXT;")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE reviews ADD COLUMN summary TEXT;")
    except sqlite3.OperationalError:
        pass
    
    conn.commit()
    conn.close()
    print("Database initialized successfully.")
