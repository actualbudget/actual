// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef OffsetOrderedList_INCLUDED
#define OffsetOrderedList_INCLUDED 1

#include "types.h"
#include "Owner.h"
#include "NCVector.h"
#include "Boolean.h"
#include "Mutex.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct OffsetOrderedListBlock {
  Offset offset;		// next Offset
  size_t nextIndex;		// index of first item in next block
  enum { size = 200 };
  unsigned char bytes[size];
};

// This is an ordered list of Offsets with no duplicates.

class OffsetOrderedList {
public:
  OffsetOrderedList();
  // off must be > the last offset added.
  void append(Offset off);
  // Find the last offset in the list <= off.
  Boolean findPreceding(Offset off, size_t &foundIndex, Offset &foundOffset)
    const;
  size_t size() const;
private:
  OffsetOrderedList(const OffsetOrderedList &);	// undefined
  void operator=(const OffsetOrderedList &);	// undefined
  void addByte(unsigned char b);
  // bytes used in current block
  int blockUsed_;
  NCVector<Owner<OffsetOrderedListBlock> > blocks_;
  Mutex mutex_;
};

inline
size_t OffsetOrderedList::size() const
{
  return blocks_.size() == 0 ? 0 : blocks_.back()->nextIndex;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not OffsetOrderedList_INCLUDED */
