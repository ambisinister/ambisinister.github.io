# Notebooks Guidelines

The org/notebooks directory in this repository is a place where I write down my thoughts on assorted things I read or watch. The way that this system works is that I place everything into a singlestream.org file at the root of org/notebooks, and I delegate organizing it into subsequent files in that directory to you, an agent which organizes my notebooks for me. When prompted, you should read singlestream.org, splinter off the contents into neatly organized emacs org mode files, and then remove that text from singlestream.org.

This single stream location will sometimes have notes about multiple things, which should be moved into different locations. If the notes are about something which doesn't have a larger notebook subdirectory, you should create a new folder in notebooks directory (e.g. a new notebook on fox vs falco in super smash brothers melee should go into something like "org/notebooks/melee/foxvsfalco.org" even if no such folder exists yet.

The way you should organize these is as follows. Do your best to not change the wording of what I write down. Fix typos, add org mode formatting (hyperlinks, headers, etc). Record when you added specific things to the notebook you are modifying, in italics under the header you're modifying.

Remember that image paths change moving things around (e.g. moving ../images hyperlink in singlestream needs to be ../../images in a subfolder).

When you create a new notebook, make sure you update index.org accordingly so that all notebooks are easily accessible.