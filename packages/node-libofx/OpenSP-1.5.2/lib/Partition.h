// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Partition_INCLUDED
#define Partition_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "types.h"
#include "SubstTable.h"
#include "StringOf.h"
#include "ISet.h"
#include "XcharMap.h"
#include "Vector.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Partition {
public:
  Partition(const ISet<Char> &chars,
	    const ISet<Char> **sets,
	    int nSets,
	    const SubstTable &subst);
  EquivCode maxCode() const;
  EquivCode charCode(Char c) const;
  EquivCode eECode() const;
  const String<EquivCode> &setCodes(int i) const;
  const XcharMap<EquivCode> &map() const;
private:
  Partition(const Partition &);	// undefined
  void operator=(const Partition &); // undefined
  EquivCode maxCode_;
  Vector<String<EquivCode> > setCodes_;
  XcharMap<EquivCode> map_;
};

inline
EquivCode Partition::maxCode() const
{
  return maxCode_;
}

inline
EquivCode Partition::charCode(Char c) const
{
  return map_[c];
}

inline
EquivCode Partition::eECode() const
{
  return 0;
}

inline
const String<EquivCode> &Partition::setCodes(int i) const
{
  return setCodes_[i];
}

inline
const XcharMap<EquivCode> &Partition::map() const
{
  return map_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Partition_INCLUDED */
