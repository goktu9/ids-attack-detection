"""
Automatically generates user_2..5.py files from user_1.py template.
Run once: python generate_user_scripts.py
"""
from pathlib import Path

HERE     = Path(__file__).resolve().parent
TEMPLATE = HERE / "user_1.py"
N_USERS  = 5

if not TEMPLATE.exists():
    raise FileNotFoundError(f"Template not found: {TEMPLATE}")

template_text = TEMPLATE.read_text(encoding="utf-8")

for i in range(2, N_USERS + 1):
    new_text = template_text.replace("USER_ID   = 1", f"USER_ID   = {i}")
    new_text = new_text.replace("Mock Federated Client — User 1",
                                f"Mock Federated Client — User {i}")
    out_path = HERE / f"user_{i}.py"
    out_path.write_text(new_text, encoding="utf-8")
    print(f"✓ {out_path.name} created")

print(f"\nTotal {N_USERS} user scripts ready.")