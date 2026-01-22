(tool-bar-mode 0)
(menu-bar-mode 0)
(setq inhibit-startup-message t)
(when window-system (scroll-bar-mode -1))
(setq fill-column 80)
(global-visual-line-mode t)

;theme
(use-package monokai-theme :ensure t)
(load-theme 'monokai t)

;encoding?
(prefer-coding-system 'utf-8)
(set-default-coding-systems 'utf-8)
(set-terminal-coding-system 'utf-8)
(set-keyboard-coding-system 'utf-8)

(setq initial-scratch-message
"; Present Day. Present Time! (ahahaha!)
")

; autosave directory hidden
(setq
   backup-by-copying t      ; don't clobber symlinks
   backup-directory-alist
    '(("." . "~/.saves/"))    ; don't litter my fs tree
   delete-old-versions t
   kept-new-versions 6
   kept-old-versions 2
   version-control t)

(global-set-key (kbd "M-o") 'other-window)
(global-set-key (kbd "C-x k") 'kill-current-buffer)
(global-set-key (kbd "C-c C-k") 'eval-buffer)
(global-unset-key (kbd "C-z"))


(defun kill-current-buffer ()
  (interactive)
  (kill-buffer (current-buffer))
  )

(setq org-export-with-section-numbers nil)
;(setq org-export-with-title nil) ;doesn't seem to work
(setq org-export-with-title t)
(setq org-html-toplevel-hlevel 1)
(setq org-html-head-include-default-style nil)
(setq org-html-head-include-default-scripts nil)

(setq org-html-head
      "<meta charset=\"utf-8\">
<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
<script src=\"https://cdnjs.cloudflare.com/ajax/libs/jquery/1.11.3/jquery.min.js\"></script>
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src=\"https://www.googletagmanager.com/gtag/js?id=UA-101739190-1\"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'UA-101739190-1');
</script>


<link  href=\"https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.5/css/bootstrap.min.css\" rel=\"stylesheet\">
<script src=\"https://cdnjs.cloudflare.com/ajax/libs/jquery/1.11.3/jquery.min.js\"></script>
<script src=\"https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.5/js/bootstrap.min.js\"></script>

<script>
var shiftWindow = function() { scrollBy(0, -50) };
if (location.hash) shiftWindow();
window.addEventListener(\"hashchange\", shiftWindow);
</script>

<script type=\"text/javascript\">

$(function() {
    'use strict';

    $(\"#text-table-of-contents ul:first\").addClass('nav')
    $('body').attr('data-spy', 'scroll')
    $('body').attr('data-target', '#text-table-of-contents')
    $('body').attr('data-offset', '100')
    $('table').addClass('table table-striped table-bordered table-hover table-condensed')

    // Dark mode functionality
    window.toggleDarkMode = function() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        updateToggleButton();
    }

    function updateToggleButton() {
        const toggle = document.querySelector('.dark-mode-toggle-nav');
        if (toggle) {
            toggle.innerHTML = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        }
    }

    // Initialize dark mode from localStorage
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');
    }

    // Update toggle button on page load
    updateToggleButton();
});
</script>

<link rel=\"stylesheet\" type=\"text/css\" href=\"https://planetbanatt.net/css/default_20240614.css\" />
<link rel=\"shortcut icon\" type=\"image/jpg\" href=\"https://planetbanatt.net/favicon.ico\" />
")

(setq org-html-preamble
"
<!-- heading -->
<!-- add here -->

<!-- Fixed navbar -->
    <nav class=\"navbar navbar-default navbar-fixed-top\">
        <div class=\"navbar-header\">
          <button type=\"button\" class=\"navbar-toggle collapsed\" data-toggle=\"collapse\" data-target=\"#navbar\" aria-expanded=\"false\" aria-controls=\"navbar\">
            <span class=\"sr-only\">Toggle navigation</span>
            <span class=\"icon-bar\"></span>
            <span class=\"icon-bar\"></span>
            <span class=\"icon-bar\"></span>
          </button>
        </div>

        <div id=\"navbar\" class=\"navbar-collapse collapse\">
          <ul class=\"nav navbar-nav ml-auto\" style=\"margin-left:3%%\">
            <li class=\"nav-item\"><a href=\"http://planetbanatt.net/\">Home</a></li>
            <li><a href=\"http://planetbanatt.net/about.html\">About</a></li>
            <li><a href=\"http://planetbanatt.net/projects.html\">Projects</a></li>
            <li><a href=\"http://planetbanatt.net/melee/index.html\">Melee</a></li>
            <li><a href=\"http://planetbanatt.net/links.html\">Links</a></li>
            <li><a href=\"http://planetbanatt.net/resume.pdf\">Resume</a></li>
            <li class=\"dark-mode-nav-item\"><a href=\"#\" class=\"dark-mode-toggle-nav\" onclick=\"toggleDarkMode(); return false;\">🌙</a></li>
          </ul>
          </ul>
        </div><!--/.nav-collapse -->
    </nav>
")

(setq org-html-postamble
      "<a href=\"#top\">Back to Top</a>")

(setq org-publish-project-alist
      '(("planetbanatt"
	:base-directory "~/Documents/code/ambisinister.github.io/org/"
	:base-extension "org"
	:publishing-directory "~/Documents/code/ambisinister.github.io/"
	:recursive t
	:publishing-function org-html-publish-to-html
	:headline-levels 6             ; Just the default for this project.
	))
)

(require 'ox-latex)
(use-package htmlize)
(add-to-list 'org-latex-packages-alist '("" "minted"))
(setq org-latex-listings 'minted)
(setq org-latex-pdf-process
      '("pdflatex -shell-escape -interaction nonstopmode -output-directory %o %f"
        "pdflatex -shell-escape -interaction nonstopmode -output-directory %o %f"
        "pdflatex -shell-escape -interaction nonstopmode -output-directory %o %f"))

;; The following lines are always needed.  Choose your own keys.
(global-set-key "\C-cl" 'org-store-link)
(global-set-key "\C-ca" 'org-agenda)
(global-set-key "\C-cc" 'org-capture)
(global-set-key "\C-cb" 'org-switchb)

(global-set-key (kbd "C-c i") 'org-toggle-inline-images)
(setq org-image-actual-width '(500))
(setq org-display-inline-images t)
(setq org-latex-create-formula-image-program 'dvipng)
(setq org-archive-location "~/Dropbox/org/logs/archive.org::* From %s")
(setq org-hide-leading-stars t)
(setq org-src-tab-acts-natively t)
(setq org-default-notes-file "~/Dropbox/org/main.org")


(setq org-todo-keywords
      '((sequence "TODO" "WAITING" "|" "DONE" "HOLD")))

(setq org-return-follows-link 1)


(use-package org-bullets :ensure t)
(require 'org-bullets)
(add-hook 'org-mode-hook (lambda () (org-bullets-mode 1)))

(setq org-ellipsis "⤵")

(setq org-src-fontify-natively t)

;(setq org-bullets-bullet-list
;'("◉" "◎" "<img draggable="false" class="emoji" alt="⚫" src="https://s0.wp.com/wp-content/mu-plugins/wpcom-smileys/twemoji/2/svg/26ab.svg">" "○" "►" "◇"))

(defun paste-clipboard-image ()
    (interactive)
    (let* ((image-dir (concat (file-name-directory (buffer-file-name))
			      "../images/from_clipboard/"))
	   (file-name (concat (format-time-string "%Y%m%d_%H%M%S") ".png"))
	   (file-path (concat image-dir file-name)))
      (unless (file-exists-p image-dir)
	(make-directory image-dir t))
      ;; replace 'pngpaste' with 'xclip' for Linux.
      (shell-command (concat "/opt/homebrew/bin/pngpaste " file-path))
      (insert (concat "[[../images/from_clipboard/" file-name "]]"))
      (org-display-inline-images)))

(with-eval-after-load 'org
  (define-key org-mode-map (kbd "C-c C-x i") 'paste-clipboard-image))

(setq org-capture-templates
      '(("a" "anki basic" entry (file+headline "~/Dropbox/org/logs/added_anki.org" "Basic")
         "* know :deck: \n** Item :note: \n\t:PROPERTIES:\n\t:ANKI_NOTE_TYPE: Basic\n\t:ANKI_TAGS: \n\t:END:\n*** Front\n%?\n*** Back\n")
        ("t" "task" entry (file+headline "~/Dropbox/org/main.org" "Assorted Things")
         "* TODO %?")
        ("l" "links" item (file "~/Dropbox/org/links.org")
         "[[%^{prompt}][%^{prompt}]] %?")
        ("j" "journal" entry (file+headline "~/Dropbox/org/logs/captains_log.org" "journal")
         "* %t \n%?")
        ))

(use-package anki-editor :ensure t)

(global-set-key "\C-c0" 'send-to-anki)

(defun send-to-anki ()
  (interactive)
  (find-file "~/Dropbox/org/logs/added_anki.org")
  (anki-editor-submit)
  (erase-buffer)
  (save-buffer)
  (kill-current-buffer)
  )

;probably change this so that it only asks once per file upon opening, since this is sort of dangerous
(defun my-org-confirm-babel-evaluate (lang body)
  (not (member lang '("python"))))
(setq org-confirm-babel-evaluate 'my-org-confirm-babel-evaluate)

(org-babel-do-load-languages
 'org-babel-load-languages
 '((python . t)))

(use-package pdf-tools :ensure t)
(add-to-list 'load-path "~/.emacs.d/lisp/")
(pdf-loader-install)
