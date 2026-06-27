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

def resolve_node_id(node_id_or_mac):
    """
    Maps a node_id or MAC address to its registered location (city).
    Falls back to the input string itself if not found in the registry (backward compatibility).
    """
    if not node_id_or_mac:
        return node_id_or_mac
        
    registry = load_node_registry()
    
    # Clean input if it's a MAC address (lowercase and strip colons)
    clean_input = node_id_or_mac.strip().lower().replace(":", "")
    
    # 1. Match by key (node_id)
    if node_id_or_mac in registry:
        return registry[node_id_or_mac].get("location", node_id_or_mac)
        
    # 2. Match by mac_address
    for node_info in registry.values():
        node_mac = node_info.get("mac_address", "")
        if node_mac:
            clean_mac = node_mac.strip().lower().replace(":", "")
            if clean_mac == clean_input:
                return node_info.get("location")
                
    # 3. Match by location itself
    for node_info in registry.values():
        if node_info.get("location") == node_id_or_mac:
            return node_id_or_mac
            
    return node_id_or_mac

def update_node_last_seen(node_id_or_mac, timestamp):
    registry = load_node_registry()
    updated = False
    
    clean_input = node_id_or_mac.strip().lower().replace(":", "")
    
    # Try finding by key (node_id)
    if node_id_or_mac in registry:
        registry[node_id_or_mac]["last_seen"] = timestamp
        updated = True
    else:
        # Try finding by mac_address or location
        for nid, node_info in registry.items():
            node_mac = node_info.get("mac_address", "")
            clean_mac = node_mac.strip().lower().replace(":", "") if node_mac else ""
            if clean_mac == clean_input or node_info.get("location") == node_id_or_mac:
                registry[nid]["last_seen"] = timestamp
                updated = True
                break
                
    if updated:
        save_node_registry(registry)
