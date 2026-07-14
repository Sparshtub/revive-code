import os
import base64

# Use the JWT_SECRET_KEY as the salt/key for the XOR cipher.
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "revive-code-super-secret-key-change-in-production")

def encrypt_token(token: str) -> str:
    """
    Encrypts/obfuscates a token string using a symmetric XOR cipher and base64.
    """
    if not token:
        return ""
    key_bytes = SECRET_KEY.encode('utf-8')
    token_bytes = token.encode('utf-8')
    encrypted = bytearray(len(token_bytes))
    for i in range(len(token_bytes)):
        encrypted[i] = token_bytes[i] ^ key_bytes[i % len(key_bytes)]
    return base64.b64encode(encrypted).decode('utf-8')

def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypts/deobfuscates a base64 encoded XOR encrypted token.
    """
    if not encrypted_token:
        return ""
    try:
        encrypted_bytes = base64.b64decode(encrypted_token.encode('utf-8'))
        key_bytes = SECRET_KEY.encode('utf-8')
        decrypted = bytearray(len(encrypted_bytes))
        for i in range(len(encrypted_bytes)):
            decrypted[i] = encrypted_bytes[i] ^ key_bytes[i % len(key_bytes)]
        return decrypted.decode('utf-8')
    except Exception:
        return ""
