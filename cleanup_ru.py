import json
import copy

def sync_dicts(base_dict, target_dict):
    """
    Sync target_dict to strictly match the structure of base_dict.
    - Removes keys in target_dict that are not in base_dict.
    - Adds missing keys from base_dict to target_dict.
    """
    synced = {}
    for key, base_val in base_dict.items():
        if key not in target_dict:
            # Key is missing in target, add from base
            synced[key] = copy.deepcopy(base_val)
        else:
            target_val = target_dict[key]
            if isinstance(base_val, dict) and isinstance(target_val, dict):
                # Recurse into nested dictionaries
                synced[key] = sync_dicts(base_val, target_val)
            else:
                # Keep the value from target
                synced[key] = target_val
                
    return synced

def main():
    en_path = "flowsint-app/src/locales/en.json"
    ru_path = "flowsint-app/src/locales/ru.json"
    
    with open(en_path, "r", encoding="utf-8") as f:
        en_data = json.load(f)
        
    with open(ru_path, "r", encoding="utf-8") as f:
        ru_data = json.load(f)
        
    synced_ru_data = sync_dicts(en_data, ru_data)
    
    with open(ru_path, "w", encoding="utf-8") as f:
        json.dump(synced_ru_data, f, indent=2, ensure_ascii=False)
        
    print("Cleanup and synchronization completed successfully.")

if __name__ == "__main__":
    main()
