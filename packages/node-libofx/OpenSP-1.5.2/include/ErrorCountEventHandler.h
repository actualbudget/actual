// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifndef ErrorCountEventHandler_INCLUDED
#define ErrorCountEventHandler_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include <signal.h>
#include "Event.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API ErrorCountEventHandler : public EventHandler {
public:
  ErrorCountEventHandler(unsigned errorLimit = 0);
  void setErrorLimit(unsigned maxErrors);
  const sig_atomic_t *cancelPtr() const;
  void cancel();
  Boolean cancelled() const;
  unsigned errorCount() const;
  void message(MessageEvent *);
  void noteMessage(const Message &);
private:
  unsigned maxErrors_;
  unsigned errorCount_;
  sig_atomic_t cancel_;
};

inline
unsigned ErrorCountEventHandler::errorCount() const
{
  return errorCount_;
}

inline
const sig_atomic_t *ErrorCountEventHandler::cancelPtr() const
{
  return &cancel_;
}

inline
void ErrorCountEventHandler::cancel()
{
  cancel_ = 1;
}

inline
void ErrorCountEventHandler::setErrorLimit(unsigned maxErrors)
{
  maxErrors_ = maxErrors;
}

inline
Boolean ErrorCountEventHandler::cancelled() const
{
  return cancel_ != 0;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ErrorCountEventHandler_INCLUDED */
