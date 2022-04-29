<!DOCTYPE style-sheet PUBLIC "-//James Clark//DTD DSSSL Style Sheet//EN" [
<!ENTITY html-ss 
  PUBLIC "-//Norman Walsh//DOCUMENT DocBook HTML Stylesheet//EN" CDATA dsssl>
<!ENTITY print-ss
  PUBLIC "-//Norman Walsh//DOCUMENT DocBook Print Stylesheet//EN" CDATA dsssl>
]>
<style-sheet>
<style-specification id="print" use="print-stylesheet">
<style-specification-body> 

;; This draws in version 1.74b of the module docbook DSSSL stylesheets
;; together with sourceforge patch #502637

;; customize the print stylesheet

(define %hsize-bump-factor% 1.1)

(define %chapter-autolabel%
  ;; Are chapters enumerated?
  #f)

(define %two-side% #t)

;;
;; We are targeting pdfjadetex - and converting from PDF to postscript
;; We need to make sure that .pdf images (actually .epdf) are preferred
;; over others

(define %graphic-extensions%
;; List of graphic filename extensions
'("pdf" "eps" "epsf" "gif" "tif" "tiff" "jpg" "jpeg" "png"))


(define preferred-mediaobject-notations
  (list "PDF" "EPS" "PS" "JPG" "JPEG" "PNG" "linespecific"))

(define preferred-mediaobject-extensions
  (list "pdf" "eps" "ps" "jpg" "jpeg" "png"))

(define %titlepage-in-info-order% #f)

;; Fix bug in numbering of the preface
;;
;; ISC: 23/11/02 - I think this is in version 1.76 of the stylesheets
;; but I will leave it here for now

      (define ($component$)
        (make simple-page-sequence
          page-n-columns: %page-n-columns%
          page-number-restart?: (or %page-number-restart%
                                    (first-chapter?))
          page-number-format: ($page-number-format$)
          use: default-text-style
          left-header:   ($left-header$)
          center-header: ($center-header$)
          right-header:  ($right-header$)
          left-footer:   ($left-footer$)
          center-footer: ($center-footer$)
          right-footer:  ($right-footer$)
          start-indent: %body-start-indent%
          input-whitespace-treatment: 'collapse
          quadding: %default-quadding%
          (make sequence
            ($component-title$)
            (process-children))
          (make-endnotes)))

;; Customise the title page
;;
;; We want to choose the items to go on the page, the placement of them
;; and the font. We want a logo in the bottom right hand corner
;; And a nice thick rule above the title.
;;
(element book 
  (let* ((bookinfo  (select-elements (children (current-node)) 
				     (normalize "bookinfo")))
	 (dedication (select-elements (children (current-node)) 
				      (normalize "dedication")))
	 (nl        (titlepage-info-elements (current-node) bookinfo)))
    (make sequence
      (if %generate-book-titlepage%
	  (make simple-page-sequence
	    page-n-columns: %titlepage-n-columns%
	    input-whitespace-treatment: 'collapse
	    use: default-text-style
		bottom-margin: 144pt
		right-footer: ($title-right-footer$)
	    (book-titlepage nl 'recto)
	    (make display-group
	      break-before: 'page
	      (book-titlepage nl 'verso)))
	  (empty-sosofo))

      (if (node-list-empty? dedication)
	  (empty-sosofo)
	  (with-mode dedication-page-mode
	    (process-node-list dedication)))

      (if (not (generate-toc-in-front))
	  (process-children)
	  (empty-sosofo))

      (if %generate-book-toc%
	  (make simple-page-sequence
	    page-n-columns: %page-n-columns%
	    page-number-format: ($page-number-format$ (normalize "toc"))
	    use: default-text-style
	    left-header:   ($left-header$ (normalize "toc"))
	    center-header: ($center-header$ (normalize "toc"))
	    right-header:  ($right-header$ (normalize "toc"))
	    left-footer:   ($left-footer$ (normalize "toc"))
	    center-footer: ($center-footer$ (normalize "toc"))
	    right-footer:  ($right-footer$ (normalize "toc"))
	    input-whitespace-treatment: 'collapse
	    (build-toc (current-node)
		       (toc-depth (current-node))))
	  (empty-sosofo))
	    
      (let loop ((gilist ($generate-book-lot-list$)))
	(if (null? gilist)
	    (empty-sosofo)
	    (if (not (node-list-empty? 
		      (select-elements (descendants (current-node))
				       (car gilist))))
		(make simple-page-sequence
		  page-n-columns: %page-n-columns%
		  page-number-format: ($page-number-format$ (normalize "lot"))
		  use: default-text-style
		  left-header:   ($left-header$ (normalize "lot"))
		  center-header: ($center-header$ (normalize "lot"))
		  right-header:  ($right-header$ (normalize "lot"))
		  left-footer:   ($left-footer$ (normalize "lot"))
		  center-footer: ($center-footer$ (normalize "lot"))
		  right-footer:  ($right-footer$ (normalize "lot"))
		  input-whitespace-treatment: 'collapse
		  (build-lot (current-node) (car gilist))
		  (loop (cdr gilist)))
		(loop (cdr gilist)))))

      (if (generate-toc-in-front)
	  (process-children)
	  (empty-sosofo)))))

(define %openjade-logo%
   ;; The openjade logo
    "logo.png" )

(define ($title-right-footer$)
  (if-first-page
    (make external-graphic
	  scale:               1.0
	  entity-system-id:    %openjade-logo%
	  notation-system-id:  "PDF"
	  display?:            #f)
    (empty-sosofo)))

(define (book-titlepage-recto-elements)
  (list (normalize "corpauthor")
        (normalize "subtitle")
        (normalize "title")
        (normalize "graphic")))

(define (book-titlepage-verso-elements)
  (list (normalize "legalnotice")
        (normalize "copyright")
        (normalize "edition")
        (normalize "pubdate")
        (normalize "abstract")
        (normalize "revhistory")))  

(define (book-titlepage-before node side)
(empty-sosofo)
	)

(mode book-titlepage-recto-mode

    (element graphic
        (make display-group
             (make external-graphic
                 entity-system-id: (attribute-string "fileref")
                 display?:               #t
             )
        )
    )                         
    (element title
        (make paragraph
                font-size:      36pt
                font-family-name:       "Palatino"
                font-weight:    'bold
                space-before:   12pt
		line-spacing:	36pt
                (make rule
			space-after: 4pt
                        line-thickness: 1pt)
                (process-children)
        )                                                                       
    )
    (element subtitle
        (make paragraph
                font-size:      24pt
		line-spacing:	24pt
                font-family-name:       "Palatino"
                font-weight:    'bold
                (process-children)
        )
    ) 
    (element corpauthor
        (make paragraph
                font-size:      24pt
                line-spacing:      24pt
                space-after:   6pt
                font-family-name:       "Palatino"
                font-weight:    'normal
                (process-children)
        )                                                                       
    )
)


</style-specification-body>
</style-specification>

<style-specification id="html" use="html-stylesheet">
<style-specification-body>

;; customize the html stylesheet


;; customize the html stylesheet
(define %body-attr%
  ;; What attributes should be hung off of BODY?
  (list
     (list "BGCOLOR" "#FFFFFF")
     (list "TEXT" "#000000")))

</style-specification-body>
</style-specification>
<external-specification id="print-stylesheet" document="print-ss">
<external-specification id="html-stylesheet"  document="html-ss">
</style-sheet>
