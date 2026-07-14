import os
import base64
import hashlib
from cryptography.fernet import Fernet

# Use the JWT_SECRET_KEY as the salt/key for the XOR cipher.
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "revive-code-super-secret-key-change-in-production")

def _get_fernet() -> Fernet:
    """Derives a 32-byte URL-safe base64 key from SECRET_KEY using SHA-256."""
    key = base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode('utf-8')).digest())
    return Fernet(key)

def encrypt_token(token: str) -> str:
    """
    Encrypts a token string using authenticated symmetric cryptography (Fernet).
    """
    if not token:
        return ""
    try:
        fernet = _get_fernet()
        return fernet.encrypt(token.encode('utf-8')).decode('utf-8')
    except Exception:
        return ""

def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypts a Fernet encrypted token, with a fallback to the legacy XOR decryption
    for backward compatibility with old records.
    """
    if not encrypted_token:
        return ""
    
    # 1. Try Fernet decryption first
    try:
        fernet = _get_fernet()
        return fernet.decrypt(encrypted_token.encode('utf-8')).decode('utf-8')
    except Exception:
        pass
        
    # 2. Fallback to legacy XOR decryption
    try:
        encrypted_bytes = base64.b64decode(encrypted_token.encode('utf-8'))
        key_bytes = SECRET_KEY.encode('utf-8')
        decrypted = bytearray(len(encrypted_bytes))
        for i in range(len(encrypted_bytes)):
            decrypted[i] = encrypted_bytes[i] ^ key_bytes[i % len(key_bytes)]
        return decrypted.decode('utf-8')
    except Exception:
        return ""

