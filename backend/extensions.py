"""Shared Flask extension instances.

Kept in their own module so models/blueprints can import them without pulling
in app.py (avoids circular imports). app.py calls init_app on each.
"""
from authlib.integrations.flask_client import OAuth
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
oauth = OAuth()
