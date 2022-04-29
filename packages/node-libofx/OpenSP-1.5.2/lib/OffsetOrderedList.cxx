// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
#include "OffsetOrderedList.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

OffsetOrderedList::OffsetOrderedList()
: blockUsed_(OffsetOrderedListBlock::size)
{
}

void OffsetOrderedList::append(Offset offset)
{
  // At any position in the list there's a current offset.
  // The offset is initially zero.
  // A byte of 255 says add 255 to the current offset.
  // A byte B < 255, says that there's an item in the list whose
  // offset is the current offset + B, and that B + 1 should be
  // added to the current offset.
  Offset curOffset = blocks_.size() > 0  ? blocks_.back()->offset : 0;
  ASSERT(offset >= curOffset);
  Offset count = offset - curOffset;
  while (count >= 255) {
    addByte(255);
    count -= 255;
  }
  addByte(count);
}

void OffsetOrderedList::addByte(unsigned char b)
{
  if (blockUsed_ >= OffsetOrderedListBlock::size) {
    Mutex::Lock lock(&mutex_);
    blocks_.resize(blocks_.size() + 1);
    Owner<OffsetOrderedListBlock> &last = blocks_.back();
    last = new OffsetOrderedListBlock;
    if (blocks_.size() == 1) {
      last->nextIndex = 0;
      last->offset = 0;
    }
    else {
      OffsetOrderedListBlock &lastButOne = *blocks_[blocks_.size() - 2];
      last->nextIndex = lastButOne.nextIndex;
      last->offset = lastButOne.offset;
    }
    blockUsed_ = 0;
  }
  blocks_.back()->bytes[blockUsed_] = b;
  if (b == 255)
    blocks_.back()->offset += 255;
  else {
    blocks_.back()->offset += b + 1;
    blocks_.back()->nextIndex += 1;
  }
  blockUsed_++;
}

// Find the last offset <= off.

Boolean OffsetOrderedList::findPreceding(Offset off,
					 size_t &foundIndex,
					 Offset &foundOffset) const
{
  Mutex::Lock lock(&((OffsetOrderedList *)this)->mutex_);
  // Invariant:
  // blocks with index < i have offset <= off
  // blocks with index >= lim have offset > off
  size_t i = 0;
  size_t lim = blocks_.size();
  // Most commonly we'll want to know the about positions near the end,
  // so optimize this case.
  if (lim > 0 && blocks_[lim - 1]->offset <= off)
    i = lim;
  else if (lim > 1 && blocks_[lim - 2]->offset <= off)
    i = lim - 1;
  else {
    // Do a binary search.
    while (i < lim) {
      size_t mid = i + (lim - i)/2;
      if (blocks_[mid]->offset > off)
	lim = mid;
      else
	i = mid + 1;
    }
  }
  if (i == blocks_.size()) {
    if (i == 0)
      return 0;
    foundIndex = blocks_.back()->nextIndex - 1;
    foundOffset = blocks_.back()->offset - 1;
    return 1;
  }
  // Note that an item with offset X can only occur in a block with offset > X
  // i is now the first block with offset > off
  Offset curOff = blocks_[i]->offset;
  size_t curIndex = blocks_[i]->nextIndex;
  const unsigned char *bytes = blocks_[i]->bytes;
  int j = (i == blocks_.size() - 1
	   ? blockUsed_ 
	   : int(OffsetOrderedListBlock::size));
  for (;;) {
    j--;
    if (bytes[j] != 255) {
      curIndex -= 1;
      curOff -= 1;
      if (curOff <= off)
	break;
    }
    curOff -= bytes[j];
    if (j == 0) {
      if (i == 0)
	return 0;
      i--;
      j = OffsetOrderedListBlock::size;
      curOff = blocks_[i]->offset;
      curIndex = blocks_[i]->nextIndex;
      bytes = blocks_[i]->bytes;
    }
  }
  foundIndex = curIndex;
  foundOffset = curOff;
  return 1;
}

#ifdef SP_NAMESPACE
}
#endif
