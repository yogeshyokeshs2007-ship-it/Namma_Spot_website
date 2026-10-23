# Namma Spot — Restaurant Website + Admin Dashboard

A responsive restaurant website inspired by the supplied Namma Spot mockup, with a separate admin dashboard to edit menu items and shop details.

## Features

- Dark, premium-style landing page with orange accents and responsive mobile layout.
- Menu categories, live search, featured dishes, food cards, and prices.
- Basket with quantity controls and clear hand-off to Swiggy or Zomato. (Items are not automatically transferred into those apps.)
- Google Maps directions link, verified approximate shop address, Swiggy and Zomato links, and optional Instagram link. No mobile number is pre-filled.
- Admin sign-in at `/admin`.
- Dashboard overview, add/edit/delete menu items, show/hide dishes, feature dishes, and edit shop settings.
- SQLite stores menu and shop settings; existing JSON files are imported automatically on first startup.

> **Important:** The menu items and prices initially in the app are sample content based on the mockup, not verified prices for the real shop. Replace them with the actual menu before publishing. The shop address and opening hours are prefilled from public listings. The mobile number is intentionally left blank. Confirm the Zomato match (its listing shows Door 147 while Google Maps-associated information shows Door 148) and adjust Swiggy/Zomato links if needed before launch.

## Run locally (Windows)

1. Install Python 3.10 or newer.
2. Extract this ZIP, open the `namma-spot` folder in VS Code.
3. Open a terminal in that folder and run:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   $env:ADMIN_PASSWORD = "choose-a-strong-password"
   $env:SECRET_KEY = "replace-this-with-a-long-random-secret"
   python app.py
   ```

4. Open `http://127.0.0.1:5000` for the public website.
5. Open `http://127.0.0.1:5000/admin` for the admin dashboard and sign in with the password you set above.

For a quick local-only test, the dashboard password defaults to `admin123` if `ADMIN_PASSWORD` is not set. **Do not use that default on a public deployment.**

## Database

The Flask API reads and writes the menu and shop settings in SQLite. By default, the database is `namma_spot.sqlite3` inside `DATA_DIR` (the app folder unless `DATA_DIR` is set). Set `DATABASE_PATH` to choose a different SQLite file. On first startup, the app imports `menu_data.json` and `shop_data.json` if present; otherwise it loads the sample menu and default shop settings. After that, changes made in the admin dashboard are saved to SQLite.

Back up the SQLite file to preserve admin changes. On Render, attach a persistent disk and set `DATA_DIR` to its mount path (or set `DATABASE_PATH` directly to a file on that disk). JSON files are only used as initial import data after database migration.

## Configure shop information

Open `/admin`, log in, and select **Shop settings**. Set the shop name, tagline, optional WhatsApp number, address, opening hours, Google Maps URL, Swiggy URL, Zomato URL, Instagram URL, about text, and hero image URL. The WhatsApp/mobile number is optional. Delivery buttons link to Swiggy and Zomato; customers must re-add chosen items inside the delivery app.

In **Manage menu**, add your actual food items, categories, prices, photos and descriptions. The image field accepts a publicly accessible `https://` image URL.

## Deploy on Render

1. Push the extracted project folder to a GitHub repository.
2. In Render, create a **Web Service** connected to the repository.
3. Set **Build Command** to `pip install -r requirements.txt` and **Start Command** to `gunicorn app:app`.
4. Add environment variables:
   - `ADMIN_PASSWORD` — a strong admin password.
   - `SECRET_KEY` — a long random secret value.
   - `COOKIE_SECURE` — `1` when served over HTTPS (Render uses HTTPS).
   - `DATA_DIR` — optional. For persistence, point this to the mount path of a Render persistent disk, for example `/var/data`, and attach a disk at that path. The SQLite database is created there automatically.
5. Deploy and visit `/admin` to configure the shop.

**Persistence note:** If you leave `DATA_DIR` unset on an ephemeral host, the SQLite database lives inside the app directory and may be reset by redeploys or instance replacement. For changes to survive, attach a persistent disk and set `DATA_DIR` to its mount path. Do not share the admin password.

## Files

- `app.py` — Flask backend and API.
- `templates/index.html` — public website layout.
- `templates/admin.html` — admin console layout.
- `static/css/style.css` — public website styling.
- `static/css/admin.css` — dashboard styling.
- `static/js/main.js` — menu, basket, filters and delivery-platform hand-off.
- `static/js/admin.js` — dashboard login and CRUD actions.
- `menu_data.json` — starter menu data.
- `shop_data.json` — starter shop settings.
