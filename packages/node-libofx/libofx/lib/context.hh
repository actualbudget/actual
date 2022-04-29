/**@file libofx_context.hh
 @brief Main state object passed everywhere in the library
 @author (C) 2004 by Benoit Grégoire
 */
/***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/

#ifndef CONTEXT_H
#define CONTEXT_H
#include <string.h>
#include <time.h>		// for time_t
#include "libofx.h"
#include "ParserEventGeneratorKit.h"

#include <string>


using namespace std;
class LibofxContext
{
private:
  LibofxFileFormat _current_file_type;

  LibofxProcStatusCallback _statusCallback;
  LibofxProcAccountCallback _accountCallback;
  LibofxProcSecurityCallback _securityCallback;
  LibofxProcTransactionCallback _transactionCallback;
  LibofxProcStatementCallback _statementCallback;

  void * _statementData;
  void * _accountData;
  void * _transactionData;
  void * _securityData;
  void * _statusData;

  std::string _dtdDir;

public:
  LibofxContext();
  ~LibofxContext();

  LibofxFileFormat currentFileType() const;
  void setCurrentFileType(LibofxFileFormat t);

  const std::string &dtdDir() const
  {
    return _dtdDir;
  };
  void setDtdDir(const std::string &s)
  {
    _dtdDir = s;
  };

  int statementCallback(const struct OfxStatementData data);
  int accountCallback(const struct OfxAccountData data);
  int transactionCallback(const struct OfxTransactionData data);
  int securityCallback(const struct OfxSecurityData data);
  int statusCallback(const struct OfxStatusData data);

  void setStatusCallback(LibofxProcStatusCallback cb, void *user_data);
  void setAccountCallback(LibofxProcAccountCallback cb, void *user_data);
  void setSecurityCallback(LibofxProcSecurityCallback cb, void *user_data);
  void setTransactionCallback(LibofxProcTransactionCallback cb, void *user_data);
  void setStatementCallback(LibofxProcStatementCallback cb, void *user_data);


};//End class LibofxContext




#endif
