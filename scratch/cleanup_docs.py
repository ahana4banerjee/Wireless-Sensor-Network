import os
import shutil

ROOT_DIR = "d:/Projects/College/Wireless-Sensor-Network"
DOCS_DIR = os.path.join(ROOT_DIR, "docs")
ARCHIVE_DIR = os.path.join(DOCS_DIR, "archive")

def move_file(src, dst):
    if os.path.exists(src):
        try:
            shutil.move(src, dst)
            print(f"Moved: {os.path.basename(src)} -> {os.path.relpath(dst, ROOT_DIR)}")
        except Exception as e:
            print(f"Error moving {src}: {e}")
    else:
        print(f"Source not found: {src}")

def cleanup():
    print("--- Cleaning and Organizing Docs ---")
    
    # Ensure dirs exist
    os.makedirs(DOCS_DIR, exist_ok=True)
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    
    # Move files
    move_file(os.path.join(ROOT_DIR, "ARCHITECTURE.md"), os.path.join(DOCS_DIR, "ARCHITECTURE.md"))
    move_file(os.path.join(ROOT_DIR, "CONTEXT.md"), os.path.join(DOCS_DIR, "CONTEXT.md"))
    move_file(os.path.join(DOCS_DIR, "PHASE3_HARDWARE_GUIDE.md"), os.path.join(DOCS_DIR, "HARDWARE.md"))
    move_file(os.path.join(DOCS_DIR, "design", "DESIGN_SYSTEM.md"), os.path.join(ARCHIVE_DIR, "DESIGN_SYSTEM.md"))
    
    # Remove empty directories
    design_dir = os.path.join(DOCS_DIR, "design")
    if os.path.exists(design_dir) and not os.listdir(design_dir):
        try:
            os.rmdir(design_dir)
            print(f"Removed empty directory: {os.path.relpath(design_dir, ROOT_DIR)}")
        except Exception as e:
            print(f"Error removing {design_dir}: {e}")

if __name__ == "__main__":
    cleanup()
