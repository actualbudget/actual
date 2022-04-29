// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifndef ConsoleOutput_INCLUDED
#define ConsoleOutput_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "OutputCharStream.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API ConsoleOutput {
public:
  // Returns null if fd is not a console.
  static OutputCharStream *makeOutputCharStream(int fd);
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ConsoleOutput_INCLUDED */
