// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "OutputState.h"
#include "Event.h"
#include "Allocator.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

OutputState::OutputState()
{
  init();
}

void OutputState::init()
{
  nextSerial_ = 0;
  stack_.clear();
  stack_.insert(new OutputStateLevel);
}

OutputStateLevel::OutputStateLevel()
: state(OutputState::afterStartTag)
{
}

void OutputState::handleRe(EventHandler &handler, Allocator &alloc,
			   const EventsWanted &eventsWanted, Char re,
			   const Location &location)
{
  re_ = re;
  if (eventsWanted.wantInstanceMarkup())
    handler.reOrigin(new (alloc) ReOriginEvent(re_, location, nextSerial_));
  switch (top().state) {
  case afterStartTag:
    // it's the first RE in the element
    if (eventsWanted.wantInstanceMarkup())
      handler.ignoredRe(new (alloc) IgnoredReEvent(re_, location, nextSerial_++));
    top().state = afterRsOrRe;
    break;
  case afterRsOrRe:
  case afterData:
    top().state = pendingAfterRsOrRe;
    top().reLocation = location;
    top().reSerial = nextSerial_++;
    break;
  case pendingAfterRsOrRe:
    // We now know that the pending RE won't be ignored as the last RE.
    handler.data(new (alloc) ReEvent(&re_, top().reLocation, top().reSerial));
    top().state = pendingAfterRsOrRe;
    top().reLocation = location;
    top().reSerial = nextSerial_++;
    break;
  case pendingAfterMarkup:
    // We've had only markup since the last RS or RE, so this
    // RE is ignored.  Note that it's this RE that's ignored, not
    // the pending one.
    if (eventsWanted.wantInstanceMarkup())
      handler.ignoredRe(new (alloc) IgnoredReEvent(re_, location, nextSerial_++));
    top().state = pendingAfterRsOrRe;
    break;
  }
}

void OutputState::noteRs(EventHandler &, Allocator &, const EventsWanted &)
{
  if (top().hasPendingRe())
    top().state = pendingAfterRsOrRe;
  else
    top().state = afterRsOrRe;
}

void OutputState::noteMarkup(EventHandler &, Allocator &, const EventsWanted &)
{
  switch (top().state) {
  case afterRsOrRe:
    top().state = afterStartTag;
    break;
  case pendingAfterRsOrRe:
    top().state = pendingAfterMarkup;
    break;
  default:
    break;			// avoid warning
  }
}

void OutputState::noteData(EventHandler &handler, Allocator &alloc,
			   const EventsWanted &)
{
  if (top().hasPendingRe())
    handler.data(new (alloc) ReEvent(&re_, top().reLocation, top().reSerial));
  top().state = afterData;
}

void OutputState::noteStartElement(Boolean included,
				   EventHandler &handler, Allocator &alloc,
				   const EventsWanted &)
{
  if (included)
    stack_.insert(new OutputStateLevel);
  else {
    if (top().hasPendingRe())
      handler.data(new (alloc) ReEvent(&re_, top().reLocation, top().reSerial));
    top().state = afterStartTag;
  }
}

void OutputState::noteEndElement(Boolean included, EventHandler &handler,
				 Allocator &alloc,
				 const EventsWanted &eventsWanted)
{
  if (eventsWanted.wantInstanceMarkup() && top().hasPendingRe())
    handler.ignoredRe(new (alloc) IgnoredReEvent(re_, top().reLocation,
						 top().reSerial));
  if (included) {
    delete stack_.get();
    noteMarkup(handler, alloc, eventsWanted);
  }
  else
    top().state = afterData;
}

#ifdef SP_NAMESPACE
}
#endif
