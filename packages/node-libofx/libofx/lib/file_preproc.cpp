/***************************************************************************
          file_preproc.cpp
                             -------------------
    copyright            : (C) 2004 by Benoit Grégoire
    email                : benoitg@coeus.ca
***************************************************************************/
/**@file
 * \brief File type detection, etc.
 *
 * Implements AutoDetection of file type, and handoff to specific parsers.
*/
/***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/
#include <iostream>
#include <fstream>
#include <stdlib.h>
#include <stdio.h>
#include <string>
#include "libofx.h"
#include "messages.hh"
#include "ofx_preproc.hh"
#include "context.hh"
#include "file_preproc.hh"

using namespace std;
const unsigned int READ_BUFFER_SIZE = 1024;

/* get_file_type_description returns a string description of a LibofxFileType
 * suitable for debugging output or user communication.
 */
const char * libofx_get_file_format_description(const struct LibofxFileFormatInfo format_list[], enum LibofxFileFormat file_format)
{
  const char * retval = "UNKNOWN (File format couldn't be successfully identified)";

  for (int i = 0; LibofxImportFormatList[i].format != LAST; i++)
  {
    if (LibofxImportFormatList[i].format == file_format)
    {
      retval = LibofxImportFormatList[i].description;
    }
  }
  return retval;
};

/*
libofx_get_file_type returns a proper enum from a file type string.
*/
enum LibofxFileFormat libofx_get_file_format_from_str(const struct LibofxFileFormatInfo format_list[], const char * file_type_string)
{
  enum LibofxFileFormat retval = UNKNOWN;
  for (int i = 0; LibofxImportFormatList[i].format != LAST; i++)
  {
    if (strcmp(LibofxImportFormatList[i].format_name, file_type_string) == 0)
    {
      retval = LibofxImportFormatList[i].format;
    }
  }
  return retval;
}

int libofx_proc_file(LibofxContextPtr p_libofx_context, const char * p_filename, LibofxFileFormat p_file_type)
{
  LibofxContext * libofx_context = (LibofxContext *) p_libofx_context;

  if (p_file_type == AUTODETECT)
  {
    message_out(INFO, string("libofx_proc_file(): File format not specified, autodetecting..."));
    libofx_context->setCurrentFileType(libofx_detect_file_type(p_filename));
    message_out(INFO, string("libofx_proc_file(): Detected file format: ") +
                libofx_get_file_format_description(LibofxImportFormatList,
                    libofx_context->currentFileType() ));
  }
  else
  {
    libofx_context->setCurrentFileType(libofx_detect_file_type(p_filename));
    message_out(INFO,
                string("libofx_proc_file(): File format forced to: ") +
                libofx_get_file_format_description(LibofxImportFormatList,
                    libofx_context->currentFileType() ));
  }

  switch (libofx_context->currentFileType())
  {
  case OFX:
    ofx_proc_file(libofx_context, p_filename);
    break;
  case OFC:
    ofx_proc_file(libofx_context, p_filename);
    break;
  default:
    message_out(ERROR, string("libofx_proc_file(): Detected file format not yet supported ou couldn't detect file format; aborting."));
  }
  return 0;
}

enum LibofxFileFormat libofx_detect_file_type(const char * p_filename)
{
  enum LibofxFileFormat retval = UNKNOWN;
  ifstream input_file;
  char buffer[READ_BUFFER_SIZE];
  string s_buffer;
  bool type_found = false;

  if (p_filename != NULL && strcmp(p_filename, "") != 0)
  {
    message_out(DEBUG, string("libofx_detect_file_type():Opening file: ") + p_filename);

    input_file.open(p_filename);

    if (!input_file)
    {
      message_out(ERROR, "libofx_detect_file_type():Unable to open the input file " + string(p_filename));
      return retval;
    }
    else
    {
      do
      {
        input_file.getline(buffer, sizeof(buffer), '\n');
        //cout<<buffer<<"\n";
        s_buffer.assign(buffer);
        //cout<<"input_file.gcount(): "<<input_file.gcount()<<" sizeof(buffer): "<<sizeof(buffer)<<endl;
        if (input_file.gcount() < (sizeof(buffer) - 1))
        {
          s_buffer.append("\n");//Just in case...
        }
        else if ( !input_file.eof() && input_file.fail())
        {
          input_file.clear();
        }

        if (s_buffer.find("<OFX>") != string::npos || s_buffer.find("<ofx>") != string::npos)
        {
          message_out(DEBUG, "libofx_detect_file_type():<OFX> tag has been found");
          retval = OFX;
          type_found = true;
        }
        else if (s_buffer.find("<OFC>") != string::npos || s_buffer.find("<ofc>") != string::npos)
        {
          message_out(DEBUG, "libofx_detect_file_type():<OFC> tag has been found");
          retval = OFC;
          type_found = true;
        }

      }
      while (type_found == false && !input_file.eof() && !input_file.bad());
    }
    input_file.close();
  }
  else
  {
    message_out(ERROR, "libofx_detect_file_type(): No input file specified");
  }
  if (retval == UNKNOWN)
    message_out(ERROR, "libofx_detect_file_type(): Failed to identify input file format");
  return retval;
}





