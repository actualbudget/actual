// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
#include "Allocator.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Allocator::Allocator(size_t maxSize, unsigned blocksPerSegment)
: objectSize_(maxSize),
  blocksPerSegment_(blocksPerSegment),
  freeList_(0),
  segments_(0)
{
}

Allocator::~Allocator()
{
  SegmentHeader *p = segments_;
  while (p) {
    SegmentHeader *tem = p->next;
    if (p->liveCount == 0)
      ::operator delete(p);
    else
      p->freeList = 0;
    p = tem;
  }
}

void *Allocator::alloc(size_t sz)
{
  if (sz > objectSize_)
    tooBig(sz);
  Block *tem = freeList_;
  if (tem) {
    tem->header.seg->liveCount += 1;
    freeList_ = tem->next;
    return &(tem->next);
  }
  else
    return alloc1();
}

void *Allocator::allocSimple(size_t sz)
{
  BlockHeader *p = (BlockHeader *)::operator new(sz + sizeof(BlockHeader));
  p->seg = 0;
  return p + 1;
}

void Allocator::free(void *p)
{
  BlockHeader *b = ((BlockHeader *)p) - 1;
  SegmentHeader *seg = b->seg;
  if (seg == 0)
    ::operator delete(b);
  else {
    Block **freeList = seg->freeList;
    if (freeList == 0) {
      seg->liveCount -= 1;
      if (seg->liveCount == 0)
	::operator delete(seg);
    }
    else {
      ((Block *)b)->next = *freeList;
      *freeList = (Block *)b;
      seg->liveCount -= 1;
    }
  }
}

void *Allocator::alloc1()
{
  SegmentHeader *seg
    = (SegmentHeader *)::operator new(sizeof(SegmentHeader)
				      + ((objectSize_ + sizeof(BlockHeader))
					 * blocksPerSegment_));
  seg->next = segments_;
  segments_ = seg;
  seg->liveCount = 1;
  seg->freeList = &freeList_;
  char *p = (char *)(seg + 1);
  Block *head = 0;
  for (size_t n = blocksPerSegment_; n > 0; n--) {
    ((Block *)p)->next = head;
    ((Block *)p)->header.seg = seg;
    head = (Block *)p;
    p += sizeof(BlockHeader) + objectSize_;
  }
  freeList_ = head->next;
  return &(head->next);
}

void Allocator::tooBig(size_t sz)
{
  ASSERT(sz <= objectSize_);
}

#ifdef SP_NAMESPACE
}
#endif
