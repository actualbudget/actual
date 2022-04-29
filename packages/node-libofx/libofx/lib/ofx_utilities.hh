/***************************************************************************
                          ofx_util.h
                             -------------------
    copyright            : (C) 2002 by Benoit Gr�goire
    email                : benoitg@coeus.ca
 ***************************************************************************/
/**@file
 * \brief Various simple functions for type conversion & al
 */
/***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/
#ifndef OFX_UTIL_H
#define OFX_UTIL_H
#include <string.h>
#include <time.h>		// for time_t
#include "ParserEventGeneratorKit.h"
using namespace std;
/* This file contains various simple functions for type conversion & al */

/*wostream &operator<<(wostream &os, SGMLApplication::CharString s); */

///Convert OpenSP CharString to a C++ stream
ostream &operator<<(ostream &os, SGMLApplication::CharString s);

///Convert OpenSP CharString and put it in the C wchar_t string provided
wchar_t* CharStringtowchar_t(SGMLApplication::CharString source, wchar_t *dest);

///Convert OpenSP CharString to a C++ STL string
string CharStringtostring(const SGMLApplication::CharString source, string &dest);

///Append an OpenSP CharString to an existing C++ STL string
string AppendCharStringtostring(const SGMLApplication::CharString source, string &dest);

///Convert a C++ string containing a time in OFX format to a C time_t
time_t ofxdate_to_time_t(const string ofxdate);

///Convert OFX amount of money to double float
double ofxamount_to_double(const string ofxamount);

///Sanitize a string coming from OpenSP
string strip_whitespace(const string para_string);

int mkTempFileName(const char *tmpl, char *buffer, unsigned int size);

#endif
