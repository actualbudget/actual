// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "ErrorCountEventHandler.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

ErrorCountEventHandler::ErrorCountEventHandler(unsigned errorLimit)
: errorCount_(0), maxErrors_(errorLimit), cancel_(0)
{
}

void ErrorCountEventHandler::message(MessageEvent *event)
{
  noteMessage(event->message());
  delete event;
}

void ErrorCountEventHandler::noteMessage(const Message &message)
{
  if (message.isError() && ++errorCount_ == maxErrors_)
    cancel_ = 1;
}

#ifdef SP_NAMESPACE
}
#endif
