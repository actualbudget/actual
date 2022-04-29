bin_PROGRAMS = ofxdump
ofxdump_LDADD = $(top_builddir)/lib/libofx.la
ofxdump_SOURCES = cmdline.h cmdline.c ofxdump.cpp
dist_man_MANS = ofxdump.1

AM_CPPFLAGS = \
	-I${top_builddir}/inc \
	'-DCMDLINE_PARSER_PACKAGE="ofxdump"'

if USE_GENGETOPT 
CLEANFILES = cmdline.c cmdline.h

cmdline.c cmdline.h: cmdline.ggo Makefile
	gengetopt --unamed-opts < $<

endif

ofxdump.1: ofxdump.cpp $(top_srcdir)/configure.ac
	$(MAKE) $(AM_MAKEFLAGS) ofxdump$(EXEEXT)
if HAVE_HELP2MAN
	$(HELP2MAN) -n 'Dump content of OFX files as human-readable text' -N --output=ofxdump.1 ./ofxdump$(EXEEXT)
else
	echo "*** No man page available because of missing help2man tool" > $@
endif

MAINTAINERCLEANFILES  = cmdline.c cmdline.h
EXTRA_DIST = cmdline.ggo

