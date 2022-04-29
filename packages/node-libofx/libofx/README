Copyright (c) 2002-2010 Benoit Grégoire

This is the LibOFX library.  It is a API designed to allow applications to very easily support OFX command responses, usually provided by financial institutions.  See http://www.ofx.net/ for details and specification. This project was first started as my end of degree project, with the objective to add OFX support to GnuCash https://www.gnucash.org/ If you can read French, the original project presentation is included in the doc directory.  I finally decided to make it into a generic library, so all OpenSource financial software can benefit.

LibOFX is based on the excellent OpenSP library written by James Clark, and now part of the OpenJADE http://openjade.sourceforge.net/ project.  OpenSP by itself is not widely distributed.  OpenJADE 1.3.1 includes a version on OpenSP that will link, however, it has some major problems with LibOFX and isn't recommended.  Since LibOFX uses the generic interface to OpenSP, it should be compatible with all recent versions of OpenSP (It has been developed with OpenSP-1.5pre5).  LibOFX is written in C++, but provides a C style interface usable transparently from both C and C++ using a single include file.

In addition to the library, three utilities are included with libofx

ofxdump:
ofxdump prints to stdout, in human readable form, everything the library understands about a particular ofx response file, and sends errors to stderr.  It is as C++ code example and demo of the library (it uses every functions and every structures of LibOFX)
usage: ofxdump path_to_ofx_file/ofx_filename

ofx2qif:
ofx2qif is a OFX "file" to QIF (Quicken Interchange Format) converter.  It was written as a C code example, and as a way for LibOFX to immediately provide something usefull, as an incentive for people to try out the library.  It is not recommended that financial software use the output of this utility for OFX support.  The QIF file format is very primitive, and much information is lost.  The utility curently supports every tansaction tags of the qif format except the address lines, and supports many of the tags of !Account. It should generate QIF files that will import sucesfully in just about every software with QIF support.
I do not plan on working on this utility much further, but I would be more than happy to accept contributions.
usage: ofx2qif path_to_ofx_file/ofx_filename > output_filename.qif

ofxconnect:
sample app to demonstrate & test new direct connect API's (try "make check" in the ofxconnect folder).  Read README.privateserver first.

LibOFX strives to achieve the following design goals:

-Simplicity: OFX is a VERY complex spec. However, few if any software needs all this complexity. The library tries to hide this complexity by "flattening" the data structures, doing timezone conversions, currency conversion, etc.
-Data directly usable from C, without conversion: A date is a C time_t, money is a float, strings are char[], etc.
-C style interface: Although LibOFX is written in C++, it provides an interface usable transparently from both C and C++, using a single header file.

LibOFX was implemented directly from the full OFX 1.6 spec, and currently supports:

    * Banking transactions and statements.
    * Credit card and statements.
    * Investment transactions.
    * OFX 2.0 

Future projects for libofx include:

    * Header parsing
    * DTD autodetection
    * Currency conversion
    * QIF import
    * QIF export (integrated inside the library)
    * OFX export

Full documentation of the API and library internals generated using doxygen is available. For a quick start, you should learn all you need to know to get started by reading the libofx.h file in the INC directory, and ofxdump.cpp in the ofxdump directory.

Call for help:
-Please note that despite a very detailled spec, OFX is by nature very hard to test.  I only have access to the specifications examples, and
my own bank (Desjardins).  But I need people to run as many ofx files from different banks as they can thru libofx, and report the result.
-This is my first attempt at writing an API.  I need comments from financial software writers about inc/libofx.h  What do YOU need?

Benoit Grégoire
benoitg@coeus.ca

