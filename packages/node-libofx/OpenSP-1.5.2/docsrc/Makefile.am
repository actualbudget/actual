MAX_TEX_RECURSION=4
XMLTO=@XMLTO@
JADE=@JADE@
JADETEX=@JADETEX@
PDF2PS=@PDF2PS@
PDFJADETEX=@PDFJADETEX@
XMLDCL=$(top_srcdir)/pubtext/xml.dcl


docdir = $(datadir)/doc
pkgdocdir = $(docdir)/@PACKAGE@

man_MANS = onsgmls.1 osgmlnorm.1 ospent.1 ospam.1 osx.1 ospcat.1
BUILT_SOURCES = $(man_MANS)
pkgdoc_DATA = releasenotes.html @EXTRADOCS@

MAINTAINERCLEANFILES = Makefile.in

EXTRA_DIST = $(patsubst %.1, %.xml, $(man_MANS)) releasenotes.xml releasenotes.dsl logo.png

%.tex: $(srcdir)/%.xml $(srcdir)/%.dsl
	$(JADE) -o $@ -v -t tex -V tex-backend -V '(define %openjade-logo% "$(srcdir)/logo.png")' -d $(srcdir)/$*.dsl#print $(XMLDCL) $(srcdir)/$*.xml

%.pdf: %.tex
	$(PDFJADETEX) $<
	if ! cmp $(shell basename $< .tex).aux prior.aux 2>/dev/null && \
		expr $(MAKELEVEL) '<' $(MAX_TEX_RECURSION); then \
		cp -pf $(shell basename $< .tex).aux prior.aux ; \
		rm -f $@ ; \
		$(MAKE) $@ ; \
	fi
	rm -f prior.aux

%.dvi: %.tex
	$(JADETEX) $<
	if ! cmp $(shell basename $< .tex).aux prior.aux 2>/dev/null && \
		expr $(MAKELEVEL) '<' $(MAX_TEX_RECURSION); then \
		cp -pf $(shell basename $< .tex).aux prior.aux ; \
		rm -f $@ ; \
		$(MAKE) $@ ; \
	fi
	rm -f prior.aux

%.ps: %.pdf
	$(PDF2PS) $< $@

%.html: $(srcdir)/%.xml $(srcdir)/%.dsl
#	$(JADE) -v -t sgml -i html -V nochunks -V rootchunk -V "%root-filename%=$*" -V "%html-ext%=.html" -d $(srcdir)/$*.dsl#html $(XMLDCL) $(srcdir)/$*.xml
	$(XMLTO) html-nochunks $(srcdir)/$*.xml

%.1: $(srcdir)/%.xml
	$(XMLTO) man $<
   
mostlyclean-local:
	-rm -f *.out *.aux *.log *.dvi *.tex

clean-local: mostlyclean
	-rm -f *.1 *.html *.pdf *.ps
