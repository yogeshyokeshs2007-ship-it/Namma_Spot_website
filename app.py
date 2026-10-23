from flask import Flask, render_template, request, jsonify, session
from pathlib import Path
from contextlib import contextmanager
import json, math, os, sqlite3

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("DATA_DIR", str(BASE_DIR))).resolve()
MENU_FILE = DATA_DIR / "menu_data.json"
SETTINGS_FILE = DATA_DIR / "shop_data.json"
DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", str(DATA_DIR / "namma_spot.sqlite3"))).resolve()
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "local-development-only-change-me")
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE", "0") == "1")

SEED_MENU = [
    {"id": 1, "name": "Chicken Biryani", "category": "Biryani", "description": "Aromatic basmati rice with tender chicken.", "price": 120, "image": "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=900&q=85", "featured": True, "available": True},
    {"id": 2, "name": "Mutton Biryani", "category": "Biryani", "description": "Rich spices, fragrant rice and slow-cooked mutton.", "price": 180, "image": "https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=900&q=85", "featured": True, "available": True},
    {"id": 3, "name": "Chicken Fried Rice", "category": "Fried Rice", "description": "Wok-tossed rice with chicken and fresh vegetables.", "price": 90, "image": "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=85", "featured": True, "available": True},
    {"id": 4, "name": "Egg Fried Rice", "category": "Fried Rice", "description": "Classic fried rice tossed with egg and spring onion.", "price": 70, "image": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=85", "featured": False, "available": True},
    {"id": 5, "name": "Grilled Chicken (Half)", "category": "Chicken", "description": "Juicy grilled chicken with a smoky finish.", "price": 150, "image": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=900&q=85", "featured": True, "available": True},
    {"id": 6, "name": "Shawarma (Regular)", "category": "Shawarma", "description": "Classic shawarma loaded with flavour.", "price": 100, "image": "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=85", "featured": True, "available": True},
    {"id": 7, "name": "Shawarma Plate", "category": "Shawarma", "description": "A generous plate with chicken, salad and sauce.", "price": 150, "image": "https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=900&q=85", "featured": False, "available": True},
    {"id": 8, "name": "Chicken 65", "category": "Chicken", "description": "Crispy, spicy bites with curry leaves.", "price": 120, "image": "https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=900&q=85", "featured": False, "available": True},
    {"id": 9, "name": "French Fries", "category": "Snacks", "description": "Golden, crispy and lightly seasoned.", "price": 70, "image": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=85", "featured": False, "available": True},
    {"id": 10, "name": "Chicken Nuggets", "category": "Snacks", "description": "Crunchy bites, perfect for sharing.", "price": 80, "image": "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=900&q=85", "featured": False, "available": True},
    {"id": 11, "name": "Peri Peri Chicken", "category": "Chicken", "description": "Spicy, smoky chicken with peri peri seasoning.", "price": 140, "image": "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=900&q=85", "featured": False, "available": True},
    {"id": 12, "name": "Cold Drinks", "category": "Beverages", "description": "Chilled soft drink. Choose your favourite.", "price": 30, "image": "https://images.unsplash.com/photo- soda-placeholder?auto=format&fit=crop&w=900&q=85", "featured": False, "available": True}
]
# Replace the intentionally generic drinks placeholder with a reliable photo URL.
SEED_MENU[-1]["image"] = "https://images.unsplash.com/photo-1513558161293-cdaf765edfd7?auto=format&fit=crop&w=900&q=85"
SEED_SETTINGS = {
    "name": "Namma Spot",
    "tagline": "Food Brings People Together",
    "subtitle": "Delicious food · Great taste · Good vibes",
    "phone": "",
    "address": "148, Poonamallee High Road, Village, Ondikuppam, Manavalanagar, Tamil Nadu",
    "map_url": "https://www.google.com/maps/dir/?api=1&destination=13.1099799%2C79.9191939",
    "instagram_url": "",
    "swiggy_url": "https://www.swiggy.com/search?query=Namma%20Spot%20Manavalanagar",
    "zomato_url": "https://www.zomato.com/chennai/namma-spot-ponniyammanmedu/order",
    "opening_hours": "Daily · 11:00 AM – 11:00 PM",
    "hero_image": "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1400&q=90",
    "about": "Good food, great taste and a warm welcome. Update this description to tell customers what makes your shop special."
}


def read_json(path, fallback):
    if not path.exists():
        return fallback.copy() if isinstance(fallback, dict) else list(fallback)
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return fallback.copy() if isinstance(fallback, dict) else list(fallback)


@contextmanager
def get_db_connection():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database():
    with get_db_connection() as connection:
        connection.executescript("""
            CREATE TABLE IF NOT EXISTS menu_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                price REAL NOT NULL,
                image TEXT NOT NULL DEFAULT '',
                featured INTEGER NOT NULL DEFAULT 0,
                available INTEGER NOT NULL DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS shop_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        """)
        migrated = connection.execute(
            "SELECT value FROM app_metadata WHERE key = 'json_migration_complete'"
        ).fetchone()
        if migrated:
            return

        menu = read_json(MENU_FILE, SEED_MENU)
        if not isinstance(menu, list):
            menu = SEED_MENU
        for item in menu:
            connection.execute(
                """INSERT OR IGNORE INTO menu_items
                   (id, name, category, description, price, image, featured, available)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    item.get("id"),
                    str(item.get("name", "")),
                    str(item.get("category", "")),
                    str(item.get("description", "")),
                    float(item.get("price", 0)),
                    str(item.get("image", "")),
                    int(bool(item.get("featured", False))),
                    int(bool(item.get("available", True))),
                ),
            )

        settings = read_json(SETTINGS_FILE, SEED_SETTINGS)
        if not isinstance(settings, dict):
            settings = SEED_SETTINGS
        connection.executemany(
            "INSERT OR IGNORE INTO shop_settings (key, value) VALUES (?, ?)",
            [(str(key), str(value)) for key, value in settings.items()],
        )
        connection.execute(
            "INSERT INTO app_metadata (key, value) VALUES ('json_migration_complete', '1')"
        )


def get_menu():
    with get_db_connection() as connection:
        rows = connection.execute(
            """SELECT id, name, category, description, price, image, featured, available
               FROM menu_items ORDER BY id"""
        ).fetchall()
    return [
        {
            **dict(row),
            "featured": bool(row["featured"]),
            "available": bool(row["available"]),
        }
        for row in rows
    ]


def get_settings():
    with get_db_connection() as connection:
        rows = connection.execute("SELECT key, value FROM shop_settings").fetchall()
    return {row["key"]: row["value"] for row in rows}


initialize_database()


def admin_required():
    if not session.get("is_admin"):
        return jsonify({"error": "Please log in as admin first."}), 401
    return None


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/admin")
def admin():
    return render_template("admin.html")


@app.get("/api/menu")
def api_menu():
    include_unavailable = request.args.get("all") == "1" and session.get("is_admin")
    items = get_menu()
    if not include_unavailable:
        items = [item for item in items if item.get("available", True)]
    return jsonify(items)


@app.get("/api/settings")
def api_settings():
    return jsonify(get_settings())


@app.get("/api/admin/status")
def admin_status():
    return jsonify({"logged_in": bool(session.get("is_admin"))})


@app.post("/api/admin/login")
def admin_login():
    payload = request.get_json(silent=True) or {}
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    if payload.get("password") != password:
        return jsonify({"error": "Incorrect password."}), 401
    session.clear()
    session["is_admin"] = True
    return jsonify({"ok": True})


@app.post("/api/admin/logout")
def admin_logout():
    session.clear()
    return jsonify({"ok": True})


@app.post("/api/admin/menu")
def add_menu_item():
    auth = admin_required()
    if auth:
        return auth
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    category = str(payload.get("category", "")).strip()
    try:
        price = float(payload.get("price", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Enter a valid price."}), 400
    if not name or not category or not math.isfinite(price) or price < 0:
        return jsonify({"error": "Name, category and a non-negative price are required."}), 400
    item = {
        "name": name,
        "category": category,
        "description": str(payload.get("description", "")).strip(),
        "price": price,
        "image": str(payload.get("image", "")).strip(),
        "featured": bool(payload.get("featured", False)),
        "available": bool(payload.get("available", True))
    }
    with get_db_connection() as connection:
        cursor = connection.execute(
            """INSERT INTO menu_items
               (name, category, description, price, image, featured, available)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                item["name"], item["category"], item["description"], item["price"],
                item["image"], int(item["featured"]), int(item["available"]),
            ),
        )
        item["id"] = cursor.lastrowid
    return jsonify(item), 201


@app.put("/api/admin/menu/<int:item_id>")
def update_menu_item(item_id):
    auth = admin_required()
    if auth:
        return auth
    payload = request.get_json(silent=True) or {}
    with get_db_connection() as connection:
        row = connection.execute(
            "SELECT * FROM menu_items WHERE id = ?", (item_id,)
        ).fetchone()
        if not row:
            return jsonify({"error": "Menu item not found."}), 404
        current = dict(row)
        name = str(payload.get("name", current["name"])).strip()
        category = str(payload.get("category", current["category"])).strip()
        try:
            price = float(payload.get("price", current["price"]))
        except (TypeError, ValueError):
            return jsonify({"error": "Enter a valid price."}), 400
        if not name or not category or not math.isfinite(price) or price < 0:
            return jsonify({"error": "Name, category and a non-negative price are required."}), 400
        item = {
            "id": item_id,
            "name": name,
            "category": category,
            "description": str(payload.get("description", current["description"])).strip(),
            "price": price,
            "image": str(payload.get("image", current["image"])).strip(),
            "featured": bool(payload.get("featured", current["featured"])),
            "available": bool(payload.get("available", current["available"])),
        }
        connection.execute(
            """UPDATE menu_items
               SET name = ?, category = ?, description = ?, price = ?, image = ?,
                   featured = ?, available = ?
               WHERE id = ?""",
            (
                item["name"], item["category"], item["description"], item["price"],
                item["image"], int(item["featured"]), int(item["available"]), item_id,
            ),
        )
    return jsonify(item)


@app.delete("/api/admin/menu/<int:item_id>")
def delete_menu_item(item_id):
    auth = admin_required()
    if auth:
        return auth
    with get_db_connection() as connection:
        cursor = connection.execute("DELETE FROM menu_items WHERE id = ?", (item_id,))
        if cursor.rowcount == 0:
            return jsonify({"error": "Menu item not found."}), 404
    return jsonify({"ok": True})


@app.put("/api/admin/settings")
def update_settings():
    auth = admin_required()
    if auth:
        return auth
    payload = request.get_json(silent=True) or {}
    allowed = ["name", "tagline", "subtitle", "phone", "address", "map_url", "instagram_url", "swiggy_url", "zomato_url", "opening_hours", "hero_image", "about"]
    current = get_settings()
    for key in allowed:
        if key in payload:
            current[key] = str(payload[key]).strip()
    if not current.get("name"):
        return jsonify({"error": "Shop name cannot be empty."}), 400
    with get_db_connection() as connection:
        connection.executemany(
            """INSERT INTO shop_settings (key, value) VALUES (?, ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value""",
            [(key, current[key]) for key in allowed if key in payload],
        )
    return jsonify(current)


if __name__ == "__main__":
    # Run with: python app.py
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=os.environ.get("FLASK_DEBUG", "0") == "1")
