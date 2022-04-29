lib_LTLIBRARIES = libofx.la

EXTRA_DIST = gnugetopt.h getopt.c getopt1.c

libofx_la_SOURCES =  messages.cpp \
		ofx_utilities.cpp \
		file_preproc.cpp \
		context.cpp \
		ofx_preproc.cpp \
		ofx_container_generic.cpp \
		ofx_container_main.cpp \
		ofx_container_security.cpp \
		ofx_container_statement.cpp \
		ofx_container_account.cpp \
		ofx_container_transaction.cpp \
		ofx_containers_misc.cpp \
		ofx_request.cpp \
		ofx_request_accountinfo.cpp \
		ofx_request_statement.cpp \
		ofx_sgml.cpp \
		ofc_sgml.cpp \
		win32.cpp

noinst_HEADERS = ${top_builddir}/inc/libofx.h \
		messages.hh \
		ofx_preproc.hh \
		file_preproc.hh \
		context.hh \
		ofx_sgml.hh \
		ofc_sgml.hh \
		ofx_aggregate.hh \
		ofx_error_msg.hh \
		ofx_containers.hh \
		ofx_request.hh \
		ofx_request_accountinfo.hh \
		ofx_request_statement.hh \
		ofx_utilities.hh \
		tree.hh \
		win32.hh

AM_CPPFLAGS = \
	-I. \
	-I${top_builddir}/inc \
	-I${OPENSPINCLUDES} \
	-DMAKEFILE_DTD_PATH=\"${LIBOFX_DTD_DIR}\"

#libofx_la_LIBADD = @LIBOBJS@ ${OPENSPLIBS} -lstdc++
libofx_la_LIBADD = $(OPENSPLIBS) $(ICONV_LIBS) -lstdc++
libofx_la_LDFLAGS = -no-undefined -version-info @LIBOFX_SO_CURRENT@:@LIBOFX_SO_REVISION@:@LIBOFX_SO_AGE@



