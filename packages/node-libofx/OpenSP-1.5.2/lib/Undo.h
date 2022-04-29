// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Undo_INCLUDED
#define Undo_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "Link.h"
#include "ContentToken.h"
#include "OpenElement.h"
#include "Allocator.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class ParserState;
class Event;

class Undo : public Link {
public:
  void *operator new(size_t sz, Allocator &alloc) { return alloc.alloc(sz); }
  void *operator new(size_t sz) { return Allocator::allocSimple(sz); }
  void operator delete(void *p) { Allocator::free(p); }
#ifdef SP_HAVE_PLACEMENT_OPERATOR_DELETE
  void operator delete(void *p, Allocator &) { Allocator::free(p); }
#endif
  Undo();
  virtual ~Undo();
  virtual void undo(ParserState *) = 0;
private:
  Undo(const Undo &);		// undefined
  void operator=(const Undo &);	// undefined
};

class UndoTransition : public Undo {
public:
  UndoTransition(const MatchState &);
  void undo(ParserState *);
private:
  UndoTransition(const UndoTransition &); // undefined
  void operator=(const UndoTransition &); // undefined
  MatchState state_;
};

class UndoStartTag : public Undo {
public:
  UndoStartTag();
  void undo(ParserState *);
private:
  UndoStartTag(const UndoStartTag &); // undefined
  void operator=(const UndoStartTag &);	// undefined
};

class UndoEndTag : public Undo {
public:
  UndoEndTag(OpenElement *);
  void undo(ParserState *);
private:
  UndoEndTag(const UndoEndTag &); // undefined
  void operator=(const UndoEndTag &); // undefined
  Owner<OpenElement> element_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Undo_INCLUDED */
