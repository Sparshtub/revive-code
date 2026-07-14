import os
import sqlite3

# Define database file path in the app directory
APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(APP_DIR, "revivecode.db")

DATABASE_URL = os.environ.get("DATABASE_URL")

class PostgresCursorWrapper:
    def __init__(self, cursor):
        self.cursor = cursor
        
    def execute(self, sql, params=None):
        # Convert SQLite ? placeholders to PostgreSQL %s placeholders
        sql = sql.replace('?', '%s')
        if params is not None:
            return self.cursor.execute(sql, params)
        else:
            return self.cursor.execute(sql)
            
    def fetchone(self):
        row = self.cursor.fetchone()
        return row
        
    def fetchall(self):
        return self.cursor.fetchall()
        
    def close(self):
        self.cursor.close()
        
    def __getattr__(self, name):
        return getattr(self.cursor, name)


class PostgresConnectionWrapper:
    def __init__(self, conn):
        self.conn = conn
        
    def cursor(self):
        from psycopg2.extras import DictCursor
        cursor = self.conn.cursor(cursor_factory=DictCursor)
        return PostgresCursorWrapper(cursor)
        
    def commit(self):
        self.conn.commit()
        
    def rollback(self):
        self.conn.rollback()
        
    def close(self):
        self.conn.close()
        
    def __getattr__(self, name):
        return getattr(self.conn, name)


def get_db_connection():
    """
    Creates and returns a connection to the SQLite or PostgreSQL database.
    Configures dict-like row access for both database types.
    """
    if DATABASE_URL and (DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://")):
        import psycopg2
        conn = psycopg2.connect(DATABASE_URL)
        return PostgresConnectionWrapper(conn)
    else:
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
    
    is_postgres = DATABASE_URL and (DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://"))
    
    if is_postgres:
        # Create users table for PostgreSQL
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create reviews table for PostgreSQL
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
        
        # Safe column check and migrations for PostgreSQL reviews table
        for col in ['embedding', 'surprise_scores', 'category_scores', 'summary']:
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='reviews' AND column_name='{col}';
            """)
            if not cursor.fetchone():
                cursor.execute(f"ALTER TABLE reviews ADD COLUMN {col} TEXT;")
                
        # Create review_files table for PostgreSQL
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS review_files (
                review_id TEXT,
                file_path TEXT,
                code_content TEXT,
                PRIMARY KEY (review_id, file_path),
                FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE
            );
        """)
        
        # Safe column check and migrations for users table (GitHub connection)
        for col in ['github_username', 'github_access_token']:
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='{col}';
            """)
            if not cursor.fetchone():
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col} TEXT;")
    else:
        # 1. Create users table for SQLite
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # 2. Create reviews table for SQLite
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
        
        # Run migrations for existing SQLite databases
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

        # Create review_files table for SQLite
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS review_files (
                review_id TEXT,
                file_path TEXT,
                code_content TEXT,
                PRIMARY KEY (review_id, file_path),
                FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE
            );
        """)

        # Migrate SQLite users for github credentials
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN github_username TEXT;")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN github_access_token TEXT;")
        except sqlite3.OperationalError:
            pass
    
    conn.commit()
    conn.close()
    print("Database initialized successfully.")

