## Process this file with automake to produce Makefile.in

bin_PROGRAMS = onsgmls

onsgmls_SOURCES = nsgmls.cxx SgmlsEventHandler.cxx SgmlsEventHandler.h \
	RastEventHandler.cxx RastEventHandler.h StringSet.cxx StringSet.h \
	nsgmls_inst.cxx NsgmlsMessages.h RastEventHandlerMessages.h nsgmls.h

EXTRA_DIST = nsgmls_inst.m4 NsgmlsMessages.msg NsgmlsMessages.rc \
	RastEventHandlerMessages.msg RastEventHandlerMessages.rc \
	nsgmls.rc nsgmls.dsp .cvsignore

onsgmls_LDADD = $(top_builddir)/lib/libosp.la $(LTLIBINTL)

INCLUDES = -I$(top_srcdir)/include -I$(top_srcdir)/generic 

BUILT_SOURCES = nsgmls_inst.cxx NsgmlsMessages.h NsgmlsMessages.rc \
	RastEventHandlerMessages.h RastEventHandlerMessages.rc

MAINTAINERCLEANFILES = Makefile.in
  
MSGGENFLAGS = -l appModule 

SUFFIXES = .msg .m4 .rc

.m4.cxx:
	$(PERL) $(top_srcdir)/instmac.pl $< >$@

%.h %.cxx %.rc: %.msg
	[ ! -f $(top_srcdir)/msggen.pl ] || $(PERL) -w $(top_srcdir)/msggen.pl $(MSGGENFLAGS) $<
