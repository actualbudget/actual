/***************************************************************************
                          file_preproc.hh
                             -------------------
    copyright            : (C) 2004 by Benoit Gr�goire
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
#ifndef FILE_PREPROC_H
#define FILE_PREPROC_H

/**
 * \brief  libofx_detect_file_type tries to analyze a file to determine it's format.
 *
@param p_filename File name of the file to process
 @return Detected file format, UNKNOWN if unsuccessfull.
*/
enum LibofxFileFormat libofx_detect_file_type(const char * p_filename);

#endif
