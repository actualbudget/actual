## Makefile for the tests subdirectory of OpenSP
## Copyright (C) 2002, 2005 OpenSP Project
## Process this file with automake to produce Makefile.in.

# AUTOMAKE_OPTIONS = 1.7 no-dependencies

# A dist should include all tests, but not all tests should always run.
# Disabling DTDDECL should turn that test off, and setting SHOWSTOPPERS to a
# blank value should prevent those tests from running and allow a make check
# to complete with a zero exit code.

TESTS_THAT_PASS = onsgmls-1 onsgmls-2 \
osnorm-1 \
af-1 af-2 af-3 af-4 af-5 af-6 af-12 af-13 af-14 af-15 af-16 \
af-18 af-19

# These tests currently fail, but should not.  The problems need to be tracked
# down and fixed, then the tests moved to TESTS_THAT_PASS.
TESTS_THAT_FAIL = catalog-2 \
af-7 af-8 af-9 af-10 af-11

SHOWSTOPPERS = $(TESTS_THAT_FAIL)

DTDDECL_TEST = catalog-1

TESTS = $(TESTS_THAT_PASS) $(SHOWSTOPPERS)

if DTDDECL
TESTS += $(DTDDECL_TEST)
endif

EXTRA_DIST = $(TESTS_THAT_PASS) $(TESTS_THAT_FAIL) $(DTDDECL_TEST)


TESTS_ENVIRONMENT = top_srcdir=$(top_srcdir) \
	PATH=.:../nsgmls:../sgmlnorm:../sx:../spent:../spcat:../spam:$$PATH \
	ONSGMLS=`echo onsgmls|sed '$(transform)'`\
	OSGMLNORM=`echo osgmlnorm|sed '$(transform)'`\
	$(SHELL)

# Two auxiliary programs used by the tests.
INCLUDES = -I.. -I$(top_srcdir)/lib -I$(top_srcdir)/intl
DEFS = -DLOCALEDIR=\"$(localedir)\" @DEFS@

