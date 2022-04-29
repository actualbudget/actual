SUBDIRS =

docdir = ${prefix}/share/doc/libofx

EXTRA_DIST = \
	doxygen.cfg \
	ofx_sample_files \
	tag_striper_test.txt \
	html

all:

doc: html/

html/: doxygen.cfg
	echo "doc: " && pwd && 	echo "distdir: " && echo $(distdir)
	rm -rf html/ refman.pdf
	$(DOXYGEN) $(srcdir)/doxygen.cfg
#	$(MAKE) -C latex/ 
#	mv latex/refman.pdf ./refman.pdf

dist-hook: maintainer-clean-local doc
	echo "dist-hook: " && pwd

clean-local:
	echo "clean-local: " && pwd
	rm -rf latex/
	rm -f *~
	rm -f doxygen.log

maintainer-clean-local: clean-local
	echo "maintainer-clean-local: " && pwd
	rm -rf html refman.pdf

install-data-hook:
	$(mkinstalldirs) $(DESTDIR)$(docdir)
	mkdir -p html #Workaround to allow libofx-cvs user to install without doc.
	cp -rp html $(DESTDIR)$(docdir)

uninstall-hook:
	chmod +w -R $(DESTDIR)${docdir}/html #Why chmod is needed is a mystery
	rm -rf $(DESTDIR)${docdir}/html
