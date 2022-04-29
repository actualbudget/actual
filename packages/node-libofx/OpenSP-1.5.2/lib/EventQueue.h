// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef EventQueue_INCLUDED
#define EventQueue_INCLUDED 1

#include "IQueue.h"
#include "Event.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class EventQueue : public EventHandler, public IQueue<Event> {
public:
  EventQueue();
private:
#define EVENT(c, f) void f(c *);
#include "events.h"
#undef EVENT
  void append(Event *);
};

class Pass1EventHandler : public EventQueue {
public:
  Pass1EventHandler();
  void init(EventHandler *origHandler);
  void message(MessageEvent *);
  Boolean hadError() const;
  EventHandler *origHandler() const;
private:
  Boolean hadError_;
  EventHandler *origHandler_;
};

inline
void EventQueue::append(Event *event)
{
  IQueue<Event>::append(event);
}

inline
Boolean Pass1EventHandler::hadError() const
{
  return hadError_;
}

inline
EventHandler *Pass1EventHandler::origHandler() const
{
  return origHandler_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not EventQueue_INCLUDED */
