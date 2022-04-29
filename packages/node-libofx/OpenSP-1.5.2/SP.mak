# Microsoft Developer Studio Generated NMAKE File, Format Version 4.20
# ** DO NOT EDIT **

# TARGTYPE "Win32 (x86) Console Application" 0x0103
# TARGTYPE "Win32 (x86) External Target" 0x0106
# TARGTYPE "Win32 (x86) Dynamic-Link Library" 0x0102

!IF "$(CFG)" == ""
CFG=sx - Win32 Debug
!MESSAGE No configuration specified.  Defaulting to sx - Win32 Debug.
!ENDIF 

!IF "$(CFG)" != "lib - Win32 Release" && "$(CFG)" != "lib - Win32 Debug" &&\
 "$(CFG)" != "nsgmls - Win32 Release" && "$(CFG)" != "nsgmls - Win32 Debug" &&\
 "$(CFG)" != "spam - Win32 Release" && "$(CFG)" != "spam - Win32 Debug" &&\
 "$(CFG)" != "spent - Win32 Release" && "$(CFG)" != "spent - Win32 Debug" &&\
 "$(CFG)" != "sgmlnorm - Win32 Release" && "$(CFG)" != "sgmlnorm - Win32 Debug"\
 && "$(CFG)" != "all - Win32 Release" && "$(CFG)" != "all - Win32 Debug" &&\
 "$(CFG)" != "sx - Win32 Release" && "$(CFG)" != "sx - Win32 Debug"
!MESSAGE Invalid configuration "$(CFG)" specified.
!MESSAGE You can specify a configuration when running NMAKE on this makefile
!MESSAGE by defining the macro CFG on the command line.  For example:
!MESSAGE 
!MESSAGE NMAKE /f "SP.mak" CFG="sx - Win32 Debug"
!MESSAGE 
!MESSAGE Possible choices for configuration are:
!MESSAGE 
!MESSAGE "lib - Win32 Release" (based on "Win32 (x86) Dynamic-Link Library")
!MESSAGE "lib - Win32 Debug" (based on "Win32 (x86) Dynamic-Link Library")
!MESSAGE "nsgmls - Win32 Release" (based on "Win32 (x86) Console Application")
!MESSAGE "nsgmls - Win32 Debug" (based on "Win32 (x86) Console Application")
!MESSAGE "spam - Win32 Release" (based on "Win32 (x86) Console Application")
!MESSAGE "spam - Win32 Debug" (based on "Win32 (x86) Console Application")
!MESSAGE "spent - Win32 Release" (based on "Win32 (x86) Console Application")
!MESSAGE "spent - Win32 Debug" (based on "Win32 (x86) Console Application")
!MESSAGE "sgmlnorm - Win32 Release" (based on\
 "Win32 (x86) Console Application")
!MESSAGE "sgmlnorm - Win32 Debug" (based on "Win32 (x86) Console Application")
!MESSAGE "all - Win32 Release" (based on "Win32 (x86) External Target")
!MESSAGE "all - Win32 Debug" (based on "Win32 (x86) External Target")
!MESSAGE "sx - Win32 Release" (based on "Win32 (x86) Console Application")
!MESSAGE "sx - Win32 Debug" (based on "Win32 (x86) Console Application")
!MESSAGE 
!ERROR An invalid configuration is specified.
!ENDIF 

!IF "$(OS)" == "Windows_NT"
NULL=
!ELSE 
NULL=nul
!ENDIF 
################################################################################
# Begin Project
# PROP Target_Last_Scanned "lib - Win32 Debug"

!IF  "$(CFG)" == "lib - Win32 Release"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 0
# PROP BASE Output_Dir "lib\Release"
# PROP BASE Intermediate_Dir "lib\Release"
# PROP BASE Target_Dir "lib"
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 0
# PROP Output_Dir "lib\Release"
# PROP Intermediate_Dir "lib\Release"
# PROP Target_Dir "lib"
OUTDIR=.\lib\Release
INTDIR=.\lib\Release

ALL : ".\bin\sp133.dll"

CLEAN : 
	-@erase "$(INTDIR)\Allocator.obj"
	-@erase "$(INTDIR)\app_inst.obj"
	-@erase "$(INTDIR)\arc_inst.obj"
	-@erase "$(INTDIR)\ArcEngine.obj"
	-@erase "$(INTDIR)\assert.obj"
	-@erase "$(INTDIR)\Attribute.obj"
	-@erase "$(INTDIR)\Big5CodingSystem.obj"
	-@erase "$(INTDIR)\CharsetDecl.obj"
	-@erase "$(INTDIR)\CharsetInfo.obj"
	-@erase "$(INTDIR)\CharsetRegistry.obj"
	-@erase "$(INTDIR)\CmdLineApp.obj"
	-@erase "$(INTDIR)\CodingSystem.obj"
	-@erase "$(INTDIR)\CodingSystemKit.obj"
	-@erase "$(INTDIR)\ConsoleOutput.obj"
	-@erase "$(INTDIR)\ContentState.obj"
	-@erase "$(INTDIR)\ContentToken.obj"
	-@erase "$(INTDIR)\DescriptorManager.obj"
	-@erase "$(INTDIR)\Dtd.obj"
	-@erase "$(INTDIR)\ElementType.obj"
	-@erase "$(INTDIR)\Entity.obj"
	-@erase "$(INTDIR)\EntityApp.obj"
	-@erase "$(INTDIR)\EntityCatalog.obj"
	-@erase "$(INTDIR)\EntityDecl.obj"
	-@erase "$(INTDIR)\EntityManager.obj"
	-@erase "$(INTDIR)\entmgr_inst.obj"
	-@erase "$(INTDIR)\ErrnoMessageArg.obj"
	-@erase "$(INTDIR)\ErrorCountEventHandler.obj"
	-@erase "$(INTDIR)\EUCJPCodingSystem.obj"
	-@erase "$(INTDIR)\Event.obj"
	-@erase "$(INTDIR)\EventGenerator.obj"
	-@erase "$(INTDIR)\ExtendEntityManager.obj"
	-@erase "$(INTDIR)\ExternalId.obj"
	-@erase "$(INTDIR)\Fixed2CodingSystem.obj"
	-@erase "$(INTDIR)\GenericEventHandler.obj"
	-@erase "$(INTDIR)\Group.obj"
	-@erase "$(INTDIR)\Hash.obj"
	-@erase "$(INTDIR)\Id.obj"
	-@erase "$(INTDIR)\IdentityCodingSystem.obj"
	-@erase "$(INTDIR)\IListBase.obj"
	-@erase "$(INTDIR)\InputSource.obj"
	-@erase "$(INTDIR)\InternalInputSource.obj"
	-@erase "$(INTDIR)\lib.pch"
	-@erase "$(INTDIR)\lib.res"
	-@erase "$(INTDIR)\Link.obj"
	-@erase "$(INTDIR)\LinkProcess.obj"
	-@erase "$(INTDIR)\LiteralStorage.obj"
	-@erase "$(INTDIR)\Location.obj"
	-@erase "$(INTDIR)\Lpd.obj"
	-@erase "$(INTDIR)\Markup.obj"
	-@erase "$(INTDIR)\Message.obj"
	-@erase "$(INTDIR)\MessageArg.obj"
	-@erase "$(INTDIR)\MessageEventHandler.obj"
	-@erase "$(INTDIR)\MessageFormatter.obj"
	-@erase "$(INTDIR)\MessageReporter.obj"
	-@erase "$(INTDIR)\MessageTable.obj"
	-@erase "$(INTDIR)\ModeInfo.obj"
	-@erase "$(INTDIR)\Notation.obj"
	-@erase "$(INTDIR)\NotationStorage.obj"
	-@erase "$(INTDIR)\NumericCharRefOrigin.obj"
	-@erase "$(INTDIR)\OffsetOrderedList.obj"
	-@erase "$(INTDIR)\OpenElement.obj"
	-@erase "$(INTDIR)\OutputByteStream.obj"
	-@erase "$(INTDIR)\OutputCharStream.obj"
	-@erase "$(INTDIR)\OutputState.obj"
	-@erase "$(INTDIR)\Param.obj"
	-@erase "$(INTDIR)\parseAttribute.obj"
	-@erase "$(INTDIR)\parseCommon.obj"
	-@erase "$(INTDIR)\parseDecl.obj"
	-@erase "$(INTDIR)\parseInstance.obj"
	-@erase "$(INTDIR)\parseMode.obj"
	-@erase "$(INTDIR)\parseParam.obj"
	-@erase "$(INTDIR)\Parser.obj"
	-@erase "$(INTDIR)\parser_inst.obj"
	-@erase "$(INTDIR)\ParserApp.obj"
	-@erase "$(INTDIR)\ParserEventGeneratorKit.obj"
	-@erase "$(INTDIR)\ParserMessages.obj"
	-@erase "$(INTDIR)\ParserOptions.obj"
	-@erase "$(INTDIR)\ParserState.obj"
	-@erase "$(INTDIR)\parseSd.obj"
	-@erase "$(INTDIR)\Partition.obj"
	-@erase "$(INTDIR)\PosixStorage.obj"
	-@erase "$(INTDIR)\Recognizer.obj"
	-@erase "$(INTDIR)\RewindStorageObject.obj"
	-@erase "$(INTDIR)\Sd.obj"
	-@erase "$(INTDIR)\SdText.obj"
	-@erase "$(INTDIR)\SearchResultMessageArg.obj"
	-@erase "$(INTDIR)\SGMLApplication.obj"
	-@erase "$(INTDIR)\SgmlParser.obj"
	-@erase "$(INTDIR)\ShortReferenceMap.obj"
	-@erase "$(INTDIR)\SJISCodingSystem.obj"
	-@erase "$(INTDIR)\SOEntityCatalog.obj"
	-@erase "$(INTDIR)\splib.obj"
	-@erase "$(INTDIR)\StdioStorage.obj"
	-@erase "$(INTDIR)\StorageManager.obj"
	-@erase "$(INTDIR)\StringVectorMessageArg.obj"
	-@erase "$(INTDIR)\Syntax.obj"
	-@erase "$(INTDIR)\Text.obj"
	-@erase "$(INTDIR)\TokenMessageArg.obj"
	-@erase "$(INTDIR)\TranslateCodingSystem.obj"
	-@erase "$(INTDIR)\TrieBuilder.obj"
	-@erase "$(INTDIR)\TypeId.obj"
	-@erase "$(INTDIR)\Undo.obj"
	-@erase "$(INTDIR)\UnicodeCodingSystem.obj"
	-@erase "$(INTDIR)\UnivCharsetDesc.obj"
	-@erase "$(INTDIR)\URLStorage.obj"
	-@erase "$(INTDIR)\UTF8CodingSystem.obj"
	-@erase "$(INTDIR)\Win32CodingSystem.obj"
	-@erase "$(INTDIR)\WinApp.obj"
	-@erase "$(INTDIR)\WinInetStorage.obj"
	-@erase "$(INTDIR)\xentmgr_inst.obj"
	-@erase "$(INTDIR)\XMLCodingSystem.obj"
	-@erase "$(OUTDIR)\sp133.exp"
	-@erase "$(OUTDIR)\sp133.lib"
	-@erase ".\bin\sp133.dll"

"$(OUTDIR)" :
    if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

CPP=cl.exe
# ADD BASE CPP /nologo /MT /W3 /GX /O2 /D "WIN32" /D "NDEBUG" /D "_WINDOWS" /YX /c
# ADD CPP /nologo /MD /W3 /GX /O2 /I "include" /I "generic" /D "NDEBUG" /D "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE" /Yu"splib.h" /c
CPP_PROJ=/nologo /MD /W3 /GX /O2 /I "include" /I "generic" /D "NDEBUG" /D\
 "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D\
 "SP_MULTI_BYTE" /Fp"$(INTDIR)/lib.pch" /Yu"splib.h" /Fo"$(INTDIR)/" /c 
CPP_OBJS=.\lib\Release/
CPP_SBRS=.\.

.c{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.c{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

MTL=mktyplib.exe
# ADD BASE MTL /nologo /D "NDEBUG" /win32
# ADD MTL /nologo /D "NDEBUG" /win32
MTL_PROJ=/nologo /D "NDEBUG" /win32 
RSC=rc.exe
# ADD BASE RSC /l 0x809 /d "NDEBUG"
# ADD RSC /l 0x809 /d "NDEBUG"
RSC_PROJ=/l 0x809 /fo"$(INTDIR)/lib.res" /d "NDEBUG" 
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
BSC32_FLAGS=/nologo /o"$(OUTDIR)/lib.bsc" 
BSC32_SBRS= \
	
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:windows /dll /machine:I386
# ADD LINK32 wininet.lib wsock32.lib kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:windows /dll /machine:I386 /out:"bin/sp133.dll"
# SUBTRACT LINK32 /profile
LINK32_FLAGS=wininet.lib wsock32.lib kernel32.lib user32.lib gdi32.lib\
 winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib\
 uuid.lib /nologo /subsystem:windows /dll /incremental:no\
 /pdb:"$(OUTDIR)/sp133.pdb" /machine:I386 /out:"bin/sp133.dll"\
 /implib:"$(OUTDIR)/sp133.lib" 
LINK32_OBJS= \
	"$(INTDIR)\Allocator.obj" \
	"$(INTDIR)\app_inst.obj" \
	"$(INTDIR)\arc_inst.obj" \
	"$(INTDIR)\ArcEngine.obj" \
	"$(INTDIR)\assert.obj" \
	"$(INTDIR)\Attribute.obj" \
	"$(INTDIR)\Big5CodingSystem.obj" \
	"$(INTDIR)\CharsetDecl.obj" \
	"$(INTDIR)\CharsetInfo.obj" \
	"$(INTDIR)\CharsetRegistry.obj" \
	"$(INTDIR)\CmdLineApp.obj" \
	"$(INTDIR)\CodingSystem.obj" \
	"$(INTDIR)\CodingSystemKit.obj" \
	"$(INTDIR)\ConsoleOutput.obj" \
	"$(INTDIR)\ContentState.obj" \
	"$(INTDIR)\ContentToken.obj" \
	"$(INTDIR)\DescriptorManager.obj" \
	"$(INTDIR)\Dtd.obj" \
	"$(INTDIR)\ElementType.obj" \
	"$(INTDIR)\Entity.obj" \
	"$(INTDIR)\EntityApp.obj" \
	"$(INTDIR)\EntityCatalog.obj" \
	"$(INTDIR)\EntityDecl.obj" \
	"$(INTDIR)\EntityManager.obj" \
	"$(INTDIR)\entmgr_inst.obj" \
	"$(INTDIR)\ErrnoMessageArg.obj" \
	"$(INTDIR)\ErrorCountEventHandler.obj" \
	"$(INTDIR)\EUCJPCodingSystem.obj" \
	"$(INTDIR)\Event.obj" \
	"$(INTDIR)\EventGenerator.obj" \
	"$(INTDIR)\ExtendEntityManager.obj" \
	"$(INTDIR)\ExternalId.obj" \
	"$(INTDIR)\Fixed2CodingSystem.obj" \
	"$(INTDIR)\GenericEventHandler.obj" \
	"$(INTDIR)\Group.obj" \
	"$(INTDIR)\Hash.obj" \
	"$(INTDIR)\Id.obj" \
	"$(INTDIR)\IdentityCodingSystem.obj" \
	"$(INTDIR)\IListBase.obj" \
	"$(INTDIR)\InputSource.obj" \
	"$(INTDIR)\InternalInputSource.obj" \
	"$(INTDIR)\lib.res" \
	"$(INTDIR)\Link.obj" \
	"$(INTDIR)\LinkProcess.obj" \
	"$(INTDIR)\LiteralStorage.obj" \
	"$(INTDIR)\Location.obj" \
	"$(INTDIR)\Lpd.obj" \
	"$(INTDIR)\Markup.obj" \
	"$(INTDIR)\Message.obj" \
	"$(INTDIR)\MessageArg.obj" \
	"$(INTDIR)\MessageEventHandler.obj" \
	"$(INTDIR)\MessageFormatter.obj" \
	"$(INTDIR)\MessageReporter.obj" \
	"$(INTDIR)\MessageTable.obj" \
	"$(INTDIR)\ModeInfo.obj" \
	"$(INTDIR)\Notation.obj" \
	"$(INTDIR)\NotationStorage.obj" \
	"$(INTDIR)\NumericCharRefOrigin.obj" \
	"$(INTDIR)\OffsetOrderedList.obj" \
	"$(INTDIR)\OpenElement.obj" \
	"$(INTDIR)\OutputByteStream.obj" \
	"$(INTDIR)\OutputCharStream.obj" \
	"$(INTDIR)\OutputState.obj" \
	"$(INTDIR)\Param.obj" \
	"$(INTDIR)\parseAttribute.obj" \
	"$(INTDIR)\parseCommon.obj" \
	"$(INTDIR)\parseDecl.obj" \
	"$(INTDIR)\parseInstance.obj" \
	"$(INTDIR)\parseMode.obj" \
	"$(INTDIR)\parseParam.obj" \
	"$(INTDIR)\Parser.obj" \
	"$(INTDIR)\parser_inst.obj" \
	"$(INTDIR)\ParserApp.obj" \
	"$(INTDIR)\ParserEventGeneratorKit.obj" \
	"$(INTDIR)\ParserMessages.obj" \
	"$(INTDIR)\ParserOptions.obj" \
	"$(INTDIR)\ParserState.obj" \
	"$(INTDIR)\parseSd.obj" \
	"$(INTDIR)\Partition.obj" \
	"$(INTDIR)\PosixStorage.obj" \
	"$(INTDIR)\Recognizer.obj" \
	"$(INTDIR)\RewindStorageObject.obj" \
	"$(INTDIR)\Sd.obj" \
	"$(INTDIR)\SdText.obj" \
	"$(INTDIR)\SearchResultMessageArg.obj" \
	"$(INTDIR)\SGMLApplication.obj" \
	"$(INTDIR)\SgmlParser.obj" \
	"$(INTDIR)\ShortReferenceMap.obj" \
	"$(INTDIR)\SJISCodingSystem.obj" \
	"$(INTDIR)\SOEntityCatalog.obj" \
	"$(INTDIR)\splib.obj" \
	"$(INTDIR)\StdioStorage.obj" \
	"$(INTDIR)\StorageManager.obj" \
	"$(INTDIR)\StringVectorMessageArg.obj" \
	"$(INTDIR)\Syntax.obj" \
	"$(INTDIR)\Text.obj" \
	"$(INTDIR)\TokenMessageArg.obj" \
	"$(INTDIR)\TranslateCodingSystem.obj" \
	"$(INTDIR)\TrieBuilder.obj" \
	"$(INTDIR)\TypeId.obj" \
	"$(INTDIR)\Undo.obj" \
	"$(INTDIR)\UnicodeCodingSystem.obj" \
	"$(INTDIR)\UnivCharsetDesc.obj" \
	"$(INTDIR)\URLStorage.obj" \
	"$(INTDIR)\UTF8CodingSystem.obj" \
	"$(INTDIR)\Win32CodingSystem.obj" \
	"$(INTDIR)\WinApp.obj" \
	"$(INTDIR)\WinInetStorage.obj" \
	"$(INTDIR)\xentmgr_inst.obj" \
	"$(INTDIR)\XMLCodingSystem.obj"

".\bin\sp133.dll" : "$(OUTDIR)" $(DEF_FILE) $(LINK32_OBJS)
    $(LINK32) @<<
  $(LINK32_FLAGS) $(LINK32_OBJS)
<<

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 1
# PROP BASE Output_Dir "lib\Debug"
# PROP BASE Intermediate_Dir "lib\Debug"
# PROP BASE Target_Dir "lib"
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 1
# PROP Output_Dir "lib\Debug"
# PROP Intermediate_Dir "lib\Debug"
# PROP Target_Dir "lib"
OUTDIR=.\lib\Debug
INTDIR=.\lib\Debug

ALL : ".\dbgbin\sp133d.dll"

CLEAN : 
	-@erase "$(INTDIR)\Allocator.obj"
	-@erase "$(INTDIR)\app_inst.obj"
	-@erase "$(INTDIR)\arc_inst.obj"
	-@erase "$(INTDIR)\ArcEngine.obj"
	-@erase "$(INTDIR)\assert.obj"
	-@erase "$(INTDIR)\Attribute.obj"
	-@erase "$(INTDIR)\Big5CodingSystem.obj"
	-@erase "$(INTDIR)\CharsetDecl.obj"
	-@erase "$(INTDIR)\CharsetInfo.obj"
	-@erase "$(INTDIR)\CharsetRegistry.obj"
	-@erase "$(INTDIR)\CmdLineApp.obj"
	-@erase "$(INTDIR)\CodingSystem.obj"
	-@erase "$(INTDIR)\CodingSystemKit.obj"
	-@erase "$(INTDIR)\ConsoleOutput.obj"
	-@erase "$(INTDIR)\ContentState.obj"
	-@erase "$(INTDIR)\ContentToken.obj"
	-@erase "$(INTDIR)\DescriptorManager.obj"
	-@erase "$(INTDIR)\Dtd.obj"
	-@erase "$(INTDIR)\ElementType.obj"
	-@erase "$(INTDIR)\Entity.obj"
	-@erase "$(INTDIR)\EntityApp.obj"
	-@erase "$(INTDIR)\EntityCatalog.obj"
	-@erase "$(INTDIR)\EntityDecl.obj"
	-@erase "$(INTDIR)\EntityManager.obj"
	-@erase "$(INTDIR)\entmgr_inst.obj"
	-@erase "$(INTDIR)\ErrnoMessageArg.obj"
	-@erase "$(INTDIR)\ErrorCountEventHandler.obj"
	-@erase "$(INTDIR)\EUCJPCodingSystem.obj"
	-@erase "$(INTDIR)\Event.obj"
	-@erase "$(INTDIR)\EventGenerator.obj"
	-@erase "$(INTDIR)\ExtendEntityManager.obj"
	-@erase "$(INTDIR)\ExternalId.obj"
	-@erase "$(INTDIR)\Fixed2CodingSystem.obj"
	-@erase "$(INTDIR)\GenericEventHandler.obj"
	-@erase "$(INTDIR)\Group.obj"
	-@erase "$(INTDIR)\Hash.obj"
	-@erase "$(INTDIR)\Id.obj"
	-@erase "$(INTDIR)\IdentityCodingSystem.obj"
	-@erase "$(INTDIR)\IListBase.obj"
	-@erase "$(INTDIR)\InputSource.obj"
	-@erase "$(INTDIR)\InternalInputSource.obj"
	-@erase "$(INTDIR)\lib.pch"
	-@erase "$(INTDIR)\lib.res"
	-@erase "$(INTDIR)\Link.obj"
	-@erase "$(INTDIR)\LinkProcess.obj"
	-@erase "$(INTDIR)\LiteralStorage.obj"
	-@erase "$(INTDIR)\Location.obj"
	-@erase "$(INTDIR)\Lpd.obj"
	-@erase "$(INTDIR)\Markup.obj"
	-@erase "$(INTDIR)\Message.obj"
	-@erase "$(INTDIR)\MessageArg.obj"
	-@erase "$(INTDIR)\MessageEventHandler.obj"
	-@erase "$(INTDIR)\MessageFormatter.obj"
	-@erase "$(INTDIR)\MessageReporter.obj"
	-@erase "$(INTDIR)\MessageTable.obj"
	-@erase "$(INTDIR)\ModeInfo.obj"
	-@erase "$(INTDIR)\Notation.obj"
	-@erase "$(INTDIR)\NotationStorage.obj"
	-@erase "$(INTDIR)\NumericCharRefOrigin.obj"
	-@erase "$(INTDIR)\OffsetOrderedList.obj"
	-@erase "$(INTDIR)\OpenElement.obj"
	-@erase "$(INTDIR)\OutputByteStream.obj"
	-@erase "$(INTDIR)\OutputCharStream.obj"
	-@erase "$(INTDIR)\OutputState.obj"
	-@erase "$(INTDIR)\Param.obj"
	-@erase "$(INTDIR)\parseAttribute.obj"
	-@erase "$(INTDIR)\parseCommon.obj"
	-@erase "$(INTDIR)\parseDecl.obj"
	-@erase "$(INTDIR)\parseInstance.obj"
	-@erase "$(INTDIR)\parseMode.obj"
	-@erase "$(INTDIR)\parseParam.obj"
	-@erase "$(INTDIR)\Parser.obj"
	-@erase "$(INTDIR)\parser_inst.obj"
	-@erase "$(INTDIR)\ParserApp.obj"
	-@erase "$(INTDIR)\ParserEventGeneratorKit.obj"
	-@erase "$(INTDIR)\ParserMessages.obj"
	-@erase "$(INTDIR)\ParserOptions.obj"
	-@erase "$(INTDIR)\ParserState.obj"
	-@erase "$(INTDIR)\parseSd.obj"
	-@erase "$(INTDIR)\Partition.obj"
	-@erase "$(INTDIR)\PosixStorage.obj"
	-@erase "$(INTDIR)\Recognizer.obj"
	-@erase "$(INTDIR)\RewindStorageObject.obj"
	-@erase "$(INTDIR)\Sd.obj"
	-@erase "$(INTDIR)\SdText.obj"
	-@erase "$(INTDIR)\SearchResultMessageArg.obj"
	-@erase "$(INTDIR)\SGMLApplication.obj"
	-@erase "$(INTDIR)\SgmlParser.obj"
	-@erase "$(INTDIR)\ShortReferenceMap.obj"
	-@erase "$(INTDIR)\SJISCodingSystem.obj"
	-@erase "$(INTDIR)\SOEntityCatalog.obj"
	-@erase "$(INTDIR)\splib.obj"
	-@erase "$(INTDIR)\StdioStorage.obj"
	-@erase "$(INTDIR)\StorageManager.obj"
	-@erase "$(INTDIR)\StringVectorMessageArg.obj"
	-@erase "$(INTDIR)\Syntax.obj"
	-@erase "$(INTDIR)\Text.obj"
	-@erase "$(INTDIR)\TokenMessageArg.obj"
	-@erase "$(INTDIR)\TranslateCodingSystem.obj"
	-@erase "$(INTDIR)\TrieBuilder.obj"
	-@erase "$(INTDIR)\TypeId.obj"
	-@erase "$(INTDIR)\Undo.obj"
	-@erase "$(INTDIR)\UnicodeCodingSystem.obj"
	-@erase "$(INTDIR)\UnivCharsetDesc.obj"
	-@erase "$(INTDIR)\URLStorage.obj"
	-@erase "$(INTDIR)\UTF8CodingSystem.obj"
	-@erase "$(INTDIR)\vc40.pdb"
	-@erase "$(INTDIR)\Win32CodingSystem.obj"
	-@erase "$(INTDIR)\WinApp.obj"
	-@erase "$(INTDIR)\WinInetStorage.obj"
	-@erase "$(INTDIR)\xentmgr_inst.obj"
	-@erase "$(INTDIR)\XMLCodingSystem.obj"
	-@erase "$(OUTDIR)\sp133d.exp"
	-@erase "$(OUTDIR)\sp133d.lib"
	-@erase "$(OUTDIR)\sp133d.pdb"
	-@erase ".\dbgbin\sp133d.dll"
	-@erase ".\dbgbin\sp133d.ilk"

"$(OUTDIR)" :
    if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

CPP=cl.exe
# ADD BASE CPP /nologo /MTd /W3 /Gm /GX /Zi /Od /D "WIN32" /D "_DEBUG" /D "_WINDOWS" /YX /c
# ADD CPP /nologo /MDd /W3 /GX /Zi /Od /I "include" /I "generic" /D "_DEBUG" /D "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE" /Yu"splib.h" /c
CPP_PROJ=/nologo /MDd /W3 /GX /Zi /Od /I "include" /I "generic" /D "_DEBUG" /D\
 "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D\
 "SP_MULTI_BYTE" /Fp"$(INTDIR)/lib.pch" /Yu"splib.h" /Fo"$(INTDIR)/"\
 /Fd"$(INTDIR)/" /c 
CPP_OBJS=.\lib\Debug/
CPP_SBRS=.\.

.c{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.c{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

MTL=mktyplib.exe
# ADD BASE MTL /nologo /D "_DEBUG" /win32
# ADD MTL /nologo /D "_DEBUG" /win32
MTL_PROJ=/nologo /D "_DEBUG" /win32 
RSC=rc.exe
# ADD BASE RSC /l 0x809 /d "_DEBUG"
# ADD RSC /l 0x809 /d "_DEBUG"
RSC_PROJ=/l 0x809 /fo"$(INTDIR)/lib.res" /d "_DEBUG" 
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
BSC32_FLAGS=/nologo /o"$(OUTDIR)/lib.bsc" 
BSC32_SBRS= \
	
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:windows /dll /debug /machine:I386
# ADD LINK32 wininet.lib wsock32.lib kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:windows /dll /debug /machine:I386 /out:"dbgbin/sp133d.dll"
LINK32_FLAGS=wininet.lib wsock32.lib kernel32.lib user32.lib gdi32.lib\
 winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib\
 uuid.lib /nologo /subsystem:windows /dll /incremental:yes\
 /pdb:"$(OUTDIR)/sp133d.pdb" /debug /machine:I386 /out:"dbgbin/sp133d.dll"\
 /implib:"$(OUTDIR)/sp133d.lib" 
LINK32_OBJS= \
	"$(INTDIR)\Allocator.obj" \
	"$(INTDIR)\app_inst.obj" \
	"$(INTDIR)\arc_inst.obj" \
	"$(INTDIR)\ArcEngine.obj" \
	"$(INTDIR)\assert.obj" \
	"$(INTDIR)\Attribute.obj" \
	"$(INTDIR)\Big5CodingSystem.obj" \
	"$(INTDIR)\CharsetDecl.obj" \
	"$(INTDIR)\CharsetInfo.obj" \
	"$(INTDIR)\CharsetRegistry.obj" \
	"$(INTDIR)\CmdLineApp.obj" \
	"$(INTDIR)\CodingSystem.obj" \
	"$(INTDIR)\CodingSystemKit.obj" \
	"$(INTDIR)\ConsoleOutput.obj" \
	"$(INTDIR)\ContentState.obj" \
	"$(INTDIR)\ContentToken.obj" \
	"$(INTDIR)\DescriptorManager.obj" \
	"$(INTDIR)\Dtd.obj" \
	"$(INTDIR)\ElementType.obj" \
	"$(INTDIR)\Entity.obj" \
	"$(INTDIR)\EntityApp.obj" \
	"$(INTDIR)\EntityCatalog.obj" \
	"$(INTDIR)\EntityDecl.obj" \
	"$(INTDIR)\EntityManager.obj" \
	"$(INTDIR)\entmgr_inst.obj" \
	"$(INTDIR)\ErrnoMessageArg.obj" \
	"$(INTDIR)\ErrorCountEventHandler.obj" \
	"$(INTDIR)\EUCJPCodingSystem.obj" \
	"$(INTDIR)\Event.obj" \
	"$(INTDIR)\EventGenerator.obj" \
	"$(INTDIR)\ExtendEntityManager.obj" \
	"$(INTDIR)\ExternalId.obj" \
	"$(INTDIR)\Fixed2CodingSystem.obj" \
	"$(INTDIR)\GenericEventHandler.obj" \
	"$(INTDIR)\Group.obj" \
	"$(INTDIR)\Hash.obj" \
	"$(INTDIR)\Id.obj" \
	"$(INTDIR)\IdentityCodingSystem.obj" \
	"$(INTDIR)\IListBase.obj" \
	"$(INTDIR)\InputSource.obj" \
	"$(INTDIR)\InternalInputSource.obj" \
	"$(INTDIR)\lib.res" \
	"$(INTDIR)\Link.obj" \
	"$(INTDIR)\LinkProcess.obj" \
	"$(INTDIR)\LiteralStorage.obj" \
	"$(INTDIR)\Location.obj" \
	"$(INTDIR)\Lpd.obj" \
	"$(INTDIR)\Markup.obj" \
	"$(INTDIR)\Message.obj" \
	"$(INTDIR)\MessageArg.obj" \
	"$(INTDIR)\MessageEventHandler.obj" \
	"$(INTDIR)\MessageFormatter.obj" \
	"$(INTDIR)\MessageReporter.obj" \
	"$(INTDIR)\MessageTable.obj" \
	"$(INTDIR)\ModeInfo.obj" \
	"$(INTDIR)\Notation.obj" \
	"$(INTDIR)\NotationStorage.obj" \
	"$(INTDIR)\NumericCharRefOrigin.obj" \
	"$(INTDIR)\OffsetOrderedList.obj" \
	"$(INTDIR)\OpenElement.obj" \
	"$(INTDIR)\OutputByteStream.obj" \
	"$(INTDIR)\OutputCharStream.obj" \
	"$(INTDIR)\OutputState.obj" \
	"$(INTDIR)\Param.obj" \
	"$(INTDIR)\parseAttribute.obj" \
	"$(INTDIR)\parseCommon.obj" \
	"$(INTDIR)\parseDecl.obj" \
	"$(INTDIR)\parseInstance.obj" \
	"$(INTDIR)\parseMode.obj" \
	"$(INTDIR)\parseParam.obj" \
	"$(INTDIR)\Parser.obj" \
	"$(INTDIR)\parser_inst.obj" \
	"$(INTDIR)\ParserApp.obj" \
	"$(INTDIR)\ParserEventGeneratorKit.obj" \
	"$(INTDIR)\ParserMessages.obj" \
	"$(INTDIR)\ParserOptions.obj" \
	"$(INTDIR)\ParserState.obj" \
	"$(INTDIR)\parseSd.obj" \
	"$(INTDIR)\Partition.obj" \
	"$(INTDIR)\PosixStorage.obj" \
	"$(INTDIR)\Recognizer.obj" \
	"$(INTDIR)\RewindStorageObject.obj" \
	"$(INTDIR)\Sd.obj" \
	"$(INTDIR)\SdText.obj" \
	"$(INTDIR)\SearchResultMessageArg.obj" \
	"$(INTDIR)\SGMLApplication.obj" \
	"$(INTDIR)\SgmlParser.obj" \
	"$(INTDIR)\ShortReferenceMap.obj" \
	"$(INTDIR)\SJISCodingSystem.obj" \
	"$(INTDIR)\SOEntityCatalog.obj" \
	"$(INTDIR)\splib.obj" \
	"$(INTDIR)\StdioStorage.obj" \
	"$(INTDIR)\StorageManager.obj" \
	"$(INTDIR)\StringVectorMessageArg.obj" \
	"$(INTDIR)\Syntax.obj" \
	"$(INTDIR)\Text.obj" \
	"$(INTDIR)\TokenMessageArg.obj" \
	"$(INTDIR)\TranslateCodingSystem.obj" \
	"$(INTDIR)\TrieBuilder.obj" \
	"$(INTDIR)\TypeId.obj" \
	"$(INTDIR)\Undo.obj" \
	"$(INTDIR)\UnicodeCodingSystem.obj" \
	"$(INTDIR)\UnivCharsetDesc.obj" \
	"$(INTDIR)\URLStorage.obj" \
	"$(INTDIR)\UTF8CodingSystem.obj" \
	"$(INTDIR)\Win32CodingSystem.obj" \
	"$(INTDIR)\WinApp.obj" \
	"$(INTDIR)\WinInetStorage.obj" \
	"$(INTDIR)\xentmgr_inst.obj" \
	"$(INTDIR)\XMLCodingSystem.obj"

".\dbgbin\sp133d.dll" : "$(OUTDIR)" $(DEF_FILE) $(LINK32_OBJS)
    $(LINK32) @<<
  $(LINK32_FLAGS) $(LINK32_OBJS)
<<

!ELSEIF  "$(CFG)" == "nsgmls - Win32 Release"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 0
# PROP BASE Output_Dir "nsgmls\Release"
# PROP BASE Intermediate_Dir "nsgmls\Release"
# PROP BASE Target_Dir "nsgmls"
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 0
# PROP Output_Dir "nsgmls\Release"
# PROP Intermediate_Dir "nsgmls\Release"
# PROP Target_Dir "nsgmls"
OUTDIR=.\nsgmls\Release
INTDIR=.\nsgmls\Release

ALL : "lib - Win32 Release" ".\bin\nsgmls.exe"

CLEAN : 
	-@erase "$(INTDIR)\nsgmls.obj"
	-@erase "$(INTDIR)\nsgmls.res"
	-@erase "$(INTDIR)\nsgmls_inst.obj"
	-@erase "$(INTDIR)\RastEventHandler.obj"
	-@erase "$(INTDIR)\SgmlsEventHandler.obj"
	-@erase "$(INTDIR)\StringSet.obj"
	-@erase ".\bin\nsgmls.exe"

"$(OUTDIR)" :
    if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

CPP=cl.exe
# ADD BASE CPP /nologo /W3 /GX /O2 /D "WIN32" /D "NDEBUG" /D "_CONSOLE" /YX /c
# ADD CPP /nologo /MD /W3 /GX /O2 /I "include" /D "NDEBUG" /D "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE" /YX /c
CPP_PROJ=/nologo /MD /W3 /GX /O2 /I "include" /D "NDEBUG" /D "_CONSOLE" /D\
 "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE"\
 /Fp"$(INTDIR)/nsgmls.pch" /YX /Fo"$(INTDIR)/" /c 
CPP_OBJS=.\nsgmls\Release/
CPP_SBRS=.\.

.c{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.c{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

RSC=rc.exe
# ADD BASE RSC /l 0x809 /d "NDEBUG"
# ADD RSC /l 0x809 /d "NDEBUG"
RSC_PROJ=/l 0x809 /fo"$(INTDIR)/nsgmls.res" /d "NDEBUG" 
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
BSC32_FLAGS=/nologo /o"$(OUTDIR)/nsgmls.bsc" 
BSC32_SBRS= \
	
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /machine:I386
# ADD LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /machine:I386 /out:"bin/nsgmls.exe"
# SUBTRACT LINK32 /profile
LINK32_FLAGS=kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib\
 advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo\
 /subsystem:console /incremental:no /pdb:"$(OUTDIR)/nsgmls.pdb" /machine:I386\
 /out:"bin/nsgmls.exe" 
LINK32_OBJS= \
	"$(INTDIR)\nsgmls.obj" \
	"$(INTDIR)\nsgmls.res" \
	"$(INTDIR)\nsgmls_inst.obj" \
	"$(INTDIR)\RastEventHandler.obj" \
	"$(INTDIR)\SgmlsEventHandler.obj" \
	"$(INTDIR)\StringSet.obj" \
	".\lib\Release\sp133.lib"

".\bin\nsgmls.exe" : "$(OUTDIR)" $(DEF_FILE) $(LINK32_OBJS)
    $(LINK32) @<<
  $(LINK32_FLAGS) $(LINK32_OBJS)
<<

!ELSEIF  "$(CFG)" == "nsgmls - Win32 Debug"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 1
# PROP BASE Output_Dir "nsgmls\Debug"
# PROP BASE Intermediate_Dir "nsgmls\Debug"
# PROP BASE Target_Dir "nsgmls"
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 1
# PROP Output_Dir "nsgmls\Debug"
# PROP Intermediate_Dir "nsgmls\Debug"
# PROP Target_Dir "nsgmls"
OUTDIR=.\nsgmls\Debug
INTDIR=.\nsgmls\Debug

ALL : "lib - Win32 Debug" ".\dbgbin\nsgmls.exe"

CLEAN : 
	-@erase "$(INTDIR)\nsgmls.obj"
	-@erase "$(INTDIR)\nsgmls.res"
	-@erase "$(INTDIR)\nsgmls_inst.obj"
	-@erase "$(INTDIR)\RastEventHandler.obj"
	-@erase "$(INTDIR)\SgmlsEventHandler.obj"
	-@erase "$(INTDIR)\StringSet.obj"
	-@erase "$(INTDIR)\vc40.idb"
	-@erase "$(INTDIR)\vc40.pdb"
	-@erase "$(OUTDIR)\nsgmls.pdb"
	-@erase ".\dbgbin\nsgmls.exe"
	-@erase ".\dbgbin\nsgmls.ilk"

"$(OUTDIR)" :
    if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

CPP=cl.exe
# ADD BASE CPP /nologo /W3 /Gm /GX /Zi /Od /D "WIN32" /D "_DEBUG" /D "_CONSOLE" /YX /c
# ADD CPP /nologo /MDd /W3 /Gm /GX /Zi /Od /I "include" /D "_DEBUG" /D "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE" /YX /c
CPP_PROJ=/nologo /MDd /W3 /Gm /GX /Zi /Od /I "include" /D "_DEBUG" /D\
 "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE"\
 /Fp"$(INTDIR)/nsgmls.pch" /YX /Fo"$(INTDIR)/" /Fd"$(INTDIR)/" /c 
CPP_OBJS=.\nsgmls\Debug/
CPP_SBRS=.\.

.c{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.c{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

RSC=rc.exe
# ADD BASE RSC /l 0x809 /d "_DEBUG"
# ADD RSC /l 0x809 /d "_DEBUG"
RSC_PROJ=/l 0x809 /fo"$(INTDIR)/nsgmls.res" /d "_DEBUG" 
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
BSC32_FLAGS=/nologo /o"$(OUTDIR)/nsgmls.bsc" 
BSC32_SBRS= \
	
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /debug /machine:I386
# ADD LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /debug /machine:I386 /out:"dbgbin/nsgmls.exe"
LINK32_FLAGS=kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib\
 advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo\
 /subsystem:console /incremental:yes /pdb:"$(OUTDIR)/nsgmls.pdb" /debug\
 /machine:I386 /out:"dbgbin/nsgmls.exe" 
LINK32_OBJS= \
	"$(INTDIR)\nsgmls.obj" \
	"$(INTDIR)\nsgmls.res" \
	"$(INTDIR)\nsgmls_inst.obj" \
	"$(INTDIR)\RastEventHandler.obj" \
	"$(INTDIR)\SgmlsEventHandler.obj" \
	"$(INTDIR)\StringSet.obj" \
	".\lib\Debug\sp133d.lib"

".\dbgbin\nsgmls.exe" : "$(OUTDIR)" $(DEF_FILE) $(LINK32_OBJS)
    $(LINK32) @<<
  $(LINK32_FLAGS) $(LINK32_OBJS)
<<

!ELSEIF  "$(CFG)" == "spam - Win32 Release"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 0
# PROP BASE Output_Dir "spam\Release"
# PROP BASE Intermediate_Dir "spam\Release"
# PROP BASE Target_Dir "spam"
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 0
# PROP Output_Dir "spam\Release"
# PROP Intermediate_Dir "spam\Release"
# PROP Target_Dir "spam"
OUTDIR=.\spam\Release
INTDIR=.\spam\Release

ALL : "lib - Win32 Release" ".\bin\spam.exe"

CLEAN : 
	-@erase "$(INTDIR)\CopyEventHandler.obj"
	-@erase "$(INTDIR)\MarkupEventHandler.obj"
	-@erase "$(INTDIR)\spam.obj"
	-@erase "$(INTDIR)\spam.res"
	-@erase "$(INTDIR)\spam_inst.obj"
	-@erase ".\bin\spam.exe"

"$(OUTDIR)" :
    if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

CPP=cl.exe
# ADD BASE CPP /nologo /W3 /GX /O2 /D "WIN32" /D "NDEBUG" /D "_CONSOLE" /YX /c
# ADD CPP /nologo /MD /W3 /GX /O2 /I "include" /D "NDEBUG" /D "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE" /YX /c
CPP_PROJ=/nologo /MD /W3 /GX /O2 /I "include" /D "NDEBUG" /D "_CONSOLE" /D\
 "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE"\
 /Fp"$(INTDIR)/spam.pch" /YX /Fo"$(INTDIR)/" /c 
CPP_OBJS=.\spam\Release/
CPP_SBRS=.\.

.c{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.c{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

RSC=rc.exe
# ADD BASE RSC /l 0x809 /d "NDEBUG"
# ADD RSC /l 0x809 /d "NDEBUG"
RSC_PROJ=/l 0x809 /fo"$(INTDIR)/spam.res" /d "NDEBUG" 
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
BSC32_FLAGS=/nologo /o"$(OUTDIR)/spam.bsc" 
BSC32_SBRS= \
	
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /machine:I386
# ADD LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /machine:I386 /out:"bin/spam.exe"
# SUBTRACT LINK32 /profile
LINK32_FLAGS=kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib\
 advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo\
 /subsystem:console /incremental:no /pdb:"$(OUTDIR)/spam.pdb" /machine:I386\
 /out:"bin/spam.exe" 
LINK32_OBJS= \
	"$(INTDIR)\CopyEventHandler.obj" \
	"$(INTDIR)\MarkupEventHandler.obj" \
	"$(INTDIR)\spam.obj" \
	"$(INTDIR)\spam.res" \
	"$(INTDIR)\spam_inst.obj" \
	".\lib\Release\sp133.lib"

".\bin\spam.exe" : "$(OUTDIR)" $(DEF_FILE) $(LINK32_OBJS)
    $(LINK32) @<<
  $(LINK32_FLAGS) $(LINK32_OBJS)
<<

!ELSEIF  "$(CFG)" == "spam - Win32 Debug"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 1
# PROP BASE Output_Dir "spam\Debug"
# PROP BASE Intermediate_Dir "spam\Debug"
# PROP BASE Target_Dir "spam"
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 1
# PROP Output_Dir "spam\Debug"
# PROP Intermediate_Dir "spam\Debug"
# PROP Target_Dir "spam"
OUTDIR=.\spam\Debug
INTDIR=.\spam\Debug

ALL : "lib - Win32 Debug" ".\dbgbin\spam.exe"

CLEAN : 
	-@erase "$(INTDIR)\CopyEventHandler.obj"
	-@erase "$(INTDIR)\MarkupEventHandler.obj"
	-@erase "$(INTDIR)\spam.obj"
	-@erase "$(INTDIR)\spam.res"
	-@erase "$(INTDIR)\spam_inst.obj"
	-@erase "$(INTDIR)\vc40.idb"
	-@erase "$(INTDIR)\vc40.pdb"
	-@erase "$(OUTDIR)\spam.pdb"
	-@erase ".\dbgbin\spam.exe"
	-@erase ".\dbgbin\spam.ilk"

"$(OUTDIR)" :
    if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

CPP=cl.exe
# ADD BASE CPP /nologo /W3 /Gm /GX /Zi /Od /D "WIN32" /D "_DEBUG" /D "_CONSOLE" /YX /c
# ADD CPP /nologo /MDd /W3 /Gm /GX /Zi /Od /I "include" /D "_DEBUG" /D "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE" /YX /c
CPP_PROJ=/nologo /MDd /W3 /Gm /GX /Zi /Od /I "include" /D "_DEBUG" /D\
 "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE"\
 /Fp"$(INTDIR)/spam.pch" /YX /Fo"$(INTDIR)/" /Fd"$(INTDIR)/" /c 
CPP_OBJS=.\spam\Debug/
CPP_SBRS=.\.

.c{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.c{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

RSC=rc.exe
# ADD BASE RSC /l 0x809 /d "_DEBUG"
# ADD RSC /l 0x809 /d "_DEBUG"
RSC_PROJ=/l 0x809 /fo"$(INTDIR)/spam.res" /d "_DEBUG" 
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
BSC32_FLAGS=/nologo /o"$(OUTDIR)/spam.bsc" 
BSC32_SBRS= \
	
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /debug /machine:I386
# ADD LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /debug /machine:I386 /out:"dbgbin/spam.exe"
LINK32_FLAGS=kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib\
 advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo\
 /subsystem:console /incremental:yes /pdb:"$(OUTDIR)/spam.pdb" /debug\
 /machine:I386 /out:"dbgbin/spam.exe" 
LINK32_OBJS= \
	"$(INTDIR)\CopyEventHandler.obj" \
	"$(INTDIR)\MarkupEventHandler.obj" \
	"$(INTDIR)\spam.obj" \
	"$(INTDIR)\spam.res" \
	"$(INTDIR)\spam_inst.obj" \
	".\lib\Debug\sp133d.lib"

".\dbgbin\spam.exe" : "$(OUTDIR)" $(DEF_FILE) $(LINK32_OBJS)
    $(LINK32) @<<
  $(LINK32_FLAGS) $(LINK32_OBJS)
<<

!ELSEIF  "$(CFG)" == "spent - Win32 Release"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 0
# PROP BASE Output_Dir "spent\Release"
# PROP BASE Intermediate_Dir "spent\Release"
# PROP BASE Target_Dir "spent"
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 0
# PROP Output_Dir "spent\Release"
# PROP Intermediate_Dir "spent\Release"
# PROP Target_Dir "spent"
OUTDIR=.\spent\Release
INTDIR=.\spent\Release

ALL : "lib - Win32 Release" ".\bin\spent.exe"

CLEAN : 
	-@erase "$(INTDIR)\spent.obj"
	-@erase ".\bin\spent.exe"

"$(OUTDIR)" :
    if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

CPP=cl.exe
# ADD BASE CPP /nologo /W3 /GX /O2 /D "WIN32" /D "NDEBUG" /D "_CONSOLE" /YX /c
# ADD CPP /nologo /MD /W3 /GX /O2 /I "include" /D "NDEBUG" /D "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE" /YX /c
CPP_PROJ=/nologo /MD /W3 /GX /O2 /I "include" /D "NDEBUG" /D "_CONSOLE" /D\
 "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE"\
 /Fp"$(INTDIR)/spent.pch" /YX /Fo"$(INTDIR)/" /c 
CPP_OBJS=.\spent\Release/
CPP_SBRS=.\.

.c{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.c{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

RSC=rc.exe
# ADD BASE RSC /l 0x809 /d "NDEBUG"
# ADD RSC /l 0x809 /d "NDEBUG"
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
BSC32_FLAGS=/nologo /o"$(OUTDIR)/spent.bsc" 
BSC32_SBRS= \
	
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /machine:I386
# ADD LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /machine:I386 /out:"bin/spent.exe"
# SUBTRACT LINK32 /profile
LINK32_FLAGS=kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib\
 advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo\
 /subsystem:console /incremental:no /pdb:"$(OUTDIR)/spent.pdb" /machine:I386\
 /out:"bin/spent.exe" 
LINK32_OBJS= \
	"$(INTDIR)\spent.obj" \
	".\lib\Release\sp133.lib"

".\bin\spent.exe" : "$(OUTDIR)" $(DEF_FILE) $(LINK32_OBJS)
    $(LINK32) @<<
  $(LINK32_FLAGS) $(LINK32_OBJS)
<<

!ELSEIF  "$(CFG)" == "spent - Win32 Debug"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 1
# PROP BASE Output_Dir "spent\Debug"
# PROP BASE Intermediate_Dir "spent\Debug"
# PROP BASE Target_Dir "spent"
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 1
# PROP Output_Dir "spent\Debug"
# PROP Intermediate_Dir "spent\Debug"
# PROP Target_Dir "spent"
OUTDIR=.\spent\Debug
INTDIR=.\spent\Debug

ALL : "lib - Win32 Debug" ".\dbgbin\spent.exe"

CLEAN : 
	-@erase "$(INTDIR)\spent.obj"
	-@erase "$(INTDIR)\vc40.idb"
	-@erase "$(INTDIR)\vc40.pdb"
	-@erase "$(OUTDIR)\spent.pdb"
	-@erase ".\dbgbin\spent.exe"
	-@erase ".\dbgbin\spent.ilk"

"$(OUTDIR)" :
    if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

CPP=cl.exe
# ADD BASE CPP /nologo /W3 /Gm /GX /Zi /Od /D "WIN32" /D "_DEBUG" /D "_CONSOLE" /YX /c
# ADD CPP /nologo /MDd /W3 /Gm /GX /Zi /Od /I "include" /D "_DEBUG" /D "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE" /YX /c
CPP_PROJ=/nologo /MDd /W3 /Gm /GX /Zi /Od /I "include" /D "_DEBUG" /D\
 "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE"\
 /Fp"$(INTDIR)/spent.pch" /YX /Fo"$(INTDIR)/" /Fd"$(INTDIR)/" /c 
CPP_OBJS=.\spent\Debug/
CPP_SBRS=.\.

.c{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.c{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

RSC=rc.exe
# ADD BASE RSC /l 0x809 /d "_DEBUG"
# ADD RSC /l 0x809 /d "_DEBUG"
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
BSC32_FLAGS=/nologo /o"$(OUTDIR)/spent.bsc" 
BSC32_SBRS= \
	
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /debug /machine:I386
# ADD LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /debug /machine:I386 /out:"dbgbin/spent.exe"
LINK32_FLAGS=kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib\
 advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo\
 /subsystem:console /incremental:yes /pdb:"$(OUTDIR)/spent.pdb" /debug\
 /machine:I386 /out:"dbgbin/spent.exe" 
LINK32_OBJS= \
	"$(INTDIR)\spent.obj" \
	".\lib\Debug\sp133d.lib"

".\dbgbin\spent.exe" : "$(OUTDIR)" $(DEF_FILE) $(LINK32_OBJS)
    $(LINK32) @<<
  $(LINK32_FLAGS) $(LINK32_OBJS)
<<

!ELSEIF  "$(CFG)" == "sgmlnorm - Win32 Release"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 0
# PROP BASE Output_Dir "sgmlnorm\Release"
# PROP BASE Intermediate_Dir "sgmlnorm\Release"
# PROP BASE Target_Dir "sgmlnorm"
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 0
# PROP Output_Dir "sgmlnorm\Release"
# PROP Intermediate_Dir "sgmlnorm\Release"
# PROP Target_Dir "sgmlnorm"
OUTDIR=.\sgmlnorm\Release
INTDIR=.\sgmlnorm\Release

ALL : "lib - Win32 Release" ".\bin\sgmlnorm.exe"

CLEAN : 
	-@erase "$(INTDIR)\SGMLGenerator.obj"
	-@erase "$(INTDIR)\sgmlnorm.obj"
	-@erase ".\bin\sgmlnorm.exe"

"$(OUTDIR)" :
    if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

CPP=cl.exe
# ADD BASE CPP /nologo /W3 /GX /O2 /D "WIN32" /D "NDEBUG" /D "_CONSOLE" /YX /c
# ADD CPP /nologo /MD /W3 /GX /O2 /I "include" /I "generic" /D "NDEBUG" /D "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE" /YX /c
CPP_PROJ=/nologo /MD /W3 /GX /O2 /I "include" /I "generic" /D "NDEBUG" /D\
 "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE"\
 /Fp"$(INTDIR)/sgmlnorm.pch" /YX /Fo"$(INTDIR)/" /c 
CPP_OBJS=.\sgmlnorm\Release/
CPP_SBRS=.\.

.c{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.c{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

RSC=rc.exe
# ADD BASE RSC /l 0x809 /d "NDEBUG"
# ADD RSC /l 0x809 /d "NDEBUG"
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
BSC32_FLAGS=/nologo /o"$(OUTDIR)/sgmlnorm.bsc" 
BSC32_SBRS= \
	
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /machine:I386
# ADD LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /machine:I386 /out:"bin/sgmlnorm.exe"
# SUBTRACT LINK32 /profile
LINK32_FLAGS=kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib\
 advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo\
 /subsystem:console /incremental:no /pdb:"$(OUTDIR)/sgmlnorm.pdb" /machine:I386\
 /out:"bin/sgmlnorm.exe" 
LINK32_OBJS= \
	"$(INTDIR)\SGMLGenerator.obj" \
	"$(INTDIR)\sgmlnorm.obj" \
	".\lib\Release\sp133.lib"

".\bin\sgmlnorm.exe" : "$(OUTDIR)" $(DEF_FILE) $(LINK32_OBJS)
    $(LINK32) @<<
  $(LINK32_FLAGS) $(LINK32_OBJS)
<<

!ELSEIF  "$(CFG)" == "sgmlnorm - Win32 Debug"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 1
# PROP BASE Output_Dir "sgmlnorm\Debug"
# PROP BASE Intermediate_Dir "sgmlnorm\Debug"
# PROP BASE Target_Dir "sgmlnorm"
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 1
# PROP Output_Dir "sgmlnorm\Debug"
# PROP Intermediate_Dir "sgmlnorm\Debug"
# PROP Target_Dir "sgmlnorm"
OUTDIR=.\sgmlnorm\Debug
INTDIR=.\sgmlnorm\Debug

ALL : "lib - Win32 Debug" ".\dbgbin\sgmlnorm.exe"

CLEAN : 
	-@erase "$(INTDIR)\SGMLGenerator.obj"
	-@erase "$(INTDIR)\sgmlnorm.obj"
	-@erase "$(INTDIR)\vc40.idb"
	-@erase "$(INTDIR)\vc40.pdb"
	-@erase "$(OUTDIR)\sgmlnorm.pdb"
	-@erase ".\dbgbin\sgmlnorm.exe"
	-@erase ".\dbgbin\sgmlnorm.ilk"

"$(OUTDIR)" :
    if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

CPP=cl.exe
# ADD BASE CPP /nologo /W3 /Gm /GX /Zi /Od /D "WIN32" /D "_DEBUG" /D "_CONSOLE" /YX /c
# ADD CPP /nologo /MDd /W3 /Gm /GX /Zi /Od /I "include" /I "generic" /D "_DEBUG" /D "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE" /YX /c
CPP_PROJ=/nologo /MDd /W3 /Gm /GX /Zi /Od /I "include" /I "generic" /D "_DEBUG"\
 /D "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE"\
 /Fp"$(INTDIR)/sgmlnorm.pch" /YX /Fo"$(INTDIR)/" /Fd"$(INTDIR)/" /c 
CPP_OBJS=.\sgmlnorm\Debug/
CPP_SBRS=.\.

.c{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.c{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

RSC=rc.exe
# ADD BASE RSC /l 0x809 /d "_DEBUG"
# ADD RSC /l 0x809 /d "_DEBUG"
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
BSC32_FLAGS=/nologo /o"$(OUTDIR)/sgmlnorm.bsc" 
BSC32_SBRS= \
	
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /debug /machine:I386
# ADD LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /debug /machine:I386 /out:"dbgbin/sgmlnorm.exe"
LINK32_FLAGS=kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib\
 advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo\
 /subsystem:console /incremental:yes /pdb:"$(OUTDIR)/sgmlnorm.pdb" /debug\
 /machine:I386 /out:"dbgbin/sgmlnorm.exe" 
LINK32_OBJS= \
	"$(INTDIR)\SGMLGenerator.obj" \
	"$(INTDIR)\sgmlnorm.obj" \
	".\lib\Debug\sp133d.lib"

".\dbgbin\sgmlnorm.exe" : "$(OUTDIR)" $(DEF_FILE) $(LINK32_OBJS)
    $(LINK32) @<<
  $(LINK32_FLAGS) $(LINK32_OBJS)
<<

!ELSEIF  "$(CFG)" == "all - Win32 Release"

# PROP BASE Use_Debug_Libraries 0
# PROP BASE Output_Dir "all\Release"
# PROP BASE Intermediate_Dir "all\Release"
# PROP BASE Target_Dir "all"
# PROP BASE Cmd_Line "NMAKE /f all.mak"
# PROP BASE Rebuild_Opt "/a"
# PROP BASE Target_File "all\all.exe"
# PROP BASE Bsc_Name "all\all.bsc"
# PROP Use_Debug_Libraries 0
# PROP Output_Dir "all\Release"
# PROP Intermediate_Dir "all\Release"
# PROP Target_Dir "all"
# PROP Cmd_Line ""
# PROP Rebuild_Opt ""
# PROP Target_File "all"
# PROP Bsc_Name ""
OUTDIR=.\all\Release
INTDIR=.\all\Release

ALL : "sx - Win32 Release" "spent - Win32 Release" "spam - Win32 Release"\
 "sgmlnorm - Win32 Release" "nsgmls - Win32 Release" "lib - Win32 Release" 

CLEAN : 
	-@erase 

"$(OUTDIR)" :
    if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

!ELSEIF  "$(CFG)" == "all - Win32 Debug"

# PROP BASE Use_Debug_Libraries 1
# PROP BASE Output_Dir "all\Debug"
# PROP BASE Intermediate_Dir "all\Debug"
# PROP BASE Target_Dir "all"
# PROP BASE Cmd_Line "NMAKE /f all.mak"
# PROP BASE Rebuild_Opt "/a"
# PROP BASE Target_File "all\all.exe"
# PROP BASE Bsc_Name "all\all.bsc"
# PROP Use_Debug_Libraries 1
# PROP Output_Dir "all\Debug"
# PROP Intermediate_Dir "all\Debug"
# PROP Target_Dir "all"
# PROP Cmd_Line ""
# PROP Rebuild_Opt ""
# PROP Target_File "all"
# PROP Bsc_Name ""
OUTDIR=.\all\Debug
INTDIR=.\all\Debug

ALL : "sx - Win32 Debug" "spent - Win32 Debug" "spam - Win32 Debug"\
 "sgmlnorm - Win32 Debug" "nsgmls - Win32 Debug" "lib - Win32 Debug" 

CLEAN : 
	-@erase 

"$(OUTDIR)" :
    if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

!ELSEIF  "$(CFG)" == "sx - Win32 Release"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 0
# PROP BASE Output_Dir "sx\Release"
# PROP BASE Intermediate_Dir "sx\Release"
# PROP BASE Target_Dir "sx"
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 0
# PROP Output_Dir "sx\Release"
# PROP Intermediate_Dir "sx\Release"
# PROP Target_Dir "sx"
OUTDIR=.\sx\Release
INTDIR=.\sx\Release

ALL : "lib - Win32 Release" ".\bin\sx.exe"

CLEAN : 
	-@erase "$(INTDIR)\sx.obj"
	-@erase "$(INTDIR)\sx.res"
	-@erase "$(INTDIR)\sx_inst.obj"
	-@erase "$(INTDIR)\XmlOutputEventHandler.obj"
	-@erase ".\bin\sx.exe"

"$(OUTDIR)" :
    if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

CPP=cl.exe
# ADD BASE CPP /nologo /W3 /GX /O2 /D "WIN32" /D "NDEBUG" /D "_CONSOLE" /YX /c
# ADD CPP /nologo /MD /W3 /GX /O2 /I "include" /D "NDEBUG" /D "WIN32" /D "_CONSOLE" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE" /YX /c
CPP_PROJ=/nologo /MD /W3 /GX /O2 /I "include" /D "NDEBUG" /D "WIN32" /D\
 "_CONSOLE" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE"\
 /Fp"$(INTDIR)/sx.pch" /YX /Fo"$(INTDIR)/" /c 
CPP_OBJS=.\sx\Release/
CPP_SBRS=.\.

.c{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.c{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

RSC=rc.exe
# ADD BASE RSC /l 0x809 /d "NDEBUG"
# ADD RSC /l 0x809 /d "NDEBUG"
RSC_PROJ=/l 0x809 /fo"$(INTDIR)/sx.res" /d "NDEBUG" 
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
BSC32_FLAGS=/nologo /o"$(OUTDIR)/sx.bsc" 
BSC32_SBRS= \
	
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib odbc32.lib odbccp32.lib /nologo /subsystem:console /machine:I386
# ADD LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /machine:I386 /out:"bin/sx.exe"
LINK32_FLAGS=kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib\
 advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo\
 /subsystem:console /incremental:no /pdb:"$(OUTDIR)/sx.pdb" /machine:I386\
 /out:"bin/sx.exe" 
LINK32_OBJS= \
	"$(INTDIR)\sx.obj" \
	"$(INTDIR)\sx.res" \
	"$(INTDIR)\sx_inst.obj" \
	"$(INTDIR)\XmlOutputEventHandler.obj" \
	".\lib\Release\sp133.lib"

".\bin\sx.exe" : "$(OUTDIR)" $(DEF_FILE) $(LINK32_OBJS)
    $(LINK32) @<<
  $(LINK32_FLAGS) $(LINK32_OBJS)
<<

!ELSEIF  "$(CFG)" == "sx - Win32 Debug"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 1
# PROP BASE Output_Dir "sx\Debug"
# PROP BASE Intermediate_Dir "sx\Debug"
# PROP BASE Target_Dir "sx"
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 1
# PROP Output_Dir "sx\Debug"
# PROP Intermediate_Dir "sx\Debug"
# PROP Target_Dir "sx"
OUTDIR=.\sx\Debug
INTDIR=.\sx\Debug

ALL : "lib - Win32 Debug" ".\dbgbin\sx.exe"

CLEAN : 
	-@erase "$(INTDIR)\sx.obj"
	-@erase "$(INTDIR)\sx.res"
	-@erase "$(INTDIR)\sx_inst.obj"
	-@erase "$(INTDIR)\vc40.idb"
	-@erase "$(INTDIR)\vc40.pdb"
	-@erase "$(INTDIR)\XmlOutputEventHandler.obj"
	-@erase "$(OUTDIR)\sx.pdb"
	-@erase ".\dbgbin\sx.exe"
	-@erase ".\dbgbin\sx.ilk"

"$(OUTDIR)" :
    if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

CPP=cl.exe
# ADD BASE CPP /nologo /W3 /Gm /GX /Zi /Od /D "WIN32" /D "_DEBUG" /D "_CONSOLE" /YX /c
# ADD CPP /nologo /MDd /W3 /Gm /GX /Zi /Od /I "include" /D "_DEBUG" /D "WIN32" /D "_CONSOLE" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE" /YX /c
CPP_PROJ=/nologo /MDd /W3 /Gm /GX /Zi /Od /I "include" /D "_DEBUG" /D "WIN32"\
 /D "_CONSOLE" /D SP_NAMESPACE=James_Clark_SP /D "SP_MULTI_BYTE"\
 /Fp"$(INTDIR)/sx.pch" /YX /Fo"$(INTDIR)/" /Fd"$(INTDIR)/" /c 
CPP_OBJS=.\sx\Debug/
CPP_SBRS=.\.

.c{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_OBJS)}.obj:
   $(CPP) $(CPP_PROJ) $<  

.c{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cpp{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

.cxx{$(CPP_SBRS)}.sbr:
   $(CPP) $(CPP_PROJ) $<  

RSC=rc.exe
# ADD BASE RSC /l 0x809 /d "_DEBUG"
# ADD RSC /l 0x809 /d "_DEBUG"
RSC_PROJ=/l 0x809 /fo"$(INTDIR)/sx.res" /d "_DEBUG" 
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
BSC32_FLAGS=/nologo /o"$(OUTDIR)/sx.bsc" 
BSC32_SBRS= \
	
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib odbc32.lib odbccp32.lib /nologo /subsystem:console /debug /machine:I386
# ADD LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /debug /machine:I386 /out:"dbgbin/sx.exe"
LINK32_FLAGS=kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib\
 advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo\
 /subsystem:console /incremental:yes /pdb:"$(OUTDIR)/sx.pdb" /debug\
 /machine:I386 /out:"dbgbin/sx.exe" 
LINK32_OBJS= \
	"$(INTDIR)\sx.obj" \
	"$(INTDIR)\sx.res" \
	"$(INTDIR)\sx_inst.obj" \
	"$(INTDIR)\XmlOutputEventHandler.obj" \
	".\lib\Debug\sp133d.lib"

".\dbgbin\sx.exe" : "$(OUTDIR)" $(DEF_FILE) $(LINK32_OBJS)
    $(LINK32) @<<
  $(LINK32_FLAGS) $(LINK32_OBJS)
<<

!ENDIF 

################################################################################
# Begin Target

# Name "lib - Win32 Release"
# Name "lib - Win32 Debug"

!IF  "$(CFG)" == "lib - Win32 Release"

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

!ENDIF 

################################################################################
# Begin Source File

SOURCE=.\lib\xentmgr_inst.cxx
DEP_CPP_XENTM=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\Mutex.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OffsetOrderedList.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

!IF  "$(CFG)" == "lib - Win32 Release"

# ADD CPP /Yu"splib.h"

"$(INTDIR)\xentmgr_inst.obj" : $(SOURCE) $(DEP_CPP_XENTM) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) /nologo /MD /W3 /GX /O2 /I "include" /I "generic" /D "NDEBUG" /D\
 "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D\
 "SP_MULTI_BYTE" /Fp"$(INTDIR)/lib.pch" /Yu"splib.h" /Fo"$(INTDIR)/" /c\
 $(SOURCE)


!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# ADD CPP /Yu"splib.h"

"$(INTDIR)\xentmgr_inst.obj" : $(SOURCE) $(DEP_CPP_XENTM) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) /nologo /MDd /W3 /GX /Zi /Od /I "include" /I "generic" /D "_DEBUG" /D\
 "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D\
 "SP_MULTI_BYTE" /Fp"$(INTDIR)/lib.pch" /Yu"splib.h" /Fo"$(INTDIR)/"\
 /Fd"$(INTDIR)/" /c $(SOURCE)


!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\URLStorage.cxx
DEP_CPP_URLST=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	".\lib\URLStorageMessages.h"\
	{$(INCLUDE)}"\sys\TYPES.H"\
	

"$(INTDIR)\URLStorage.obj" : $(SOURCE) $(DEP_CPP_URLST) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\UnivCharsetDesc.cxx
DEP_CPP_UNIVC=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\UnivCharsetDesc.obj" : $(SOURCE) $(DEP_CPP_UNIVC) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\UnicodeCodingSystem.cxx
DEP_CPP_UNICO=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\UnicodeCodingSystem.obj" : $(SOURCE) $(DEP_CPP_UNICO) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Undo.cxx
DEP_CPP_UNDO_=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Undo.obj" : $(SOURCE) $(DEP_CPP_UNDO_) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\TypeId.cxx
DEP_CPP_TYPEI=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\TypeId.obj" : $(SOURCE) $(DEP_CPP_TYPEI) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\TrieBuilder.cxx
DEP_CPP_TRIEB=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\TrieBuilder.obj" : $(SOURCE) $(DEP_CPP_TRIEB) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\TokenMessageArg.h

!IF  "$(CFG)" == "lib - Win32 Release"

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\TokenMessageArg.cxx
DEP_CPP_TOKEN=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\TokenMessageArg.obj" : $(SOURCE) $(DEP_CPP_TOKEN) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\token.h

!IF  "$(CFG)" == "lib - Win32 Release"

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Text.cxx
DEP_CPP_TEXT_=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Text.obj" : $(SOURCE) $(DEP_CPP_TEXT_) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Syntax.cxx
DEP_CPP_SYNTA=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Syntax.obj" : $(SOURCE) $(DEP_CPP_SYNTA) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\StorageManager.cxx
DEP_CPP_STORA=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\StorageManager.obj" : $(SOURCE) $(DEP_CPP_STORA) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\StdioStorage.cxx
DEP_CPP_STDIO=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StdioStorageMessages.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\StdioStorage.obj" : $(SOURCE) $(DEP_CPP_STDIO) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\SOEntityCatalog.cxx
DEP_CPP_SOENT=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\CatalogMessages.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\SOEntityCatalog.obj" : $(SOURCE) $(DEP_CPP_SOENT) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\SJISCodingSystem.cxx
DEP_CPP_SJISC=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\SJISCodingSystem.obj" : $(SOURCE) $(DEP_CPP_SJISC) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ShortReferenceMap.cxx
DEP_CPP_SHORT=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ShortReferenceMap.obj" : $(SOURCE) $(DEP_CPP_SHORT) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\SgmlParser.cxx
DEP_CPP_SGMLP=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\SgmlParser.obj" : $(SOURCE) $(DEP_CPP_SGMLP) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\SearchResultMessageArg.cxx
DEP_CPP_SEARC=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\SearchResultMessageArg.obj" : $(SOURCE) $(DEP_CPP_SEARC) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\SdText.cxx
DEP_CPP_SDTEX=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\SdText.obj" : $(SOURCE) $(DEP_CPP_SDTEX) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Sd.cxx
DEP_CPP_SD_CX=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Sd.obj" : $(SOURCE) $(DEP_CPP_SD_CX) "$(INTDIR)" "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\RewindStorageObject.cxx
DEP_CPP_REWIN=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\RewindStorageObject.obj" : $(SOURCE) $(DEP_CPP_REWIN) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Recognizer.cxx
DEP_CPP_RECOG=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Recognizer.obj" : $(SOURCE) $(DEP_CPP_RECOG) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\PosixStorage.cxx
DEP_CPP_POSIX=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\PosixStorageMessages.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	{$(INCLUDE)}"\sys\STAT.H"\
	{$(INCLUDE)}"\sys\TYPES.H"\
	

"$(INTDIR)\PosixStorage.obj" : $(SOURCE) $(DEP_CPP_POSIX) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Partition.cxx
DEP_CPP_PARTI=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Partition.obj" : $(SOURCE) $(DEP_CPP_PARTI) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\parseSd.cxx
DEP_CPP_PARSE=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\parseSd.obj" : $(SOURCE) $(DEP_CPP_PARSE) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ParserState.cxx
DEP_CPP_PARSER=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ParserState.obj" : $(SOURCE) $(DEP_CPP_PARSER) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ParserOptions.cxx
DEP_CPP_PARSERO=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ParserOptions.obj" : $(SOURCE) $(DEP_CPP_PARSERO) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ParserMessages.cxx
DEP_CPP_PARSERM=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ParserMessages.obj" : $(SOURCE) $(DEP_CPP_PARSERM) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\parser_inst.cxx
DEP_CPP_PARSER_=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

!IF  "$(CFG)" == "lib - Win32 Release"

# ADD CPP /Yu"splib.h"

"$(INTDIR)\parser_inst.obj" : $(SOURCE) $(DEP_CPP_PARSER_) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) /nologo /MD /W3 /GX /O2 /I "include" /I "generic" /D "NDEBUG" /D\
 "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D\
 "SP_MULTI_BYTE" /Fp"$(INTDIR)/lib.pch" /Yu"splib.h" /Fo"$(INTDIR)/" /c\
 $(SOURCE)


!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# ADD CPP /Yu"splib.h"

"$(INTDIR)\parser_inst.obj" : $(SOURCE) $(DEP_CPP_PARSER_) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) /nologo /MDd /W3 /GX /Zi /Od /I "include" /I "generic" /D "_DEBUG" /D\
 "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D\
 "SP_MULTI_BYTE" /Fp"$(INTDIR)/lib.pch" /Yu"splib.h" /Fo"$(INTDIR)/"\
 /Fd"$(INTDIR)/" /c $(SOURCE)


!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Parser.cxx
DEP_CPP_PARSER_C=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Parser.obj" : $(SOURCE) $(DEP_CPP_PARSER_C) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\parseParam.cxx
DEP_CPP_PARSEP=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\parseParam.obj" : $(SOURCE) $(DEP_CPP_PARSEP) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\parseMode.cxx
DEP_CPP_PARSEM=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\parseMode.obj" : $(SOURCE) $(DEP_CPP_PARSEM) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\parseInstance.cxx
DEP_CPP_PARSEI=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\parseInstance.obj" : $(SOURCE) $(DEP_CPP_PARSEI) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\parseDecl.cxx
DEP_CPP_PARSED=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\parseDecl.obj" : $(SOURCE) $(DEP_CPP_PARSED) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\parseCommon.cxx
DEP_CPP_PARSEC=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\parseCommon.obj" : $(SOURCE) $(DEP_CPP_PARSEC) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\parseAttribute.cxx
DEP_CPP_PARSEA=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\parseAttribute.obj" : $(SOURCE) $(DEP_CPP_PARSEA) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Param.cxx
DEP_CPP_PARAM=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Param.obj" : $(SOURCE) $(DEP_CPP_PARAM) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\OutputState.cxx
DEP_CPP_OUTPU=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\OutputState.obj" : $(SOURCE) $(DEP_CPP_OUTPU) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\OutputCharStream.cxx
DEP_CPP_OUTPUT=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\OutputCharStream.obj" : $(SOURCE) $(DEP_CPP_OUTPUT) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\OpenElement.cxx
DEP_CPP_OPENE=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\OpenElement.obj" : $(SOURCE) $(DEP_CPP_OPENE) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\OffsetOrderedList.h

!IF  "$(CFG)" == "lib - Win32 Release"

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\OffsetOrderedList.cxx
DEP_CPP_OFFSE=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\Mutex.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OffsetOrderedList.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\OffsetOrderedList.obj" : $(SOURCE) $(DEP_CPP_OFFSE) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\NumericCharRefOrigin.cxx
DEP_CPP_NUMER=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\NumericCharRefOrigin.obj" : $(SOURCE) $(DEP_CPP_NUMER) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Notation.cxx
DEP_CPP_NOTAT=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Notation.obj" : $(SOURCE) $(DEP_CPP_NOTAT) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ModeInfo.cxx
DEP_CPP_MODEI=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ModeInfo.obj" : $(SOURCE) $(DEP_CPP_MODEI) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\MessageReporter.cxx
DEP_CPP_MESSA=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\MessageReporterMessages.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\MessageReporter.obj" : $(SOURCE) $(DEP_CPP_MESSA) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\MessageEventHandler.cxx
DEP_CPP_MESSAG=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\MessageEventHandler.obj" : $(SOURCE) $(DEP_CPP_MESSAG) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\MessageArg.cxx
DEP_CPP_MESSAGE=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\MessageArg.obj" : $(SOURCE) $(DEP_CPP_MESSAGE) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Message.cxx
DEP_CPP_MESSAGE_=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Message.obj" : $(SOURCE) $(DEP_CPP_MESSAGE_) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Markup.cxx
DEP_CPP_MARKU=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Markup.obj" : $(SOURCE) $(DEP_CPP_MARKU) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Lpd.cxx
DEP_CPP_LPD_C=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Lpd.obj" : $(SOURCE) $(DEP_CPP_LPD_C) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Location.cxx
DEP_CPP_LOCAT=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\Mutex.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Location.obj" : $(SOURCE) $(DEP_CPP_LOCAT) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\LiteralStorage.cxx
DEP_CPP_LITER=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\LiteralStorage.obj" : $(SOURCE) $(DEP_CPP_LITER) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\LinkProcess.cxx
DEP_CPP_LINKP=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\LinkProcess.obj" : $(SOURCE) $(DEP_CPP_LINKP) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Link.cxx
DEP_CPP_LINK_=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Link.obj" : $(SOURCE) $(DEP_CPP_LINK_) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\InternalInputSource.cxx
DEP_CPP_INTER=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\InternalInputSource.obj" : $(SOURCE) $(DEP_CPP_INTER) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\InputSource.cxx
DEP_CPP_INPUT=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\InputSource.obj" : $(SOURCE) $(DEP_CPP_INPUT) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\IListBase.cxx
DEP_CPP_ILIST=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\IListBase.obj" : $(SOURCE) $(DEP_CPP_ILIST) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\IdentityCodingSystem.cxx
DEP_CPP_IDENT=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\IdentityCodingSystem.obj" : $(SOURCE) $(DEP_CPP_IDENT) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Id.cxx
DEP_CPP_ID_CX=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Id.obj" : $(SOURCE) $(DEP_CPP_ID_CX) "$(INTDIR)" "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Hash.cxx
DEP_CPP_HASH_=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Hash.obj" : $(SOURCE) $(DEP_CPP_HASH_) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Group.cxx
DEP_CPP_GROUP=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Group.obj" : $(SOURCE) $(DEP_CPP_GROUP) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Fixed2CodingSystem.cxx
DEP_CPP_FIXED=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Fixed2CodingSystem.obj" : $(SOURCE) $(DEP_CPP_FIXED) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ExternalId.cxx
DEP_CPP_EXTER=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ExternalId.obj" : $(SOURCE) $(DEP_CPP_EXTER) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ExtendEntityManager.cxx
DEP_CPP_EXTEN=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EntityManagerMessages.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\Mutex.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OffsetOrderedList.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ExtendEntityManager.obj" : $(SOURCE) $(DEP_CPP_EXTEN) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Event.cxx
DEP_CPP_EVENT=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Event.obj" : $(SOURCE) $(DEP_CPP_EVENT) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\EUCJPCodingSystem.cxx
DEP_CPP_EUCJP=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\EUCJPCodingSystem.obj" : $(SOURCE) $(DEP_CPP_EUCJP) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ErrnoMessageArg.cxx
DEP_CPP_ERRNO=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ErrnoMessageArg.obj" : $(SOURCE) $(DEP_CPP_ERRNO) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\entmgr_inst.cxx
DEP_CPP_ENTMG=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

!IF  "$(CFG)" == "lib - Win32 Release"

# ADD CPP /Yu"splib.h"

"$(INTDIR)\entmgr_inst.obj" : $(SOURCE) $(DEP_CPP_ENTMG) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) /nologo /MD /W3 /GX /O2 /I "include" /I "generic" /D "NDEBUG" /D\
 "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D\
 "SP_MULTI_BYTE" /Fp"$(INTDIR)/lib.pch" /Yu"splib.h" /Fo"$(INTDIR)/" /c\
 $(SOURCE)


!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# ADD CPP /Yu"splib.h"

"$(INTDIR)\entmgr_inst.obj" : $(SOURCE) $(DEP_CPP_ENTMG) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) /nologo /MDd /W3 /GX /Zi /Od /I "include" /I "generic" /D "_DEBUG" /D\
 "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D\
 "SP_MULTI_BYTE" /Fp"$(INTDIR)/lib.pch" /Yu"splib.h" /Fo"$(INTDIR)/"\
 /Fd"$(INTDIR)/" /c $(SOURCE)


!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\EntityManager.cxx
DEP_CPP_ENTIT=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\EntityManager.obj" : $(SOURCE) $(DEP_CPP_ENTIT) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\EntityDecl.cxx
DEP_CPP_ENTITY=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\EntityDecl.obj" : $(SOURCE) $(DEP_CPP_ENTITY) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\EntityCatalog.cxx
DEP_CPP_ENTITYC=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\EntityCatalog.obj" : $(SOURCE) $(DEP_CPP_ENTITYC) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Entity.cxx
DEP_CPP_ENTITY_=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Entity.obj" : $(SOURCE) $(DEP_CPP_ENTITY_) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ElementType.cxx
DEP_CPP_ELEME=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ElementType.obj" : $(SOURCE) $(DEP_CPP_ELEME) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Dtd.cxx
DEP_CPP_DTD_C=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Dtd.obj" : $(SOURCE) $(DEP_CPP_DTD_C) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\DescriptorManager.cxx
DEP_CPP_DESCR=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\DescriptorManager.obj" : $(SOURCE) $(DEP_CPP_DESCR) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ContentToken.cxx
DEP_CPP_CONTE=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ContentToken.obj" : $(SOURCE) $(DEP_CPP_CONTE) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\CharsetRegistry.cxx
DEP_CPP_CHARS=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\big5.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\gb2312.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\iso646-jis.h"\
	".\lib\iso8859-2.h"\
	".\lib\iso8859-3.h"\
	".\lib\iso8859-4.h"\
	".\lib\iso8859-5.h"\
	".\lib\iso8859-6.h"\
	".\lib\iso8859-7.h"\
	".\lib\iso8859-8.h"\
	".\lib\iso8859-9.h"\
	".\lib\jis0201.h"\
	".\lib\jis0208.h"\
	".\lib\jis0212.h"\
	".\lib\ksc5601.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\CharsetRegistry.obj" : $(SOURCE) $(DEP_CPP_CHARS) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\CharsetInfo.cxx
DEP_CPP_CHARSE=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\CharsetInfo.obj" : $(SOURCE) $(DEP_CPP_CHARSE) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\CharsetDecl.cxx
DEP_CPP_CHARSET=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\CharsetDecl.obj" : $(SOURCE) $(DEP_CPP_CHARSET) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Attribute.cxx
DEP_CPP_ATTRI=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Attribute.obj" : $(SOURCE) $(DEP_CPP_ATTRI) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\assert.cxx
DEP_CPP_ASSER=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\assert.obj" : $(SOURCE) $(DEP_CPP_ASSER) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\app_inst.cxx
DEP_CPP_APP_I=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

!IF  "$(CFG)" == "lib - Win32 Release"

# ADD CPP /Yu"splib.h"

"$(INTDIR)\app_inst.obj" : $(SOURCE) $(DEP_CPP_APP_I) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) /nologo /MD /W3 /GX /O2 /I "include" /I "generic" /D "NDEBUG" /D\
 "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D\
 "SP_MULTI_BYTE" /Fp"$(INTDIR)/lib.pch" /Yu"splib.h" /Fo"$(INTDIR)/" /c\
 $(SOURCE)


!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# ADD CPP /Yu"splib.h"

"$(INTDIR)\app_inst.obj" : $(SOURCE) $(DEP_CPP_APP_I) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) /nologo /MDd /W3 /GX /Zi /Od /I "include" /I "generic" /D "_DEBUG" /D\
 "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D\
 "SP_MULTI_BYTE" /Fp"$(INTDIR)/lib.pch" /Yu"splib.h" /Fo"$(INTDIR)/"\
 /Fd"$(INTDIR)/" /c $(SOURCE)


!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Allocator.cxx
DEP_CPP_ALLOC=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Allocator.obj" : $(SOURCE) $(DEP_CPP_ALLOC) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ErrorCountEventHandler.cxx
DEP_CPP_ERROR=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ErrorCountEventHandler.obj" : $(SOURCE) $(DEP_CPP_ERROR) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Win32CodingSystem.cxx
DEP_CPP_WIN32=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Win32CodingSystem.obj" : $(SOURCE) $(DEP_CPP_WIN32) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\UTF8CodingSystem.cxx
DEP_CPP_UTF8C=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\UTF8CodingSystem.obj" : $(SOURCE) $(DEP_CPP_UTF8C) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\StringVectorMessageArg.cxx
DEP_CPP_STRIN=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\StringVectorMessageArg.obj" : $(SOURCE) $(DEP_CPP_STRIN) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ParserApp.cxx
DEP_CPP_PARSERA=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserAppMessages.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ParserApp.obj" : $(SOURCE) $(DEP_CPP_PARSERA) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\EntityApp.cxx
DEP_CPP_ENTITYA=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\WinInetStorage.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\EntityApp.obj" : $(SOURCE) $(DEP_CPP_ENTITYA) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\CmdLineApp.cxx
DEP_CPP_CMDLI=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\MessageTable.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\CmdLineAppMessages.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	".\lib\version.h"\
	{$(INCLUDE)}"\sys\TYPES.H"\
	

"$(INTDIR)\CmdLineApp.obj" : $(SOURCE) $(DEP_CPP_CMDLI) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ConsoleOutput.cxx
DEP_CPP_CONSO=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ConsoleOutput.obj" : $(SOURCE) $(DEP_CPP_CONSO) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ContentState.cxx
DEP_CPP_CONTEN=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ContentState.obj" : $(SOURCE) $(DEP_CPP_CONTEN) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ArcEngine.cxx
DEP_CPP_ARCEN=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcEngineMessages.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ArcEngine.obj" : $(SOURCE) $(DEP_CPP_ARCEN) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\arc_inst.cxx
DEP_CPP_ARC_I=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

!IF  "$(CFG)" == "lib - Win32 Release"

# ADD CPP /Yu"splib.h"

"$(INTDIR)\arc_inst.obj" : $(SOURCE) $(DEP_CPP_ARC_I) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) /nologo /MD /W3 /GX /O2 /I "include" /I "generic" /D "NDEBUG" /D\
 "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D\
 "SP_MULTI_BYTE" /Fp"$(INTDIR)/lib.pch" /Yu"splib.h" /Fo"$(INTDIR)/" /c\
 $(SOURCE)


!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# ADD CPP /Yu"splib.h"

"$(INTDIR)\arc_inst.obj" : $(SOURCE) $(DEP_CPP_ARC_I) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) /nologo /MDd /W3 /GX /Zi /Od /I "include" /I "generic" /D "_DEBUG" /D\
 "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D\
 "SP_MULTI_BYTE" /Fp"$(INTDIR)/lib.pch" /Yu"splib.h" /Fo"$(INTDIR)/"\
 /Fd"$(INTDIR)/" /c $(SOURCE)


!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\splib.cxx
DEP_CPP_SPLIB=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

!IF  "$(CFG)" == "lib - Win32 Release"

# ADD CPP /Yc"splib.h"

BuildCmds= \
	$(CPP) /nologo /MD /W3 /GX /O2 /I "include" /I "generic" /D "NDEBUG" /D\
 "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D\
 "SP_MULTI_BYTE" /Fp"$(INTDIR)/lib.pch" /Yc"splib.h" /Fo"$(INTDIR)/" /c\
 $(SOURCE) \
	

"$(INTDIR)\splib.obj" : $(SOURCE) $(DEP_CPP_SPLIB) "$(INTDIR)"
   $(BuildCmds)

"$(INTDIR)\lib.pch" : $(SOURCE) $(DEP_CPP_SPLIB) "$(INTDIR)"
   $(BuildCmds)

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# ADD CPP /Yc"splib.h"

BuildCmds= \
	$(CPP) /nologo /MDd /W3 /GX /Zi /Od /I "include" /I "generic" /D "_DEBUG" /D\
 "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=James_Clark_SP /D\
 "SP_MULTI_BYTE" /Fp"$(INTDIR)/lib.pch" /Yc"splib.h" /Fo"$(INTDIR)/"\
 /Fd"$(INTDIR)/" /c $(SOURCE) \
	

"$(INTDIR)\splib.obj" : $(SOURCE) $(DEP_CPP_SPLIB) "$(INTDIR)"
   $(BuildCmds)

"$(INTDIR)\lib.pch" : $(SOURCE) $(DEP_CPP_SPLIB) "$(INTDIR)"
   $(BuildCmds)

!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\SGMLApplication.cxx
DEP_CPP_SGMLA=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\SGMLApplication.obj" : $(SOURCE) $(DEP_CPP_SGMLA) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ParserEventGeneratorKit.cxx
DEP_CPP_PARSERE=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\ParserEventGeneratorKit.obj" : $(SOURCE) $(DEP_CPP_PARSERE)\
 "$(INTDIR)" "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\GenericEventHandler.cxx
DEP_CPP_GENER=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\GenericEventHandler.obj" : $(SOURCE) $(DEP_CPP_GENER) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\EventGenerator.cxx
DEP_CPP_EVENTG=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\EventGenerator.obj" : $(SOURCE) $(DEP_CPP_EVENTG) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\lib.rc
DEP_RSC_LIB_R=\
	".\lib\ArcEngineMessages.rc"\
	".\lib\CatalogMessages.rc"\
	".\lib\CmdLineAppMessages.rc"\
	".\lib\EntityManagerMessages.rc"\
	".\lib\MessageFormatterMessages.rc"\
	".\lib\MessageReporterMessages.rc"\
	".\lib\ParserAppMessages.rc"\
	".\lib\ParserMessages.rc"\
	".\lib\PosixStorageMessages.rc"\
	".\lib\StdioStorageMessages.rc"\
	".\lib\URLStorageMessages.rc"\
	

!IF  "$(CFG)" == "lib - Win32 Release"


"$(INTDIR)\lib.res" : $(SOURCE) $(DEP_RSC_LIB_R) "$(INTDIR)"
   $(RSC) /l 0x809 /fo"$(INTDIR)/lib.res" /i "lib" /d "NDEBUG" $(SOURCE)


!ELSEIF  "$(CFG)" == "lib - Win32 Debug"


"$(INTDIR)\lib.res" : $(SOURCE) $(DEP_RSC_LIB_R) "$(INTDIR)"
   $(RSC) /l 0x809 /fo"$(INTDIR)/lib.res" /i "lib" /d "_DEBUG" $(SOURCE)


!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\MessageTable.cxx
DEP_CPP_MESSAGET=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\MessageTable.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\MessageTable.obj" : $(SOURCE) $(DEP_CPP_MESSAGET) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\WinInetStorage.cxx
DEP_CPP_WININ=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\WinInetStorage.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	".\lib\WinInetStorageMessages.h"\
	

"$(INTDIR)\WinInetStorage.obj" : $(SOURCE) $(DEP_CPP_WININ) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\ParserMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\arc_inst.m4

!IF  "$(CFG)" == "lib - Win32 Release"

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\app_inst.m4

!IF  "$(CFG)" == "lib - Win32 Release"

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\entmgr_inst.m4

!IF  "$(CFG)" == "lib - Win32 Release"

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\instmac.m4

!IF  "$(CFG)" == "lib - Win32 Release"

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\parser_inst.m4

!IF  "$(CFG)" == "lib - Win32 Release"

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\xentmgr_inst.m4

!IF  "$(CFG)" == "lib - Win32 Release"

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\TranslateCodingSystem.cxx
DEP_CPP_TRANS=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TranslateCodingSystem.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\TranslateCodingSystem.obj" : $(SOURCE) $(DEP_CPP_TRANS) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\CodingSystemKit.cxx
DEP_CPP_CODIN=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Big5CodingSystem.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TranslateCodingSystem.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\XMLCodingSystem.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\CodingSystemKit.obj" : $(SOURCE) $(DEP_CPP_CODIN) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\CmdLineAppMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\EntityManagerMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\CodingSystem.cxx
DEP_CPP_CODING=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\CodingSystem.obj" : $(SOURCE) $(DEP_CPP_CODING) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\Big5CodingSystem.cxx
DEP_CPP_BIG5C=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Big5CodingSystem.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\Big5CodingSystem.obj" : $(SOURCE) $(DEP_CPP_BIG5C) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\OutputByteStream.cxx
DEP_CPP_OUTPUTB=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	{$(INCLUDE)}"\sys\STAT.H"\
	{$(INCLUDE)}"\sys\TYPES.H"\
	

"$(INTDIR)\OutputByteStream.obj" : $(SOURCE) $(DEP_CPP_OUTPUTB) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\MessageFormatter.cxx
DEP_CPP_MESSAGEF=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\MessageFormatterMessages.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\MessageFormatter.obj" : $(SOURCE) $(DEP_CPP_MESSAGEF) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\WinApp.cxx
DEP_CPP_WINAP=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\WinApp.h"\
	".\include\WinInetStorage.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	
# PROP Exclude_From_Build 0

"$(INTDIR)\WinApp.obj" : $(SOURCE) $(DEP_CPP_WINAP) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\NotationStorage.cxx
DEP_CPP_NOTATI=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\NotationStorage.obj" : $(SOURCE) $(DEP_CPP_NOTATI) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\lib\XMLCodingSystem.cxx
DEP_CPP_XMLCO=\
	".\generic\EventGenerator.h"\
	".\generic\ParserEventGeneratorKit.h"\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\ArcEngine.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CharsetRegistry.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\ConsoleOutput.h"\
	".\include\constant.h"\
	".\include\ContentState.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\DescriptorManager.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\EUCJPCodingSystem.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Fixed2CodingSystem.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IdentityCodingSystem.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IListIter.h"\
	".\include\IListIterBase.h"\
	".\include\InputSource.h"\
	".\include\InternalInputSource.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\ISetIter.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\List.cxx"\
	".\include\List.h"\
	".\include\ListIter.h"\
	".\include\LiteralStorage.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\NotationStorage.h"\
	".\include\OpenElement.h"\
	".\include\Options.cxx"\
	".\include\Options.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\PosixStorage.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\RewindStorageObject.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SearchResultMessageArg.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\SJISCodingSystem.h"\
	".\include\SOEntityCatalog.h"\
	".\include\sptchar.h"\
	".\include\StdioStorage.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnicodeCodingSystem.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\URLStorage.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\Win32CodingSystem.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\XMLCodingSystem.h"\
	".\include\xnew.h"\
	".\lib\ArcProcessor.h"\
	".\lib\CatalogEntry.h"\
	".\lib\EquivClass.h"\
	".\lib\EventQueue.h"\
	".\lib\events.h"\
	".\lib\Group.h"\
	".\lib\Id.h"\
	".\lib\LpdEntityRef.h"\
	".\lib\MarkupScan.h"\
	".\lib\ModeInfo.h"\
	".\lib\NameToken.h"\
	".\lib\NumericCharRefOrigin.h"\
	".\lib\OutputState.h"\
	".\lib\Param.h"\
	".\lib\Parser.h"\
	".\lib\ParserMessages.h"\
	".\lib\ParserState.h"\
	".\lib\Partition.h"\
	".\lib\Priority.h"\
	".\lib\Recognizer.h"\
	".\lib\SdFormalError.h"\
	".\lib\splib.h"\
	".\lib\splibpch.h"\
	".\lib\SrInfo.h"\
	".\lib\StorageObjectPosition.h"\
	".\lib\StringVectorMessageArg.h"\
	".\lib\token.h"\
	".\lib\TokenMessageArg.h"\
	".\lib\Trie.h"\
	".\lib\TrieBuilder.h"\
	".\lib\Undo.h"\
	

"$(INTDIR)\XMLCodingSystem.obj" : $(SOURCE) $(DEP_CPP_XMLCO) "$(INTDIR)"\
 "$(INTDIR)\lib.pch"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
# End Target
################################################################################
# Begin Target

# Name "nsgmls - Win32 Release"
# Name "nsgmls - Win32 Debug"

!IF  "$(CFG)" == "nsgmls - Win32 Release"

!ELSEIF  "$(CFG)" == "nsgmls - Win32 Debug"

!ENDIF 

################################################################################
# Begin Project Dependency

# Project_Dep_Name "lib"

!IF  "$(CFG)" == "nsgmls - Win32 Release"

"lib - Win32 Release" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="lib - Win32 Release" 

!ELSEIF  "$(CFG)" == "nsgmls - Win32 Debug"

"lib - Win32 Debug" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="lib - Win32 Debug" 

!ENDIF 

# End Project Dependency
################################################################################
# Begin Source File

SOURCE=.\nsgmls\StringSet.cxx
DEP_CPP_STRING=\
	".\include\Boolean.h"\
	".\include\config.h"\
	".\include\Hash.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\xnew.h"\
	".\nsgmls\StringSet.h"\
	

"$(INTDIR)\StringSet.obj" : $(SOURCE) $(DEP_CPP_STRING) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\nsgmls\SgmlsEventHandler.cxx
DEP_CPP_SGMLS=\
	".\include\Allocator.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\constant.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\nsgmls\SgmlsEventHandler.h"\
	".\nsgmls\StringSet.h"\
	

"$(INTDIR)\SgmlsEventHandler.obj" : $(SOURCE) $(DEP_CPP_SGMLS) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\nsgmls\RastEventHandler.cxx
DEP_CPP_RASTE=\
	".\include\Allocator.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CodingSystem.h"\
	".\include\config.h"\
	".\include\constant.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExternalId.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\nsgmls\RastEventHandler.h"\
	".\nsgmls\RastEventHandlerMessages.h"\
	

"$(INTDIR)\RastEventHandler.obj" : $(SOURCE) $(DEP_CPP_RASTE) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\nsgmls\nsgmls_inst.cxx
DEP_CPP_NSGML=\
	".\include\Allocator.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CodingSystem.h"\
	".\include\config.h"\
	".\include\constant.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\Event.h"\
	".\include\ExternalId.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\ShortReferenceMap.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\nsgmls\RastEventHandler.h"\
	".\nsgmls\StringSet.h"\
	

"$(INTDIR)\nsgmls_inst.obj" : $(SOURCE) $(DEP_CPP_NSGML) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\nsgmls\nsgmls.cxx
DEP_CPP_NSGMLS=\
	".\include\Allocator.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\constant.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrnoMessageArg.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\IList.h"\
	".\include\IListBase.h"\
	".\include\IQueue.cxx"\
	".\include\IQueue.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\Link.h"\
	".\include\LinkProcess.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageEventHandler.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\sptchar.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\nsgmls\NsgmlsMessages.h"\
	".\nsgmls\RastEventHandler.h"\
	".\nsgmls\SgmlsEventHandler.h"\
	".\nsgmls\StringSet.h"\
	

"$(INTDIR)\nsgmls.obj" : $(SOURCE) $(DEP_CPP_NSGMLS) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\nsgmls\nsgmls.rc
DEP_RSC_NSGMLS_=\
	".\nsgmls\NsgmlsMessages.rc"\
	".\nsgmls\RastEventHandlerMessages.rc"\
	

!IF  "$(CFG)" == "nsgmls - Win32 Release"


"$(INTDIR)\nsgmls.res" : $(SOURCE) $(DEP_RSC_NSGMLS_) "$(INTDIR)"
   $(RSC) /l 0x809 /fo"$(INTDIR)/nsgmls.res" /i "nsgmls" /d "NDEBUG" $(SOURCE)


!ELSEIF  "$(CFG)" == "nsgmls - Win32 Debug"


"$(INTDIR)\nsgmls.res" : $(SOURCE) $(DEP_RSC_NSGMLS_) "$(INTDIR)"
   $(RSC) /l 0x809 /fo"$(INTDIR)/nsgmls.res" /i "nsgmls" /d "_DEBUG" $(SOURCE)


!ENDIF 

# End Source File
# End Target
################################################################################
# Begin Target

# Name "spam - Win32 Release"
# Name "spam - Win32 Debug"

!IF  "$(CFG)" == "spam - Win32 Release"

!ELSEIF  "$(CFG)" == "spam - Win32 Debug"

!ENDIF 

################################################################################
# Begin Project Dependency

# Project_Dep_Name "lib"

!IF  "$(CFG)" == "spam - Win32 Release"

"lib - Win32 Release" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="lib - Win32 Release" 

!ELSEIF  "$(CFG)" == "spam - Win32 Debug"

"lib - Win32 Debug" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="lib - Win32 Debug" 

!ENDIF 

# End Project Dependency
################################################################################
# Begin Source File

SOURCE=.\spam\spam_inst.cxx
DEP_CPP_SPAM_=\
	".\include\Allocator.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CodingSystem.h"\
	".\include\config.h"\
	".\include\constant.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\Event.h"\
	".\include\ExternalId.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\Link.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\ShortReferenceMap.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\spam\CopyEventHandler.h"\
	".\spam\MarkupEventHandler.h"\
	

"$(INTDIR)\spam_inst.obj" : $(SOURCE) $(DEP_CPP_SPAM_) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\spam\spam.cxx
DEP_CPP_SPAM_C=\
	".\include\Allocator.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\constant.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\InputSource.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\Link.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\sptchar.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\spam\CopyEventHandler.h"\
	".\spam\MarkupEventHandler.h"\
	".\spam\SpamMessages.h"\
	

"$(INTDIR)\spam.obj" : $(SOURCE) $(DEP_CPP_SPAM_C) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\spam\MarkupEventHandler.cxx
DEP_CPP_MARKUP=\
	".\include\Allocator.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\config.h"\
	".\include\constant.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\Event.h"\
	".\include\ExternalId.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\Link.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\ShortReferenceMap.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\spam\MarkupEventHandler.h"\
	

"$(INTDIR)\MarkupEventHandler.obj" : $(SOURCE) $(DEP_CPP_MARKUP) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\spam\CopyEventHandler.cxx
DEP_CPP_COPYE=\
	".\include\Allocator.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CodingSystem.h"\
	".\include\config.h"\
	".\include\constant.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\Event.h"\
	".\include\ExternalId.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\Link.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\ShortReferenceMap.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\spam\CopyEventHandler.h"\
	".\spam\MarkupEventHandler.h"\
	

"$(INTDIR)\CopyEventHandler.obj" : $(SOURCE) $(DEP_CPP_COPYE) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\spam\SpamMessages.msg

!IF  "$(CFG)" == "spam - Win32 Release"

!ELSEIF  "$(CFG)" == "spam - Win32 Debug"

!ENDIF 

# End Source File
################################################################################
# Begin Source File

SOURCE=.\spam\spam.rc
DEP_RSC_SPAM_R=\
	".\spam\SpamMessages.rc"\
	

!IF  "$(CFG)" == "spam - Win32 Release"


"$(INTDIR)\spam.res" : $(SOURCE) $(DEP_RSC_SPAM_R) "$(INTDIR)"
   $(RSC) /l 0x809 /fo"$(INTDIR)/spam.res" /i "spam" /d "NDEBUG" $(SOURCE)


!ELSEIF  "$(CFG)" == "spam - Win32 Debug"


"$(INTDIR)\spam.res" : $(SOURCE) $(DEP_RSC_SPAM_R) "$(INTDIR)"
   $(RSC) /l 0x809 /fo"$(INTDIR)/spam.res" /i "spam" /d "_DEBUG" $(SOURCE)


!ENDIF 

# End Source File
# End Target
################################################################################
# Begin Target

# Name "spent - Win32 Release"
# Name "spent - Win32 Debug"

!IF  "$(CFG)" == "spent - Win32 Release"

!ELSEIF  "$(CFG)" == "spent - Win32 Debug"

!ENDIF 

################################################################################
# Begin Project Dependency

# Project_Dep_Name "lib"

!IF  "$(CFG)" == "spent - Win32 Release"

"lib - Win32 Release" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="lib - Win32 Release" 

!ELSEIF  "$(CFG)" == "spent - Win32 Debug"

"lib - Win32 Debug" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="lib - Win32 Debug" 

!ENDIF 

# End Project Dependency
################################################################################
# Begin Source File

SOURCE=.\spent\spent.cxx
DEP_CPP_SPENT=\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetInfo.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\constant.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityManager.h"\
	".\include\ExtendEntityManager.h"\
	".\include\InputSource.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\Link.h"\
	".\include\Location.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\rtti.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\TypeId.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	

"$(INTDIR)\spent.obj" : $(SOURCE) $(DEP_CPP_SPENT) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\spent\SpentMessages.msg

!IF  "$(CFG)" == "spent - Win32 Release"

!ELSEIF  "$(CFG)" == "spent - Win32 Debug"

!ENDIF 

# End Source File
# End Target
################################################################################
# Begin Target

# Name "sgmlnorm - Win32 Release"
# Name "sgmlnorm - Win32 Debug"

!IF  "$(CFG)" == "sgmlnorm - Win32 Release"

!ELSEIF  "$(CFG)" == "sgmlnorm - Win32 Debug"

!ENDIF 

################################################################################
# Begin Project Dependency

# Project_Dep_Name "lib"

!IF  "$(CFG)" == "sgmlnorm - Win32 Release"

"lib - Win32 Release" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="lib - Win32 Release" 

!ELSEIF  "$(CFG)" == "sgmlnorm - Win32 Debug"

"lib - Win32 Debug" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="lib - Win32 Debug" 

!ENDIF 

# End Project Dependency
################################################################################
# Begin Source File

SOURCE=.\sgmlnorm\sgmlnorm.cxx
DEP_CPP_SGMLN=\
	".\generic\SGMLApplication.h"\
	".\include\Allocator.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\constant.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\GenericEventHandler.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\Link.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\sgmlnorm\SGMLGenerator.h"\
	

"$(INTDIR)\sgmlnorm.obj" : $(SOURCE) $(DEP_CPP_SGMLN) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\sgmlnorm\SGMLGenerator.cxx
DEP_CPP_SGMLG=\
	".\generic\SGMLApplication.h"\
	".\include\Boolean.h"\
	".\include\CodingSystem.h"\
	".\include\config.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\sgmlnorm\SGMLGenerator.h"\
	

"$(INTDIR)\SGMLGenerator.obj" : $(SOURCE) $(DEP_CPP_SGMLG) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
# End Target
################################################################################
# Begin Target

# Name "all - Win32 Release"
# Name "all - Win32 Debug"

!IF  "$(CFG)" == "all - Win32 Release"

".\all" : 
   CD all
   

!ELSEIF  "$(CFG)" == "all - Win32 Debug"

".\all" : 
   CD all
   

!ENDIF 

################################################################################
# Begin Project Dependency

# Project_Dep_Name "lib"

!IF  "$(CFG)" == "all - Win32 Release"

"lib - Win32 Release" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="lib - Win32 Release" 

!ELSEIF  "$(CFG)" == "all - Win32 Debug"

"lib - Win32 Debug" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="lib - Win32 Debug" 

!ENDIF 

# End Project Dependency
################################################################################
# Begin Project Dependency

# Project_Dep_Name "nsgmls"

!IF  "$(CFG)" == "all - Win32 Release"

"nsgmls - Win32 Release" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="nsgmls - Win32 Release" 

!ELSEIF  "$(CFG)" == "all - Win32 Debug"

"nsgmls - Win32 Debug" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="nsgmls - Win32 Debug" 

!ENDIF 

# End Project Dependency
################################################################################
# Begin Project Dependency

# Project_Dep_Name "sgmlnorm"

!IF  "$(CFG)" == "all - Win32 Release"

"sgmlnorm - Win32 Release" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="sgmlnorm - Win32 Release" 

!ELSEIF  "$(CFG)" == "all - Win32 Debug"

"sgmlnorm - Win32 Debug" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="sgmlnorm - Win32 Debug" 

!ENDIF 

# End Project Dependency
################################################################################
# Begin Project Dependency

# Project_Dep_Name "spam"

!IF  "$(CFG)" == "all - Win32 Release"

"spam - Win32 Release" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="spam - Win32 Release" 

!ELSEIF  "$(CFG)" == "all - Win32 Debug"

"spam - Win32 Debug" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="spam - Win32 Debug" 

!ENDIF 

# End Project Dependency
################################################################################
# Begin Project Dependency

# Project_Dep_Name "spent"

!IF  "$(CFG)" == "all - Win32 Release"

"spent - Win32 Release" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="spent - Win32 Release" 

!ELSEIF  "$(CFG)" == "all - Win32 Debug"

"spent - Win32 Debug" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="spent - Win32 Debug" 

!ENDIF 

# End Project Dependency
################################################################################
# Begin Project Dependency

# Project_Dep_Name "sx"

!IF  "$(CFG)" == "all - Win32 Release"

"sx - Win32 Release" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="sx - Win32 Release" 

!ELSEIF  "$(CFG)" == "all - Win32 Debug"

"sx - Win32 Debug" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="sx - Win32 Debug" 

!ENDIF 

# End Project Dependency
# End Target
################################################################################
# Begin Target

# Name "sx - Win32 Release"
# Name "sx - Win32 Debug"

!IF  "$(CFG)" == "sx - Win32 Release"

!ELSEIF  "$(CFG)" == "sx - Win32 Debug"

!ENDIF 

################################################################################
# Begin Project Dependency

# Project_Dep_Name "lib"

!IF  "$(CFG)" == "sx - Win32 Release"

"lib - Win32 Release" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="lib - Win32 Release" 

!ELSEIF  "$(CFG)" == "sx - Win32 Debug"

"lib - Win32 Debug" : 
   $(MAKE) /$(MAKEFLAGS) /F ".\SP.mak" CFG="lib - Win32 Debug" 

!ENDIF 

# End Project Dependency
################################################################################
# Begin Source File

SOURCE=.\sx\sx.cxx
DEP_CPP_SX_CX=\
	".\include\Allocator.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CmdLineApp.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\constant.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityApp.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\Event.h"\
	".\include\EventsWanted.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\Link.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\MessageBuilder.h"\
	".\include\MessageFormatter.h"\
	".\include\MessageReporter.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\ParserApp.h"\
	".\include\ParserOptions.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\SgmlParser.h"\
	".\include\ShortReferenceMap.h"\
	".\include\sptchar.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\sx\SxMessages.h"\
	".\sx\XmlOutputEventHandler.h"\
	

"$(INTDIR)\sx.obj" : $(SOURCE) $(DEP_CPP_SX_CX) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\sx\sx_inst.cxx
DEP_CPP_SX_IN=\
	".\include\Boolean.h"\
	".\include\config.h"\
	".\include\constant.h"\
	".\include\InputSource.h"\
	".\include\Link.h"\
	".\include\Location.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\Resource.h"\
	".\include\rtti.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\TypeId.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	

"$(INTDIR)\sx_inst.obj" : $(SOURCE) $(DEP_CPP_SX_IN) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\sx\XmlOutputEventHandler.cxx
DEP_CPP_XMLOU=\
	".\include\Allocator.h"\
	".\include\Attribute.h"\
	".\include\Attributed.h"\
	".\include\Boolean.h"\
	".\include\CharMap.cxx"\
	".\include\CharMap.h"\
	".\include\CharsetDecl.h"\
	".\include\CharsetInfo.h"\
	".\include\CodingSystem.h"\
	".\include\CodingSystemKit.h"\
	".\include\config.h"\
	".\include\constant.h"\
	".\include\ContentToken.h"\
	".\include\CopyOwner.cxx"\
	".\include\CopyOwner.h"\
	".\include\Dtd.h"\
	".\include\ElementType.h"\
	".\include\Entity.h"\
	".\include\EntityCatalog.h"\
	".\include\EntityDecl.h"\
	".\include\EntityManager.h"\
	".\include\ErrorCountEventHandler.h"\
	".\include\Event.h"\
	".\include\ExtendEntityManager.h"\
	".\include\ExternalId.h"\
	".\include\Hash.h"\
	".\include\HashTable.cxx"\
	".\include\HashTable.h"\
	".\include\HashTableItemBase.cxx"\
	".\include\HashTableItemBase.h"\
	".\include\InputSource.h"\
	".\include\ISet.cxx"\
	".\include\ISet.h"\
	".\include\Link.h"\
	".\include\Location.h"\
	".\include\Lpd.h"\
	".\include\macros.h"\
	".\include\Markup.h"\
	".\include\Message.h"\
	".\include\MessageArg.h"\
	".\include\Mode.h"\
	".\include\Named.h"\
	".\include\NamedResource.h"\
	".\include\NamedResourceTable.h"\
	".\include\NamedTable.h"\
	".\include\NCVector.h"\
	".\include\Notation.h"\
	".\include\OutputByteStream.h"\
	".\include\OutputCharStream.h"\
	".\include\Owner.cxx"\
	".\include\Owner.h"\
	".\include\OwnerTable.cxx"\
	".\include\OwnerTable.h"\
	".\include\PointerTable.cxx"\
	".\include\PointerTable.h"\
	".\include\Ptr.cxx"\
	".\include\Ptr.h"\
	".\include\RangeMap.cxx"\
	".\include\RangeMap.h"\
	".\include\Resource.h"\
	".\include\rtti.h"\
	".\include\Sd.h"\
	".\include\SdText.h"\
	".\include\ShortReferenceMap.h"\
	".\include\StorageManager.h"\
	".\include\StringC.h"\
	".\include\StringOf.cxx"\
	".\include\StringOf.h"\
	".\include\StringResource.h"\
	".\include\SubstTable.cxx"\
	".\include\SubstTable.h"\
	".\include\Syntax.h"\
	".\include\Text.h"\
	".\include\TypeId.h"\
	".\include\UnivCharsetDesc.h"\
	".\include\UTF8CodingSystem.h"\
	".\include\Vector.cxx"\
	".\include\Vector.h"\
	".\include\XcharMap.cxx"\
	".\include\XcharMap.h"\
	".\include\xnew.h"\
	".\sx\XmlOutputEventHandler.h"\
	".\sx\XmlOutputMessages.h"\
	

"$(INTDIR)\XmlOutputEventHandler.obj" : $(SOURCE) $(DEP_CPP_XMLOU) "$(INTDIR)"
   $(CPP) $(CPP_PROJ) $(SOURCE)


# End Source File
################################################################################
# Begin Source File

SOURCE=.\sx\sx.rc
DEP_RSC_SX_RC=\
	".\sx\SxMessages.rc"\
	".\sx\XmlOutputMessages.rc"\
	

!IF  "$(CFG)" == "sx - Win32 Release"


"$(INTDIR)\sx.res" : $(SOURCE) $(DEP_RSC_SX_RC) "$(INTDIR)"
   $(RSC) /l 0x809 /fo"$(INTDIR)/sx.res" /i "sx" /d "NDEBUG" $(SOURCE)


!ELSEIF  "$(CFG)" == "sx - Win32 Debug"


"$(INTDIR)\sx.res" : $(SOURCE) $(DEP_RSC_SX_RC) "$(INTDIR)"
   $(RSC) /l 0x809 /fo"$(INTDIR)/sx.res" /i "sx" /d "_DEBUG" $(SOURCE)


!ENDIF 

# End Source File
# End Target
# End Project
################################################################################
