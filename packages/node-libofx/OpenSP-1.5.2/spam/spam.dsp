# Microsoft Developer Studio Project File - Name="spam" - Package Owner=<4>
# Microsoft Developer Studio Generated Build File, Format Version 6.00
# ** DO NOT EDIT **

# TARGTYPE "Win32 (x86) Console Application" 0x0103

CFG=spam - Win32 Release
!MESSAGE This is not a valid makefile. To build this project using NMAKE,
!MESSAGE use the Export Makefile command and run
!MESSAGE 
!MESSAGE NMAKE /f "spam.mak".
!MESSAGE 
!MESSAGE You can specify a configuration when running NMAKE
!MESSAGE by defining the macro CFG on the command line. For example:
!MESSAGE 
!MESSAGE NMAKE /f "spam.mak" CFG="spam - Win32 Release"
!MESSAGE 
!MESSAGE Possible choices for configuration are:
!MESSAGE 
!MESSAGE "spam - Win32 Release" (based on "Win32 (x86) Console Application")
!MESSAGE "spam - Win32 Debug" (based on "Win32 (x86) Console Application")
!MESSAGE 

# Begin Project
# PROP AllowPerConfigDependencies 0
# PROP Scc_ProjName ""
# PROP Scc_LocalPath ""
CPP=cl.exe
RSC=rc.exe

!IF  "$(CFG)" == "spam - Win32 Release"

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
# ADD BASE CPP /nologo /W3 /GX /O2 /D "WIN32" /D "NDEBUG" /D "_CONSOLE" /YX /c
# ADD CPP /nologo /MD /W3 /GX /O2 /I "..\include" /D "NDEBUG" /D "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=OpenSP /D "SP_MULTI_BYTE" /YX /FD /c
# ADD BASE RSC /l 0x809 /d "NDEBUG"
# ADD RSC /l 0x809 /d "NDEBUG"
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /machine:I386
# ADD LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /machine:I386 /out:"..\bin\ospam.exe"
# SUBTRACT LINK32 /profile

!ELSEIF  "$(CFG)" == "spam - Win32 Debug"

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
# ADD BASE CPP /nologo /W3 /Gm /GX /Zi /Od /D "WIN32" /D "_DEBUG" /D "_CONSOLE" /YX /c
# ADD CPP /nologo /MDd /W3 /Gm /GX /ZI /Od /I "..\include" /D "_DEBUG" /D "_CONSOLE" /D "WIN32" /D SP_NAMESPACE=OpenSP /D "SP_MULTI_BYTE" /YX /FD /c
# ADD BASE RSC /l 0x809 /d "_DEBUG"
# ADD RSC /l 0x809 /d "_DEBUG"
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /debug /machine:I386
# ADD LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib /nologo /subsystem:console /debug /machine:I386 /out:"..\dbgbin\ospam.exe"

!ENDIF 

# Begin Target

# Name "spam - Win32 Release"
# Name "spam - Win32 Debug"
# Begin Group "Source Files"

# PROP Default_Filter "cpp;c;cxx;rc;def;r;odl;idl;hpj;bat;for;f90"
# Begin Source File

SOURCE=.\CopyEventHandler.cxx
# End Source File
# Begin Source File

SOURCE=.\MarkupEventHandler.cxx
# End Source File
# Begin Source File

SOURCE=.\spam.cxx
# End Source File
# Begin Source File

SOURCE=.\spam_inst.cxx
# End Source File
# Begin Source File

SOURCE=.\spam_inst.m4

!IF  "$(CFG)" == "spam - Win32 Release"

# PROP Exclude_From_Build 1

!ELSEIF  "$(CFG)" == "spam - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\spam_inst.m4
InputName=spam_inst

"$(InputDir)\$(InputName).cxx" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	del /f $(InputDir)\$(InputName).cxx 
	perl ..\instmac.pl $(InputPath) >$(InputDir)\$(InputName).cxx 
	attrib +r $(InputDir)\$(InputName).cxx 
	
# End Custom Build

!ENDIF 

# End Source File
# Begin Source File

SOURCE=.\SpamMessages.msg

!IF  "$(CFG)" == "spam - Win32 Release"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\SpamMessages.msg
InputName=SpamMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l appModule $(InputPath)

# End Custom Build

!ELSEIF  "$(CFG)" == "spam - Win32 Debug"

# Begin Custom Build - Processing $(InputPath)
InputDir=.
InputPath=.\SpamMessages.msg
InputName=SpamMessages

"$(InputDir)\$(InputName).h" : $(SOURCE) "$(INTDIR)" "$(OUTDIR)"
	perl -w ..\msggen.pl -l appModule $(InputPath)

# End Custom Build

!ENDIF 

# End Source File
# End Group
# Begin Group "Header Files"

# PROP Default_Filter "h;hpp;hxx;hm;inl;fi;fd"
# Begin Source File

SOURCE=.\CopyEventHandler.h
# End Source File
# Begin Source File

SOURCE=.\MarkupEventHandler.h
# End Source File
# Begin Source File

SOURCE=.\SpamMessages.h
# End Source File
# End Group
# Begin Group "Resource Files"

# PROP Default_Filter "ico;cur;bmp;dlg;rc2;rct;bin;cnt;rtf;gif;jpg;jpeg;jpe"
# Begin Source File

SOURCE=.\spam.rc
# End Source File
# Begin Source File

SOURCE=.\SpamMessages.rc
# PROP BASE Exclude_From_Build 1
# PROP Exclude_From_Build 1
# End Source File
# End Group
# End Target
# End Project
