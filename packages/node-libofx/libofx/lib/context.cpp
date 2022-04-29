/**@file libofx_context.hh
 @brief Main state object passed everywhere in the library
 @author (C) 2004 by Benoit Gr�goire
 */
/***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 ***************************************************************************/
#include <config.h>
#include "context.hh"

using namespace std;



LibofxContext::LibofxContext()
  : _current_file_type(OFX)
  , _statusCallback(0)
  , _accountCallback(0)
  , _securityCallback(0)
  , _transactionCallback(0)
  , _statementCallback(0)
  , _statementData(0)
  , _accountData(0)
  , _transactionData(0)
  , _securityData(0)
  , _statusData(0)
{

}



LibofxContext::~LibofxContext()
{
}



LibofxFileFormat LibofxContext::currentFileType() const
{
  return _current_file_type;
}



void LibofxContext::setCurrentFileType(LibofxFileFormat t)
{
  _current_file_type = t;
}



int LibofxContext::statementCallback(const struct OfxStatementData data)
{
  if (_statementCallback)
    return _statementCallback(data, _statementData);
  return 0;
}



int LibofxContext::accountCallback(const struct OfxAccountData data)
{
  if (_accountCallback)
    return _accountCallback(data, _accountData);
  return 0;
}



int LibofxContext::transactionCallback(const struct OfxTransactionData data)
{
  if (_transactionCallback)
    return _transactionCallback(data, _transactionData);
  return 0;
}



int LibofxContext::securityCallback(const struct OfxSecurityData data)
{
  if (_securityCallback)
    return _securityCallback(data, _securityData);
  return 0;
}



int LibofxContext::statusCallback(const struct OfxStatusData data)
{
  if (_statusCallback)
    return _statusCallback(data, _statusData);
  return 0;
}


void LibofxContext::setStatusCallback(LibofxProcStatusCallback cb,
                                      void *user_data)
{
  _statusCallback = cb;
  _statusData = user_data;
}



void LibofxContext::setAccountCallback(LibofxProcAccountCallback cb,
                                       void *user_data)
{
  _accountCallback = cb;
  _accountData = user_data;
}



void LibofxContext::setSecurityCallback(LibofxProcSecurityCallback cb,
                                        void *user_data)
{
  _securityCallback = cb;
  _securityData = user_data;
}



void LibofxContext::setTransactionCallback(LibofxProcTransactionCallback cb,
    void *user_data)
{
  _transactionCallback = cb;
  _transactionData = user_data;
}



void LibofxContext::setStatementCallback(LibofxProcStatementCallback cb,
    void *user_data)
{
  _statementCallback = cb;
  _statementData = user_data;
}







/** @note:  Actual object returned is LibofxContext *
*/
LibofxContextPtr libofx_get_new_context()
{
  return new LibofxContext();
}

int libofx_free_context( LibofxContextPtr libofx_context_param)
{
  delete (LibofxContext *)libofx_context_param;
  return 0;
}



void libofx_set_dtd_dir(LibofxContextPtr libofx_context,
                        const char *s)
{
  ((LibofxContext*)libofx_context)->setDtdDir(s);
}






extern "C" {
  void ofx_set_status_cb(LibofxContextPtr ctx,
                         LibofxProcStatusCallback cb,
                         void *user_data)
  {
    ((LibofxContext*)ctx)->setStatusCallback(cb, user_data);
  }


  void ofx_set_account_cb(LibofxContextPtr ctx,
                          LibofxProcAccountCallback cb,
                          void *user_data)
  {
    ((LibofxContext*)ctx)->setAccountCallback(cb, user_data);
  }



  void ofx_set_security_cb(LibofxContextPtr ctx,
                           LibofxProcSecurityCallback cb,
                           void *user_data)
  {
    ((LibofxContext*)ctx)->setSecurityCallback(cb, user_data);
  }



  void ofx_set_transaction_cb(LibofxContextPtr ctx,
                              LibofxProcTransactionCallback cb,
                              void *user_data)
  {
    ((LibofxContext*)ctx)->setTransactionCallback(cb, user_data);
  }



  void ofx_set_statement_cb(LibofxContextPtr ctx,
                            LibofxProcStatementCallback cb,
                            void *user_data)
  {
    ((LibofxContext*)ctx)->setStatementCallback(cb, user_data);
  }




}










