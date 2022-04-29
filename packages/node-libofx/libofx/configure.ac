## -*-m4-*-

dnl Process this file with autoconf to produce a configure script.

# FILE:
# configure.in
#
# FUNCTION:
# implements checks for a variety of system-specific functions

AC_INIT(inc/libofx.h.in)
AM_CONFIG_HEADER(config.h)
AC_CONFIG_AUX_DIR(config)
AC_CONFIG_MACRO_DIR(m4)
AC_PROG_CC
AC_PROG_CXX

m4_include([libcurl.m4])

LIBOFX_MAJOR_VERSION=0
LIBOFX_MINOR_VERSION=9
LIBOFX_MICRO_VERSION=13
# this number is just incremented for every major change in CVS, also across
# releases to emulate the Revision variable of SVN (which isn't available
# with CVS)
LIBOFX_BUILD_VERSION=0
LIBOFX_TAG_VERSION="stable"

case "$LIBOFX_TAG_VERSION" in
  cvs|svn|git)
     LIBOFX_VERSION_RELEASE_STRING="$LIBOFX_MAJOR_VERSION.$LIBOFX_MINOR_VERSION.$LIBOFX_MICRO_VERSION.$LIBOFX_TAG_VERSION${LIBOFX_BUILD_VERSION}"
     ;;
  stable)
     LIBOFX_VERSION_RELEASE_STRING="$LIBOFX_MAJOR_VERSION.$LIBOFX_MINOR_VERSION.$LIBOFX_MICRO_VERSION"
     ;;
  *)
     LIBOFX_VERSION_RELEASE_STRING="$LIBOFX_MAJOR_VERSION.$LIBOFX_MINOR_VERSION.$LIBOFX_MICRO_VERSION"
     
     # add TAG
     LIBOFX_VERSION_RELEASE_STRING="${LIBOFX_VERSION_RELEASE_STRING}${GWENHYWFAR_VERSION_TAG}"
     ;;
esac

### Check for GCC symbol visibility extensions
AC_CACHE_CHECK([for symbol visibility extensions],
	ac_cv_sym_visibility, [
		echo '#pragma GCC visibility push(default)' > conftest.c
		echo 'int foo (void) { return 1; }' >> conftest.c
		echo '#pragma GCC visibility pop' >> conftest.c
		echo 'int bar (void) { return 1; }' >> conftest.c
		ac_cv_sym_visibility=no
		if AC_TRY_COMMAND(${CXX-cxx} -fvisibility-inlines-hidden -fvisibility=hidden -Werror -S conftest.c -o conftest.s 1>&AS_MESSAGE_LOG_FD);
		then
			if grep '\.hidden.*bar' conftest.s > /dev/null && grep -v '\.hidden.*foo' conftest.s >/dev/null;
			then
				ac_cv_sym_visibility=yes
			fi
		fi
		rm -f conftest.*
	])
if test $ac_cv_sym_visibility = yes;
then
	AC_DEFINE(HAVE_GCC_VISIBILITY_EXTS, 1,
			  [Define if GCC visibility extensions are supported])
	VISIBILITY_FLAGS="-fvisibility=hidden"
	CFLAGS="$VISIBILITY_FLAGS $CFLAGS"
	CXXFLAGS="$VISIBILITY_FLAGS -fvisibility-inlines-hidden $CFLAGS"
fi

## Pass -DIN_LIBOFX to the compiler so we can detect it and include config.h
## in libofx.h safely
CFLAGS="-DIN_LIBOFX $CFLAGS"
CXXFLAGS="-DIN_LIBOFX $CXXFLAGS"

LIBOFX_VERSION=$LIBOFX_MAJOR_VERSION.$LIBOFX_MINOR_VERSION.$LIBOFX_MICRO_VERSION

AC_SUBST(LIBOFX_MAJOR_VERSION)
AC_SUBST(LIBOFX_MINOR_VERSION)
AC_SUBST(LIBOFX_MICRO_VERSION)
AC_SUBST(LIBOFX_BUILD_VERSION)
AC_SUBST(LIBOFX_VERSION_RELEASE_STRING)
AC_SUBST(LIBOFX_VERSION)
AM_INIT_AUTOMAKE(libofx,$LIBOFX_VERSION_RELEASE_STRING)

LIBOFX_SO_CURRENT=7
LIBOFX_SO_REVISION=2
LIBOFX_SO_AGE=0
LIBOFX_SO_EFFECTIVE="`echo \$(($LIBOFX_SO_CURRENT-$LIBOFX_SO_AGE))`"
AC_SUBST(LIBOFX_SO_CURRENT)
AC_SUBST(LIBOFX_SO_REVISION)
AC_SUBST(LIBOFX_SO_AGE)

#AM_MAINTAINER_MODE

AC_PROG_INSTALL

AC_PROG_LIBTOOL
AC_LIBTOOL_DLOPEN
AC_LIBTOOL_WIN32_DLL
AC_LIBTOOL_RC

AC_ISC_POSIX
AC_C_BIGENDIAN
AC_PROG_MAKE_SET
AC_HEADER_STDC

AC_ARG_WITH(opensp-includes, 
[  --with-opensp-includes=PATH     specify where to look for OpenSP includes  
                                  - default is /usr/include/OpenSP)],
			OPENSPINCLUDES="$with_opensp_includes",
			OPENSPINCLUDES="" )

AC_ARG_WITH(opensp-libs, 
[  --with-opensp-libs=PATH         specify where to look for libosp 
                                  - default is /usr/lib],
			OPENSPLIBPATH="$with_opensp_libs",
			OPENSPLIBPATH="/usr/lib")
			
			echo $OPENSPLIBPATH
for d in /usr/include/OpenSP /usr/local/include/OpenSP /usr/include/sp/generic /usr/local/include/sp/generic; do
    if test "x$OPENSPINCLUDES" = x; then
	save_CPPFLAGS="$CPPFLAGS"
	CPPFLAGS="$CPPFLAGS -I$d"
	AC_MSG_CHECKING(for ParserEventGenerator.h in $d)
	AC_TRY_CPP([#include <ParserEventGeneratorKit.h>],
	[ AC_MSG_RESULT(yes); OPENSPINCLUDES=$d ], [ AC_MSG_RESULT(no) ])
	CPPFLAGS="$save_CPPFLAGS"
    fi
done

##Detect if OpenSP was compiled with SP_MULTI_BYTE, and put the result in config.h
##

#if 0
##This test works for me, but breaks for most distro because the config.h installed isn't really the one that was used to compile OpenSP
## So --with-opensp-multibyte is now the default.
AC_DEFUN([CHECK_SP_MULTI_BYTE],
 [
AC_CACHE_VAL(ox_sp_multibyte,
   [
 for d in $OPENSPINCLUDES/config.h $OPENSPINCLUDES/../config.h $OPENSPINCLUDES/../include/config.h ; do
    if test "x$OPENSPCONFIG_H" = x; then
	save_CPPFLAGS="$CPPFLAGS"
	CPPFLAGS="$CPPFLAGS -DOPENSPCONFIG_H=\"$d\""
	AC_MSG_CHECKING(for OpenSP's config.h in $d)
	AC_TRY_CPP([#include OPENSPCONFIG_H],
	[ AC_MSG_RESULT(yes); OPENSPCONFIG_H=$d ], [ AC_MSG_RESULT(no) ])
	CPPFLAGS="$save_CPPFLAGS"
    fi
 done
 if test "x$OPENSPCONFIG_H" = x; then
	AC_MSG_ERROR([OpenSP's config.h not found])
 fi
AC_MSG_CHECKING(for if OpenSP's was compiled with SP_MULTI_BYTE)
    ox_sp_multibyte=`sed 's/^#.*SP_MULTI_BYTE[ \t]*\([01]\)/\1/;t;d' < \
            $OPENSPCONFIG_H`])
     if test x"$ox_sp_multibyte" != x ;then
         AC_DEFINE_UNQUOTED(SP_MULTI_BYTE, $ox_sp_multibyte, [SP_MULTI_BYTE value from when OpenSP was compiled])
		 AC_MSG_RESULT(yes)
     else
AC_MSG_RESULT(no)
    fi
 ])
#endif

 AC_ARG_WITH(no-opensp-multibyte, 	
[  --with-no-opensp-multibyte     Force libofx to compile with the assumption that OpenSP was NOT compiled with SP_MULTI_BYTE defined],
		,
			AC_DEFINE(SP_MULTI_BYTE, 1, [SP_MULTI_BYTE value from when OpenSP was compiled])	 )
			
##if test x"$SP_MULTI_BYTE" == x ;then
##CHECK_SP_MULTI_BYTE
##fi

ac_save_CPPFLAGS="$CPPFLAGS"
if test "x$OPENSPINCLUDES" != x ; then
  CPPFLAGS="-I$OPENSPINCLUDES $CPPFLAGS"
fi
AC_LANG_CPLUSPLUS 
AC_CHECK_HEADERS([ParserEventGeneratorKit.h SGMLApplication.h EventGenerator.h], 
				[] , 
				[ AC_MSG_ERROR([OpenSP includes not found]) ], 
				[] )
				
OPENSPLIBS="-L$OPENSPLIBPATH -losp"
ac_save_LIBS="$LIBS"
LIBS="$OPENSPLIBS $LIBS"

AC_MSG_CHECKING([for libosp])
##dnl This is code from the opensp documentation, I modified it a little
##dnl It is really just a link test rather than a run test, it does nothing
AC_LANG_CPLUSPLUS 
	AC_TRY_RUN([
		#include "ParserEventGeneratorKit.h"
		using namespace std;
		class OutlineApplication : public SGMLApplication {
		public:
		  OutlineApplication() { }
		  void startElement(const StartElementEvent &event) {
		  }
		  void endElement(const EndElementEvent &) { }

		};
		int main(int argc, char **argv)
		{
		  ParserEventGeneratorKit parserKit;
		  EventGenerator *egp = parserKit.makeEventGenerator(argc - 1, argv + 1);
		  OutlineApplication app;
		}
	],
	[AC_MSG_RESULT([yes])],
	[AC_MSG_RESULT([no])
	AC_MSG_ERROR([unable to link a test program, is OpenSP installed?])],
	[AC_MSG_RESULT([unknown, assumed OK])])
				
CPPFLAGS="$ac_save_CPPFLAGS"
LIBS="$ac_save_LIBS"		

 
# check for doxygen, mostly stolen from http://log4cpp.sourceforge.net/
# ----------------------------------------------------------------------------
AC_DEFUN([BB_ENABLE_DOXYGEN],
[
AC_ARG_ENABLE(doxygen, [  --enable-doxygen        enable documentation generation with doxygen (auto)])
AC_ARG_ENABLE(dot, [  --enable-dot            use 'dot' to generate graphs in doxygen (auto)])              
AC_ARG_ENABLE(html-docs, [  --enable-html-docs      enable HTML generation with doxygen (yes)], [], [ enable_html_docs=yes])              
AC_ARG_ENABLE(latex-docs, [  --enable-latex-docs     enable LaTeX documentation generation with doxygen (no)], [], [ enable_latex_docs=no])              
if test "x$enable_doxygen" = xno; then
        enable_doc=no
else 
        AC_PATH_PROG(DOXYGEN, doxygen, , $PATH)
        if test x$DOXYGEN = x; then
                if test "x$enable_doxygen" = xyes; then
                        AC_MSG_ERROR([could not find doxygen])
                fi
                enable_doc=no
        else
                enable_doc=yes
                AC_PATH_PROG(DOT, dot, , $PATH)
        fi
fi
AM_CONDITIONAL(DOC, test x$enable_doc = xyes)

if test x$DOT = x; then
        if test "x$enable_dot" = xyes; then
                AC_MSG_ERROR([could not find dot])
        fi
        enable_dot=no
else
        enable_dot=yes
fi
AM_CONDITIONAL(ENABLE_DOXYGEN, test x$enable_doc = xtrue)
AC_SUBST(enable_dot)
AC_SUBST(enable_html_docs)
AC_SUBST(enable_latex_docs)
])

# check for doxygen
# ----------------------------------------------------------------------------
BB_ENABLE_DOXYGEN

# Check if getopt_long is available
# ----------------------------------------------------------------------------
dnl Available from the GNU Autoconf Macro Archive at:
dnl http://www.gnu.org/software/ac-archive/htmldoc/adl_func_getopt_long.html
dnl
AC_DEFUN([adl_FUNC_GETOPT_LONG],
 [AC_PREREQ(2.49)dnl
  # clean out junk possibly left behind by a previous configuration
  rm -f lib/getopt.h
  # Check for getopt_long support
  AC_CHECK_HEADERS([getopt.h])
  AC_CHECK_FUNCS([getopt_long],,
   [# FreeBSD has a gnugetopt library for this
    AC_CHECK_LIB([gnugetopt],[getopt_long],[AC_DEFINE([HAVE_GETOPT_LONG])],
     [# use the GNU replacement
      AC_LIBOBJ(getopt)
      AC_LIBOBJ(getopt1)
      AC_CONFIG_LINKS([lib/getopt.h:lib/gnugetopt.h])])])])

dnl check for getopt in standard library
adl_FUNC_GETOPT_LONG
AM_CONDITIONAL(NO_GETOPTLONG, test "$ac_cv_func_getopt_long" = no  )

# gengetopt command line parser generation
AC_ARG_ENABLE(gengetopt,
        AS_HELP_STRING(--disable-gengetopt,Disable rebuilding of command line parser with gengetopt),
[case "${enableval}" in
  yes) gengetopt=yes ;;
  no)  gengetopt=no ;;
  *) AC_MSG_ERROR([bad value ${enableval} for --disable-gengetopt]) ;;
esac],[gengetopt=yes])

if test x$gengetopt = xyes ; then
   AC_CHECK_PROG(have_gengetopt, gengetopt, yes, no)

   if test x$have_gengetopt = xno; then
     if test -f "${srcdir}/ofxdump/cmdline.c"; then
       AC_MSG_WARN([*** Not rebuilding command line parser as gengetopt is not found ***])
     else
       AC_MSG_ERROR([*** Gengetopt is not found, and generated files (cmdline.c) are missing (probably because you checked out from git).  You need to install gengetopt ***])
     fi
     
     gengetopt=no
   fi
fi

AM_CONDITIONAL(USE_GENGETOPT, test "x$gengetopt" = xyes)

AC_PATH_PROG([HELP2MAN], [help2man], [no])
AM_CONDITIONAL(HAVE_HELP2MAN, test "x$HELP2MAN" != "xno")

# check for curl
# ----------------------------------------------------------------------------

LIBCURL_CHECK_CONFIG([yes],[7.9.7], [libcurl_available=yes],  [libcurl_available=no])
if  test "$libcurl_available" = no; then
	AC_MSG_WARN([libcurl is not available. ofxconnect (Direct connect samples) will NOT be built.])
fi

PKG_CHECK_MODULES(LIBXMLPP,libxml++-2.6 >= 2.6,
	[
	AC_DEFINE(HAVE_LIBXMLPP, 1, [Defined if libxml++ is available])
	have_libxmlpp=yes],
        [AC_MSG_WARN([libxml++ 2.6 is not available. ofxconnect (Direct connect samples) will NOT be built.])
	have_libxmlpp=no])

#PKG_CHECK_MODULES(QT,qt-mt >= 3.2,
#	[AC_DEFINE(HAVE_QT, 1, [Defined if Qt Gui is available])],
#        [AC_MSG_WARN([Qt is not available. Some experimental direct connect samples will not be fully functional.])])

build_ofxconnect=no
if test "$libcurl_available" = yes; then
	if test "$have_libxmlpp" = yes; then
		build_ofxconnect=yes
	fi
fi
AM_CONDITIONAL([BUILD_OFXCONNECT], [test "$build_ofxconnect" = yes])

# check for iconv
# ----------------------------------------------------------------------------

AC_ARG_WITH(iconv,
[  --with-iconv[[=DIR]]      add ICONV support (on)])

WITH_ICONV=0
if test "$with_iconv" = "no" ; then
    echo Disabling ICONV support
else
    if test "$with_iconv" != "yes" -a "$with_iconv" != "" ; then
	CPPFLAGS="${CPPFLAGS} -I$with_iconv/include"
	# Export this since our headers include iconv.h
	XML_INCLUDEDIR="${XML_INCLUDEDIR} -I$with_iconv/include"
	ICONV_LIBS="-L$with_iconv/lib"
    fi

    AC_CHECK_HEADER(iconv.h,
	AC_MSG_CHECKING(for iconv)
	AC_TRY_LINK([#include <stdlib.h>
#include <iconv.h>],[
iconv_t cd = iconv_open ("","");
iconv (cd, NULL, NULL, NULL, NULL);],[
	    AC_MSG_RESULT(yes)
	    WITH_ICONV=1],[
	    AC_MSG_RESULT(no)
	    AC_MSG_CHECKING(for iconv in -liconv)

	    _ldflags="${LDFLAGS}"
	    _libs="${LIBS}"
	    LDFLAGS="${LDFLAGS} ${ICONV_LIBS}"
	    LIBS="${LIBS} -liconv"

	    AC_TRY_LINK([#include <stdlib.h>
#include <iconv.h>],[
iconv_t cd = iconv_open ("","");
iconv (cd, NULL, NULL, NULL, NULL);],[
		AC_MSG_RESULT(yes)
		WITH_ICONV=1
		ICONV_LIBS="${ICONV_LIBS} -liconv"
		LIBS="${_libs}"
		LDFLAGS="${_ldflags}"],[
		AC_MSG_RESULT(no)
		LIBS="${_libs}"
		LDFLAGS="${_ldflags}"])]))
fi
AC_DEFINE_UNQUOTED(HAVE_ICONV, $WITH_ICONV, [Defined if libxml++ is available])

AC_SUBST(WITH_ICONV)
AC_SUBST(ICONV_LIBS)
AC_SUBST(ofxconnect)
AC_SUBST(OPENSPINCLUDES)
AC_SUBST(OPENSPLIBS)
AC_SUBST(LIBXMLPP_CFLAGS)
AC_SUBST(LIBXMLPP_LIBS)
AC_SUBST(QT_CFLAGS)
AC_SUBST(QT_CFLAGS)

LIBOFX_DTD_DIR='${datadir}/libofx/dtd'
AC_SUBST(LIBOFX_DTD_DIR)

	AC_CONFIG_FILES([Makefile])
AC_OUTPUT( 		
	   		libofx.spec
			libofx.pc
			libofx.lsm
			m4/Makefile
			lib/Makefile
			inc/Makefile
			inc/libofx.h
			dtd/Makefile
			doc/Makefile
			ofx2qif/Makefile
			ofxdump/Makefile
			ofxconnect/Makefile
			)
