// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Id_INCLUDED
#define Id_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "Named.h"
#include "Location.h"
#include "Vector.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Id : public Named {
public:
  Id(const StringC &);
  void define(const Location &);
  void addPendingRef(const Location &);
  Boolean defined() const;
  const Location &defLocation() const;
  const Vector<Location> &pendingRefs() const;
private:
  Location defLocation_;
  Vector<Location> pendingRefs_;
};

inline
Boolean Id::defined() const
{
  return !defLocation_.origin().isNull();
}

inline
const Location &Id::defLocation() const
{
  return defLocation_;
}

inline
const Vector<Location> &Id::pendingRefs() const
{
  return pendingRefs_;
}

inline
void Id::addPendingRef(const Location &loc)
{
  pendingRefs_.push_back(loc);
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Id_INCLUDED */
