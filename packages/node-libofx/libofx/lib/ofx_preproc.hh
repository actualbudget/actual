/***************************************************************************
                          ofx_preproc.h
                             -------------------
    copyright            : (C) 2002 by Benoit Gr�goire
    email                : benoitg@coeus.ca
 ***************************************************************************/
/**@file
 * \brief Preprocessing of the OFX files before parsing
 *
 Implements the pre-treatement of the OFX file prior to parsing:  OFX header striping, OFX proprietary tags and SGML comment striping, locating the appropriate DTD.
*/
/***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/
#ifndef OFX_PREPROC_H
#define OFX_PREPROC_H

#include "context.hh"

#define OPENSPDCL_FILENAME "opensp.dcl"
#define OFX160DTD_FILENAME "ofx160.dtd"
#define OFCDTD_FILENAME "ofc.dtd"

///Removes proprietary tags and comments.
string sanitize_proprietary_tags(string input_string);
///Find the appropriate DTD for the file version.
std::string find_dtd(LibofxContextPtr ctx, const std::string& dtd_filename);
/**
 * \brief ofx_proc_file process an ofx or ofc file.
 *
 *  libofx_proc_file must be called  with a list of 1 or more OFX
 files to be parsed in command line format.
*/
int ofx_proc_file(LibofxContextPtr libofx_context, const char *);

#endif
