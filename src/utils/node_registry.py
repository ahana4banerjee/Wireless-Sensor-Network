import os
import json
import logging

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
REGISTRY_PATH = os.path.join(PROJECT_ROOT, "configs", "nodes_registry.json")

logger = logging.getLogger("WSN_Registry")

def load_node_registry():
    if not os.path.exists(REGISTRY_PATH):
        logger.error(f"Node registry not found at: {REGISTRY_PATH}")
        return {}
    try:
        with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to read nodes_registry.json: {e}")
        return {}

def save_node_registry(registry):
    try:
        with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
            json.dump(registry, f, indent=4)
    except Exception as e:
        logger.error(f"Failed to write nodes_registry.json: {e}")

def resolve_node_id(node_id_or_city):
    """
    Maps a node_id to its registered location (city).
    Falls back to the input string itself if not found in the registry (backward compatibility).
    """
    registry = load_node_registry()
    if node_id_or_city in registry:
        return registry[node_id_or_city].get("location", node_id_or_city)
    
    # Check if the input is already a registered location/city
    for node_info in registry.values():
        if node_info.get("location") == node_id_or_city:
            return node_id_or_city
            
    return node_id_or_city

def update_node_last_seen(node_id_or_city, timestamp):
    registry = load_node_registry()
    updated = False
    
    # Try finding by key (node_id)
    if node_id_or_city in registry:
        registry[node_id_or_city]["last_seen"] = timestamp
        updated = True
    else:
        # Try finding by location (city)
        for nid, node_info in registry.items():
            if node_info.get("location") == node_id_or_city:
                registry[nid]["last_seen"] = timestamp
                updated = True
                break
                
    if updated:
        save_node_registry(registry)
