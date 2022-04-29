// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef SdFormalError_INCLUDED
#define SdFormalError_INCLUDED 1

#include "Link.h"
#include "StringC.h"
#include "Message.h"
#include "Location.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class ParserState;

class SdFormalError : public Link {
public:
  SdFormalError(const Location &, const MessageType1 &, const StringC &);
  void send(ParserState &);
private:
  const MessageType1 *message_;
  Location location_;
  StringC id_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not SdFormalError_INCLUDED */
