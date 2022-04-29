// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef MessageEventHandler_INCLUDED
#define MessageEventHandler_INCLUDED 1

#include "Event.h"
#include "ErrorCountEventHandler.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class OutputCharStream;
class SgmlParser;

class SP_API MessageEventHandler : public ErrorCountEventHandler {
public:
  // if parser is non-null then subdocs will be parsed automatically
  MessageEventHandler(Messenger *messenger, const SgmlParser *parser = 0);
  void message(MessageEvent *);
  void subdocEntity(SubdocEntityEvent *);
  Messenger *messenger() const;
private:
  Messenger *messenger_;
  const SgmlParser *parser_;
};

inline
Messenger *MessageEventHandler::messenger() const
{
  return messenger_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not MessageEventHandler_INCLUDED */
