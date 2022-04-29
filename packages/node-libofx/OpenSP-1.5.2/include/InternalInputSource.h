// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef InternalInputSource_INCLUDED
#define InternalInputSource_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include <stddef.h>
#include "InputSource.h"
#include "Allocator.h"
#include "StringC.h"
#include "types.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class InputSourceOrigin;
class Messenger;
class NamedCharRef;

class SP_API InternalInputSource : public InputSource {
public:
  void *operator new(size_t sz, Allocator &alloc) { return alloc.alloc(sz); }
  void *operator new(size_t sz) { return Allocator::allocSimple(sz); }
  void operator delete(void *p) { Allocator::free(p); }
#ifdef SP_HAVE_PLACEMENT_OPERATOR_DELETE
  void operator delete(void *p, Allocator &) { Allocator::free(p); }
#endif
  InternalInputSource(const StringC &, InputSourceOrigin *);
  Xchar fill(Messenger &);
  void pushCharRef(Char ch, const NamedCharRef &);
  Boolean rewind(Messenger &);
  const StringC *contents();
  InternalInputSource *asInternalInputSource();
  ~InternalInputSource();
private:
  InternalInputSource(const InternalInputSource &); // undefined
  void operator=(const InternalInputSource &);	    // undefined
  Char *buf_;
  const StringC *contents_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not InternalInputSource_INCLUDED */
