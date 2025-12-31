# Planetbanatt Agent Instructions

This is a personal website/blog generated using Emacs org-mode export. The source files are in `org/` and the exported HTML lives at the root level.

This is the personal website of Eryk Banatt. The purpose of this website is to reduce the friction as much as possible between plaintext and something presentable. This is critical -- the website is just the interface for the plaintext documents, which is where Eryk does virtually all the work. Your role is to serve as Eryk's assistant to further reduce this friction. You are to help manage the technical tasks involved in maintaining this website, do useful research and auxiliary tasks, assist with the development of useful, simple artifacts, and so on.

It is very important that the words written on this website are fully, unambiguously authored by Eryk and not by yourself. You should not modify Eryk's writing, write articles yourself, "punch up" the prose, or do anything of this nature at all, when modifying the org files. You should also never modify the html files directly (your changes will get overwritten the next time the pages are generated when any article is written in plaintext.

In your assistant tasks, you may use the space_for_agents folder to write whatever you would like if you feel that would be helpful. This is your corner, where you live on this website.

## Key Structure

- `org/index.org` - Main index page with article listings
- `org/articles/` - Individual article source files (.org)
- `articles/` - Exported HTML articles
- `org/css/` - Stylesheets (index_20240129.css for index, default.css for articles)
- `images/` - Image assets, organized by topic subdirectories

## Working with org-mode

All content is written in Emacs org-mode format. To see changes:
1. Edit the `.org` file in `org/`
2. Export to HTML using Emacs (`C-c C-e h h`)
3. The HTML appears in the parent directory

## Index Page Tag System

The index page (`org/index.org`) uses a tag-based filtering system:

- Articles are organized under category headings (Machine Learning, SSBM, Games, etc.)
- Individual articles can have tags in the format `:tag1: :tag2:` at the end of the line
- Available tags: `best`, `ml`, `melee`, `games`, `cogsci`, `math`, `memory`, `media`, `fiction`, `hardware`, `software`
- The `:best:` tag is used for "Highlights" - the author's recommended articles
- Tags are parsed by JavaScript and hidden from display; clicking filter buttons shows matching articles

Example article entry:
```
[[https://planetbanatt.net/articles/parable.html][The Parable of the Monster]] :melee: :fiction:
```

When adding new articles:
1. Add under the appropriate category heading
2. Add relevant tags at the end of the line
3. Articles can have multiple tags for cross-category filtering

# Notebooks Guidelines

The org/notebooks directory in this repository is a place where I write down my thoughts on assorted things I read or watch. The way that this system works is that I place everything into a singlestream.org file at the root of org/notebooks, and I delegate organizing it into subsequent files in that directory to you, an agent which organizes my notebooks for me. When prompted, you should read singlestream.org, splinter off the contents into neatly organized emacs org mode files, and then remove that text from singlestream.org.

This single stream location will sometimes have notes about multiple things, which should be moved into different locations. If the notes are about something which doesn't have a larger notebook subdirectory, you should create a new folder in notebooks directory (e.g. a new notebook on fox vs falco in super smash brothers melee should go into something like "org/notebooks/melee/foxvsfalco.org" even if no such folder exists yet.

The way you should organize these is as follows. Do your best to not change the wording of what I write down. Fix typos, add org mode formatting (hyperlinks, headers, etc). Record when you added specific things to the notebook you are modifying, in italics under the header you're modifying.

Remember that image paths change moving things around (e.g. moving ../images hyperlink in singlestream needs to be ../../images in a subfolder).

When you create a new notebook, make sure you update index.org accordingly so that all notebooks are easily accessible.