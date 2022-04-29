## Process this file with automake to produce Makefile.in

lib_LTLIBRARIES= libosp.la

## Note on library versions
##
## Here are a set of rules to help you update your library version
## information (format is current:revision:age): 
##
## 1. Start with version information of `0:0:0' for each libtool library. 
## 2. Update the version information only immediately before a public release
##    of your software. More frequent updates are unnecessary, and only
##    guarantee that the current interface number gets larger faster. 
## 3. If the library source code has changed at all since the last update,
##    then increment revision (`c:r:a' becomes `c:r+1:a'). 
## 4. If any interfaces have been added, removed, or changed since the last
##    update, increment current, and set revision to 0. 
## 5. If any interfaces have been added since the last public release, then
##    increment age. 
## 6. If any interfaces have been removed since the last public release,
##    then set age to 0. 

libosp_la_LDFLAGS = -no-undefined -version-info @SP_LIBOSP_CUR@:@SP_LIBOSP_REV@:@SP_LIBOSP_AGE@
libosp_la_LIBADD = $(LTLIBINTL)

## We list the generated sources here. This has the side-effect
## of putting them in the distribution, but that is actually nice
## since it means that building the distribution doesn't require perl.
##
## Note that we put the windows-only sources into EXTRA_DIST.
libosp_la_SOURCES = Allocator.cxx ArcEngine.cxx \
	ArcEngineMessages.h ArcProcessor.h Attribute.cxx \
	Big5CodingSystem.cxx CatalogEntry.h CatalogMessages.h \
	CharsetDecl.cxx CharsetInfo.cxx CharsetRegistry.cxx CmdLineApp.cxx \
	CmdLineAppMessages.h CodingSystem.cxx CodingSystemKit.cxx \
	ConsoleOutput.cxx ContentState.cxx ContentToken.cxx \
	DescriptorManager.cxx Dtd.cxx DtdDeclEventHandler.cxx \
	DtdDeclEventHandler.h EUCJPCodingSystem.cxx ElementType.cxx \
	Entity.cxx EntityApp.cxx EntityCatalog.cxx EntityDecl.cxx \
	EntityManager.cxx EntityManagerMessages.h EquivClass.h \
	ErrnoMessageArg.cxx ErrorCountEventHandler.cxx Event.cxx \
	EventGenerator.cxx EventQueue.h ExtendEntityManager.cxx \
	ExternalId.cxx Fixed2CodingSystem.cxx GenericEventHandler.cxx \
	Group.cxx Group.h Hash.cxx IListBase.cxx Id.cxx Id.h \
	IdentityCodingSystem.cxx InputSource.cxx InternalInputSource.cxx \
	Link.cxx LinkProcess.cxx LiteralStorage.cxx Location.cxx Lpd.cxx \
	LpdEntityRef.h Markup.cxx MarkupScan.h Message.cxx MessageArg.cxx \
	MessageEventHandler.cxx MessageFormatter.cxx MessageFormatterMessages.h \
	MessageReporter.cxx MessageReporterMessages.h \
	MessageTable.cxx ModeInfo.cxx \
	ModeInfo.h Mutex.h NameToken.h Notation.cxx NotationStorage.cxx \
	NumericCharRefOrigin.cxx NumericCharRefOrigin.h OffsetOrderedList.cxx \
	OffsetOrderedList.h OpenElement.cxx OutputByteStream.cxx \
	OutputCharStream.cxx OutputState.cxx OutputState.h Param.cxx Param.h \
	Parser.cxx Parser.h ParserApp.cxx ParserAppMessages.h \
	EntityAppMessages.h \
	ParserEventGeneratorKit.cxx ParserMessages.h ParserMessages.cxx \
	ParserOptions.cxx ParserState.cxx ParserState.h Partition.cxx \
	Partition.h PosixStorage.cxx PosixStorageMessages.h Priority.h \
	Recognizer.cxx Recognizer.h RewindStorageObject.cxx \
	SGMLApplication.cxx SJISCodingSystem.cxx SOEntityCatalog.cxx Sd.cxx \
	SdFormalError.h SdText.cxx SearchResultMessageArg.cxx SgmlParser.cxx \
	ShortReferenceMap.cxx SrInfo.h StdioStorage.cxx StdioStorageMessages.h \
	StorageManager.cxx StorageObjectPosition.h Syntax.cxx \
	Text.cxx TokenMessageArg.cxx TokenMessageArg.h \
	TranslateCodingSystem.cxx Trie.h TrieBuilder.cxx TrieBuilder.h \
	TypeId.cxx URLStorage.cxx URLStorageMessages.h \
	UTF8CodingSystem.cxx Undo.cxx Undo.h UnicodeCodingSystem.cxx \
	UnivCharsetDesc.cxx XMLCodingSystem.cxx \
	assert.cxx big5.h events.h gb2312.h iso646-jis.h iso8859-2.h \
	iso8859-3.h iso8859-4.h iso8859-5.h iso8859-6.h iso8859-7.h \
	iso8859-8.h iso8859-9.h jis0201.h jis0208.h jis0212.h ksc5601.h \
	koi8-r.h \
	parseAttribute.cxx parseCommon.cxx parseDecl.cxx parseInstance.cxx \
	parseMode.cxx parseParam.cxx parseSd.cxx splib.cxx splib.h \
	splibpch.h token.h app_inst.cxx arc_inst.cxx entmgr_inst.cxx \
	parser_inst.cxx xentmgr_inst.cxx SubstTable.cxx \
	UTF16CodingSystem.cxx Fixed4CodingSystem.cxx \
	memcmp.c memmove.c strerror.c

INCLUDES = -I$(top_srcdir)/include -I$(top_srcdir)/generic

## We include the windows-only source and aux files here, so that
## make dist-zip produces a working windows distribution.
EXTRA_DIST = ArcEngineMessages.msg ArcEngineMessages.rc \
	CatalogMessages.msg CatalogMessages.rc \
	CmdLineAppMessages.msg CmdLineAppMessages.rc \
	EntityAppMessages.msg EntityAppMessages.rc \
	EntityManagerMessages.msg EntityManagerMessages.rc \
	MessageFormatterMessages.msg MessageFormatterMessages.rc \
	MessageReporterMessages.msg MessageReporterMessages.rc \
	ParserAppMessages.msg ParserAppMessages.rc \
	ParserMessages.msg ParserMessages.rc \
	PosixStorageMessages.msg PosixStorageMessages.rc \
	StdioStorageMessages.msg StdioStorageMessages.rc \
	URLStorageMessages.msg URLStorageMessages.rc \
	app_inst.m4 arc_inst.m4 entmgr_inst.m4 \
	parser_inst.m4 xentmgr_inst.m4 WinInetStorage.cxx \
	WinInetStorageMessages.h WinInetStorageMessages.msg \
	WinInetStorageMessages.rc WinApp.cxx Win32CodingSystem.cxx \
	lib.rc lib.dsp .cvsignore

MSGGENFLAGS = -l libModule

BUILT_SOURCES = ArcEngineMessages.h ArcEngineMessages.rc \
	CatalogMessages.h CatalogMessages.rc \
	CmdLineAppMessages.h CmdLineAppMessages.rc \
	EntityAppMessages.h EntityAppMessages.rc \
	EntityManagerMessages.h EntityManagerMessages.rc \
	MessageFormatterMessages.h MessageFormatterMessages.rc \
	MessageReporterMessages.h MessageReporterMessages.rc \
	ParserAppMessages.h ParserAppMessages.rc \
	ParserMessages.cxx ParserMessages.h ParserMessages.rc \
	PosixStorageMessages.h PosixStorageMessages.rc \
	StdioStorageMessages.h StdioStorageMessages.rc \
	URLStorageMessages.h URLStorageMessages.rc \
	WinInetStorageMessages.h WinInetStorageMessages.rc \
	app_inst.cxx arc_inst.cxx entmgr_inst.cxx parser_inst.cxx \
	xentmgr_inst.cxx

MAINTAINERCLEANFILES = Makefile.in

SUFFIXES = .msg .m4 .rc

.m4.cxx: 
	$(PERL) $(top_srcdir)/instmac.pl $< >$@

%.h %.cxx %.rc: %.msg
	[ ! -f $(top_srcdir)/msggen.pl ] || $(PERL) -w $(top_srcdir)/msggen.pl $(MSGGENFLAGS) $<
