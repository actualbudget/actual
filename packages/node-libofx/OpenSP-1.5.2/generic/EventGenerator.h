// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef EventGenerator_INCLUDED
#define EventGenerator_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "SGMLApplication.h"

class SP_API EventGenerator {
public:
  virtual ~EventGenerator();
  // Can be called at most once for any object.
  // Returns number of errors.
  virtual unsigned run(SGMLApplication &) = 0;
  // may be called at any time
  virtual void inhibitMessages(bool);
  // may be called at any time, even from another thread
  virtual void halt() = 0;
  // called after run
  virtual EventGenerator *
    makeSubdocEventGenerator(const SGMLApplication::Char *systemId,
			     size_t systemIdLength);
};

#endif /* not EventGenerator_INCLUDED */
