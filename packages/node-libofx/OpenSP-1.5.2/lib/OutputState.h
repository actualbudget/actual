// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef OutputState_INCLUDED
#define OutputState_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "Location.h"
#include "IList.h"
#include "Link.h"
#include "Boolean.h"
#include "types.h"
#include "EventsWanted.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct OutputStateLevel : public Link {
  OutputStateLevel();
  Boolean hasPendingRe() const;
  char state;			// should be OutputState::State
  unsigned long reSerial;
  Location reLocation;
};

class EventHandler;
class Allocator;

class OutputState {
public:
  OutputState();
  void init();
  void handleRe(EventHandler &, Allocator &, const EventsWanted &,
		Char, const Location &);
  void noteRs(EventHandler &, Allocator &, const EventsWanted &);
  void noteMarkup(EventHandler &, Allocator &, const EventsWanted &);
  void noteData(EventHandler &, Allocator &, const EventsWanted &);
  void noteStartElement(Boolean included,
			EventHandler &, Allocator &, const EventsWanted &);
  void noteEndElement(Boolean included,
		      EventHandler &, Allocator &, const EventsWanted &);
private:
  OutputState(const OutputState &); // undefined
  void operator=(const OutputState &); // undefined
  enum State {
    afterStartTag,
    afterRsOrRe,
    afterData,
    pendingAfterRsOrRe,
    pendingAfterMarkup
  };
  IList<OutputStateLevel> stack_;
  OutputStateLevel &top();
  Char re_;
  unsigned long nextSerial_;
  friend struct OutputStateLevel;
};

inline
Boolean OutputStateLevel::hasPendingRe() const
{
  return int(state) >= int(OutputState::pendingAfterRsOrRe);
}

inline
OutputStateLevel &OutputState::top()
{
  return *stack_.head();
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not OutputState_INCLUDED */
