// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Link_INCLUDED
#define Link_INCLUDED 1

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API Link {
public:
  Link();
  Link(Link *);
  virtual ~Link();
private:
  Link *next_;

friend class IListBase;
friend class IListIterBase;
friend class IQueueBase;
};

inline
Link::Link() : next_(0)
{
}

inline
Link::Link(Link *next) : next_(next)
{
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Link_INCLUDED */
