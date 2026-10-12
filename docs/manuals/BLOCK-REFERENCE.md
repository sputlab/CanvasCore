# Block Reference

Every page in CanvasCore is built from **blocks**: a title, a photo, a pricing table, a map. You add blocks from the **Add** tab on the left, and you arrange them in the **Layers** tab. When you click a block on the canvas, the right panel shows its settings in up to three tabs:

- **Content**: what the block says and does (texts, images, links, options). Each block has its own Content tab, described below.
- **Style**: how the block looks (size, spacing, typography, background, borders). It is the same for every block.
- **Advanced**: entrance animation, hover effect, looping motion and, for admins only, custom code. It is the same for every block.

The panel header also has three buttons: **Save as template** (the save icon: a reusable copy under **Add › My templates**), **Master** (makes the block a global master: edit it once and it changes on every page that uses it) and **Delete block** (you can undo with Ctrl+Z).

This manual covers each block's Content tab. For the editor in general, and for the Style and Advanced tabs, see the [User Guide](USER-GUIDE.md).

---

## All blocks at a glance

| Category | Block | Use it for |
| --- | --- | --- |
| **Layout** | [Section](#section) | A full-width band with its own background |
| | [Container](#container) | A centered box that keeps content at a readable width |
| | [Flex Row](#flex-row) | Putting blocks side by side |
| | [CSS Grid](#css-grid) | Putting blocks in a set number of equal columns |
| | [Simple Grid](#simple-grid) | Quick columns of text or HTML, without nesting blocks |
| **Basic** | [Text](#text) | Paragraphs, headings, lists, links |
| | [Image](#image) | A single picture |
| | [Button](#button) | A call-to-action link |
| | [Divider](#divider) | A line, a decorative shape or empty space |
| | [Video](#video) | A YouTube or Vimeo video |
| | [Custom HTML](#custom-html) | Embed codes and widgets (admins only) |
| **Sections** | [Hero](#hero) | The big opening banner of a page |
| | [Image + Text](#image--text) | A picture next to a paragraph |
| | [Cards](#cards) | A row of feature boxes |
| | [Icon Box](#icon-box) | One feature with an emoji or icon |
| | [Testimonial](#testimonial) | A customer quote |
| | [Callout](#callout) | A highlighted note, tip or warning |
| | [Form](#form) | A contact or request form |
| **Interactive** | [Accordion](#accordion) | Content that opens and closes |
| | [Tabs](#tabs) | Content split into tabbed panels |
| | [FAQ](#faq) | A simple list of questions and answers |
| | [Slider](#slider) | A slideshow of images |
| | [Gallery](#gallery) | A grid of photos that open full screen |
| | [Before / After](#before--after) | Comparing two images with a drag handle |
| | [Countdown](#countdown) | Time left until a date |
| **Lists & data** | [Steps](#steps) | A numbered "how it works" process |
| | [Counters](#counters) | Big numbers and stats |
| | [Progress Bars](#progress-bars) | Skills or percentages as bars |
| | [Data Table](#data-table) | Rows and columns of data |
| | [Timeline](#timeline) | History and milestones |
| | [Pricing](#pricing) | Plans and prices side by side |
| | [Team](#team) | People with photo, role and links |
| | [Logo Cloud](#logo-cloud) | Client or partner logos |
| **Business & dynamic** | [Business Info](#business-info) | Address, contacts and opening hours |
| | [Map](#map) | A Google map of a place |
| | [Collection List](#collection-list) | The latest posts, news or items of a collection |

Tip: the **Search blocks…** box in the Add tab also finds blocks by keyword, for example "carousel" finds Slider and "faq" finds Accordion and FAQ.

---

## Layout

### Section

A full-width band of the page. Use it to give part of a page its own background color and vertical spacing, then put other blocks inside it.

**Settings**
- Section has **no Content tab**. You set everything in **Style**: background color, padding, minimum height and so on.
- New sections start with a white background, 80px of padding top and bottom (20px left and right) and full width.

**Tips**
- A Section is the usual outer layer of a page: Section › Container › your blocks.
- To add blocks inside it, select it and use the Add tab (see [Working with layout blocks](#working-with-layout-blocks)).

### Container

A box that holds other blocks. New containers are centered with a **Max Width** of 1200px, so text does not stretch across very wide screens.

**Settings**
- Container has **no Content tab**. Change its width, spacing and background in **Style**.

**Tips**
- Put a Container inside a Section to keep a full-width background while the content stays centered.

### Flex Row

Places the blocks inside it side by side. When there is not enough room, they wrap onto a new line.

**Settings**
- Flex Row has **no Content tab**. The gap between items is 20px and wrapping is on.
- To control how wide each item is, select the item and set its **Width** in **Style › Size & Dimensions** (for example 48% for two per row, 31% for three).

**Tips**
- Good for a row of buttons, icon boxes or images.

### CSS Grid

Places the blocks inside it in equal columns.

**Settings** (panel: **CSS Grid Setup**)
- **Number of Columns**: 1 to 12. Default 2.
- **Gap (Spacing)**: space between cells, for example `20px`. Default 20px.

**Tips**
- On phones (screens 768px wide or less) the grid always becomes one column.
- Blocks fill the grid left to right, then wrap to the next row. Add blocks inside it from the Add tab or by dragging in Layers.

### Simple Grid

Columns of text or HTML in a single block. Unlike CSS Grid, you do not put other blocks inside it: each column is a box of HTML.

**Settings**
- **Grid Settings › Number of columns**: a slider from 1 to 24. Adding columns adds empty "Column N" boxes; reducing the number removes the last ones.
- **Columns Content**: one text box per column (HTML). Each one has **+ Image** (inserts a picture from the media library) and **+ Button** (inserts a "Click Here" button).

**Tips**
- The space between columns is fixed at 20px.
- On phones it becomes one column.
- The **+ Button** link points to `#`: edit the `href` in the HTML to set the real link.
- For anything more than simple text, prefer CSS Grid with real blocks inside.

---

## Basic

### Text

Rich text: paragraphs, headings, lists, links, images and tables.

**Settings** (panel: **Text Content**)
- **HTML Text**: the text, with the full formatting toolbar.

**On the canvas**: click the block and type directly. The formatting toolbar floats above it. This is the quickest way to edit.

**Tips**
- New text blocks say "Edit this text...". An empty text shows "Type your text…" on the canvas only.
- Font size, color and alignment for the whole block are in **Style › Typography** and **Style › Background & Alignment**.

### Image

One picture.

**Settings** (panel: **Image Settings**)
- **Image URL**: paste an address or click the image button to pick from the media library.
- **Alt Text (SEO)**: a short description for screen readers and search engines. Always fill it in.
- **Object-Fit Mode**: **Cover (Fill and crop)** (default), **Contain (Show full without crop)** or **Fill (Stretch to fit)**.
- **Aspect Ratio**: **Auto (original)** (default), 1:1, 4:3, 3:2, 16:9, 21:9 or 2:3 (Portrait).
- **Focus / Object Position**: which part stays visible when cropped: Center, Top, Bottom, Left, Right.
- **Zoom (Scale)**: a slider from 0.5 to 2. Above 1 zooms in (the edges are cropped).

**Tips**
- Cropping and focus only matter when the frame has a different shape than the photo: choose an **Aspect Ratio** or set a **Height** in Style.
- Images load lazily (only when the visitor scrolls near them).

### Button

A link styled as a button.

**Button Settings**
- **Use Global Style (Brand)**: on by default. Starts from the site's brand look (brand color, white text, rounded corners).
- **Button Size**: Small, Medium or Large sets padding and font size in one click. It always shows "Custom" afterwards; that is normal.
- **Text**: the label. Default "Click Here".
- **Link**: pick one of your pages from **Select internal page...**, or type any address in **Custom URL...**.

**Colors**
- **Background**, **Text color** and **Border** (empty = no border).
- For an outline button: set Background to transparent, then pick a Border and a Text color.

**Hover**
- **Background on hover**, **Text color on hover** and, when the button has a border, **Border on hover**.
- **Hover effect**: Color change only, Lift, Grow, Press, Shadow, Glow, Shine sweep, Outline ring or Pulse.
- Point at the button on the canvas to try it.

**Tips**
- To center the button, use **Style › Background & Alignment › Text Alignment**.
- Do not leave **Text** empty: the button would show with no label.

### Divider

Separates parts of a page: a line, a row of dots, a decorative shape or just space.

**Settings** (panel: **Divider**)
- **Style**: Line (default), Gradient line, Dots, Wave, Curve, Diagonal, or Spacer (empty space).
- **Color**: not shown for Spacer. Default light grey.
- **Thickness / size (1–20)**: for lines and dots. Default 2.
- **Width % (10–100)**: for lines only. Default 100.
- **Height px (10–400)**: for shapes and spacers. Default 80.
- **Flip vertically (use at the bottom of a section)**: for Wave, Curve and Diagonal.

**Tips**
- For a seamless shape between two sections, give the shape the same color as the section it flows into.

### Video

Embeds a video from YouTube or Vimeo.

**Settings** (panel: **Video Settings**)
- **YouTube / Vimeo Link**: paste the normal address of the video (for example `https://www.youtube.com/watch?v=…`, `https://youtu.be/…` or `https://vimeo.com/123456`).

**Tips**
- The video is always 16:9 and fills the width of its place.
- Only YouTube and Vimeo links work. With any other link, or an empty one, **the block is not shown on the site**.
- Rounded corners come from **Style › Borders & Shadows › Border Radius** (12px by default).

### Custom HTML

Raw HTML code, for example an embed from another service.

**Availability**: only **admins** see this block in the Add tab.

**Settings** (panel: **Custom HTML**)
- **HTML Code**: the code, inserted on the page as it is.

**On the canvas**: when selected, the block turns into a code box you can type in.

**Tips**
- Code that is wrong can break the layout of the page. Preview before publishing.

---

## Sections

### Hero

The large banner at the top of a page: title, subtitle, buttons, optional background image.

**Background & Titles**
- **Hero Background Image**: paste an address or pick from the media library. It covers the whole hero.
- **Main Title** and **Subtitle**: formatted text (simple toolbar).

**Hero Buttons**: one card per button, with move up/down and remove.
- **Text** and **Link** (pick a page or type a **Custom URL...**).
- **Style**: **Solid**, **Outline** or **Text only**, a quick starting look.
- **Background**, **Text color**, **Border (empty = no border)**, **Corner radius (↑/↓)**.
- **On hover**: **Background**, **Text color**, **Border** (only when the button has a border) and **Effect** (same list as the Button block).
- **+ Add Button** adds a green "New Button".

**On the canvas**: click the hero and type the title and subtitle directly.

**Tips**
- You can remove every button, including the last one: the hero then shows only the texts.
- New heroes have a dark background, white text, centered alignment and 100px padding. Change them in **Style**. The buttons follow the hero's **Text Alignment**.
- With a background image, check that the text is still readable; there is no automatic dark overlay.
- For a taller hero set **Style › Size & Dimensions › Min Height** (for example `80vh`).

### Image + Text

A picture beside a block of text.

**Settings** (panel: **Text Content**)
- **Image URL**: paste or pick from the media library.
- **Layout**: **Image Left** (default) or **Image Right**.
- **HTML Text**: the text, with the full toolbar.

**On the canvas**: click the block and type the text directly.

**Tips**
- On narrow screens the image and text stack on top of each other.
- There is no alt text field for this image. If the picture carries meaning, use an Image block inside a Flex Row instead.

### Cards

A set of boxes (white background, light shadow), typically for features or services.

**Settings**
- **Cards › Number of cards**: a slider from 1 to 12. New cards say "Card N / Describe it here."; lowering the number removes the last ones.
- **Cards content**: one HTML box per card, with **+ Image** and **+ Button** helpers (as in Simple Grid).

**Tips**
- Cards wrap automatically: each card is at least 280px wide, so they sit side by side and move to a new row when there is no room. You do not set a number of columns.
- The inserted button links to `#`: edit the HTML to set the real link.

### Icon Box

One feature: a large emoji or icon, a title and a short description.

**Settings** (panel: **Icon Box Content**)
- **Icon / Emoji**: for example ⚡ or ★. Default ⚡.
- **Title**.
- **Description**: plain text.

**Tips**
- Centered by default. Change alignment in **Style › Background & Alignment**.
- Put several Icon Boxes in a CSS Grid or Flex Row for a features row.

### Testimonial

A customer quote with name and role.

**Settings** (panel: **Testimonial**)
- **Quote**: plain text. The quotation marks are added for you.
- **Author**.
- **Role**: for example "CEO, Acme".

### Callout

A colored box to highlight a note, a tip or a warning.

**Settings** (panel: **Callout**)
- **Type**: Info (blue, default), Success (green), Warning (amber), Danger (red), Note (grey). Sets colors and icon.
- **Title (optional)**.
- **Text (HTML allowed)**: you can use `<strong>`, `<a>` and similar tags.
- **Show icon**: on by default.

### Form

A form visitors fill in. Submissions are sent by email.

**Form Settings**
- **Form Title**: formatted text. Default "Contact Us".
- **Receiving Email**: where submissions go. Leave blank to use the site's global email.
- **Submit Button Text**: default "Send".

**Form Fields**: one card per field.
- Label (for example "Name").
- Type: **Short Text**, **Email**, **Long Text** or **Number**.
- **Required Field**: the visitor cannot send the form without it.
- **+ Add Field** adds a new short text field; the bin icon removes a field.

**On the canvas**: click the form and type the title directly.

**Tips**
- New forms have Name, Email and Message, all required.
- After sending, the visitor sees the message "Sent!". It cannot be changed from the panel.
- Fields cannot be reordered: to change the order, remove and re-add them.
- Do not leave **Submit Button Text** empty, or the button shows no label.
- The form includes a hidden anti-spam trap; you do not need to set anything.

---

## Interactive

### Accordion

A list of titles that open to reveal their content when clicked.

**Accordion Items**: one card per item, with move up/down and remove.
- **Title**.
- **Content**: text or HTML (`<p>`, `<strong>`, `<a>`, `<img>`…).
- **+ Add item**.

**Accordion Settings**
- **Style**: **Cards** (separate boxes, default) or **Flat (lines)**.
- **Icon**: **Plus (+)** (default), **Chevron (▾)** or **None**.
- **First item open by default**: on for new accordions.
- **Allow several items open at once**: off by default, so opening one item closes the others.

**Tips**
- It works without JavaScript, so it is reliable and accessible.

### Tabs

Content split into panels; visitors click a tab to switch.

**Tabs**: one card per tab, with move up/down and remove.
- **Title** and **Content** (text or HTML).
- **+ Add tab**.

**Tabs Settings**
- **Style**: **Underline** (default) or **Pills**.
- **Tabs alignment**: Left (default), Center, Right.

**Tips**
- The first tab is always the one shown when the page opens.
- The active tab uses the brand color. Tabs wrap onto two lines if there are many.

### FAQ

A simple list of questions that open to show the answer.

**Settings** (panel: **FAQ Items**)
- **Question** and **Answer** for each item. The bin icon removes an item.
- **+ Add Question**.

**Tips**
- Answers are plain text: line breaks are kept, HTML is shown as typed.
- Items cannot be reordered here. If you need ordering, HTML answers or more options, use the **Accordion** block.

### Slider

A slideshow of images, one at a time.

**Slider Settings**
- **Transition Effect**: **Slide (Horizontal Swipe)** (default) or **Fade (Crossfade)**.
- **Enable Autoplay**: on by default.
- **Delay (ms)**: time per slide when autoplay is on. Minimum 500, default 3000 (3 seconds).
- **Aspect Ratio**: 1:1, 4:3, 3:2, **16:9 (Wide)** (default), 21:9 or 2:3.
- **Image Fit**: **Cover (fill and crop)** (default), **Contain (show full)**, **Fill (stretch)**.
- **Focus / Object Position**: Center, Top, Bottom, Left, Right.

**Images**: one card per slide with the image address (or media button) and **Alt Text (SEO)**. **+ Add Slide** adds a placeholder slide; the bin icon removes one.

**Tips**
- There are no arrows or dots. With **Slide**, visitors can also swipe or scroll sideways.
- With **Fade**, only autoplay changes the slide: if you turn autoplay off, visitors only ever see the first image.
- Autoplay needs at least two slides.
- If you set a **Height** in Style, it replaces the aspect ratio.
- Slides cannot be reordered here; remove and re-add to change the order.

### Gallery

A grid of photos. Clicking one opens it full screen (lightbox).

**Gallery Images**: one card per image, with move up/down and remove.
- Image URL (or the media button), **Alt text (accessibility / SEO)**, **Caption (shown in lightbox / under image)**.
- **+ Add image from media** or **+ Add empty slot (paste URL)**.

**Gallery Settings**
- **Layout**: **Grid (uniform crops)** (default) or **Masonry (natural ratios)**.
- **Columns**: 1 to 6. Default 3.
- **Gap (px)**: 0 to 80. Default 12.
- **Thumbnail ratio**: Grid only. 1:1 (default), 4:3, 3:2, 16:9, 2:3 or **Auto (original ratio)**.
- **Corner radius**: default `8px`.
- **Open images in a lightbox**: on by default. Visitors can move to the previous and next image.
- **Show captions under images**: off by default (captions still show in the lightbox).

**Tips**
- On phones the gallery shows at most 2 columns.

### Before / After

Two images on top of each other with a handle visitors drag to compare.

**Before / After**
- **BEFORE (left)** and **AFTER (right)**: each has **Image**, **Alt text** and **Label**.

**Compare Settings**
- **Starting position**: where the handle starts, 0–100%. Default 50%.
- **Aspect ratio**: 16:9 (default), 4:3, 3:2, 1:1, 21:9.
- **Show Before / After labels**: on by default.

**Tips**
- Use two images with the same size and framing, or the comparison will not line up.
- The handle works on the canvas too, so you can try it while editing.

### Countdown

Shows days, hours, minutes and seconds left until a date.

**Countdown**
- **Target date & time**: the moment the countdown reaches zero. Default 1 January 2030.
- **Time zone**: **Visitor's local time** (default) or a fixed UTC offset. A fixed offset does not follow daylight-saving changes: pick the offset that applies on the target date.
- **When it ends**: **Show a message** (default) or **Hide the block**.
- **Message**: shown at the end (default "It's here!").

**Countdown Display**
- **Show seconds**: on by default.
- **Show the date under the numbers**: on by default.
- **Days label**, **Hours label**, **Minutes label**, **Seconds label**: translate or rename the units.

**Tips**
- Always set the target date: a new countdown points to 2030 until you change it.
- With **Visitor's local time**, people in different countries reach zero at different moments. For a live event, choose a fixed offset.

---

## Lists & data

### Steps

A numbered sequence, for example "how it works".

**Steps**: one card per step (move up/down, remove) with **Title** and **Text**. **+ Add step**.

**Steps Layout**
- **Layout**: **Horizontal (columns)** (default) or **Vertical (list)**.

**Tips**
- Numbers are added automatically, in the brand color.
- Horizontal shows up to 4 steps per row and becomes vertical on small screens.

### Counters

Big numbers with a label, for example "120+ Happy clients".

**Counters**: one card per counter (move up/down, remove).
- **Value**: the number.
- **Decimals**: 0 to 2.
- **Prefix** (for example `$`) and **Suffix** (for example `+` or `%`).
- **Label**.
- **+ Add counter**.

**Counters Settings**
- **Columns**: **Auto (one per counter)** (default), or 1 to 4.
- **Count up when scrolled into view**: on by default.
- **Duration ms (500–5000)**: how long the count-up takes. Default 1800.

**Tips**
- The final number is always in the page, even without JavaScript. Visitors who prefer reduced motion see it directly.
- On phones counters show 2 per row. Large numbers get thousands separators (1,200).

### Progress Bars

Horizontal bars filled to a percentage, for skills or goals.

**Progress Bars**: one card per bar (move up/down, remove).
- **Label**, **Value % (0–100)**, **Color (empty = brand color)**.
- **+ Add bar**.

**Progress Settings**
- **Bar height px (4–30)**: default 10.
- **Show percentage**: on by default.
- **Fill when scrolled into view**: on by default.

### Data Table

A table typed or pasted as plain text.

**Data Table**
- **Data — one row per line, cells separated by | or Tab**. For example:
  `Name | Role | City` on the first line, `Anna | CEO | Rome` on the next.
- **Caption (optional)**: a title above the table.

**Table Options**
- **First row is the header**: on by default.
- **First column is a header (row labels)**.
- **Striped rows**: on by default.
- **Cell borders**.
- **Compact**: less padding.
- **Sticky header (scrolls inside)**: the header stays visible while the table scrolls. Set **Max height px** to make the table scroll inside its own box.

**Tips**
- You can paste straight from Excel or Google Sheets.
- A cell cannot contain the `|` character, because it separates cells.
- Wide tables scroll sideways on phones instead of breaking the page.

### Timeline

Events in order along a line, for company history or milestones.

**Timeline**: one card per event (move up/down, remove) with **Date / period**, **Title** and **Text**. **+ Add event**.

**Timeline Layout**
- **Layout**: **Line on the left** (default) or **Alternating (desktop)**.

**Tips**
- Alternating places events left and right of a central line on screens wider than 768px; on phones it goes back to the line on the left.

### Pricing

Plan cards side by side, each with price, features and a button.

**Pricing Plans**: one card per plan (move up/down, remove). Highlighted plans show ★.
- **Plan name**, **Price** (for example `$19`) and period (for example `/month`).
- **Short description**.
- **Features — one per line**. Each line gets a check mark.
- **Button text** and its link (**URL or mailto:**), or **Link to a page…** to pick one of your pages.
- **Highlight this plan**: brand-colored border and button. When on, you can also add a **Badge** (for example "Most popular").
- **+ Add plan**.

**Pricing Layout**
- **Columns**: **Auto (one per plan)** (default) or 1 to 4.

**Tips**
- New pricing blocks have three plans, with "Pro" highlighted.
- Leave **Button text** empty to hide a plan's button. Empty feature lines are skipped.
- On screens 900px wide or less, plans stack in one column.
- If you turn off **Highlight this plan**, clear the **Badge** first (see the note in [Known issues](#known-issues)).

### Team

People cards with photo, name, role, short bio and links.

**Team Members**: one card per person (move up/down, remove).
- **Name**, **Role**, **Short bio**.
- **Photo (empty = initials)**: without a photo, the person's initials are shown in a colored circle.
- **Email**, **LinkedIn**, **X / Twitter**, **Website**: shown as links under the card. You can type `linkedin.com/in/…` without `https://`.
- **+ Add member**.

**Team Layout**
- **Columns**: Auto (default) or 1 to 4.
- **Style**: **Cards** (default) or **Minimal**.
- **Photo shape**: **Circle** (default), **Rounded**, **Square**.

**Tips**
- Only valid email addresses become links. Empty links are not shown.
- On tablets the team shows at most 2 per row, on phones 1.

### Logo Cloud

A row of client or partner logos.

**Logos**
- **Heading (optional)**: default "Trusted by". Leave empty to hide it.
- One card per logo (move up/down, remove) with **Image**, **Name (alt text)** and **Link (optional)**.
- **+ Add logo from media** or **+ Add empty slot (paste URL)**.

**Logos Layout**
- **Layout**: **Grid** (default) or **Scrolling strip**.
- **Columns**: Grid only, 1 to 8. Default 5.
- **Loop duration s (10–120)**: Scrolling strip only. Higher is slower. Default 30.
- **Logo height px (20–120)**: default 48.
- **Gap px (8–80)**: default 40.
- **Grayscale (color on hover)**: on by default.

**Tips**
- The scrolling strip pauses when the mouse is over it and stays still for visitors who prefer reduced motion.
- On phones the grid shows at most 3 per row.

---

## Business & dynamic

### Business Info

Your business card: name, address, phone, email, website and opening hours. It also tells Google about your business.

**Business Details**
- **Business name**.
- **Business type (for Google)**: for example LocalBusiness (default), Restaurant, Store, Hotel.
- **Address (one line per row)**.
- **Phone**: becomes a tap-to-call link.
- **Email**: becomes a link if it is a valid address.
- **Website**: you can omit `https://`.
- **Show a "Get directions" button (Google Maps)**: on by default. **Button text** default "Get directions".

**Opening Hours**
- **+ Add weekly hours** creates Monday to Sunday. Each row has the day label, **OPENS**, **CLOSES** and a ✕ box for closed days. **Remove opening hours** removes them all.
- **Section title**: default "Opening hours".
- **"Closed" text**: default "Closed".
- **Note (optional)**: for example "Closed on public holidays".
- **Add structured data for Google (LocalBusiness)**: on by default.

**Tips**
- The directions button only appears when there is an address.
- Day labels can be in any language; Google always receives the standard day names, in order Monday → Sunday. Keep the rows in that order.
- A day with a missing open or close time shows the "Closed" text.
- Contacts and hours sit in two columns; on phones they stack.

### Map

An embedded Google map centered on a place.

**Settings** (panel: **Map Settings**)
- **Location / Address**: what to look up on Google Maps, for example "Colosseum, Rome, Italy" or a full street address. Default "Rome, Italy".
- **Zoom Level**: 1 (whole world) to 20 (street). Default 15.

**Tips**
- The map uses this address only; it does not read the Business Info block. Type the same address in both.
- The map is always 16:9 and fills the width of its place.

### Collection List

Shows items from one of your collections (blog posts, news, products…) as cards or rows, each linking to its own page.

**Settings** (panel: **Collection List**)
- **Collection**: choose which collection to show. The number in brackets is how many items it has.
- **Source**: **Active (not archived)** (default), **Archived only** or **All**.
- **Layout**: **Grid (cards)** (default) or **List (rows)**.
- **Show all items (ignore limit)**.
- **Items to show**: when not showing all. Default 6.
- **Columns**: Grid only, 1 to 4. Default 3.
- **Show cover image**, **Show date**, **Show excerpt**: all on by default.

**Tips**
- A Collection List needs a collection. If you have none, the panel says so: create one first in the **Collections** section.
- On the canvas you see grey placeholder cards. The real items are added when the page is published, so publish (or republish) after adding items to the collection.
- If there is nothing to show, the site displays "No published items yet."
- On phones the grid becomes one column.

---

## Working with layout blocks

The four layout blocks are **containers**: Section, Container, Flex Row and CSS Grid. They hold other blocks, and they can hold each other. (Simple Grid is not a container: its columns contain HTML, not blocks.)

### How they nest

A typical page looks like this in **Layers**:

```
Section                  (full-width band, background color)
└─ Container             (centered, max 1200px)
   ├─ Text               (a heading and intro)
   └─ CSS Grid           (3 columns)
      ├─ Icon Box
      ├─ Icon Box
      └─ Icon Box
```

- **Section**: the outer band. Use one per visual part of the page.
- **Container**: inside a Section, keeps content at a readable width.
- **Flex Row**: side by side, items keep their own width and wrap.
- **CSS Grid**: equal columns, one column on phones.

You can nest freely (a Flex Row inside a CSS Grid cell, for example), but two or three levels are usually enough. An empty container shows "Empty … Drop elements here." on the canvas.

### Putting blocks inside a container

**From the Add tab**
1. Click the container on the canvas (or in Layers) to select it.
2. Open the **Add** tab. The line under the search box now says **Adds inside the selected Section** (or Container, Flex Row, CSS Grid).
3. Click a block: it is added at the end of that container.

If the selected block is not a container, or nothing is selected, the line says **Adds at the end of the page** and new blocks go to the bottom of the page.

**From the Layers tab**
- Drag a block by its handle and drop it on the **middle** of a container's row: the row highlights with a dashed outline and the block goes inside.
- Drop on the top or bottom edge of a row to place the block before or after it instead.
- At the bottom of Layers, the quick buttons **+ Section**, **+ Container**, **+ Flex Row** and **+ Text** add inside the selected container (or at the end of the page).

**On the canvas**
- A selected block shows a blue tab with its type at the top: drag it to move the block.

### Deleting a container

Deleting a container also deletes everything inside it. The confirmation says so, and you can undo with Ctrl+Z.

---

## Known issues

These behaviors may surprise you. They are tracked for a fix.

- **Pricing badge**: turning off **Highlight this plan** hides the **Badge** field, but a badge already typed still shows on the site. Clear the badge before turning off the highlight.
- **Slider with Fade and no autoplay**: only the first image is ever shown.
- **Button colors**: a new button has a fixed blue background, so **Use Global Style (Brand)** does not switch it to your brand color. Clear **Colors › Background** to use the brand color.
- **Layers quick buttons**: "Add inside selected" adds to the end of the page when the selected block is not a container.
