## Process this file with automake to produce Makefile.in

bin_PROGRAMS = osx

osx_SOURCES = sx.cxx XmlOutputEventHandler.cxx XmlOutputEventHandler.h \
	sx_inst.cxx XmlOutputMessages.h SxMessages.h

EXTRA_DIST = XmlOutputMessages.msg XmlOutputMessages.rc \
	SxMessages.msg SxMessages.rc sx_inst.m4 sx.rc sx.dsp \
	.cvsignore

osx_LDADD = $(top_builddir)/lib/libosp.la $(LTLIBINTL)

INCLUDES = -I$(top_srcdir)/include

BUILT_SOURCES = XmlOutputMessages.h XmlOutputMessages.rc \
	SxMessages.h SxMessages.rc sx_inst.cxx

MAINTAINERCLEANFILES = Makefile.in

MSGGENFLAGS = -l appModule

SUFFIXES = .msg .m4 .rc

.m4.cxx:
	$(PERL) $(top_srcdir)/instmac.pl $< >$@

%.h %.cxx %.rc: %.msg
	 [ ! -f $(top_srcdir)/msggen.pl ] || $(PERL) -w $(top_srcdir)/msggen.pl $(MSGGENFLAGS) $<
