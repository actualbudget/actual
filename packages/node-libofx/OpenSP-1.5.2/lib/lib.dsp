# Microsoft Developer Studio Project File - Name="lib" - Package Owner=<4>
# Microsoft Developer Studio Generated Build File, Format Version 6.00
# ** DO NOT EDIT **

# TARGTYPE "Win32 (x86) Dynamic-Link Library" 0x0102

CFG=lib - Win32 Release
!MESSAGE This is not a valid makefile. To build this project using NMAKE,
!MESSAGE use the Export Makefile command and run
!MESSAGE 
!MESSAGE NMAKE /f "lib.mak".
!MESSAGE 
!MESSAGE You can specify a configuration when running NMAKE
!MESSAGE by defining the macro CFG on the command line. For example:
!MESSAGE 
!MESSAGE NMAKE /f "lib.mak" CFG="lib - Win32 Release"
!MESSAGE 
!MESSAGE Possible choices for configuration are:
!MESSAGE 
!MESSAGE "lib - Win32 Release" (based on "Win32 (x86) Dynamic-Link Library")
!MESSAGE "lib - Win32 Debug" (based on "Win32 (x86) Dynamic-Link Library")
!MESSAGE 

# Begin Project
# PROP AllowPerConfigDependencies 0
# PROP Scc_ProjName ""
# PROP Scc_LocalPath ""
CPP=cl.exe
MTL=midl.exe
RSC=rc.exe

!IF  "$(CFG)" == "lib - Win32 Release"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 0
# PROP BASE Output_Dir ".\Release"
# PROP BASE Intermediate_Dir ".\Release"
# PROP BASE Target_Dir "."
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 0
# PROP Output_Dir ".\Release"
# PROP Intermediate_Dir ".\Release"
# PROP Ignore_Export_Lib 0
# PROP Target_Dir "."
# ADD BASE CPP /nologo /MT /W3 /GX /O2 /D "WIN32" /D "NDEBUG" /D "_WINDOWS" /YX /c
# ADD CPP /nologo /MD /W3 /GX /O2 /I "..\include" /I "..\generic" /D "NDEBUG" /D "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=OpenSP /D "SP_MULTI_BYTE" /D SP_HAVE_LOCALE=1 /Yu"splib.h" /FD /c
# ADD BASE MTL /nologo /D "NDEBUG" /win32
# ADD MTL /nologo /D "NDEBUG" /mktyplib203 /win32
# ADD BASE RSC /l 0x809 /d "NDEBUG"
# ADD RSC /l 0x809 /d "NDEBUG"
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:windows /dll /machine:I386
# ADD LINK32 wininet.lib wsock32.lib kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:windows /dll /machine:I386 /out:"..\bin\osp152.dll" /base:0x21000000
# SUBTRACT LINK32 /profile

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 1
# PROP BASE Output_Dir ".\Debug"
# PROP BASE Intermediate_Dir ".\Debug"
# PROP BASE Target_Dir "."
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 1
# PROP Output_Dir ".\Debug"
# PROP Intermediate_Dir ".\Debug"
# PROP Ignore_Export_Lib 0
# PROP Target_Dir "."
# ADD BASE CPP /nologo /MTd /W3 /Gm /GX /Zi /Od /D "WIN32" /D "_DEBUG" /D "_WINDOWS" /YX /c
# ADD CPP /nologo /MDd /W3 /GX /ZI /Od /I "..\include" /I "..\generic" /D "_DEBUG" /D "_WINDOWS" /D "WINSOCK" /D "WIN32" /D SP_NAMESPACE=OpenSP /D "SP_MULTI_BYTE" /Yu"splib.h" /FD /c
# ADD BASE MTL /nologo /D "_DEBUG" /win32
# ADD MTL /nologo /D "_DEBUG" /mktyplib203 /win32
# ADD BASE RSC /l 0x809 /d "_DEBUG"
# ADD RSC /l 0x809 /d "_DEBUG"
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:windows /dll /debug /machine:I386
# ADD LINK32 wininet.lib wsock32.lib kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:windows /dll /debug /machine:I386 /out:"..\dbgbin\osp152.dll" /base:0x21000000

!ENDIF 

# Begin Target

# Name "lib - Win32 Release"
# Name "lib - Win32 Debug"
# Begin Group "Source Files"

# PROP Default_Filter "cpp;c;cxx;rc;def;r;odl;idl;hpj;bat;for;f90"
# Begin Source File

SOURCE=.\Allocator.cxx
# End Source File
# Begin Source File

SOURCE=.\app_inst.cxx
# ADD CPP /Yu"splib.h"
# End Source File
# Begin Source File

SOURCE=.\app_inst.m4

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\app_inst.m4
InputName=app_inst

"$(InputDir)\$(InputName).cxx" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	del /f $(InputDir)\$(InputName).cxx 
	perl ..\instmac.pl $(InputPath) >$(InputDir)\$(InputName).cxx 
	attrib +r $(InputDir)\$(InputName).cxx 
	
# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\app_inst.m4
InputName=app_inst

"$(InputDir)\$(InputName).cxx" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	del /f $(InputDir)\$(InputName).cxx 
	perl ..\instmac.pl $(InputPath) >$(InputDir)\$(InputName).cxx 
	attrib +r $(InputDir)\$(InputName).cxx 
	
# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\arc_inst.cxx
# ADD CPP /Yu"splib.h"
# End Source File
# Begin Source File

SOURCE=.\arc_inst.m4

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\arc_inst.m4
InputName=arc_inst

"$(InputDir)\$(InputName).cxx" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	del /f $(InputDir)\$(InputName).cxx 
	perl ..\instmac.pl $(InputPath) >$(InputDir)\$(InputName).cxx 
	attrib +r $(InputDir)\$(InputName).cxx 
	
# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\arc_inst.m4
InputName=arc_inst

"$(InputDir)\$(InputName).cxx" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	del /f $(InputDir)\$(InputName).cxx 
	perl ..\instmac.pl $(InputPath) >$(InputDir)\$(InputName).cxx 
	attrib +r $(InputDir)\$(InputName).cxx 
	
# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\ArcEngine.cxx
# End Source File
# Begin Source File

SOURCE=.\ArcEngineMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\ArcEngineMessages.msg
InputName=ArcEngineMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\ArcEngineMessages.msg
InputName=ArcEngineMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\assert.cxx
# End Source File
# Begin Source File

SOURCE=.\Attribute.cxx
# End Source File
# Begin Source File

SOURCE=.\Big5CodingSystem.cxx
# End Source File
# Begin Source File

SOURCE=.\CatalogMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\CatalogMessages.msg
InputName=CatalogMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\CatalogMessages.msg
InputName=CatalogMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\CharsetDecl.cxx
# End Source File
# Begin Source File

SOURCE=.\CharsetInfo.cxx
# End Source File
# Begin Source File

SOURCE=.\CharsetRegistry.cxx
# End Source File
# Begin Source File

SOURCE=.\CmdLineApp.cxx
# End Source File
# Begin Source File

SOURCE=.\DtdDeclEventHandler.h
# End Source File
# Begin Source File

SOURCE=.\DtdDeclEventHandler.cxx
# End Source File
# Begin Source File

SOURCE=.\CmdLineAppMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\CmdLineAppMessages.msg
InputName=CmdLineAppMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\CmdLineAppMessages.msg
InputName=CmdLineAppMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\CodingSystem.cxx
# End Source File
# Begin Source File

SOURCE=.\CodingSystemKit.cxx
# End Source File
# Begin Source File

SOURCE=.\ConsoleOutput.cxx
# End Source File
# Begin Source File

SOURCE=.\ContentState.cxx
# End Source File
# Begin Source File

SOURCE=.\ContentToken.cxx
# End Source File
# Begin Source File

SOURCE=.\DescriptorManager.cxx
# End Source File
# Begin Source File

SOURCE=.\Dtd.cxx
# End Source File
# Begin Source File

SOURCE=.\ElementType.cxx
# End Source File
# Begin Source File

SOURCE=.\Entity.cxx
# End Source File
# Begin Source File

SOURCE=.\EntityApp.cxx
# End Source File
# Begin Source File

SOURCE=.\EntityAppMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\EntityAppMessages.msg
InputName=EntityAppMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\EntityAppMessages.msg
InputName=EntityAppMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\EntityCatalog.cxx
# End Source File
# Begin Source File

SOURCE=.\EntityDecl.cxx
# End Source File
# Begin Source File

SOURCE=.\EntityManager.cxx
# End Source File
# Begin Source File

SOURCE=.\EntityManagerMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\EntityManagerMessages.msg
InputName=EntityManagerMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\EntityManagerMessages.msg
InputName=EntityManagerMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\entmgr_inst.cxx
# ADD CPP /Yu"splib.h"
# End Source File
# Begin Source File

SOURCE=.\entmgr_inst.m4

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\entmgr_inst.m4
InputName=entmgr_inst

"$(InputDir)\$(InputName).cxx" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	del /f $(InputDir)\$(InputName).cxx 
	perl ..\instmac.pl $(InputPath) >$(InputDir)\$(InputName).cxx 
	attrib +r $(InputDir)\$(InputName).cxx 
	
# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\entmgr_inst.m4
InputName=entmgr_inst

"$(InputDir)\$(InputName).cxx" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	del /f $(InputDir)\$(InputName).cxx 
	perl ..\instmac.pl $(InputPath) >$(InputDir)\$(InputName).cxx 
	attrib +r $(InputDir)\$(InputName).cxx 
	
# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\ErrnoMessageArg.cxx
# End Source File
# Begin Source File

SOURCE=.\ErrorCountEventHandler.cxx
# End Source File
# Begin Source File

SOURCE=.\EUCJPCodingSystem.cxx
# End Source File
# Begin Source File

SOURCE=.\Event.cxx
# End Source File
# Begin Source File

SOURCE=.\EventGenerator.cxx
# End Source File
# Begin Source File

SOURCE=.\ExtendEntityManager.cxx
# End Source File
# Begin Source File

SOURCE=.\ExternalId.cxx
# End Source File
# Begin Source File

SOURCE=.\Fixed2CodingSystem.cxx
# End Source File
# Begin Source File

SOURCE=.\Fixed4CodingSystem.cxx
# End Source File
# Begin Source File

SOURCE=.\UTF16CodingSystem.cxx
# End Source File
# Begin Source File

SOURCE=.\GenericEventHandler.cxx
# End Source File
# Begin Source File

SOURCE=.\Group.cxx
# End Source File
# Begin Source File

SOURCE=.\Hash.cxx
# End Source File
# Begin Source File

SOURCE=.\Id.cxx
# End Source File
# Begin Source File

SOURCE=.\IdentityCodingSystem.cxx
# End Source File
# Begin Source File

SOURCE=.\IListBase.cxx
# End Source File
# Begin Source File

SOURCE=.\InputSource.cxx
# End Source File
# Begin Source File

SOURCE=.\InternalInputSource.cxx
# End Source File
# Begin Source File

SOURCE=.\Link.cxx
# End Source File
# Begin Source File

SOURCE=.\LinkProcess.cxx
# End Source File
# Begin Source File

SOURCE=.\LiteralStorage.cxx
# End Source File
# Begin Source File

SOURCE=.\Location.cxx
# End Source File
# Begin Source File

SOURCE=.\Lpd.cxx
# End Source File
# Begin Source File

SOURCE=.\Markup.cxx
# End Source File
# Begin Source File

SOURCE=.\Message.cxx
# End Source File
# Begin Source File

SOURCE=.\MessageArg.cxx
# End Source File
# Begin Source File

SOURCE=.\MessageEventHandler.cxx
# End Source File
# Begin Source File

SOURCE=.\MessageFormatter.cxx
# End Source File
# Begin Source File

SOURCE=.\MessageFormatterMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\MessageFormatterMessages.msg
InputName=MessageFormatterMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\MessageFormatterMessages.msg
InputName=MessageFormatterMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\MessageReporter.cxx
# End Source File
# Begin Source File

SOURCE=.\MessageReporterMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\MessageReporterMessages.msg
InputName=MessageReporterMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\MessageReporterMessages.msg
InputName=MessageReporterMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\MessageTable.cxx
# End Source File
# Begin Source File

SOURCE=.\ModeInfo.cxx
# End Source File
# Begin Source File

SOURCE=.\Notation.cxx
# End Source File
# Begin Source File

SOURCE=.\NotationStorage.cxx
# End Source File
# Begin Source File

SOURCE=.\NumericCharRefOrigin.cxx
# End Source File
# Begin Source File

SOURCE=.\OffsetOrderedList.cxx
# End Source File
# Begin Source File

SOURCE=.\OpenElement.cxx
# End Source File
# Begin Source File

SOURCE=.\OutputByteStream.cxx
# End Source File
# Begin Source File

SOURCE=.\OutputCharStream.cxx
# End Source File
# Begin Source File

SOURCE=.\OutputState.cxx
# End Source File
# Begin Source File

SOURCE=.\Param.cxx
# End Source File
# Begin Source File

SOURCE=.\parseAttribute.cxx
# End Source File
# Begin Source File

SOURCE=.\parseCommon.cxx
# End Source File
# Begin Source File

SOURCE=.\parseDecl.cxx
# End Source File
# Begin Source File

SOURCE=.\parseInstance.cxx
# End Source File
# Begin Source File

SOURCE=.\parseMode.cxx
# End Source File
# Begin Source File

SOURCE=.\parseParam.cxx
# End Source File
# Begin Source File

SOURCE=.\Parser.cxx
# End Source File
# Begin Source File

SOURCE=.\parser_inst.cxx
# ADD CPP /Yu"splib.h"
# End Source File
# Begin Source File

SOURCE=.\parser_inst.m4

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\parser_inst.m4
InputName=parser_inst

"$(InputDir)\$(InputName).cxx" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	del /f $(InputDir)\$(InputName).cxx 
	perl ..\instmac.pl $(InputPath) >$(InputDir)\$(InputName).cxx 
	attrib +r $(InputDir)\$(InputName).cxx 
	
# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\parser_inst.m4
InputName=parser_inst

"$(InputDir)\$(InputName).cxx" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	del /f $(InputDir)\$(InputName).cxx 
	perl ..\instmac.pl $(InputPath) >$(InputDir)\$(InputName).cxx 
	attrib +r $(InputDir)\$(InputName).cxx 
	
# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\ParserApp.cxx
# End Source File
# Begin Source File

SOURCE=.\ParserAppMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\ParserAppMessages.msg
InputName=ParserAppMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\ParserAppMessages.msg
InputName=ParserAppMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\ParserEventGeneratorKit.cxx
# End Source File
# Begin Source File

SOURCE=.\ParserMessages.cxx
# SUBTRACT CPP /YX /Yc /Yu
# End Source File
# Begin Source File

SOURCE=.\ParserMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\ParserMessages.msg
InputName=ParserMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\ParserMessages.msg
InputName=ParserMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\ParserOptions.cxx
# End Source File
# Begin Source File

SOURCE=.\ParserState.cxx
# End Source File
# Begin Source File

SOURCE=.\parseSd.cxx
# End Source File
# Begin Source File

SOURCE=.\Partition.cxx
# End Source File
# Begin Source File

SOURCE=.\PosixStorage.cxx
# End Source File
# Begin Source File

SOURCE=.\PosixStorageMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\PosixStorageMessages.msg
InputName=PosixStorageMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\PosixStorageMessages.msg
InputName=PosixStorageMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\Recognizer.cxx
# End Source File
# Begin Source File

SOURCE=.\RewindStorageObject.cxx
# End Source File
# Begin Source File

SOURCE=.\Sd.cxx
# End Source File
# Begin Source File

SOURCE=.\SdText.cxx
# End Source File
# Begin Source File

SOURCE=.\SearchResultMessageArg.cxx
# End Source File
# Begin Source File

SOURCE=.\SGMLApplication.cxx
# End Source File
# Begin Source File

SOURCE=.\SgmlParser.cxx
# End Source File
# Begin Source File

SOURCE=.\ShortReferenceMap.cxx
# End Source File
# Begin Source File

SOURCE=.\SJISCodingSystem.cxx
# End Source File
# Begin Source File

SOURCE=.\SOEntityCatalog.cxx
# End Source File
# Begin Source File

SOURCE=.\splib.cxx
# ADD CPP /Yc"splib.h"
# End Source File
# Begin Source File

SOURCE=.\StdioStorage.cxx
# End Source File
# Begin Source File

SOURCE=.\StdioStorageMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\StdioStorageMessages.msg
InputName=StdioStorageMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\StdioStorageMessages.msg
InputName=StdioStorageMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\StorageManager.cxx
# End Source File
# Begin Source File

SOURCE=.\Syntax.cxx
# End Source File
# Begin Source File

SOURCE=.\Text.cxx
# End Source File
# Begin Source File

SOURCE=.\TokenMessageArg.cxx
# End Source File
# Begin Source File

SOURCE=.\TranslateCodingSystem.cxx
# End Source File
# Begin Source File

SOURCE=.\TrieBuilder.cxx
# End Source File
# Begin Source File

SOURCE=.\TypeId.cxx
# End Source File
# Begin Source File

SOURCE=.\Undo.cxx
# End Source File
# Begin Source File

SOURCE=.\UnicodeCodingSystem.cxx
# End Source File
# Begin Source File

SOURCE=.\UnivCharsetDesc.cxx
# End Source File
# Begin Source File

SOURCE=.\URLStorage.cxx
# End Source File
# Begin Source File

SOURCE=.\URLStorageMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\URLStorageMessages.msg
InputName=URLStorageMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\URLStorageMessages.msg
InputName=URLStorageMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\UTF8CodingSystem.cxx
# End Source File
# Begin Source File

SOURCE=.\Win32CodingSystem.cxx
# End Source File
# Begin Source File

SOURCE=.\WinApp.cxx
# End Source File
# Begin Source File

SOURCE=.\WinInetStorage.cxx
# End Source File
# Begin Source File

SOURCE=.\WinInetStorageMessages.msg

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\WinInetStorageMessages.msg
InputName=WinInetStorageMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\WinInetStorageMessages.msg
InputName=WinInetStorageMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l libModule $(InputPath)

# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\xentmgr_inst.cxx
# ADD CPP /Yu"splib.h"
# End Source File
# Begin Source File

SOURCE=.\xentmgr_inst.m4

!IF  "$(CFG)" == "lib - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\xentmgr_inst.m4
InputName=xentmgr_inst

"$(InputDir)\$(InputName).cxx" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	del /f $(InputDir)\$(InputName).cxx 
	perl ..\instmac.pl $(InputPath) >$(InputDir)\$(InputName).cxx 
	attrib +r $(InputDir)\$(InputName).cxx 
	
# End Custom Build

!ELSEIF  "$(CFG)" == "lib - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\xentmgr_inst.m4
InputName=xentmgr_inst

"$(InputDir)\$(InputName).cxx" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	del /f $(InputDir)\$(InputName).cxx 
	perl ..\instmac.pl $(InputPath) >$(InputDir)\$(InputName).cxx 
	attrib +r $(InputDir)\$(InputName).cxx 
	
# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\XMLCodingSystem.cxx
# End Source File
# End Group
# Begin Group "Header Files"

# PROP Default_Filter "h;hpp;hxx;hm;inl;fi;fd"
# Begin Source File

SOURCE=..\include\Allocator.h
# End Source File
# Begin Source File

SOURCE=..\include\ArcEngine.h
# End Source File
# Begin Source File

SOURCE=.\ArcEngineMessages.h
# End Source File
# Begin Source File

SOURCE=.\ArcProcessor.h
# End Source File
# Begin Source File

SOURCE=..\include\Attribute.h
# End Source File
# Begin Source File

SOURCE=..\include\Attributed.h
# End Source File
# Begin Source File

SOURCE=.\big5.h
# End Source File
# Begin Source File

SOURCE=..\include\Big5CodingSystem.h
# End Source File
# Begin Source File

SOURCE=..\include\Boolean.h
# End Source File
# Begin Source File

SOURCE=.\CatalogEntry.h
# End Source File
# Begin Source File

SOURCE=.\CatalogMessages.h
# End Source File
# Begin Source File

SOURCE=..\include\CharMap.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\CharMap.h
# End Source File
# Begin Source File

SOURCE=..\include\CharsetDecl.h
# End Source File
# Begin Source File

SOURCE=..\include\CharsetInfo.h
# End Source File
# Begin Source File

SOURCE=..\include\CharsetRegistry.h
# End Source File
# Begin Source File

SOURCE=..\include\CmdLineApp.h
# End Source File
# Begin Source File

SOURCE=.\CmdLineAppMessages.h
# End Source File
# Begin Source File

SOURCE=..\include\CodingSystem.h
# End Source File
# Begin Source File

SOURCE=..\include\CodingSystemKit.h
# End Source File
# Begin Source File

SOURCE=..\include\config.h
# End Source File
# Begin Source File

SOURCE=..\include\ConsoleOutput.h
# End Source File
# Begin Source File

SOURCE=..\include\constant.h
# End Source File
# Begin Source File

SOURCE=..\include\ContentState.h
# End Source File
# Begin Source File

SOURCE=..\include\ContentToken.h
# End Source File
# Begin Source File

SOURCE=..\include\CopyOwner.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\CopyOwner.h
# End Source File
# Begin Source File

SOURCE=..\include\DescriptorManager.h
# End Source File
# Begin Source File

SOURCE=..\include\Dtd.h
# End Source File
# Begin Source File

SOURCE=..\include\ElementType.h
# End Source File
# Begin Source File

SOURCE=..\include\Entity.h
# End Source File
# Begin Source File

SOURCE=..\include\EntityApp.h
# End Source File
# Begin Source File

SOURCE=..\include\EntityCatalog.h
# End Source File
# Begin Source File

SOURCE=..\include\EntityDecl.h
# End Source File
# Begin Source File

SOURCE=..\include\EntityManager.h
# End Source File
# Begin Source File

SOURCE=.\EntityManagerMessages.h
# End Source File
# Begin Source File

SOURCE=.\EquivClass.h
# End Source File
# Begin Source File

SOURCE=..\include\ErrnoMessageArg.h
# End Source File
# Begin Source File

SOURCE=..\include\ErrorCountEventHandler.h
# End Source File
# Begin Source File

SOURCE=..\include\EUCJPCodingSystem.h
# End Source File
# Begin Source File

SOURCE=..\include\Event.h
# End Source File
# Begin Source File

SOURCE=..\generic\EventGenerator.h
# End Source File
# Begin Source File

SOURCE=.\EventQueue.h
# End Source File
# Begin Source File

SOURCE=.\events.h
# End Source File
# Begin Source File

SOURCE=..\include\EventsWanted.h
# End Source File
# Begin Source File

SOURCE=..\include\ExtendEntityManager.h
# End Source File
# Begin Source File

SOURCE=..\include\ExternalId.h
# End Source File
# Begin Source File

SOURCE=..\include\Fixed2CodingSystem.h
# End Source File
# Begin Source File

SOURCE=..\include\Fixed4CodingSystem.h
# End Source File
# Begin Source File

SOURCE=..\include\UTF16CodingSystem.h
# End Source File
# Begin Source File

SOURCE=.\gb2312.h
# End Source File
# Begin Source File

SOURCE=..\include\GenericEventHandler.h
# End Source File
# Begin Source File

SOURCE=.\Group.h
# End Source File
# Begin Source File

SOURCE=..\include\Hash.h
# End Source File
# Begin Source File

SOURCE=..\include\HashTable.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\HashTable.h
# End Source File
# Begin Source File

SOURCE=..\include\HashTableItemBase.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\HashTableItemBase.h
# End Source File
# Begin Source File

SOURCE=.\Id.h
# End Source File
# Begin Source File

SOURCE=..\include\IdentityCodingSystem.h
# End Source File
# Begin Source File

SOURCE=..\include\IList.h
# End Source File
# Begin Source File

SOURCE=..\include\IListBase.h
# End Source File
# Begin Source File

SOURCE=..\include\IListIter.h
# End Source File
# Begin Source File

SOURCE=..\include\IListIterBase.h
# End Source File
# Begin Source File

SOURCE=..\include\InputSource.h
# End Source File
# Begin Source File

SOURCE=..\include\InternalInputSource.h
# End Source File
# Begin Source File

SOURCE=..\include\IQueue.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\IQueue.h
# End Source File
# Begin Source File

SOURCE=..\include\ISet.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\ISet.h
# End Source File
# Begin Source File

SOURCE=..\include\ISetIter.h
# End Source File
# Begin Source File

SOURCE=".\iso646-jis.h"
# End Source File
# Begin Source File

SOURCE=".\iso8859-2.h"
# End Source File
# Begin Source File

SOURCE=".\iso8859-3.h"
# End Source File
# Begin Source File

SOURCE=".\iso8859-4.h"
# End Source File
# Begin Source File

SOURCE=".\iso8859-5.h"
# End Source File
# Begin Source File

SOURCE=".\iso8859-6.h"
# End Source File
# Begin Source File

SOURCE=".\iso8859-7.h"
# End Source File
# Begin Source File

SOURCE=".\iso8859-8.h"
# End Source File
# Begin Source File

SOURCE=".\iso8859-9.h"
# End Source File
# Begin Source File

SOURCE=.\jis0201.h
# End Source File
# Begin Source File

SOURCE=.\jis0208.h
# End Source File
# Begin Source File

SOURCE=.\jis0212.h
# End Source File
# Begin Source File

SOURCE=.\ksc5601.h
# End Source File
# Begin Source File

SOURCE=.\koi8-r.h
# End Source File
# Begin Source File

SOURCE=..\include\Link.h
# End Source File
# Begin Source File

SOURCE=..\include\LinkProcess.h
# End Source File
# Begin Source File

SOURCE=..\include\List.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\List.h
# End Source File
# Begin Source File

SOURCE=..\include\ListIter.h
# End Source File
# Begin Source File

SOURCE=..\include\LiteralStorage.h
# End Source File
# Begin Source File

SOURCE=..\include\Location.h
# End Source File
# Begin Source File

SOURCE=..\include\Lpd.h
# End Source File
# Begin Source File

SOURCE=.\LpdEntityRef.h
# End Source File
# Begin Source File

SOURCE=..\include\macros.h
# End Source File
# Begin Source File

SOURCE=..\include\Markup.h
# End Source File
# Begin Source File

SOURCE=.\MarkupScan.h
# End Source File
# Begin Source File

SOURCE=..\include\Message.h
# End Source File
# Begin Source File

SOURCE=..\include\MessageArg.h
# End Source File
# Begin Source File

SOURCE=..\include\MessageBuilder.h
# End Source File
# Begin Source File

SOURCE=..\include\MessageEventHandler.h
# End Source File
# Begin Source File

SOURCE=..\include\MessageFormatter.h
# End Source File
# Begin Source File

SOURCE=.\MessageFormatterMessages.h
# End Source File
# Begin Source File

SOURCE=..\include\MessageReporter.h
# End Source File
# Begin Source File

SOURCE=.\MessageReporterMessages.h
# End Source File
# Begin Source File

SOURCE=..\include\MessageTable.h
# End Source File
# Begin Source File

SOURCE=..\include\Mode.h
# End Source File
# Begin Source File

SOURCE=.\ModeInfo.h
# End Source File
# Begin Source File

SOURCE=.\Mutex.h
# End Source File
# Begin Source File

SOURCE=..\include\Named.h
# End Source File
# Begin Source File

SOURCE=..\include\NamedResource.h
# End Source File
# Begin Source File

SOURCE=..\include\NamedResourceTable.h
# End Source File
# Begin Source File

SOURCE=..\include\NamedTable.h
# End Source File
# Begin Source File

SOURCE=.\NameToken.h
# End Source File
# Begin Source File

SOURCE=..\include\NCVector.h
# End Source File
# Begin Source File

SOURCE=..\include\Notation.h
# End Source File
# Begin Source File

SOURCE=..\include\NotationStorage.h
# End Source File
# Begin Source File

SOURCE=.\NumericCharRefOrigin.h
# End Source File
# Begin Source File

SOURCE=.\OffsetOrderedList.h
# End Source File
# Begin Source File

SOURCE=..\include\OpenElement.h
# End Source File
# Begin Source File

SOURCE=..\include\Options.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\Options.h
# End Source File
# Begin Source File

SOURCE=..\include\OutputByteStream.h
# End Source File
# Begin Source File

SOURCE=..\include\OutputCharStream.h
# End Source File
# Begin Source File

SOURCE=.\OutputState.h
# End Source File
# Begin Source File

SOURCE=..\include\Owner.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\Owner.h
# End Source File
# Begin Source File

SOURCE=..\include\OwnerTable.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\OwnerTable.h
# End Source File
# Begin Source File

SOURCE=.\Param.h
# End Source File
# Begin Source File

SOURCE=.\Parser.h
# End Source File
# Begin Source File

SOURCE=..\include\ParserApp.h
# End Source File
# Begin Source File

SOURCE=.\ParserAppMessages.h
# End Source File
# Begin Source File

SOURCE=..\generic\ParserEventGeneratorKit.h
# End Source File
# Begin Source File

SOURCE=.\ParserMessages.h
# End Source File
# Begin Source File

SOURCE=..\include\ParserOptions.h
# End Source File
# Begin Source File

SOURCE=.\ParserState.h
# End Source File
# Begin Source File

SOURCE=.\Partition.h
# End Source File
# Begin Source File

SOURCE=..\include\PointerTable.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\PointerTable.h
# End Source File
# Begin Source File

SOURCE=..\include\PosixStorage.h
# End Source File
# Begin Source File

SOURCE=.\PosixStorageMessages.h
# End Source File
# Begin Source File

SOURCE=.\Priority.h
# End Source File
# Begin Source File

SOURCE=..\include\Ptr.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\Ptr.h
# End Source File
# Begin Source File

SOURCE=..\include\RangeMap.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\RangeMap.h
# End Source File
# Begin Source File

SOURCE=.\Recognizer.h
# End Source File
# Begin Source File

SOURCE=..\include\Resource.h
# End Source File
# Begin Source File

SOURCE=..\include\RewindStorageObject.h
# End Source File
# Begin Source File

SOURCE=..\include\rtti.h
# End Source File
# Begin Source File

SOURCE=..\include\Sd.h
# End Source File
# Begin Source File

SOURCE=.\SdFormalError.h
# End Source File
# Begin Source File

SOURCE=..\include\SdText.h
# End Source File
# Begin Source File

SOURCE=..\include\SearchResultMessageArg.h
# End Source File
# Begin Source File

SOURCE=..\generic\SGMLApplication.h
# End Source File
# Begin Source File

SOURCE=..\include\SgmlParser.h
# End Source File
# Begin Source File

SOURCE=..\include\ShortReferenceMap.h
# End Source File
# Begin Source File

SOURCE=..\include\SJISCodingSystem.h
# End Source File
# Begin Source File

SOURCE=..\include\SOEntityCatalog.h
# End Source File
# Begin Source File

SOURCE=.\splib.h
# End Source File
# Begin Source File

SOURCE=.\splibpch.h
# End Source File
# Begin Source File

SOURCE=..\include\sptchar.h
# End Source File
# Begin Source File

SOURCE=.\SrInfo.h
# End Source File
# Begin Source File

SOURCE="..\..\..\Program Files\Microsoft Visual Studio\VC98\Include\SYS\STAT.H"
# End Source File
# Begin Source File

SOURCE=..\include\StdioStorage.h
# End Source File
# Begin Source File

SOURCE=.\StdioStorageMessages.h
# End Source File
# Begin Source File

SOURCE=..\include\StorageManager.h
# End Source File
# Begin Source File

SOURCE=.\StorageObjectPosition.h
# End Source File
# Begin Source File

SOURCE=..\include\StringC.h
# End Source File
# Begin Source File

SOURCE=..\include\StringOf.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\StringOf.h
# End Source File
# Begin Source File

SOURCE=..\include\StringResource.h
# End Source File
# Begin Source File

SOURCE=.\SubstTable.cxx
# End Source File
# Begin Source File

SOURCE=..\include\SubstTable.h
# End Source File
# Begin Source File

SOURCE=..\include\Syntax.h
# End Source File
# Begin Source File

SOURCE=..\include\Text.h
# End Source File
# Begin Source File

SOURCE=.\token.h
# End Source File
# Begin Source File

SOURCE=.\TokenMessageArg.h
# End Source File
# Begin Source File

SOURCE=..\include\TranslateCodingSystem.h
# End Source File
# Begin Source File

SOURCE=.\Trie.h
# End Source File
# Begin Source File

SOURCE=.\TrieBuilder.h
# End Source File
# Begin Source File

SOURCE=..\include\TypeId.h
# End Source File
# Begin Source File

SOURCE="..\..\..\Program Files\Microsoft Visual Studio\VC98\Include\SYS\TYPES.H"
# End Source File
# Begin Source File

SOURCE=.\Undo.h
# End Source File
# Begin Source File

SOURCE=..\include\UnicodeCodingSystem.h
# End Source File
# Begin Source File

SOURCE=..\include\UnivCharsetDesc.h
# End Source File
# Begin Source File

SOURCE=..\include\URLStorage.h
# End Source File
# Begin Source File

SOURCE=.\URLStorageMessages.h
# End Source File
# Begin Source File

SOURCE=..\include\UTF8CodingSystem.h
# End Source File
# Begin Source File

SOURCE=..\include\Vector.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\Vector.h
# End Source File
# Begin Source File

SOURCE=..\include\Win32CodingSystem.h
# End Source File
# Begin Source File

SOURCE=..\include\WinApp.h
# End Source File
# Begin Source File

SOURCE=..\include\WinInetStorage.h
# End Source File
# Begin Source File

SOURCE=.\WinInetStorageMessages.h
# End Source File
# Begin Source File

SOURCE=..\include\XcharMap.cxx
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=..\include\XcharMap.h
# End Source File
# Begin Source File

SOURCE=..\include\XMLCodingSystem.h
# End Source File
# Begin Source File

SOURCE=..\include\xnew.h
# End Source File
# End Group
# Begin Group "Resource Files"

# PROP Default_Filter "ico;cur;bmp;dlg;rc2;rct;bin;cnt;rtf;gif;jpg;jpeg;jpe"
# Begin Source File

SOURCE=.\ArcEngineMessages.rc
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=.\CatalogMessages.rc
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=.\CmdLineAppMessages.rc
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=.\EntityAppMessages.rc
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=.\EntityManagerMessages.rc
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=.\lib.rc
# ADD BASE RSC /l 0x809 /i "lib"
# ADD RSC /l 0x809 /i "." /i "lib"
# End Source File
# Begin Source File

SOURCE=.\MessageFormatterMessages.rc
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=.\MessageReporterMessages.rc
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=.\ParserAppMessages.rc
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=.\ParserMessages.rc
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=.\PosixStorageMessages.rc
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=.\StdioStorageMessages.rc
# PROP Exclude_From_Build 1
# End Source File
# Begin Source File

SOURCE=.\URLStorageMessages.rc
# PROP Exclude_From_Build 1
# End Source File
# End Group
# End Target
# End Project
