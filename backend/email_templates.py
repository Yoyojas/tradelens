"""Outgoing-email copy (verification / password-reset codes), 7 UI languages.

Keyed TEMPLATES[purpose][lang] -> {subject, body}; body carries a {code}
placeholder. render() falls back to English for unknown/missing languages, so
old clients that send no `lang` keep getting English. Tone follows the front
end's dictionaries (informal du-form German, polite ja/ko).
"""

SUPPORTED_LANGS = ("en", "zh", "es", "fr", "de", "ja", "ko")

TEMPLATES = {
    "verify_email": {
        "en": {
            "subject": "TradeLens — verify your email",
            "body": (
                "Your TradeLens verification code is: {code}\n\n"
                "It expires in 10 minutes. If you didn't request this, you can "
                "ignore this email.\n\n— TradeLens"
            ),
        },
        "zh": {
            "subject": "TradeLens — 验证你的邮箱",
            "body": (
                "你的 TradeLens 验证码是：{code}\n\n"
                "验证码 10 分钟内有效。如果这不是你的操作，请忽略此邮件。\n\n— TradeLens"
            ),
        },
        "es": {
            "subject": "TradeLens — verifica tu correo",
            "body": (
                "Tu código de verificación de TradeLens es: {code}\n\n"
                "Caduca en 10 minutos. Si no lo has solicitado, puedes ignorar "
                "este correo.\n\n— TradeLens"
            ),
        },
        "fr": {
            "subject": "TradeLens — vérifiez votre e-mail",
            "body": (
                "Votre code de vérification TradeLens est : {code}\n\n"
                "Il expire dans 10 minutes. Si vous n’êtes pas à l’origine de "
                "cette demande, ignorez cet e-mail.\n\n— TradeLens"
            ),
        },
        "de": {
            "subject": "TradeLens — bestätige deine E-Mail",
            "body": (
                "Dein TradeLens-Bestätigungscode lautet: {code}\n\n"
                "Er läuft in 10 Minuten ab. Wenn du das nicht angefordert hast, "
                "ignoriere diese E-Mail.\n\n— TradeLens"
            ),
        },
        "ja": {
            "subject": "TradeLens — メールアドレスの確認",
            "body": (
                "TradeLens の確認コード：{code}\n\n"
                "このコードの有効期限は 10 分です。心当たりがない場合は、この"
                "メールを無視してください。\n\n— TradeLens"
            ),
        },
        "ko": {
            "subject": "TradeLens — 이메일 인증",
            "body": (
                "TradeLens 인증 코드: {code}\n\n"
                "이 코드는 10분 동안 유효합니다. 요청하지 않았다면 이 메일을 "
                "무시하세요.\n\n— TradeLens"
            ),
        },
    },
    "reset_password": {
        "en": {
            "subject": "TradeLens — password reset code",
            "body": (
                "Your TradeLens password reset code is: {code}\n\n"
                "It expires in 10 minutes. If you didn't request this, you can "
                "ignore this email — your password is unchanged.\n\n— TradeLens"
            ),
        },
        "zh": {
            "subject": "TradeLens — 密码重置验证码",
            "body": (
                "你的 TradeLens 密码重置验证码是：{code}\n\n"
                "验证码 10 分钟内有效。如果这不是你的操作，请忽略此邮件，你的"
                "密码不会改变。\n\n— TradeLens"
            ),
        },
        "es": {
            "subject": "TradeLens — código para restablecer la contraseña",
            "body": (
                "Tu código de TradeLens para restablecer la contraseña es: {code}\n\n"
                "Caduca en 10 minutos. Si no lo has solicitado, ignora este "
                "correo: tu contraseña no ha cambiado.\n\n— TradeLens"
            ),
        },
        "fr": {
            "subject": "TradeLens — code de réinitialisation du mot de passe",
            "body": (
                "Votre code TradeLens de réinitialisation du mot de passe est : {code}\n\n"
                "Il expire dans 10 minutes. Si vous n’êtes pas à l’origine de "
                "cette demande, ignorez cet e-mail — votre mot de passe reste "
                "inchangé.\n\n— TradeLens"
            ),
        },
        "de": {
            "subject": "TradeLens — Code zum Zurücksetzen des Passworts",
            "body": (
                "Dein TradeLens-Code zum Zurücksetzen des Passworts lautet: {code}\n\n"
                "Er läuft in 10 Minuten ab. Wenn du das nicht angefordert hast, "
                "ignoriere diese E-Mail — dein Passwort bleibt unverändert.\n\n— TradeLens"
            ),
        },
        "ja": {
            "subject": "TradeLens — パスワード再設定コード",
            "body": (
                "TradeLens のパスワード再設定コード：{code}\n\n"
                "このコードの有効期限は 10 分です。心当たりがない場合は、この"
                "メールを無視してください。パスワードは変更されません。\n\n— TradeLens"
            ),
        },
        "ko": {
            "subject": "TradeLens — 비밀번호 재설정 코드",
            "body": (
                "TradeLens 비밀번호 재설정 코드: {code}\n\n"
                "이 코드는 10분 동안 유효합니다. 요청하지 않았다면 이 메일을 "
                "무시하세요. 비밀번호는 변경되지 않습니다.\n\n— TradeLens"
            ),
        },
    },
}


def normalize_lang(value):
    """Whitelist a client-supplied language code; anything else -> 'en'."""
    lang = str(value or "").strip().lower()
    return lang if lang in SUPPORTED_LANGS else "en"


def render(purpose, lang, code):
    """(subject, body) for a purpose in the requested language."""
    template = TEMPLATES[purpose][normalize_lang(lang)]
    return template["subject"], template["body"].format(code=code)
