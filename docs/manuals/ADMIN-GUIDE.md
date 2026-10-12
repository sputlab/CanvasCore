# CanvasCore Administrator Guide

This guide is for the person who installs, hosts and runs a CanvasCore site: preparing the
server, installing and updating, managing accounts, publishing, backups, forms and security.
It assumes you are comfortable with a hosting control panel, FTP/SFTP and a shell, but not
that you are a developer.

- Building and editing pages: [User Guide](USER-GUIDE.md)
- Architecture, local development, tests: [Developer Guide](DEVELOPER-GUIDE.md)

Throughout this guide, `example.com` is your domain and `/var/www/example.com/public` is the
web root (the folder the domain serves). Replace both with your own values.

**Contents**

1. [Requirements](#1-requirements)
2. [Folder layout on the server](#2-folder-layout-on-the-server)
3. [Installation](#3-installation)
4. [Web server configuration](#4-web-server-configuration) (Apache, Nginx, HTTPS, reverse proxy / CDN)
5. [Updating to a new version](#5-updating-to-a-new-version)
6. [Accounts and roles](#6-accounts-and-roles)
7. [Publishing](#7-publishing) (what a publish writes, redirects, RSS, site search, cookie banner, images)
8. [Backup and restore](#8-backup-and-restore)
9. [Forms and email](#9-forms-and-email)
10. [Security](#10-security)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Requirements

| Item | Requirement |
|---|---|
| PHP | **8.0 or newer** (the installer refuses older versions) |
| PHP extensions (required) | `pdo_sqlite`, `json`, `session` |
| PHP extensions (recommended) | `dom` (without it rich text is cleaned by a simpler, more conservative fallback sanitizer, and SVG uploads are checked with a simpler test) |
| PHP extensions (optional) | `gd` **with WebP support** (`imagewebp()`), for image optimization: without it uploaded images are used as they are, with no smaller copies (section 7.7). `exif`, to turn phone photos the right way up in those copies. `mbstring`: CanvasCore has built-in fallbacks for the functions it uses, so forms, the site search and the media library work without it |
| PHP functions | `mail()` enabled, if you want form notifications by email (submissions are stored either way) |
| PHP settings | `file_uploads = On`; `upload_max_filesize` / `post_max_size` large enough for your images (and for backup files you import); a `memory_limit` large enough for your photos if you want them optimized (about 5 bytes per pixel: a 12-megapixel photo needs roughly 60 MB free; larger images are skipped) |
| Web server | Apache 2.4 (with `.htaccess` enabled; `mod_alias` for real 301 redirects) or Nginx + PHP-FPM |
| HTTPS | Strongly recommended. Without it, passwords and session cookies travel unencrypted |
| To build the editor | Node.js 20 or newer and npm (on your computer, not on the server) |

The installer (`install.php`) checks the PHP version, the required extensions, `dom`, the
writable folders, the editor build, `mail()` and HTTPS, and shows each item as OK, warning or
failure before it lets you install. It does **not** check GD/WebP or `mbstring`: to see whether
GD can write WebP, run `php -r 'var_dump(function_exists("imagewebp"));'` with the same PHP the
site uses (or look for "WebP Support" in the `gd` section of `phpinfo()`).

---

## 2. Folder layout on the server

CanvasCore lives **inside** the site it publishes. The admin folder sits directly in the web
root, and published pages are written to the folder above it (the web root itself).

```
/var/www/example.com/
├── canvascore-data/              Data: DB, settings, sessions (NOT reachable from the web)
│   ├── canvascore.sqlite         Pages, collections, accounts, templates, masters, submissions,
│   │                             version history (page_revisions), redirects
│   ├── settings.json             Global Options
│   ├── menu.json                 Menu
│   ├── media.json                Image metadata: description (alt text), size, optimized copies
│   ├── forms.json                Form registry (form id → recipient), written on publish
│   ├── published_files.json      Files written by the last successful publish (pages, items,
│   │                             redirect pages, feed.xml, ...)
│   ├── login_attempts.json       Login throttling state
│   ├── rate_forms.json           Form rate-limit state
│   ├── sessions/                 PHP session files for the editor
│   └── .htaccess                 "Deny all" (safety net)
└── public/                       Web root
    ├── index.html                Home page               ┐
    ├── about/index.html          One folder per page      │
    ├── blog/my-post/index.html   Collection items         │
    ├── blog/feed.xml             RSS feed per collection  │ written by "Publish Site"
    ├── old-page/index.html       Redirect page (old URL)  │
    ├── sitemap.xml, robots.txt   SEO files                │
    ├── search-index.json         Site search data         │
    ├── 404.html                  Not-found page           │
    ├── .htaccess                 ErrorDocument 404 +      ┘ (Apache only; see 4.1)
    │                             "CanvasCore redirects" block
    ├── uploads/                  Media library (images), with its own .htaccess
    │   └── _cc/                  Optimized WebP copies (480/960/1600 px), made on upload
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
     writable. Other files are **not** moved: copy `media.json` (image descriptions) and
     `published_files.json` (stale page cleanup) to the new folder yourself.
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
4. **Write permissions.** PHP must be able to write to the web root (published pages, feeds,
   `search-index.json`, the root `.htaccess` on Apache), to `uploads/` (including the `_cc/`
   sub-folder it creates) and to the data directory.

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

1. In **Global Options**, check the site address (needed for RSS feeds and canonical links),
   the form emails and the session timeout. If the site is behind a reverse proxy or CDN, fill
   in **Trusted proxy addresses** (section 4.4). Turn on the **Cookie banner** if the site needs
   one (section 7.6).
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
| `.htaccess` in the web root | on every publish | Created with `ErrorDocument 404 /404.html` (with the site's base path) if it does not exist. On every publish CanvasCore rewrites **only** the block between `# BEGIN CanvasCore redirects` and `# END CanvasCore redirects` (one `Redirect 301 /old/ /new/` line per redirect, inside `<IfModule mod_alias.c>`); the block is removed when there are no redirects |

If you already have a root `.htaccess` (HTTPS rules, your own redirects), CanvasCore keeps
everything outside its marked block as it is; it does not add the `ErrorDocument` line to an
existing file, so add `ErrorDocument 404 /404.html` yourself. Do not edit inside the marked
block: it is replaced on the next publish. Manage redirects in Global Options › Redirects
instead (section 7.4).

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

**Redirects on Nginx.** Nginx ignores the `.htaccess` block of 301s. The old addresses still
work, because publishing also writes a small redirect page at each old address (it sends the
browser on at once and tells search engines the new address with a canonical link), but they
answer `200` instead of a permanent `301`. To give search engines real 301s, copy the list from
Global Options › Redirects into the server block, one line per redirect, and reload Nginx:

```nginx
    location = /old-page/          { return 301 /new-page/; }
    location = /blog/old-post/     { return 301 /blog/new-post/; }
```

Repeat this when the list changes (renaming a published page or item adds a redirect). An exact
`location =` match wins over `location /`, so the redirect page on disk is never reached.

### 4.3 HTTPS

1. Install a certificate (Let's Encrypt or your host's panel) and redirect HTTP to HTTPS.
2. Behind a proxy or load balancer that terminates TLS, make sure it sends
   `X-Forwarded-Proto: https`: CanvasCore uses it to mark the session cookie `Secure`.
3. Set the site address in Global Options to the `https://` URL and publish again, so the
   sitemap, canonical links, RSS feeds and sharing tags use it.

### 4.4 Behind a reverse proxy or CDN

Behind a reverse proxy, load balancer or CDN (Cloudflare, a Docker/Kubernetes ingress, an Nginx
in front of Apache…), every request reaches PHP from the proxy's address. Login throttling and
the form rate limit would then count all visitors as one: one person's wrong passwords could
lock an account for everybody, and 8 messages from anyone would block the site's forms.

Fix it in **Global Options › Security › Trusted proxy addresses** (admins): enter the IP
addresses the proxy connects from, separated by commas (for example `10.0.0.2, 10.0.0.3`).
Only valid IP addresses are kept; ranges (CIDR) are not accepted, so list each address.

- When a request comes **from a listed address**, CanvasCore reads `X-Forwarded-For` and uses
  the nearest address in it that is not a listed proxy as the visitor's address.
- From any other address, `X-Forwarded-For` is ignored, so a visitor cannot fake their address
  by sending the header.
- Leave the field empty when nothing sits in front of the server.

Make sure the proxy sets (or appends to) `X-Forwarded-For`.

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
   table (key `db_schema`). There is nothing to run by hand. The current schema is **7**
   (`db_schema` in `version.json`); the most recent steps are:

   | Migration | Adds |
   |---|---|
   | 6 | `page_revisions` table: version history of pages and collection items (section 7.8) |
   | 7 | `redirects` table (old addresses → new ones, section 7.4) and the `pages.noindex` column ("Hide this page from search engines") |

   Back up the data directory before updating: a migration cannot be undone by installing the
   older release again.
7. Ask everyone to **reload any open editor tabs** (a hard refresh, Ctrl/Cmd+Shift+R). A tab
   opened before the update still runs the old editor.
8. Check the version at the bottom of the sidebar: `CanvasCore v0.13.0 · build 20` (example).
   If an orange line says `Editor vX / server vY: reload the page after updating`, the browser
   is still running the old editor: reload it. If the warning persists after a reload, the new
   `dist/` was not uploaded (or a cache/CDN is serving the old `index.html`).
9. Click **Publish Site** so every page is regenerated with the new release (the version is
   written into each page as `<meta name="generator" content="CanvasCore x.y.z">`).
10. Optional, after updating from a release without image optimization: in **Media**, click
    **Optimize N older images** to make the smaller copies of the images uploaded before
    (section 7.7), then publish again so pages get the `srcset`.

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
- add or change **code**. Custom HTML blocks and a block's custom CSS/JS stay **exactly as an
  admin saved them** when an editor saves the page, item, header/footer, master or template
  (matched by block id on the server); an editor can only move or delete those blocks. Custom
  HTML is shown read-only to editors, the custom code fields of the Advanced tab are hidden, and
  code an editor tries to add is dropped;
- see or change a **Form block's own receiving email**: the field is hidden for editors and
  the server keeps the value the admin saved;
- see or change the **form email settings** (default recipient, From address, subject), the
  **session timeout** or the **trusted proxy addresses**: the server does not send these values
  to an editor, and when an editor saves Global Options those fields keep their current values;
- add, change or remove **redirects** (Global Options › Redirects is shown to admins only;
  renaming a page or item still adds its redirect automatically).

### 6.1 Change your own password

Every user, whatever the role, can change their own password: click the **key icon** next to
Logout in the sidebar, enter the **current password** and the new one twice (8 or more
characters, not `admin`). The current password is required for every voluntary change; only
the forced change right after signing in (new account, reset, default `admin`) asks for the new
password alone.

### 6.2 Add a user

1. Go to **Accounts**.
2. Enter a username, a temporary password (**at least 8 characters**: the server refuses
   shorter ones) and the role (Editor or Admin), then add the account.
3. Give the credentials to the person through a safe channel. At their first sign-in they must
   choose a new password (8 or more characters).

The role cannot be changed later: to change it, delete the account and create it again (the
person's pages are kept).

### 6.3 Reset a password

1. In **Accounts**, choose the password action on the user's row.
2. Enter the new password twice (at least 8 characters).
3. The user signs in with it and is asked to choose a new one immediately.

### 6.4 Delete a user

1. In **Accounts**, click delete on the row and confirm.
2. The person can no longer sign in; the pages they wrote stay.

You cannot delete your own account, so there is always at least one admin left (you).

### 6.5 Lost the only admin password

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
| RSS feeds | `<collection-slug>/feed.xml` for each collection with published, non-archived items (newest 50); only when the site address is set (section 7.5) |
| Redirect pages | `<old-address>/index.html` for each redirect (section 7.4) |
| Site search data | `search-index.json` in the web root (section 7.5) |
| Sitemap | `sitemap.xml` (published pages and items, except pages hidden from search engines; absolute URLs if the site address is set) |
| Robots | `robots.txt` (`Allow: /` or `Disallow: /` per Global Options, plus the `Sitemap:` line if the site address is set) |
| Not-found page | `404.html` |
| Apache rules | `.htaccess` in the web root: created with the 404 rule if it does not exist; its "CanvasCore redirects" block rewritten every time (section 4.1) |
| Form registry | `forms.json` in the data directory |
| Manifest | `published_files.json` in the data directory |

Every page and item also gets, in its HTML:

- a **canonical link** (`<link rel="canonical">`) to its own address, when the site address is
  set;
- `<meta name="robots" content="noindex">` for pages marked **Hide this page from search
  engines** (Page Settings). Those pages are also left out of `sitemap.xml` and of the site
  search; the 404 page is always `noindex`;
- the links announcing the RSS feeds;
- the **cookie banner**, when it is turned on (section 7.6);
- for uploaded images, a `srcset` of the optimized copies, lazy loading and async decoding
  (section 7.7).

A URL can belong to only one live page, collection or system folder (`uploads`,
`canvascore-admin`): publishing a page on a URL already in use is refused with a message.

### 7.2 Removal of stale pages

After a fully successful publish, CanvasCore compares the files it just wrote with the
manifest of the previous publish (`published_files.json`) and deletes the `index.html` of pages
that are no longer published (deleted, unpublished, renamed, deleted collection items, removed
redirects) and the `feed.xml` of collections that no longer have a feed, plus the folders left
empty. It only ever deletes files that a previous publish wrote, and never the root
`index.html`. Files you placed in the web root yourself are never touched.

If any file could not be written, nothing is removed and the manifest is not updated, so the
next successful publish cleans up.

### 7.3 Results and errors

- Success: `Build successful: N pages published.` (plus `N old page(s) removed.` when relevant).
  A trailing `Warning: Feeds: …`, `Collections: …` or `Redirects: …` means that part of the
  build failed while the rest was published; the details are in the message.
- `Publish incomplete: N file(s) could not be written (check the folder permissions on the server), e.g. about/index.html.`
  This also covers `sitemap.xml`, `robots.txt`, `404.html`, feeds, `search-index.json` and
  `forms.json`. See section 11.
- `PHP Error: ...` / `Database not found.` / `master.html missing!`: see section 11.

Publishing only accepts a POST with the session's security token: a link or another website
cannot trigger it.

### 7.4 Redirects

When a **published** page or collection item gets a new address (slug), CanvasCore records a
redirect from the old address to the new one, so links and search results keep working. Links
to it inside pages, items, header/footer, masters and the menu are also updated. Admins see the
list in **Global Options › Redirects** ("automatic" or "added by hand") and can add their own
(old address such as `/old-page/`, new address such as `/new-page/` or a full `https://…`) or
remove one.

- Chains collapse (A → B then B → C becomes A → C) and loops are avoided. The home page cannot
  be redirected.
- Publishing a page or item at an old address cancels its redirect.
- Redirects take effect at the next publish. Each one becomes:
  - a small **redirect page** at the old address (`old-page/index.html`), which works on every
    host: it forwards the browser at once (keeping `?query` and `#anchor`), is marked `noindex`
    and points search engines to the new address with a canonical link;
  - on **Apache**, a real **`301`** in the marked block of the root `.htaccess` (section 4.1),
    which answers before the redirect page is reached;
  - on **Nginx**, add the 301s by hand if you want them (section 4.2).
- Removing a redirect deletes its redirect page at the next publish; the old address then
  answers "not found".

Redirects are not part of the Backup export (section 8.1).

### 7.5 RSS feeds and site search

- **RSS**: each collection with published, non-archived items gets
  `https://example.com/<collection-slug>/feed.xml` (RSS 2.0, newest 50 items, with excerpt and
  cover image), announced in the head of every page. Feeds need absolute addresses, so they are
  written **only when Global Options › Site address is set**.
- **Site search**: the Site Search block reads `search-index.json` in the web root, rebuilt at
  every publish with the titles, descriptions and text of published pages and non-archived
  items (pages hidden from search engines are left out). It reflects the site as of the last
  publish.

### 7.6 Cookie banner and consent

Global Options › **Cookie banner**: turn it on and set the text, the Accept/Decline labels, an
optional link to the privacy policy page and the position (bottom centered, bottom left, bottom
right). It is added to every published page (and to `404.html`) at the next publish. The
visitor's choice is stored in their browser (`localStorage`, key `cc_consent`) and the banner
is not shown again.

The banner does not block anything by itself: scripts and embeds that need consent must be
written so that they wait for it. An admin can do this in a Custom HTML block:

```html
<!-- runs only after the visitor clicks Accept (and on later visits once accepted) -->
<script type="text/plain" data-cc-consent>
  /* tracking or marketing code */
</script>
<script type="text/plain" data-cc-consent src="https://analytics.example/tag.js"></script>

<!-- the embed loads only after Accept -->
<iframe data-cc-consent-src="https://www.youtube-nocookie.com/embed/VIDEO_ID"></iframe>

<!-- any element with this attribute shows the banner again, e.g. in the footer -->
<a href="#" data-cc-consent-open>Cookie settings</a>
```

Pages also get `window.ccConsent` (`"granted"`, `"denied"` or `null`) and a `cc-consent` event
on `document` for scripts of your own. Whether your site needs a banner, and what it must say,
depends on the law that applies to you; CanvasCore only provides the mechanism.

### 7.7 Images

- **On upload**, every JPG, PNG and WebP photo gets smaller **WebP copies** 480, 960 and
  1600 px wide (never wider than the original; phone photos turned upright when `exif` is
  available) in `uploads/_cc/`, made with PHP's GD. The original file is never changed. The
  size in pixels, the file size and the description (alt text) are recorded in `media.json` in
  the data directory; the Media page shows an "Optimized" badge.
- **On publish**, every image from `uploads/` that has copies gets a `srcset` of them, so
  phones download a fraction of the size. Images load lazily, except the first one on the page,
  which loads with priority.
- **Optimize older images**: images uploaded before this feature have no copies. In **Media**,
  click **Optimize N older images**: the copies are made in batches of about 20 seconds per
  request until none are left. Publish afterwards.
- **Limits**: without GD with WebP support, images are used as they are (no copies, no
  `srcset`; everything else works). An image too large for PHP's `memory_limit` (about 5 bytes
  per pixel are needed) is skipped and used as it is. GIF, AVIF, SVG, ICO and BMP files and
  images 480 px wide or less get no copies. In all these cases the image still counts as
  processed (section 11, "Images are not optimized").
- Deleting an image in Media also deletes its copies and its metadata.

### 7.8 Version history

Every Save Draft or Publish that changes a page or a collection item stores a version in the
`page_revisions` table (a save that changes nothing adds none). The **newest 40 versions per
page or item** are kept; older ones are deleted automatically. Users open them with the
**History** button in the editor and can restore one into the editor as an unsaved change.

**Deleting a page or an item also deletes its history.** Version history is in the database,
so it is included in a full backup (section 8.2) but not in the Backup export.

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
- **form submissions**,
- **redirects**, **version history** and the "Hide this page from search engines" setting,
- **image descriptions** and the optimized copies (`media.json`, `uploads/_cc/`).

**Import** (Backup → Import a backup file) **replaces** all pages, masters, templates, the
menu, Global Options and the header/footer with the file's content, then republishes the site.
Accounts are kept. Collections and submissions are left as they are. It cannot be undone:
export the current site first.

Use export/import to move content between installations or as a quick content snapshot. It is
not a complete backup.

### 8.2 Full backup (recommended)

A complete backup is three folders:

1. **The data directory** (`canvascore-data/` or `canvascore-admin/data/`): the database with
   everything including collections, accounts, submissions, version history and redirects,
   plus settings, menu and `media.json` (image descriptions and sizes).
2. **`uploads/`**: all images. Backing up the `uploads/_cc/` sub-folder (optimized copies) is
   optional: the copies can be regenerated from the originals (section 8.3).
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
tar czf "$DEST/uploads.tgz" -C "$SITE/public" uploads   # add --exclude=uploads/_cc to skip the copies
```

Keep copies off the server. `sqlite3 .backup` is safe while the site is in use; copying the
`.sqlite` file directly is fine when nobody is editing.

### 8.3 Restore from a full backup

1. Put the release's `canvascore-admin/` in place (section 3.2), without running the installer.
2. Restore the data directory and `uploads/`; make sure the PHP user owns them and can write.
3. If `uploads/_cc/` was not backed up, pages still work (publishing leaves missing copies out of
   the `srcset` and uses the originals), but phones lose the smaller files. To make the copies
   again, clear the "optimized" marks in the data directory (descriptions are kept):
   ```bash
   php -r '$f="media.json"; $m=json_decode(file_get_contents($f), true);
     foreach ($m as &$e) { unset($e["optimized"], $e["variants"]); }
     file_put_contents($f, json_encode($m, JSON_UNESCAPED_UNICODE));'
   ```
   then sign in and click **Optimize N older images** in Media.
4. Click **Publish Site** to regenerate all pages.

---

## 9. Forms and email

### 9.1 Recipients and sender

- **Per-form recipient**: the Form block's own receiving email (set by an admin; editors
  don't see the field, and their saves keep the admin's value).
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
  visitor gets "Too many messages sent in a short time." (HTTP 429). Behind a reverse proxy or
  CDN, set the trusted proxy addresses (section 4.4), or all visitors share one limit.
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
  IP address lock that account/address pair for **15 minutes**. Behind a reverse proxy or CDN
  the visitor's real address is used once the proxy is listed in Trusted proxy addresses
  (section 4.4); `X-Forwarded-For` is never trusted from other addresses.
- **Passwords**: at least 8 characters everywhere (installer, new accounts, resets, own
  changes). The default `admin`/`admin`, new accounts and reset passwords must be changed at
  first sign-in; any later change of your own password requires the current one.
- **HTML sanitizer**: rich text is filtered through an allow-list that removes scripts, iframes,
  forms, `on*` event handlers and `javascript:`/`vbscript:`/`data:` links (only `data:image` is
  allowed in image sources).
- **Uploads**: only `jpg`, `jpeg`, `png`, `gif`, `webp`, `avif`, `svg`, `ico`, `bmp`; raster
  files must be real images; SVGs with scripts, event handlers, `javascript:` links, embedded
  HTML (`foreignObject`) or external entities are refused. File names are sanitized and
  prefixed with a timestamp. The uploads folder cannot run scripts (Apache `.htaccess`, or the
  Nginx rules in section 4.2).
- **Editors' limits**: see section 6 (no code, no form recipients, no security settings, no
  redirects, no accounts, backups or submissions).
- **Cookie consent**: scripts and embeds marked for consent run only after Accept
  (section 7.6).
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
7. Behind a reverse proxy or CDN, list its addresses in Trusted proxy addresses (section 4.4).
8. Keep PHP up to date and keep regular off-server backups (section 8.2).

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
If the user forgot the password, an admin can reset it (section 6.3). If accounts get locked
although their owners typed nothing wrong, or forms answer "Too many messages" to everyone, the
site is probably behind a proxy or CDN: set the trusted proxy addresses (section 4.4).

**"Invalid CSRF token. Reload the page."**
The editor tab is older than the current session (for example after a sign-in in another tab
or an update). Reload the page.

**Deleted or renamed pages are still online**
Deleted and unpublished pages are removed on the next successful **Publish Site**. A renamed
page's old address is meant to stay: it now holds a redirect page (section 7.4); remove the
redirect in Global Options › Redirects if you don't want it. Files created by an old version
before the manifest existed, or files you added by hand, are never deleted automatically:
remove them by FTP/SSH.

**Redirects don't work, or answer 200 instead of 301**
- Publish after renaming or adding a redirect: redirects take effect at the next publish.
- Nginx: the redirect pages forward visitors, but the `.htaccess` 301s are ignored. Add
  `location = /old/ { return 301 /new/; }` lines to the server block (section 4.2).
- Apache: check that the root `.htaccess` contains the `# BEGIN CanvasCore redirects` block,
  that PHP can write that file, that `AllowOverride` allows it and that `mod_alias` is enabled
  (the rules are inside `<IfModule mod_alias.c>`).
- An old address that is used again by a published page loses its redirect, by design.

**RSS feeds are missing**
Feeds are written only when **Global Options › Site address** is set, and only for collections
with at least one published, non-archived item. Set the address and publish again; check
`https://example.com/<collection-slug>/feed.xml`. A publish message ending in
`Warning: Feeds: …` gives the reason.

**Images are not optimized (no "Optimized" copies, no `srcset`)**
- GD without WebP: check `php -r 'var_dump(function_exists("imagewebp"));'` with the site's PHP
  and enable/upgrade the `gd` extension (with WebP support), or ask your host.
- Memory: images that need more than the free `memory_limit` (about 5 bytes per pixel) are
  skipped. Raise `memory_limit` (for example to 256M) or upload smaller images.
- `uploads/_cc/` not writable by PHP.
- Images that couldn't be processed (GD/WebP missing, memory too low) stay "not optimized":
  after fixing the cause, click **Optimize N older images** again (Media says how many were
  skipped), then publish.
- Only JPG, PNG and WebP wider than 480 px get copies; pages need a publish to get the `srcset`.

**Site search shows old or missing results**
`search-index.json` is rebuilt only when the site is published: click **Publish Site**. Pages
marked "Hide this page from search engines" and archived items are never in the results. If the
search finds nothing at all, check that `https://example.com/search-index.json` loads (a CDN or
a server rule may block or cache it).

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
