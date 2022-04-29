// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifndef ArcEngine_INCLUDED
#define ArcEngine_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "Event.h"
#include "Vector.h"
#include "SgmlParser.h"
#include <stddef.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API ArcDirector {
public:
  virtual EventHandler *arcEventHandler(const StringC *arcPublicId,
					const Notation *,
					const Vector<StringC> &,
					const SubstTable *) = 0;
};

class SP_API SelectOneArcDirector : public ArcDirector, public Messenger {
public:
  SelectOneArcDirector(const Vector<StringC> &select, EventHandler &eh)
    : select_(select), eh_(&eh) { }
  EventHandler *arcEventHandler(const StringC *,
				const Notation *,
				const Vector<StringC> &,
				const SubstTable *);
  void dispatchMessage(const Message &);
  void dispatchMessage(Message &);
private:
  Vector<StringC> select_;
  EventHandler *eh_;
};

class SP_API ArcEngine {
public:
  static void parseAll(SgmlParser &,
		       Messenger &,
		       ArcDirector &,
		       const volatile sig_atomic_t *cancelPtr = 0);
private:
  ArcEngine();
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ArcEngine_INCLUDED */
