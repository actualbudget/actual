// Copyright (c) 1994, 1995, 1996 James Clark
// See the file COPYING for copying permission.

#ifndef config_INCLUDED
#define config_INCLUDED 1

#define SP_INCLUDE_UNISTD_H
#define SP_POSIX_FILENAMES

#ifdef __GNUG__
// Ideally, this should be set in configure.in, I think
// It's not missing, but it pulls in libg++
#define SP_NEW_H_MISSING
// set_new_handler() has to be declared extern "C"
#define SP_SET_NEW_HANDLER_EXTERN_C
#if __GNUC__ > 2 || (__GNUC__ == 2 && __GNUC_MINOR__ >= 7)
#define SP_ANSI_FOR_SCOPE
#endif
#if __GNUC__ > 2 || (__GNUC__ == 2 && __GNUC_MINOR__ >= 8)
#define SP_ANSI_LIB
#define SP_NO_STD_NAMESPACE
#undef SP_NEW_H_MISSING
#endif
#if __GNUC__ > 2 || (__GNUC__ == 2 && __GNUC_MINOR__ >= 9)
#undef SP_NO_STD_NAMESPACE
#endif
#endif /* __GNUG__ */

#if defined(sun) || defined(__sun)
// struct stat has st_blksize member
#define SP_STAT_BLKSIZE
#endif

#if (defined __MACH__) && (! defined __GNU__)
#define SP_MUTEX_MACH
#endif

#ifdef __EMX__
// EMX 0.9a for OS/2
#undef SP_POSIX_FILENAMES
#define SP_MSDOS_FILENAMES
#endif

#ifdef _MSC_VER
// Microsoft Visual C++ 4.0
#undef SP_INCLUDE_UNISTD_H
#define SP_INCLUDE_IO_H
#ifndef SP_ANSI_CLASS_INST
#define SP_ANSI_CLASS_INST
#endif
#undef SP_POSIX_FILENAMES
#define SP_MSDOS_FILENAMES
#define SP_SHORT_HEADERS
#pragma warning ( disable : 4660 ) // already instantiated
#pragma warning ( disable : 4661 ) // missing def for decl member
#pragma warning ( disable : 4786 ) // debug symbol truncated (>255 chars)
#pragma warning ( disable : 4018 ) // signed/unsigned mismatch
#pragma warning ( disable : 4251 ) // __declspec(dllexport)
#pragma warning ( disable : 4275 )
#pragma warning ( disable : 4237 ) // future reserved keyword
#define huge verybig
#if _MSC_VER == 900
#define SP_DECLARE_PLACEMENT_OPERATOR_NEW
#endif
#define set_new_handler _set_new_handler
// Function passed to set_new_handler() returns int and takes size_t argument.
#define SP_FANCY_NEW_HANDLER

#if _MSC_VER >= 1100
// Visual C++ 5.0
#define SP_HAVE_BOOL
#define SP_SIZEOF_BOOL_1
#pragma warning ( disable : 4800 ) // forcing value to bool 'true' or
                                   // 'false' (performance warning)
#endif

#if _MSC_VER >= 1200
// Visual C++ 6.0
#define SP_HAVE_PLACEMENT_OPERATOR_DELETE
#define SP_HAVE_TYPENAME
#endif

#define SP_HAVE_SETMODE
#define SP_DLLEXPORT __declspec(dllexport)
#define SP_DLLIMPORT __declspec(dllimport)

#if defined(_DLL) || defined(_USRDLL) || defined(_MT)
#define SP_USE_DLL
#endif

#ifdef SP_USE_DLL
#ifndef BUILD_LIBSP
// It's not possible to export templates using __declspec(dllexport),
// so instead we include the template definitions in the headers,
// which allows Visual C++ to instantiate any needed templates
// in the client.
#define SP_DEFINE_TEMPLATES
#endif
#endif /* SP_USE_DLL */

#ifndef SP_MANUAL_INST
#ifndef SP_DEFINE_TEMPLATES
#define SP_MANUAL_INST
#endif
#endif /* not SP_MANUAL_INST */

// SP_WIDE_SYSTEM builds will not compile due to missing overloads
// OutputCharStream &operator<<(wchar_t) and
// OutputCharStream &operator<<(unsigned short*)
// which are required by onsgmls; osx has probably similar issues.
// Once these issues are addressed, the following lines should be
// re-activated.

// #ifdef SP_MULTI_BYTE
// #define SP_WIDE_SYSTEM
// #endif

// wchar_t's base type is an unsigned short
#define SP_WCHAR_T_USHORT

// Enable precompiled header support.
#define SP_PCH
// Don't compile in message text.
#define SP_NO_MESSAGE_TEXT
#ifdef _MT
// Use Win32 critical section facilities
#define SP_MUTEX_WIN32
// Use the new Standard C++ library
#define SP_ANSI_LIB
#if _MSC_VER < 1100
// Versions prior to 5.0 don't use the std namespace
#define SP_NO_STD_NAMESPACE
#endif
#endif /* _MT */
#endif /* _MSC_VER */

#ifdef __WATCOMC__
// Watcom C++ 10.0a
#define SP_MANUAL_INST
#undef SP_POSIX_FILENAMES
#define SP_MSDOS_FILENAMES
#undef SP_INCLUDE_UNISTD_H
#define SP_INCLUDE_IO_H
#pragma warning 004 9
#undef huge
// Cannot handle T::~T in template.
#define SP_QUAL_TEMPLATE_DTOR_BROKEN
#define SP_HAVE_SETMODE
#define _setmode setmode
#if __WATCOMC__ < 1050
#define _O_BINARY O_BINARY
#endif
#define SP_WCHAR_T_USHORT
#if __WATCOMC__ >= 1100
#define SP_HAVE_BOOL
// #define SP_SIZEOF_BOOL_1
#endif
#endif /* __WATCOMC__ */

#ifdef __BORLANDC__
// Borland C++ 5.0
#define SP_ANSI_FOR_SCOPE
#define SP_HAVE_RTTI
#define SP_HAVE_SETMODE
#undef SP_INCLUDE_UNISTD_H
#define SP_INCLUDE_IO_H
#undef SP_POSIX_FILENAMES
#define SP_MSDOS_FILENAMES
#define SP_HAVE_BOOL
#define SP_SHORT_HEADERS
#define _O_BINARY O_BINARY
#define _setmode setmode
#define SP_ANSI_CLASS_INST
#define SP_MANUAL_INST
// Building as a DLL doesn't work with Borland C++ yet.
#define SP_DLLEXPORT __declspec(dllexport)
#define SP_DLLIMPORT __declspec(dllimport)
#ifdef SP_USE_DLL
#ifndef BUILD_LIBSP
#define SP_DEFINE_TEMPLATES
#endif
#endif /* SP_USE_DLL */
#define SP_WCHAR_T_USHORT
#endif /* __BORLANDC__ */

#ifdef __IBMCPP__
// IBM CSet++ 2.1 from Horst Szillat <szillat@berlin.snafu.de>.
#undef SP_POSIX_FILENAMES
#define SP_MANUAL_INST
#define SP_SHORT_HEADERS
#define SP_MSDOS_FILENAMES
#undef SP_INCLUDE_UNISTD_H
#define SP_INCLUDE_IO_H
#define S_IFMT (S_IFDIR|S_IFCHR|S_IFREG)
#endif

#ifdef __xlC__
// IBM CSet++ 3.1 on AIX 4.1.
// Use CXX=xlC and CC=xlC in the Makefile.
// Note that -g creates massive executables and that -O
// takes ages to compile and creates core dumping executables!
// I havn't tried the socket stuff.
// <Chris_Paulson-Ellis@3mail.3com.com>
#define SP_MANUAL_INST
#define SP_HAVE_LOCALE
#define SP_STAT_BLKSIZE
#endif /* __xlC__ */

#ifdef macintosh
// Apple MacOS. Tested only with Metrowerks CW10.
// From Ashley Colin Yakeley <AshleyB@halcyon.com>
#undef SP_POSIX_FILENAMES
#define SP_MAC_FILENAMES
#define SP_LINE_TERM1 '\r'

#ifdef __MWERKS__
// Metrowerks for some platform (MacOS in this case)

#pragma mpwc_newline off
#define SP_DEFINE_TEMPLATES
// #define SP_USE_DLL -- __declspec doesn't work with classes (yet)
#ifdef SP_USE_DLL
#define SP_DLLEXPORT __declspec(export)
#define SP_DLLIMPORT __declspec(import)
#endif // SP_USE_DLL

#if __MWERKS__ >= 0x1000
// bool option only defined for CW10 and later (note __MWERKS__ is BCD)
#if __option(bool)
#define SP_HAVE_BOOL
#endif // __option(bool)
#endif // __MWERKS__ >= 0x1000
#endif // __MWERKS__

#if ('\n' != 10) || ('\r' != 13)
#error "newlines incorrect"
#endif

#endif /* macintosh */

#ifdef SP_HAVE_SETMODE
#ifndef SP_LINE_TERM1
#define SP_LINE_TERM1 '\r'
#define SP_LINE_TERM2 '\n'
#endif
#endif /* not SP_HAVE_SETMODE */

#ifndef SP_LINE_TERM1
#define SP_LINE_TERM1 '\n'
#endif

#ifndef SP_ANSI_FOR_SCOPE
// This simulates the new ANSI "for" scope rules
#define for if (0); else for
#endif

#ifndef SP_HAVE_TYPENAME
#define typename /* as nothing */
#endif

#ifndef SP_DLLEXPORT
#define SP_DLLEXPORT /* as nothing */
#endif

#ifndef SP_DLLIMPORT
#define SP_DLLIMPORT /* as nothing */
#endif

#ifdef SP_USE_DLL

#ifdef BUILD_LIBSP
#define SP_API SP_DLLEXPORT
#else
#define SP_API SP_DLLIMPORT
#endif

#else /* not SP_USE_DLL */

#define SP_API /* as nothing */

#endif /* not SP_USE_DLL */

// SP_WIDE_SYSTEM says that your OS provides wide character interfaces
// SP_WIDE_SYSTEM currently works only with Visual C++ and Windows NT/95
// SP_WIDE_SYSTEM implies SP_MULTI_BYTE
#ifdef SP_WIDE_SYSTEM
#ifndef SP_MULTI_BYTE
#define SP_MULTI_BYTE
#endif
#endif

#ifdef SP_NAMESPACE
#define SP_NAMESPACE_SCOPE SP_NAMESPACE::
#else
#define SP_NAMESPACE_SCOPE
#endif

#ifdef SP_MSDOS_FILENAMES
#define PATH_SEPARATOR ';'
#else
#define PATH_SEPARATOR ':'
#endif


/* new stuff */

#ifndef HAVE_MUTABLE
#define mutable
#endif

// NOTE: This is processed as a Makefile, not as a header by autoconf.
#define SP_PACKAGE "@PACKAGE@"
#define SP_VERSION "@VERSION@"

#endif /* not config_INCLUDED */
