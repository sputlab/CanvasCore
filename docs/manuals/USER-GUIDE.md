# CanvasCore User Guide

*For CanvasCore 0.13.0 · for editors and administrators*

CanvasCore is where you build and update your website. You put pages together from ready-made blocks (text, images, buttons, galleries, forms and more), see them exactly as visitors will, and publish them when they're ready. Your work stays private as a draft until you publish it, and unsaved changes are backed up on your device, so a lost connection or an expired session doesn't cost you your work. This guide covers day-to-day work. For the full list of blocks, see the [Block Reference](BLOCK-REFERENCE.md). For installation, accounts and server settings, see the [Administrator Guide](ADMIN-GUIDE.md).

## Contents

1. [Getting started](#1-getting-started)
2. [Pages](#2-pages)
3. [The page editor](#3-the-page-editor)
4. [Editing text](#4-editing-text)
5. [The settings panel](#5-the-settings-panel)
6. [Drafts and publishing](#6-drafts-and-publishing)
7. [Templates and global masters](#7-templates-and-global-masters)
8. [Collections](#8-collections)
9. [Media](#9-media)
10. [The menu](#10-the-menu)
11. [Global Options](#11-global-options)
12. [Administration (admins only)](#12-administration-admins-only)
13. [Good to know and troubleshooting](#13-good-to-know-and-troubleshooting)

---

## 1. Getting started

### Roles

There are two roles:

- **editor**: builds and edits pages, collection items, media, the menu and most global options.
- **admin**: can do everything an editor can, and also manages accounts, backups, form submissions and collections, and can use custom code (the **Custom HTML** block and **Custom Code** settings).

Your role is shown under your name at the bottom of the sidebar.

### Signing in

1. Open the CanvasCore address your administrator gave you.
2. Enter your **Username** and **Password**.
3. Click **Login**.

If you see "Your session expired" above the form, your unsaved changes were backed up. They'll be offered to you after you sign in (see [Unsaved work found](#unsaved-work-found)).

### The first password change

The first time you sign in with the default password, CanvasCore asks you to **Set a new password**.

1. Type a **NEW PASSWORD** of at least 8 characters.
2. Type it again in **CONFIRM PASSWORD**.
3. Click **Save and continue**.

To stop without changing it, click **Log out**. You can't use CanvasCore until you set a new password.

Editors can't change their own password later. If you need a new one, ask an administrator.

### The sidebar

Every screen except the page editor has a sidebar on the left. On a narrow screen, open it with the menu button at the top left.

- **Publish Site**: rebuilds and publishes the whole site (see [Publish vs Publish Site](#publish-vs-publish-site)).
- **Content**: **Pages**, **Collections**, **Templates**, **Media**.
- **Site**: **Menu**, **Global Options**.
- **Administration** (admins only): **Submissions**, **Accounts**, **Backup**.

At the bottom you see your name, your role, the **Logout** button and the CanvasCore version. If it says "Editor v… / server v…: reload the page after updating", CanvasCore was just updated. Reload the page in your browser.

### Session expiry

To keep the site safe, you're signed out after a period of inactivity. The default is 30 minutes, and an administrator can change it. Working in the editor counts as activity.

- Shortly before it ends, a yellow bar says "Your session expires in m:ss due to inactivity". Click **Stay signed in**, or just move the mouse or press a key.
- If it does expire, a **Session expired** screen covers the app. Your work underneath is not lost. Enter your password and click **Sign in and continue** to carry on exactly where you were. Anything that was being saved when the session ended is finished automatically.
- If the screen warns that "A local backup could not be stored on this device", do not close or reload the tab until you've signed in again.

### Unsaved work found

If you closed the browser, reloaded the page or your session expired with unsaved changes, CanvasCore offers them when you sign in again on the same device. A box titled **Unsaved work found** lists each one (a page, a collection item, the menu, the global options and so on).

- Click **Restore** to open it with your changes.
- Click the bin icon to throw it away. CanvasCore asks you to confirm.
- Click **Decide later** to close the box. The backups are kept.

### Notifications and confirmations

- **Notifications** appear at the corner of the screen ("Draft saved.", "Published."). Successes disappear after a few seconds. Errors stay until you close them with the **×**. Read error messages carefully: they tell you whether your changes are still safe.
- **Confirmation dialogs** appear before anything that can't be undone, such as deleting a page. The red button does the action. **Cancel**, the **Esc** key or a click outside the box cancels. **Enter** confirms.

---

## 2. Pages

Click **Pages** in the sidebar to see every page of the site.

### The page list

Each row shows the page title, its address (for example `/about`), its status, the last update and the author.

- **Search**: type in **Search by title or URL…**.
- **Filter by status**: **All**, **Published**, **Modified** or **Drafts**. Each shows how many pages it has.
- **Sort**: **Recently updated** or **Title (A–Z)**.
- If nothing matches, click **Clear filters**.

The status badges mean:

| Badge | Meaning |
| --- | --- |
| **Draft** | Never published. Only people signed in to CanvasCore can see it. |
| **Published** | Online, and what you see in the editor is what's online. |
| **Modified** | Online, but it has saved changes that aren't published yet. |

### Page actions

On each row you can:

- **Edit**: opens the page in the editor. You can also click the title or double-click the row.
- **View online** (the arrow icon): opens the live page in a new tab. Not shown for drafts.
- **Duplicate** (the copy icon): makes a copy called "… (copy)" as a new draft. If the page has unpublished changes, the copy includes them.
- **Delete** (the bin icon): deletes the page after you confirm. If it's online, it's removed from the site right away. This can't be undone.

### The Home page

The home page is the one visitors see at your site's main address. It shows a **Home** badge in the list, and its address is `/`.

To make a page the home page:

1. Open the page in the editor.
2. Click an empty area of the canvas so no block is selected.
3. In **Page Settings**, open **Page Structure**.
4. Tick **Set as Homepage (site root)**.
5. Publish the page.

### Creating a page

To create a blank page:

1. Click **New Page**.
2. A new draft called "New Page" opens in the editor.
3. Change its name in **Page Settings › Page Info › Internal Title**. The address follows the title until you edit it yourself or publish the page.

To start from a ready-made layout:

1. Click **From a template** (or **Templates** in the sidebar).
2. Read the descriptions and the list of sections in each template.
3. Click **Use template**. A new draft page opens, which you can change freely.

### Page settings

When no block is selected, the right-hand panel shows **Page Settings**:

- **Page Info**: **Internal Title** and **URL (Slug)**. The slug is the page's address. If another page already uses it, a red message tells you to choose another one.
- **Page Structure**: **Set as Homepage (site root)**, **Page Layout** (**Boxed (Centered)** or **Full Width**), **Maximum Width** for boxed pages, and the page **Background Color**.
- **SEO & Meta Data**: **Meta Title**, **Meta Description** and **Social Share Image (OG)**. This is what search engines and social networks show.

---

## 3. The page editor

The editor has a top bar, the **Add** / **Layers** panel on the left, the canvas in the middle and the settings panel on the right.

### The top bar

From left to right:

- **Pages** (back arrow): returns to the page list. For a collection item it says **Collections**, and for the global header or footer it says **Global Options**.
- The page title and its status: **Draft**, **Published** or **Modified · draft**.
- The save state:
  - "All changes saved".
  - "Unsaved changes · backed up on this device": you have changes that aren't saved to the site yet, but they're safe on this device.
  - "Unsaved changes: local backup failed": save soon.
- **Preview size**: **Desktop**, **Tablet** or **Mobile**. The canvas resizes so you can check how the page looks on each screen.
- **Undo** and **Redo**.
- **Discard draft**: only on a page that is online and has unpublished changes (see [Drafts and publishing](#6-drafts-and-publishing)).
- **Save Draft**: saves without publishing.
- **Publish**: saves and puts the page online.

### Showing and hiding the side panels

Use the small buttons at the edges of the canvas (**Hide panel** / **Show panel**) to close or open the left and right panels and give the canvas more room. CanvasCore remembers your choice in this browser. On small screens the panels start closed.

### Adding blocks (the Add tab)

The **Add** tab lists every block, grouped into **Layout**, **Basic**, **Sections**, **Interactive**, **Lists & data** and **Business & dynamic**. Click a group's title to fold or unfold it. For what each block does, see the [Block Reference](BLOCK-REFERENCE.md).

To add a block:

1. Optional: type in **Search blocks…** (for example "faq", "map" or "price").
2. Choose where it goes:
   - If a **Section**, **Container**, **Flex Row** or **CSS Grid** is selected, the block goes inside it, at the end. The line under the search box says "Adds inside the selected …".
   - Otherwise it goes at the end of the page ("Adds at the end of the page").
3. Click the block.

At the bottom of the Add tab you also find **My templates** and **Global masters** (see [Templates and global masters](#7-templates-and-global-masters)).

Editors don't see the **Custom HTML** block. Only admins can add it.

### The page structure (the Layers tab)

The **Layers** tab shows the page as a tree (**PAGE STRUCTURE**). Blocks inside a container are indented under it.

- Click a row to select that block. Click the arrow next to a container to fold or unfold it.
- To move a block, drag it by its handle (the dotted grip on the left of the row):
  - A **blue line** above or below a row means the block lands before or after it.
  - A **highlighted row** with a dashed outline means the block goes inside that container. Drop on the middle of a Section or Container to put a block inside it.
  - You can't drop a container inside itself.
- To delete the selected block, click the bin icon on its row.
- The buttons at the bottom (**+ Section**, **+ Container**, **+ Flex Row**, **+ Text**) add a block inside the selected container, or at the end of the page when nothing is selected.

### Selecting blocks on the canvas

- Click a block to select it. It gets a blue outline and the settings panel shows its options.
- Click an empty area of the page, or press **Esc**, to deselect. The panel goes back to **Page Settings**.
- In the panel, the back arrow next to the block name also returns to Page Settings.

### Moving blocks on the canvas

When a block is selected, a small blue label with the block's type appears above it. Drag that label up or down to change the block's position among its neighbours. To move a block into a different container, use the **Layers** tab.

### Deleting blocks

Select the block, then click the bin icon in the settings panel header (or on its row in **Layers**). Confirm with **Delete block**. If it's a container, everything inside it is deleted too. You can bring it back with **Undo**.

### Keyboard shortcuts

| Keys | What it does |
| --- | --- |
| **Ctrl+S** / **Cmd+S** | Save draft (works while you type, too) |
| **Ctrl+Z** / **Cmd+Z** | Undo |
| **Ctrl+Shift+Z** / **Cmd+Shift+Z** | Redo |
| **Ctrl+Y** | Redo (Windows) |
| **Esc** | Deselect the block |

While you're typing in a text, **Ctrl/Cmd+Z** undoes your typing in that text, not changes to the page.

---

## 4. Editing text

You can edit text directly on the canvas, so it looks exactly as it will on the site. This works for **Text**, the title and subtitle of a **Hero**, the text of **Image + Text** and the title of a **Form**.

### Editing in place

1. Click the text on the canvas. The block is selected and the cursor goes where you clicked.
2. Type. A toolbar floats above the text.
3. Click outside the text when you're done. **Your change is kept when you leave the text.** Then save the draft or publish as usual.

You can edit the same text in the settings panel (**Content** tab). That box has the same toolbar.

### The toolbar

Titles and short texts (such as the Hero title) get a shorter toolbar. Body text gets the full one.

| Tool | What it does | Short toolbar |
| --- | --- | --- |
| **Text style** | **Paragraph**, **Heading 1** to **Heading 4**. The full toolbar also has **Quote** and **Code block**. | Yes |
| **Font** | **Theme font**, **Sans serif**, **Serif**, **Monospace** | No |
| **Size** | **Normal**, **Small**, **Large**, **Extra large**, **Huge** | No |
| **Bold**, **Italic**, **Underline** | Ctrl/Cmd+B, I, U | Yes |
| **Strikethrough**, **Subscript**, **Superscript** | | No |
| **Text color** | A palette, a **Site** color, a custom color with **Apply**, or **Default** to remove it | Yes |
| **Highlight** | A background color behind the text. **None** removes it. | Yes |
| **Align left**, **Center**, **Align right** | The full toolbar adds **Justify** | Yes |
| **Bulleted list**, **Numbered list** | | No |
| **Quote** | Turns the paragraph into a quote, or back | No |
| **Horizontal line** | Inserts a dividing line | No |
| **Link** | Adds or edits a link (Ctrl/Cmd+K) | Yes |
| **Image** | Inserts an image in the text | No |
| **Table** | Inserts or edits a table | No |
| **Clear formatting** | Removes styles, links and headings from the selection | Yes |
| **Undo**, **Redo** | For your typing in this text | Yes |
| **Edit HTML** | Shows the text's HTML so you can fix it by hand | Yes |

**The Site color.** In **Text color** and **Highlight**, the **Site** swatch uses your brand color from Global Options. If the brand color changes later, this text changes with it.

### Links

1. Select the words you want to link, or put the cursor where the link should go.
2. Click **Link** (or press Ctrl/Cmd+K).
3. Type the **Address**, or pick a page from **Link to a page…**.
4. If nothing was selected, type the **Text** to show.
5. Optional: tick **Open in a new tab** or **Nofollow (search engines ignore it)**.
6. Click **Apply**.

To change a link, put the cursor in it and click **Link** again. To remove it, click **Remove**.

### Images in text

1. Click **Image**.
2. Click **Choose from the media library**, or paste an image address and add a **Description (alt text)**.
3. Click **Insert**.

### Tables

1. Click **Table**.
2. Move over the grid to choose the size (up to 6 × 6). Leave **First row is a header** ticked if you want a header row.
3. Click to insert.

With the cursor inside a table, **Table** offers **Row above**, **Row below**, **Column left**, **Column right**, **Toggle header row**, **Delete row**, **Delete column** and **Delete table**.

### Pasting

When you paste from Word, Google Docs or a web page, CanvasCore cleans the text and keeps only simple formatting such as headings, bold, lists and links. To paste plain text only, use **Ctrl+Shift+V** (**Cmd+Shift+V** on a Mac). You can't drag image files into text: use **Image** instead.

---

## 5. The settings panel

When a block is selected, the right-hand panel shows its name and three buttons at the top:

- **Save as template** (the save icon): keeps a reusable copy of the block (see [My templates](#my-templates-saved-blocks)).
- **Master**: makes the block a global master (see [Global masters](#global-masters)).
- **Delete block** (the bin icon).

Below are three tabs: **Content**, **Style** and **Advanced**. Each tab has sections you can open and close.

### Content tab

This tab holds the block's own settings: its texts, images, links, items and layout options. They differ for each block. See the [Block Reference](BLOCK-REFERENCE.md). **Section**, **Container** and **Flex Row** have no Content tab, because you add blocks inside them and set their look in **Style**.

To pick an image, click the blue image button next to an image field. In **Choose Image**, click an image, or click **Upload File** to add a new one.

### Style tab

**Size & Dimensions**
- **Width**, **Height**, **Max Width**, **Min Height**. Type values such as `100%`, `500px` or `50vh`.
- **Block Alignment (Centering)**: places the block left, centered or right.

**Spacing (Margin & Padding)**
- **MARGIN (Outer Space)** is the space around the block. **PADDING (Inner Space)** is the space inside it, between its edge and its content.
- Each has four boxes: TOP, RIGHT, BOT (bottom) and LEFT. You can use `px`, `rem` or `%`.

**Typography**
- **Font Size**, **Line Height**, **Font Weight**, **Text Transform**, **Text Color** and **Letter Spacing**.

**Background & Alignment**
- **Background Color**, and **Text Alignment** (left, center, right).

**Borders & Shadows**
- Border **Thickness**, **Style** (**Solid**, **Dashed**, **Dotted**), **Color** and **Border Radius** (rounded corners).

**Adjusting numbers with the keyboard.** In fields marked **↑/↓**, and in all spacing boxes, press the **Up** or **Down** arrow to change the value by 1 (or 0.1 for decimals). Hold **Shift** to change it by 10 (or 1). The unit stays as it is.

**Color fields.** Every color field has a swatch to pick a color, a box where you can type any color (such as `#1e293b`), a **Transparent** button for no fill, and **×** to go back to the default. Text colors have no Transparent button.

### Advanced tab

**Entrance Animation.** This plays once when the block scrolls into view. Choose it in **When the block scrolls into view**:

**None**, **Fade in**, **Fade up**, **Fade down**, **Slide in from the left**, **Slide in from the right**, **Zoom in**, **Zoom out**, **Flip up**, **Flip sideways**, **Rotate in**, **Blur in**, **Bounce in**.

When an animation is chosen you can also set:
- **Speed**: **Normal (0.8s)**, **Fast (0.5s)**, **Slow (1.2s)** or **Very slow (1.8s)**.
- **Delay**: **No delay**, or from 0.1s to 1.5s.

Tip: give blocks that sit side by side growing delays (0.1s, 0.2s, 0.3s) so they appear one after the other.

**Hover Effect.** This happens when a visitor points at the block: **None**, **Lift**, **Grow**, **Shrink**, **Shadow**, **Glow (brand color)**, **Tilt**, **Brighten**, **Black & white → color**. It also works on the canvas, so point at the block to try it.

**Looping Motion.** This keeps the block moving gently: **None**, **Float**, **Pulse**, **Bounce**, **Swing**, **Heartbeat**, **Shake (every few seconds)**, **Spin (slow)**. It works best on small things such as an icon, a badge or a button, and starts after the entrance animation.

**Preview animation.** On the canvas, blocks stay still so they're easy to edit. Click **Preview animation** to play the entrance animation and looping motion once.

**Reduced motion.** Visitors who have turned off motion in their system settings don't see entrance animations or looping motion.

**Custom Code** (admins only): **CSS ID (Unique)**, **CSS Classes** and **Custom CSS**. See the [Administrator Guide](ADMIN-GUIDE.md).

### Button colors and hover

The **Button** block has its own settings in the **Content** tab:

- **Button Settings**: **Use Global Style (Brand)**, **Button Size** (**Small**, **Medium**, **Large**), **Text** and **Link**. Pick a page from **Select internal page...** or type a **Custom URL...**.
- **Colors**: **Background** (when Use Global Style is on, leave it empty to use the brand color), **Text color** and **Border**.
  - To make an **outline button**, set Background to **Transparent** and choose a Border and a Text color.
- **Hover**: **Background on hover**, **Text color on hover**, **Border on hover** (only if the button has a border) and **Hover effect**.

The **Hover effect** choices for buttons are: **Color change only**, **Lift**, **Grow**, **Press**, **Shadow**, **Glow**, **Shine sweep**, **Outline ring**, **Pulse**.

**Hero buttons.** In a **Hero** block, open **Hero Buttons**. Each button has **Text**, **Link** and a **Style**: **Solid**, **Outline** or **Text only**. It also has **Background**, **Text color**, **Border**, **Corner radius** and an **ON HOVER** part with its own colors and **Effect** (the same list as above). Use **+ Add Button** to add one, and the arrows or bin to reorder or remove buttons.

---

## 6. Drafts and publishing

### Draft, published and modified

- A **new page is a draft**. Nobody outside CanvasCore can see it.
- When you **publish** it, it goes online and becomes **Published**.
- If you change a published page and click **Save Draft**, CanvasCore keeps your changes in a hidden draft copy. The online page doesn't change. The page shows as **Modified** in the list and **Modified · draft** in the editor.
- When you open a Modified page, you always edit the draft copy.
- When you publish it, the draft copy replaces the online version.

### Save Draft

Click **Save Draft** (or press **Ctrl/Cmd+S**) to save your work without changing the live site. A notification says "Draft saved.". If saving fails, the message says so, and your changes stay in the editor and backed up on this device.

### Discard draft

On a Modified page, **Discard draft** throws away all unpublished changes and brings back the version that is online. CanvasCore asks you to confirm first.

### Publish vs Publish Site

- **Publish** (in the editor) saves this page, puts it online, and then rebuilds the site so menus and lists stay up to date.
- **Publish Site** (in the sidebar) rebuilds the whole site from the published versions of all pages. **Drafts and unpublished changes are not published.** Use it after changes that affect many pages, for example after archiving collection items.
- **Save & Publish** in **Menu** and **Global Options** saves your changes and republishes the site.

### Deleted and renamed pages

- **Deleting** a page that is online removes it from the site right away.
- **Renaming** a page's address (slug) takes effect when you publish it. The old address stops working. Buttons and menu links that pointed to the old address are updated for you. Check links you typed inside text by hand.
- Pages and collection items that are no longer published are removed from the site the next time the site is published.

### Local backups of unsaved work

While you work, CanvasCore keeps a backup of your unsaved changes **in this browser on this device**. The backup is cleared once you save.

- **Reopening a page with a backup.** A bar at the bottom of the editor says **Unsaved changes found** for this page. Click **Restore** to bring them back, or **Discard** to drop them.
- **After restoring.** The bar says **Restored unsaved changes**. They are not saved to the site yet: click **Save Draft** or **Publish** to keep them, or **Discard** to go back to the last saved version.
- The same applies to the **Menu** and **Global Options** screens. Use their **Save & Publish** button to keep restored changes.

Backups live only in this browser. If you switch computer or browser, they don't follow you.

### Leaving with unsaved changes

If you click the back button with unsaved changes, CanvasCore asks **Leave with unsaved changes?** **Stay** keeps you in the editor. **Leave anyway** leaves. Your changes stay backed up on this device, but they are **not** saved to the site.

---

## 7. Templates and global masters

### Starter templates

**Templates** in the sidebar (or **From a template** on the Pages screen) lists ready-made page layouts. **Use template** creates a new draft page from one. See [Creating a page](#creating-a-page).

### My templates (saved blocks)

A saved block is a copy of a block, including everything inside it, that you can reuse on any page.

To save a block:

1. Select the block.
2. Click the save icon (**Save as template**) at the top of the settings panel.
3. Enter a **Template name** and click **Save template**.

To use one, open **Add › My templates** in the editor and click its name. A copy is inserted inside the selected container, or at the end of the page. Changing the copy doesn't change the template, or other copies.

To delete a saved block, click the bin next to it. Blocks already added to pages stay.

### Global masters

A master is a block shared by many pages. When you edit it once, it changes everywhere. It's useful for things like a call-to-action band or a contact strip.

To make a master:

1. Select the block.
2. Click **Master** at the top of the settings panel.
3. Enter a **Master name** and click **Create master**. The block is now linked to the master.

To insert a master on another page, open **Add › Global masters** and click its name.

To edit a master everywhere:

1. Select the master on any page. It shows a **GLOBAL MASTER** label.
2. Click **Edit Global Master**. A gold bar says **Editing a global master**.
3. Make your changes.
4. Click **Save Master & Close** to save, or **Cancel** to drop the changes.

The new version appears online on each page that uses the master the next time the site is published.

- To remove a master from one page only, select it and click the bin icon (**Remove this master from the page**).
- To delete a master from the whole site, click the bin next to it in **Add › Global masters**. This removes it from **every** page and can't be undone.

---

## 8. Collections

A collection is a group of similar pages, such as a blog, news or a portfolio. Each entry is an **item** with its own page. You show a list of items on any page with the **Collection List** block.

### Collections and items

Click **Collections** in the sidebar. The left column lists the collections, with the number of items in each. Click one to see its items.

- **Creating or deleting a collection** is for admins only: use **New collection**, type a **Name** and click **Create**. Deleting a collection deletes all its items.
- **Adding an item**: click **New Item** (or **Create the first item**).
- **Editing an item**: click **Edit**, or double-click the row.
- **Deleting an item**: click the bin and confirm. It disappears from the site the next time the site is published.

### Editing an item

An item opens in the same editor as a page, with a **Collection item** badge. Build its content with blocks as usual. With no block selected, the panel shows **Item Settings** first:

- **Status**: **Draft (not published)** or **Published**.
- **Archived (moved to the archive list)**.
- **Date**.
- **Cover image**: type an address, or click the upload button.
- **Excerpt**: a short summary shown in lists.

**Page Info** (title and URL) and **SEO & Meta Data** work as for pages. An item's address is the collection's address followed by the item's slug.

- **Save Draft** saves the item with the status chosen in **Item Settings**.
- **Publish** marks it **Published**, saves it and republishes the site.

Items have no hidden draft copy. If you save a published item, the change goes online the next time the site is published.

### Archive and unarchive

Click the archive icon on an item's row to archive it, or unarchive it. Archived items show an **Archived** badge. A bar then says "Archive change saved. Public lists update when you publish the site." Click **Publish now** to update the site.

### The Collection List block

Add **Collection List** (in **Business & dynamic**) to any page. In its **Content** tab:

- **Collection**: which collection to show.
- **Source**: **Active (not archived)**, **Archived only** or **All**.
- **Layout**: **Grid (cards)** or **List (rows)**.
- **Show all items (ignore limit)**, or **Items to show**.
- **Columns** (grid only): 1 to 4.
- **Show cover image**, **Show date**, **Show excerpt**.

On the canvas you see grey placeholder cards. The real items are filled in when the site is published.

---

## 9. Media

Click **Media** in the sidebar to open the **Media Library**, where all your images are kept.

- **Uploading**: click **Upload Images** and choose one or more files. You can also drag files from your computer and drop them anywhere on the page.
- **Accepted files**: JPG, PNG, GIF, WebP, AVIF, SVG, ICO and BMP.
- **SVG files with scripts** or other active content are refused. Export the SVG again as a plain SVG, or as PNG.
- **Searching**: type in **Search by file name…**.
- **Copying an address**: click the copy icon under an image. If your browser blocks copying, the address appears in a box so you can copy it yourself.
- **Deleting**: click the bin and confirm. **Pages that use the image will show a broken image**, so check first.

You can also upload while editing: any **Choose Image** window has an **Upload File** button.

---

## 10. The menu

Click **Menu** in the sidebar to open the **Menu Builder**. A **Live preview** at the top shows the real menu as it will appear on the site. Switch it between **Desktop** and **Mobile**, and scroll inside it to try "Fixed on top". Links in the preview don't work.

When you're done, click **Save & Publish**. This saves the menu and republishes the site.

### Structure

Each row is a menu item with a **Label**, a link and some buttons.

- **Link**: pick a page from the list, choose **Custom URL…** and type the address, or choose **— No link (opens submenu) —** for a parent that only opens its submenu.
- **Reordering**: drag the grip, or use the up and down arrows.
- **Submenus**: use the indent buttons to **Nest under previous** or **Un-nest**. You can also click the green **+** (**Add submenu item**).
- **Removing**: click the red bin. There's no confirmation, but nothing is saved until you click Save & Publish.
- **Adding**: click **Add top-level item**.

### Themes

A theme sets colors, item shape, typography and effects in one click. Your links, logo, alignment and mobile settings stay as they are. The themes are: **Classic**, **Professional**, **Fresh**, **Warm**, **Midnight**, **Minimal**, **Ocean**, **Sunset**, **Earth**, **Pastel**, **Bold** and **Corporate**. The theme in use shows **In use**. Right after applying one, click **Undo** to go back.

### Style

- **Items**: **ITEM STYLE** (**Classic Link**, **Pill (Rounded)**, **Box**), **TEXT COLOR**, **HOVER TEXT COLOR**, **HOVER BACKGROUND**, **BUTTON BACKGROUND** and **BUTTON TEXT** (pill and box only), **ITEM BORDER**, **ITEM RADIUS**, and **CURRENT PAGE** (**Highlight the current page**).
- **Typography**: **FONT SIZE**, **FONT WEIGHT**, **LETTER CASE**, **LETTER SPACING** and **SPACING BETWEEN ITEMS**.
- **Bar**: **BACKGROUND COLOR**, **BACKGROUND OPACITY**, **SHADOW**, **BAR HEIGHT** and **BAR PADDING**.

### Effects

Effects are grouped. In groups marked "pick one", only one effect can be on at a time. In groups marked "combine freely", you can turn on several. Point at an effect to see a short description.

- **Hover indicator**: Underline, Center underline, Overline, Highlight, Dot.
- **Hover motion**: Lift, Grow, Pop.
- **Hover glow**: Text glow, Shadow.
- **Bar**: Glass, Glare, Accent line.
- **On scroll** (only with "Fixed on top"): Shrink, Hide on scroll down, Shadow.
- **Submenu opening**: Fade, Slide, Zoom.
- **Page load**: Slide down, Fade in, Stagger.

**Clear all** turns every effect off.

### Layout & Logo

- **Position**: **BUTTONS ALIGNMENT** (Left, Center, Right) and **STICKY** (**Fixed on top**, which keeps the menu visible while visitors scroll).
- **Logo**: **LOGO IMAGE** (type an address or click **Upload**), **LOGO ALIGNMENT**, **LOGO HEIGHT**, **LOGO / BUTTONS GAP** and **LOGO LINK** (**Homepage** or **No link**).

### Mobile

On phones the menu turns into a "hamburger" button.

- **Burger icon**: **Classic**, **Staggered**, **Two lines**, **Thin**, **Bold**, **Dots**, **Grid**, **Boxed**, an icon with the word **MENU**, or **Custom** (type your own **CUSTOM CHARACTER**).
- **Mobile bar**: **BURGER POSITION** (Left or Right), **LOGO ON MOBILE** (**Show the logo**) and **MOBILE BREAKPOINT (px)**, the screen width below which the hamburger is used.

Switch the preview to **Mobile** to check the result.

---

## 11. Global Options

Click **Global Options** in the sidebar for settings that apply to the whole site. Click **Save & Publish** to save them. This also republishes the site.

### Brand & typography

- **Primary brand color**: used by buttons, links, the **Site** color in the text editor and the **Glow (brand color)** hover effect.
- **Primary font (Google Fonts)**: the site's main font.
- **Let the menu inherit the brand color on hover**: when it's off, the menu uses only its own colors from the Menu Builder.

### Site identity & SEO

- **Site name** and **Site address (for sitemap & social)**.
- **Page title suffix**: added to every page title in the browser tab (for example " | My Site"). Leave it empty for none.
- **Favicon address**: the small icon in the browser tab.
- **Default social image (OG)**: used when a page has no social share image of its own.
- **Allow search engines to index the site (robots.txt)**.

### Global header & footer

The header and footer are groups of blocks shown at the top and bottom of every page.

- **Enabled (shown on all pages)**: turns the header or footer on or off.
- **Edit header** / **Edit footer**: opens it in the editor, with a **Global header** or **Global footer** badge. Edit it like a page, then click **Save**. Click **Publish** to also put it online.
- **Delete**: removes all its blocks from every page and republishes the site. This can't be undone.

### Form emails (admins)

- **Default receiving email (To)**: where form messages go when a form has no email of its own.
- **Sender email (From)** and **Default subject**.

### Security (admins)

- **Session timeout (minutes of inactivity)**: between 5 and 720. The default is 30.

Editors can see the Form emails and Security fields, but only an administrator's changes to them are saved.

---

## 12. Administration (admins only)

These sections appear under **Administration** in the sidebar only for admins. Details are in the [Administrator Guide](ADMIN-GUIDE.md).

- **Forms**: the **Form** block's **Form Settings** set the **Form Title**, the **Receiving Email** and the **Submit Button Text**, and **Form Fields** lists the fields (for example **Short Text**, **Email**, **Long Text**, **Number**). See the [Block Reference](BLOCK-REFERENCE.md).
- **Submissions** (**Form Submissions**): messages visitors sent through your forms. You can search them, **Refresh** the list, **Export CSV**, delete single messages or **Clear all**.
- **Accounts**: **Add a user** with a **Username**, **Password** and **Role**. In the list you can **Change password** or delete an account. You can't delete your own account.
- **Backup**: **Download backup** saves the pages, menu, settings, global header and footer, masters and templates in one file. Collections and uploaded images are not included. **Import** restores a backup and **replaces** the current site, but user accounts are kept. Download a backup first.

---

## 13. Good to know and troubleshooting

**My changes aren't on the live site.**
You probably saved a draft. Open the page and click **Publish**. In the page list, **Modified** means there are saved changes that aren't online yet. For archive changes or deleted collection items, click **Publish Site**.

**An image is broken on the site.**
The image was probably deleted from the Media Library, or its address was typed wrongly. Upload it again and choose it again in the block.

**I was signed out.**
Your session expired after inactivity. Sign in again on the **Session expired** screen to carry on where you were. If you had closed or reloaded the tab, sign in and use **Restore** in **Unsaved work found**.

**The editor shows "Unsaved changes found" or "Restored unsaved changes".**
CanvasCore found work on this device that was never saved to the site. Click **Restore** to keep working on it, then **Save Draft** or **Publish**. Click **Discard** if you don't need it.

**My unsaved work isn't offered on another computer.**
Backups of unsaved work are stored only in the browser where you made the changes.

**I can't publish: the URL is already used.**
Another page (or a collection) already has that address. Change the **URL (Slug)** in **Page Settings › Page Info**.

**Animations don't play in the editor.**
That's intentional, so blocks are easy to edit. Use **Preview animation** in the **Advanced** tab, or view the published page.

**I deleted a block by mistake.**
Press **Ctrl/Cmd+Z**, or click **Undo** in the top bar, before you leave the page.

**For editors: pages with custom code.**
Custom HTML and custom CSS can only be saved by administrators. If an administrator added custom code to a page, saving that page as an editor removes the code. Ask an administrator to make changes to those pages.

**"Editor v… / server v…" appears at the bottom of the sidebar.**
CanvasCore was updated while you had it open. Save your work, then reload the page.
