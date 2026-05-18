"""
Script to load data into PostgreSQL
"""
import os
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'buffet_system.settings')
django.setup()

from django.core import serializers

print("Loading data into PostgreSQL...")

# Read the exported data
with open('data_export.json', 'r') as f:
    data = json.load(f)

print(f"Found {len(data)} objects to import")

# Convert back to JSON string for deserialization
data_json = json.dumps(data)

# Load the data
try:
    objects = serializers.deserialize('json', data_json)
    count = 0
    for obj in objects:
        try:
            obj.save()
            count += 1
            if count % 10 == 0:
                print(f"Imported {count} objects...")
        except Exception as e:
            print(f"Error saving {obj}: {e}")
    
    print(f"\nSuccessfully imported {count} objects into PostgreSQL!")
except Exception as e:
    print(f"Error during import: {e}")
