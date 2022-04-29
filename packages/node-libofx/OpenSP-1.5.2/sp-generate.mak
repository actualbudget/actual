# This is a Makefile for nmake that makes all the .cxx and .h files that
# are automatically generated.  It's too painful to do in the IDE.
# You'll need perl in your PATH to use this.

LANG=en

M4=m4
PERL=perl

GENSRCS=msggen.pl \
lib\entmgr_inst.cxx \
lib\xentmgr_inst.cxx \
lib\parser_inst.cxx \
lib\app_inst.cxx \
lib\arc_inst.cxx \
lib\ArcEngineMessages.h \
lib\EntityManagerMessages.h \
lib\CatalogMessages.h \
lib\MessageFormatterMessages.h \
lib\MessageReporterMessages.h \
lib\PosixStorageMessages.h \
lib\URLStorageMessages.h \
lib\WinInetStorageMessages.h \
lib\StdioStorageMessages.h \
lib\ParserMessages.h \
lib\ParserAppMessages.h \
lib\CmdLineAppMessages.h \
lib\EntityAppMessages.h \
nsgmls\nsgmls_inst.cxx \
nsgmls\RastEventHandlerMessages.h \
nsgmls\NsgmlsMessages.h \
spam\SpamMessages.h \
spam\spam_inst.cxx \
sx\SxMessages.h \
sx\XmlOutputMessages.h \
sx\sx_inst.cxx \
include\config.h

.SUFFIXES: .m4 .msg .pl .in

all: $(GENSRCS)


.m4.cxx:
	-del /f $@ 2> nul
	$(PERL) instmac.pl $< >$@
	attrib +r $@

{lib}.msg{lib}.h:
	-del /f $@ 2> nul
	$(PERL) -w msggen.pl -l libModule -t po\$(LANG).po $<
	attrib +r $@

{nsgmls}.msg{nsgmls}.h:
	-del /f $@ 2> nul
	$(PERL) -w msggen.pl -l appModule -t po\$(LANG).po $<
	attrib +r $@

{spam}.msg{spam}.h:
	-del /f $@ 2> nul
	$(PERL) -w msggen.pl -l appModule -t po\$(LANG).po $<
	attrib +r $@

{sx}.msg{sx}.h:
	-del /f $@ 2> nul
	$(PERL) -w msggen.pl -l appModule -t po\$(LANG).po $<
	attrib +r $@

include\config.h: include\config.h.old.in
	copy include\config.h.old.in include\config.h 

msggen.pl: msggen.pl.in
	copy msggen.pl.in msggen.pl
