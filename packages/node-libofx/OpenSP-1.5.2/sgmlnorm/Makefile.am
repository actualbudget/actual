## Process this file with automake to produce Makefile.in

bin_PROGRAMS = osgmlnorm

osgmlnorm_SOURCES = sgmlnorm.cxx SGMLGenerator.cxx SGMLGenerator.h \
	SgmlnormMessages.h

EXTRA_DIST = sgmlnorm.dsp SgmlnormMessages.msg SgmlnormMessages.rc \
	.cvsignore

BUILT_SOURCES = SgmlnormMessages.h SgmlnormMessages.rc

MAINTAINERCLEANFILES = Makefile.in

osgmlnorm_LDADD = $(top_builddir)/lib/libosp.la $(LTLIBINTL)

INCLUDES = -I$(top_srcdir)/include -I$(top_srcdir)/generic

MSGGENFLAGS = -l appModule

SUFFIXES = .msg .rc

%.h %.cxx %.rc: %.msg
	[ ! -f $(top_srcdir)/msggen.pl ] || $(PERL) -w $(top_srcdir)/msggen.pl $(MSGGENFLAGS) $<
