"""
Django settings for the ELD Trip Planner backend.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).lower() in {"1", "true", "yes", "on"}


SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-h(vl_2ua6!=&80wqcq*gt7sv2w1nq6ccpabkdfk6b29dmy1m0r",
)

# Default to production-safe (False). Set DJANGO_DEBUG=True in your local .env.
DEBUG = env_bool("DJANGO_DEBUG", False)

# Comma-separated list of hosts. Render sets RENDER_EXTERNAL_HOSTNAME.
ALLOWED_HOSTS = [h.strip() for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",") if h.strip()]
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# Vercel (Services / Python runtime) sets VERCEL=1 and VERCEL_URL.
ON_VERCEL = bool(os.environ.get("VERCEL"))
if ON_VERCEL:
    ALLOWED_HOSTS.append(".vercel.app")
    vercel_url = os.environ.get("VERCEL_URL")
    if vercel_url:
        ALLOWED_HOSTS.append(vercel_url)

if DEBUG and not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "trips",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        # On Vercel the project filesystem is read-only; only /tmp is writable.
        # The API itself is stateless, so this DB is effectively unused.
        "NAME": "/tmp/db.sqlite3" if ON_VERCEL else BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    # Public, unauthenticated JSON API — don't pull in session/basic auth.
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    # Per-IP rate limits to protect upstream geocoding quota (ORS/Nominatim).
    "DEFAULT_THROTTLE_RATES": {
        "suggest": "40/min",
        "plan": "15/min",
    },
}

# CORS: allow the deployed frontend origin(s).
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]
# Allow any *.vercel.app preview/prod deploy by default.
CORS_ALLOWED_ORIGIN_REGEXES = [r"^https://.*\.vercel\.app$"]

# In local development, allow any localhost port (Vite may pick 5173/5174/...).
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

CSRF_TRUSTED_ORIGINS = [o for o in CORS_ALLOWED_ORIGINS if o.startswith("https")]
if RENDER_EXTERNAL_HOSTNAME:
    CSRF_TRUSTED_ORIGINS.append(f"https://{RENDER_EXTERNAL_HOSTNAME}")

# Application config
ORS_API_KEY = os.environ.get("ORS_API_KEY", "")
AVERAGE_SPEED_MPH = float(os.environ.get("AVERAGE_SPEED_MPH", "55"))

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
