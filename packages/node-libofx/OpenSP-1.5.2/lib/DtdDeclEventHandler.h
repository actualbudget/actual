// Copyright (c) 1999 Matthias Clasen
// See the file COPYING for copying permission.

#ifndef DtdDeclEventHandler_INCLUDED
#define DtdDeclEventHandler_INCLUDED 1

#include "Boolean.h"
#include "Event.h"
#include "ErrorCountEventHandler.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class DtdDeclEventHandler : public ErrorCountEventHandler {
 public:
  DtdDeclEventHandler(const StringC &pubid);
  void message(MessageEvent *);
  void startDtd(StartDtdEvent *);
  Boolean match() const;
 private:
  StringC pubid_;
  Boolean match_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not DtdDeclEventHandler_INCLUDED */
