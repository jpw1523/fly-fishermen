# 🎣 Fly Fishermen — Release HQ

*Album: **Top Hat to the Hoe Down** · out November 5, 2026*

A shared task dashboard for the album release. Anyone with the link can view and edit it — no accounts, no passcode. Changes sync live between everyone's phones.

Without Supabase keys in `config.js`, the page runs in **demo mode**: data stays in your own browser.

---

## One-time setup (~10 minutes)

### 1. Create the database (Supabase)
1. Sign up at [supabase.com](https://supabase.com) and click **New project**.
   - **Database password:** click *Generate a password* and save it in your password manager (the dashboard doesn't use it).
   - **Enable Data API:** keep it **on**.
   - The other security checkboxes can be on or off — the setup script handles them.
2. When the project is ready, open **SQL Editor → New query**.
3. Open `supabase/setup.sql`, copy it all, and paste it in.
4. Near the top, replace `Me` with your name.
5. Click **Run**. You should see "Success".

### 2. Connect the page to the database
1. In Supabase, go to **Project Settings → API** (or **Data API**).
2. Copy the **Project URL** and the **anon / public** key (*not* the `service_role` key — never put that one in the page).
3. Paste them into `config.js`:
   ```js
   window.TOPHAT_CONFIG = {
     supabaseUrl: "https://xxxx.supabase.co",
     supabaseAnonKey: "eyJ..."
   };
   ```

### 3. Put it online (GitHub Pages)
1. On GitHub, create a new repository (e.g. `fly-fishermen`). Public is fine; the anon key is designed to be public.
2. Upload these files, keeping the folder structure: `index.html`, `styles.css`, `app.js`, `config.js`, `supabase/setup.sql`, `README.md`.
   (On the repo page: **Add file → Upload files**, drag them in, **Commit changes**.)
3. Go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. After a minute your dashboard is live at `https://<your-username>.github.io/fly-fishermen/`.

### 4. Share it
Send Nick and Gabe the link. On each phone: open it → **Settings (gear) → Who are you?** so status changes show your name.

Tip: on iPhone, Share → **Add to Home Screen** makes it feel like an app.

---

## Good to know
- **"Couldn't load the dashboard"?** Free Supabase projects pause after ~7 days with no visits. Log into Supabase and click **Restore project**; nothing is lost.
- **Anyone with the link can edit or delete.** Only share it with the band, and don't put passwords or account logins in task notes.

## Files
| File | What it is |
|---|---|
| `index.html` | The page |
| `styles.css` | Look and feel (light & dark mode) |
| `app.js` | All the app logic: rendering, saving, live sync, demo mode |
| `config.js` | Your Supabase URL + public key |
| `supabase/setup.sql` | Creates the tables, access rules, and starting task list |
