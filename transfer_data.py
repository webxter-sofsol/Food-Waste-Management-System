"""
Script to transfer data from SQLite to PostgreSQL
"""
import os
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'buffet_system.settings')
django.setup()

from django.core import serializers
from django.apps import apps
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.models import Permission

# First, let's use SQLite to export data
print("Step 1: Switching to SQLite to export data...")

# Temporarily switch to SQLite
from django.conf import settings
settings.DATABASES['default'] = {
    'ENGINE': 'django.db.backends.sqlite3',
    'NAME': settings.BASE_DIR / 'db.sqlite3',
}

# Close any existing connections
from django.db import connections
for conn in connections.all():
    conn.close()

# Get all models except the ones we want to skip
skip_models = [
    'contenttypes.contenttype',
    'auth.permission',
    'admin.logentry',
    'sessions.session',
]

all_models = []
for model in apps.get_models():
    model_label = f"{model._meta.app_label}.{model._meta.model_name}"
    if model_label not in skip_models:
        all_models.append(model)

print(f"Found {len(all_models)} models to export")

# Export data
data = []
for model in all_models:
    model_name = f"{model._meta.app_label}.{model._meta.model_name}"
    try:
        objects = model.objects.all()
        count = objects.count()
        if count > 0:
            print(f"Exporting {model_name}: {count} objects")
            serialized = serializers.serialize('json', objects, use_natural_foreign_keys=True, use_natural_primary_keys=True)
            data.extend(json.loads(serialized))
    except Exception as e:
        print(f"Error exporting {model_name}: {e}")

# Save to file
with open('data_export.json', 'w') as f:
    json.dump(data, f, indent=2)

print(f"\nExported {len(data)} objects to data_export.json")
print("\nStep 2: Now switch to PostgreSQL in settings.py and run:")
print("  python load_data.py")
