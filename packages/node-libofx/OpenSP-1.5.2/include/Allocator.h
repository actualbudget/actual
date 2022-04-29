// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Allocator_INCLUDED
#define Allocator_INCLUDED 1

#include <stddef.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API Allocator {
public:
  Allocator(size_t maxSize, unsigned blocksPerSegment);
  ~Allocator();
  void *alloc(size_t);
  static void *allocSimple(size_t);
  static void free(void *);

  // It would be nice to make these private, but some compilers have problems.
  union ForceAlign {
    unsigned long n;
    struct SP_API {
      char c;
    } s;
    char *cp;
    long *lp;
  };
  struct SegmentHeader;
  union BlockHeader;
  friend union BlockHeader;
  union BlockHeader {
    SegmentHeader *seg;
    ForceAlign align;
  };
  struct Block;
  friend struct Block;
  struct SP_API Block {
    BlockHeader header;
    Block *next;
  };
  friend struct SegmentHeader;
  struct SP_API SegmentHeader {
    union {
      Block **freeList;
      ForceAlign align;
    };
    unsigned liveCount;
    SegmentHeader *next;
  };
private:
  Allocator(const Allocator &);	// undefined
  Allocator &operator=(const Allocator &); // undefined
  Block *freeList_;
  size_t objectSize_;
  unsigned blocksPerSegment_;
  SegmentHeader *segments_;
  void *alloc1();
  void tooBig(size_t);
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Allocator_INCLUDED */
