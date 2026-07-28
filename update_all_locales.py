import os
import re
import json

types_dir = "flowsint-types/src/flowsint_types/"

field_pattern = re.compile(r'(\w+):\s*.*?=\s*Field\([^)]*description=["\'](.*?)["\'][^)]*title=["\'](.*?)["\']')
field_pattern_alt = re.compile(r'(\w+):\s*.*?=\s*Field\([^)]*title=["\'](.*?)["\'][^)]*description=["\'](.*?)["\']')

fields_data = {}

for filename in os.listdir(types_dir):
    if filename.endswith(".py") and filename not in ("__init__.py", "flowsint_base.py", "registry.py"):
        filepath = os.path.join(types_dir, filename)
        type_name = filename.replace(".py", "").lower()
        
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            
        fields = {}
        for match in field_pattern.finditer(content):
            name, desc, title = match.groups()
            fields[name] = {"description": desc, "title": title}
            
        for match in field_pattern_alt.finditer(content):
            name, title, desc = match.groups()
            fields[name] = {"description": desc, "title": title}
            
        if fields:
            fields_data[type_name] = fields

locales_dir = "flowsint-app/src/locales/"

def update_locale(lang):
    path = os.path.join(locales_dir, f"{lang}.json")
    if not os.path.exists(path):
        return
        
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    types_dict = data.get("types", {})
    
    for type_key, fields in fields_data.items():
        clean_key = type_key.replace("_", "")
        if clean_key in types_dict:
            if "fields" not in types_dict[clean_key]:
                types_dict[clean_key]["fields"] = {}
                
            for field_name, field_info in fields.items():
                if lang == "en":
                    types_dict[clean_key]["fields"][field_name] = {
                        "label": field_info["title"],
                        "description": field_info["description"]
                    }
                else:
                    # For fr and it, just copy the english texts so they exist in the file.
                    types_dict[clean_key]["fields"][field_name] = {
                        "label": field_info["title"],
                        "description": field_info["description"]
                    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# Update en, fr, it
for l in ["en", "fr", "it"]:
    update_locale(l)
