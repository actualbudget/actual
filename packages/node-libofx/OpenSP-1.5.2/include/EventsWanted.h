// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef EventsWanted_INCLUDED
#define EventsWanted_INCLUDED 1

#include "Boolean.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API EventsWanted {
public:
  EventsWanted();
  Boolean wantInstanceMarkup() const;
  Boolean wantCommentDecls() const; // in instance
  Boolean wantMarkedSections() const; // in instance
  Boolean wantPrologMarkup() const;
  void addInstanceMarkup();
  void addCommentDecls();
  void addMarkedSections();
  void addPrologMarkup();
private:
  PackedBoolean instanceMarkup_;
  PackedBoolean commentDecls_;
  PackedBoolean markedSections_;
  PackedBoolean prologMarkup_;
};

inline
EventsWanted::EventsWanted()
: instanceMarkup_(0), commentDecls_(0), markedSections_(0), prologMarkup_(0)
{
}

inline
Boolean EventsWanted::wantInstanceMarkup() const
{
  return instanceMarkup_;
}

inline
void EventsWanted::addInstanceMarkup()
{
  instanceMarkup_ = 1;
  commentDecls_ = 1;
  markedSections_ = 1;
}

inline
Boolean EventsWanted::wantCommentDecls() const
{
  return commentDecls_;
}

inline
void EventsWanted::addCommentDecls()
{
  commentDecls_ = 1;
}

inline
Boolean EventsWanted::wantMarkedSections() const
{
  return markedSections_;
}

inline
void EventsWanted::addMarkedSections()
{
  markedSections_ = 1;
}

inline
Boolean EventsWanted::wantPrologMarkup() const
{
  return prologMarkup_;
}

inline
void EventsWanted::addPrologMarkup()
{
  prologMarkup_ = 1;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not EventsWanted_INCLUDED */
