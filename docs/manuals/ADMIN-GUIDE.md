# CanvasCore Administrator Guide

This guide is for the person who installs, hosts and runs a CanvasCore site: preparing the
server, installing and updating, managing accounts, publishing, backups, forms and security.
It assumes you are comfortable with a hosting control panel, FTP/SFTP and a shell, but not
that you are a developer.

- Building and editing pages: [User Guide](USER-GUIDE.md)
- Architecture, local development, tests: [Developer Guide](DEVELOPER-GUIDE.md)

Throughout this guide, `example.com` is your domain and `/var/www/example.com/public` is the
web root (the folder the domain serves). Replace both with your own values.

---

## 1. Requirements

| Item | Requirement |
|---|---|
| PHP | **8.0 or newer** (the installer refuses older versions) |
| PHP extensions (required) | `pdo_sqlite`, `json`, `session`, `mbstring` |
| PHP extensions (recommended) | `dom` (without it rich text is cleaned by a simpler, more conservative fallback sanitizer, and SVG uploads are checked with a simpler test) |
| PHP functions | `mail()` enabled, if you want form notifications by email (submissions are stored either way) |
| PHP settings | `file_uploads = On`; `upload_max_filesize` / `post_max_size` large enough for your images (and for backup files you import) |
| Web server | Apache 2.4 (with `.htaccess` enabled) or Nginx + PHP-FPM |
| HTTPS | Strongly recommended. Without it, passwords and session cookies travel unencrypted |
| To build the editor | Node.js 20 or newer and npm (on your computer, not on the server) |

> `mbstring` is not checked by the installer, but the form handler uses it: make sure it is
> enabled (it is on almost every PHP host).

The installer (`install.php`) checks all of the above and shows each item as OK, warning or
failure before it lets you install.

---

## 2. Folder layout on the server

CanvasCore lives **inside** the site it publishes. The admin folder sits directly in the web
root, and published pages are written to the folder above it (the web root itself).

```
/var/www/example.com/
├── canvascore-data/              Data: DB, settings, sessions (NOT reachable from the web)
│   ├── canvascore.sqlite         Pages, collections, accounts, templates, masters, submissions
│   ├── settings.json             Global Options
│   ├── menu.json                 Menu
│   ├── forms.json                Form registry (form id → recipient), written on publish
│   ├── published_files.json      List of pages written by the last successful publish
│   ├── login_attempts.json       Login throttling state
│   ├── rate_forms.json           Form rate-limit state
│   ├── sessions/                 PHP session files for the editor
│   └── .htaccess                 "Deny all" (safety net)
└── public/                       Web root
    ├── index.html                Home page          ┐
    ├── about/index.html          One folder per page │
    ├── blog/my-post/index.html   Collection items    │ written by "Publish Site"
    ├── sitemap.xml, robots.txt   SEO files           │
    ├── 404.html                  Not-found page      │
    ├── .htaccess                 ErrorDocument 404   ┘ (created once, Apache only)
    ├── uploads/                  Media library (images), with its own .htaccess
    └── canvascore-admin/         The editor (PHP backend + built React app)
        ├── index.html, assets/   Editor build (from canvascore-frontend/dist/)
        ├── api.php, rebuild_all.php, submit_form.php, config.php, ...
        └── version.json          Version of the installed release
```

Rules to keep in mind:

1. **Keep the folder name `canvascore-admin`.** Published forms post to
   `canvascore-admin/submit_form.php`, and that name is reserved as a URL. Renaming the folder
   breaks the site's forms.
2. **The admin folder must sit directly in the web root.** Publishing writes to its parent folder.
   If the site lives in a sub-path (for example `example.com/site/`), put `canvascore-admin`
   inside `site/`; links are generated relative to that path.
3. **Data directory.** CanvasCore uses `canvascore-data/` two levels above `canvascore-admin`
   (that is, next to the web root, outside it) **if PHP can write there**. Otherwise it falls
   back to `canvascore-admin/data/`, inside the web root, protected only by a `.htaccess` file.
   - The choice is made automatically on every request. If the outside folder becomes writable
     later, the database and the `settings.json`, `menu.json`, `forms.json` files are copied there
     and the old database file is deleted; the reverse happens if the outside folder stops being
     writable.
   - To get the recommended layout, create the folder and give the PHP user write access:
     ```bash
     mkdir /var/www/example.com/canvascore-data
     chown www-data:www-data /var/www/example.com/canvascore-data
     chmod 750 /var/www/example.com/canvascore-data
     ```
     (`www-data` is the PHP user on Debian/Ubuntu; it may be `apache`, `nginx` or your hosting
     account user elsewhere.)
   - If your domain's web root is the account root itself, check where `canvascore-data` ends up
     and make sure it cannot be opened with a URL.
4. **Write permissions.** PHP must be able to write to the web root (published pages), to
   `uploads/` and to the data directory.

---

## 3. Installation

### 3.1 Build the editor (on your computer)

1. Get the release source and open a terminal in `canvascore-frontend/`.
2. Run:
   ```bash
   npm install
   npm run build
   ```
   The build writes the editor into `canvascore-frontend/dist/` and increments the build number
   in `canvascore-admin/version.json` (via `scripts/bump.mjs`). Always upload that
   `version.json` together with the build.

### 3.2 Upload

1. Upload the whole `canvascore-admin/` folder into the web root, keeping its name:
   `/var/www/example.com/public/canvascore-admin/`.
2. Copy the **contents** of `canvascore-frontend/dist/` (`index.html`, `assets/`, icons) into
   that same `canvascore-admin/` folder.
3. Create the data folder outside the web root as shown in section 2 (recommended).
4. Make sure PHP can write to the web root and to `uploads/` (it is created on first upload).

### 3.3 Run the setup wizard

1. Open `https://example.com/canvascore-admin/install.php`.
2. Review the requirements list. Failures (red) must be fixed before you can continue; warnings
   (for example "Data folder inside the web root", "mail() unavailable", "Not using HTTPS") let you
   install but should be fixed soon.
3. Fill in the form:
   - **Site name** (up to 120 characters) and **site address** (for example
     `https://www.example.com`; used for the sitemap, `robots.txt` and social sharing tags).
   - **Administrator username**: 3–32 characters, letters, digits, `.`, `-`, `_`, `@`.
   - **Password**: at least 8 characters, not `admin` and not equal to the username.
   - **Email for forms** (optional): the default recipient of form submissions.
   - **Starter** (optional): creates a homepage from a template, saved as a **draft**.
4. Submit. The wizard creates the database, replaces the default `admin`/`admin` account with
   yours, saves the settings and signs you in to the editor.
5. **Delete `install.php`.** The wizard offers a button for it. If the automatic deletion fails,
   remove the file by FTP/SSH. Once the site is installed the wizard locks itself anyway (it
   only offers to delete itself), but it should not stay on the server.

### 3.4 First login without the wizard

If you skip the wizard and open `https://example.com/canvascore-admin/` directly, the database
is created with a default account **`admin` / `admin`**. You must choose a new password
(8 or more characters, not `admin`) before you can do anything else.

> Do this immediately after uploading: until the password is changed, anyone who reaches the
> login page first can sign in with the default credentials. Using the wizard avoids this window.

### 3.5 After installation

1. In **Global Options**, check the site address, the form emails and the session timeout.
2. Build your homepage, mark it as Home and click **Publish Site**.
3. Open `https://example.com/` and check that the page and `https://example.com/sitemap.xml` load.

---

## 4. Web server configuration

### 4.1 Apache

CanvasCore writes its own `.htaccess` files; they work only if Apache reads them
(`AllowOverride All` for the site directory is the simplest setting).

| File | Written when | Content |
|---|---|---|
| `canvascore-data/.htaccess` and `canvascore-admin/data/.htaccess` | on every request, if missing or changed | Deny all access |
| `uploads/.htaccess` | on every image upload, if missing or changed | Deny `.php`, `.phtml`, `.phar`, `.php3`–`.php7`, `.phps`, `.pht`, `.cgi`, `.pl`, `.py`, `.sh`; `php_flag engine off` under mod_php; for `.svg`, the header `Content-Security-Policy: script-src 'none'; sandbox` (needs `mod_headers`) |
| `.htaccess` in the web root | on publish, **only if it does not exist yet** | `ErrorDocument 404 /404.html` (with the site's base path) |

If you already have a root `.htaccess` (redirects, HTTPS rules), CanvasCore does not touch it:
add the line `ErrorDocument 404 /404.html` yourself.

### 4.2 Nginx

Nginx ignores `.htaccess` files, so the same protections must go into the server block.
A complete example for PHP-FPM:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;
    root /var/www/example.com/public;
    index index.html index.php;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    client_max_body_size 20m;            # image uploads and backup imports

    # Data folder, if it ever falls back inside the web root
    location ^~ /canvascore-admin/data/ { deny all; return 404; }

    # Hidden files (.htaccess, .cc_wtest_*)
    location ~ /\. { deny all; return 404; }

    # Uploads: never execute scripts, and sandbox SVGs
    location ^~ /uploads/ {
        location ~* \.(php|phtml|phar|php[3-7]|phps|pht|cgi|pl|py|sh)$ { deny all; return 404; }
        location ~* \.svg$ { add_header Content-Security-Policy "script-src 'none'; sandbox"; }
    }

    location / {
        try_files $uri $uri/ =404;
    }

    error_page 404 /404.html;

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;   # adjust to your PHP version
    }
}

server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}
```

The `^~` prefix makes the uploads and data rules win over the `\.php$` location, so a script
uploaded under another name can never reach PHP-FPM.

### 4.3 HTTPS

1. Install a certificate (Let's Encrypt or your host's panel) and redirect HTTP to HTTPS.
2. Behind a proxy or load balancer that terminates TLS, make sure it sends
   `X-Forwarded-Proto: https`: CanvasCore uses it to mark the session cookie `Secure`.
3. Set the site address in Global Options to the `https://` URL and publish again, so the
   sitemap and sharing tags use it.

---

## 5. Updating to a new version

The frontend (editor build) and the PHP files form **one release**: always deploy them together.
An editor build talking to older PHP files (or the reverse) can fail in unexpected ways.

1. **Back up first** (section 8.2): data directory, `uploads/` and the site files.
2. On your computer, build the new release: `cd canvascore-frontend && npm install && npm run build`.
3. Upload the new `canvascore-admin/` files, overwriting the old ones (`*.php`, `*.json`,
   `master.html`, `effects.css`, `version.json`).
   - **Do not** delete or overwrite `canvascore-admin/data/` if your data lives there.
   - **Do not** touch `uploads/` or `canvascore-data/`.
4. Copy the contents of the new `dist/` into `canvascore-admin/`. You can delete the old
   `canvascore-admin/assets/` folder first; the new `index.html` points to the new files.
5. Delete the `install.php` that came with the release (it is locked on an installed site, but
   should not stay on the server).
6. Open the editor. **Database migrations run automatically** on the first request: each
   pending schema step is applied in order, in a transaction, and recorded in the `cc_meta`
   table. There is nothing to run by hand.
7. Ask everyone to **reload any open editor tabs** (a hard refresh, Ctrl/Cmd+Shift+R). A tab
   opened before the update still runs the old editor.
8. Check the version at the bottom of the sidebar: `CanvasCore v0.13.0 · build 20` (example).
   If an orange line says `Editor vX / server vY: reload the page after updating`, the browser
   is still running the old editor: reload it. If the warning persists after a reload, the new
   `dist/` was not uploaded (or a cache/CDN is serving the old `index.html`).
9. Click **Publish Site** so every page is regenerated with the new release (the version is
   written into each page as `<meta name="generator" content="CanvasCore x.y.z">`).

The release notes (`docs/RELEASE-NOTES-x.y.z.md`) and `docs/CHANGELOG.md` list what changed.

---

## 6. Accounts and roles

Accounts are managed in **Accounts** (admins only). There are two roles.

**Admin**: full access.

**Editor**: can edit and publish pages, collection items, menu, media, templates, masters,
header/footer and most Global Options, and can run Publish Site. Editors **cannot**:

- see or manage **Accounts** (list, add, delete, reset passwords);
- use **Backup** (export or import the site);
- see, export or delete form **Submissions**;
- create or delete **collections** (they can edit the items of existing ones);
- save **code**: the content of HTML blocks and custom CSS/JS are removed server-side from
  anything an editor saves (pages, items, header/footer, masters); the HTML block and the
  Custom Code panel are hidden for them;
- change the **form email settings** (default recipient, From address, subject) or the
  **session timeout**: when an editor saves Global Options, those fields keep their current
  values.

Every user, whatever the role, can change their own password.

### 6.1 Add a user

1. Go to **Accounts**.
2. Enter a username, a temporary password and the role (Editor or Admin), then add the account.
3. Give the credentials to the person through a safe channel. At their first sign-in they must
   choose a new password (8 or more characters).

The role cannot be changed later: to change it, delete the account and create it again (the
person's pages are kept).

### 6.2 Reset a password

1. In **Accounts**, choose the password action on the user's row.
2. Enter the new password twice (at least 8 characters).
3. The user signs in with it and is asked to choose a new one immediately.

### 6.3 Delete a user

1. In **Accounts**, click delete on the row and confirm.
2. The person can no longer sign in; the pages they wrote stay.

You cannot delete your own account, so there is always at least one admin left (you).

### 6.4 Lost the only admin password

There is no "forgot password" email. With shell access to the server:

```bash
cd /var/www/example.com/canvascore-data          # or public/canvascore-admin/data
cp canvascore.sqlite canvascore.sqlite.bak
HASH=$(php -r 'echo password_hash("Temporary-Pass-2026", PASSWORD_DEFAULT);')
sqlite3 canvascore.sqlite "UPDATE admin SET password_hash='$HASH', must_change_pw=1 WHERE username='admin';"
```

Replace `admin` with the actual username. Sign in with the temporary password and choose a new one.

---

## 7. Publishing

CanvasCore stores everything in the database; visitors only ever see the static HTML files
produced by publishing.

- **Publish** (in the page editor) saves the page as published **and then rebuilds the whole
  site**.
- **Publish Site** (sidebar) rebuilds the whole site from what is currently published. Saving
  Global Options, the menu, or importing a backup also triggers it.
- **Save Draft** never changes the live site. Editing a published page keeps the live version
  online until you publish again.

### 7.1 What a publish writes

| Output | Path |
|---|---|
| Home page | `index.html` in the web root (the page marked Home; without one, a page with slug `index` or `home`) |
| Every other published page | `<slug>/index.html` |
| Every published collection item | `<collection-slug>/<item-slug>/index.html` |
| Sitemap | `sitemap.xml` (all published pages and items; absolute URLs if the site address is set) |
| Robots | `robots.txt` (`Allow: /` or `Disallow: /` per Global Options, plus the `Sitemap:` line if the site address is set) |
| Not-found page | `404.html` |
| Apache 404 rule | `.htaccess` in the web root, only if it does not exist |
| Form registry | `forms.json` in the data directory |
| Manifest | `published_files.json` in the data directory |

A URL can belong to only one live page, collection or system folder (`uploads`,
`canvascore-admin`): publishing a page on a URL already in use is refused with a message.

### 7.2 Removal of stale pages

After a fully successful publish, CanvasCore compares the pages it just wrote with the
manifest of the previous publish (`published_files.json`) and deletes the `index.html` of pages
that are no longer published (deleted, unpublished, renamed, deleted collection items), plus
the folders left empty. It only ever deletes files that a previous publish wrote, and never the
root `index.html`. Files you placed in the web root yourself are never touched.

If any file could not be written, nothing is removed and the manifest is not updated, so the
next successful publish cleans up.

### 7.3 Results and errors

- Success: `Build successful: N pages published.` (plus `N old page(s) removed.` when relevant).
- `Publish incomplete: N file(s) could not be written (check the folder permissions on the server), e.g. about/index.html.`
  See section 11.
- `PHP Error: ...` / `Database not found.` / `master.html missing!`: see section 11.

Publishing only accepts a POST with the session's security token: a link or another website
cannot trigger it.

---

## 8. Backup and restore

### 8.1 Export / import from the Backup page (admins)

**Export** (Backup → Download backup) downloads `canvascore-site-YYYY-MM-DD.json` with:

- pages (live versions; unsaved draft copies of published pages are not included),
- menu, Global Options (including form emails),
- global header and footer,
- masters and templates,
- the **list of names** of the uploaded images (not the images themselves).

It does **not** include:

- **collections and their items**,
- **uploaded images** (copy `uploads/` separately),
- **user accounts**,
- **form submissions**.

**Import** (Backup → Import a backup file) **replaces** all pages, masters, templates, the
menu, Global Options and the header/footer with the file's content, then republishes the site.
Accounts are kept. Collections and submissions are left as they are. It cannot be undone:
export the current site first.

Use export/import to move content between installations or as a quick content snapshot. It is
not a complete backup.

### 8.2 Full backup (recommended)

A complete backup is three folders:

1. **The data directory** (`canvascore-data/` or `canvascore-admin/data/`): the database with
   everything including collections, accounts and submissions, plus settings and menu.
2. **`uploads/`**: all images.
3. **The site files** (optional, they can be regenerated by publishing): the web root without
   `uploads/` and `canvascore-admin/`.

Example nightly backup with a consistent SQLite copy:

```bash
#!/bin/sh
SITE=/var/www/example.com
DEST=/backups/example.com/$(date +%F)
mkdir -p "$DEST"
sqlite3 "$SITE/canvascore-data/canvascore.sqlite" ".backup '$DEST/canvascore.sqlite'"
tar czf "$DEST/data.tgz" -C "$SITE" --exclude=canvascore-data/sessions canvascore-data
tar czf "$DEST/uploads.tgz" -C "$SITE/public" uploads
```

Keep copies off the server. `sqlite3 .backup` is safe while the site is in use; copying the
`.sqlite` file directly is fine when nobody is editing.

### 8.3 Restore from a full backup

1. Put the release's `canvascore-admin/` in place (section 3.2), without running the installer.
2. Restore the data directory and `uploads/`; make sure the PHP user owns them and can write.
3. Sign in and click **Publish Site** to regenerate all pages.

---

## 9. Forms and email

### 9.1 Recipients and sender

- **Per-form recipient**: the Form block's own receiving email.
- **Default recipient**: Global Options → Form emails → *Default receiving email (To)*, used by
  forms without their own address.
- **From** address: *Sender email (From)*; if empty, `noreply@<your domain>`. It is also used as
  Reply-To. Use an address on your own domain, or many mail servers will reject or junk the
  message.
- **Subject**: *Default subject*, otherwise "New submission from your website".

Recipients are never sent to the browser: on publish, CanvasCore writes `forms.json` in the
data directory (form id → recipient) and `submit_form.php` reads it. **After changing a form's
recipient, publish the site** so the registry is updated.

If no valid recipient is found, the visitor sees "Form is not configured: set a valid receiving
email in Global Options." (the submission is still stored).

### 9.2 Sending

Email is sent with PHP's `mail()`, as plain text. It needs a working mail setup on the server
(sendmail/postfix, or the host's mail service). If `mail()` is disabled or fails, the visitor
sees "Error sending email. Please check the server mail configuration." and the submission is
still saved in the database.

### 9.3 Submissions

Every accepted submission is stored before the email is attempted. Admins see them in
**Submissions** (the latest 1000 in the list), can search, delete one or clear all, and
export **CSV** (all submissions, one column per field label). In the CSV, values starting with
`=`, `+`, `-`, `@`, tab or carriage return are prefixed with `'` so that spreadsheets do not run
them as formulas.

### 9.4 Spam protection

- **Honeypot**: a hidden field that people never fill in. If it is filled, the visitor sees the
  success message but nothing is stored or sent.
- **Rate limit**: at most **8 submissions every 10 minutes per IP address**; beyond that the
  visitor gets "Too many messages sent in a short time." (HTTP 429).
- **Unknown forms refused**: a submission naming a form that is not in the published registry
  is rejected ("This form is no longer available."). This check is active once the site has been
  published with at least one form.
- Only `POST` is accepted; field values are length-limited when stored.

---

## 10. Security

What CanvasCore does for you:

- **Data outside the web root**: database, settings and sessions live in `canvascore-data/`
  when writable; otherwise in `canvascore-admin/data/` with a deny-all `.htaccess` (Apache only;
  on Nginx add the deny rule from section 4.2).
- **Sessions**: cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` over HTTPS; the session ID is
  regenerated at login; session files are stored in the data directory (`sessions/`), isolated
  from other apps. Sessions expire after **30 minutes of inactivity** by default, adjustable by an
  admin from **5 to 720 minutes** (Global Options → Security). The editor warns about 2 minutes
  before expiry and keeps unsaved work when you sign in again.
- **CSRF**: every state-changing request needs a per-session token sent in the `X-CSRF-Token`
  header; otherwise the server answers 403 ("Invalid CSRF token. Reload the page.").
- **Login throttling**: **5 wrong passwords in 15 minutes** for the same account from the same
  IP address lock that account/address pair for **15 minutes**.
- **Forced password changes**: the default `admin`/`admin`, new accounts and reset passwords
  must be changed at first sign-in (8 or more characters).
- **HTML sanitizer**: rich text is filtered through an allow-list that removes scripts, iframes,
  forms, `on*` event handlers and `javascript:`/`vbscript:`/`data:` links (only `data:image` is
  allowed in image sources).
- **Uploads**: only `jpg`, `jpeg`, `png`, `gif`, `webp`, `avif`, `svg`, `ico`, `bmp`; raster
  files must be real images; SVGs with scripts, event handlers, `javascript:` links, embedded
  HTML (`foreignObject`) or external entities are refused. File names are sanitized and
  prefixed with a timestamp. The uploads folder cannot run scripts (Apache `.htaccess`, or the
  Nginx rules in section 4.2).
- **Editors' limits**: see section 6.
- **Publishing and forms**: publishing requires POST + token; form recipients are only read
  from the server-side registry (no open mail relay).

Recommended hardening:

1. Use HTTPS everywhere and redirect HTTP.
2. Make sure the data directory is outside the web root; test that
   `https://example.com/canvascore-admin/data/canvascore.sqlite` returns 403/404.
3. Delete `install.php` after installing and after every update.
4. Give accounts the Editor role unless they need admin rights; remove accounts that are no
   longer used.
5. On Nginx, add the deny rules from section 4.2 (the app cannot do it for you).
6. Optionally restrict `/canvascore-admin/` by IP or with HTTP basic auth at the web server, if
   your editors work from known locations. Leave `/canvascore-admin/submit_form.php` reachable,
   or the site's forms stop working.
7. Keep PHP up to date and keep regular off-server backups (section 8.2).

---

## 11. Troubleshooting

**"Publish incomplete: N file(s) could not be written"**
PHP cannot write in the web root or in a page folder. Give the PHP user write access to the web
root and its sub-folders (for example `chown -R www-data:www-data /var/www/example.com/public`,
or fix ownership in your hosting panel), then publish again. Stale pages are only cleaned up
after a complete publish.

**"PHP Error: …" or "Database not found." when publishing**
The message comes from the server. "Database not found" means the data directory moved or
became unreadable: check that `canvascore-data/` (or `canvascore-admin/data/`) exists and is
writable. "master.html missing!" means the upload of `canvascore-admin/` was incomplete.

**Uploads fail or images return HTTP 500**
- On Apache, a 500 on files in `uploads/` usually means the server refuses a directive in
  `uploads/.htaccess`. Check the Apache error log, and allow overrides for the site directory
  (`AllowOverride All`).
- "File type not allowed" / "The file is not a valid image": only the image types in section 10
  are accepted, and a renamed non-image is refused.
- "This SVG contains scripts…": export the SVG again as a plain SVG, or as PNG.
- "No file received or upload error": the file is larger than `upload_max_filesize` /
  `post_max_size` (Apache/PHP) or `client_max_body_size` (Nginx).
- "Cannot move the uploaded file": `uploads/` is not writable by PHP.

**Form emails are not received**
1. Check the installer report or ask your host whether `mail()` is enabled.
2. Check the recipient (Form block or Global Options) and **publish** after changing it.
3. Set a From address on your own domain and configure SPF/DKIM for it; check spam folders.
4. Look in **Submissions**: if the message is there, the form works and the problem is mail
   delivery.

**Session keeps expiring**
The default is 30 minutes without activity. An admin can raise it (up to 720 minutes) in Global
Options → Security. If sessions expire much sooner than configured, check that the data
directory's `sessions/` folder is writable (otherwise PHP's default session folder is used and
other applications' cleanup may delete CanvasCore sessions).

**"Too many failed attempts. Try again in N minute(s)."**
Five wrong passwords for that account from that address. Wait 15 minutes. To unlock at once,
delete `login_attempts.json` from the data directory (this resets the counters for everyone).
If the user forgot the password, an admin can reset it (section 6.2).

**"Invalid CSRF token. Reload the page."**
The editor tab is older than the current session (for example after a sign-in in another tab
or an update). Reload the page.

**Deleted or renamed pages are still online**
They are removed on the next successful **Publish Site**. Files created by an old version
before the manifest existed, or files you added by hand, are never deleted automatically:
remove them by FTP/SSH.

**Version mismatch warning in the sidebar**
`Editor vX / server vY: reload the page after updating`: reload the tab (hard refresh). If it
persists, upload the new `dist/` contents into `canvascore-admin/` and make sure no cache or CDN
serves an old `canvascore-admin/index.html`.

**404 page not shown**
On Apache, check that the root `.htaccess` contains `ErrorDocument 404 /404.html` (CanvasCore
creates it only when the file does not exist). On Nginx, add `error_page 404 /404.html;`.

**Where are the PHP errors?**
The API and the publisher never print PHP errors in their answers; errors go to the PHP error
log. Its location depends on the server: typically `/var/log/apache2/error.log`,
`/var/log/nginx/error.log` or `/var/log/php8.x-fpm.log`, or the "Error log" section of your
hosting panel. `php -i | grep error_log` shows the configured file. Installer errors are logged
with the prefix `CanvasCore install:`.
