// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef StringSet_INCLUDED
#define StringSet_INCLUDED 1

#include "StringC.h"
#include "Hash.h"
#include "Boolean.h"
#include "OwnerTable.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class StringSetKey {
public:
  static inline const StringC &key(const StringC &str) { return str; }
};

class StringSet {
public:
  StringSet();
  Boolean add(const StringC &);	// return 1 if already there
  void swap(StringSet &);
  void clear();
private:
  StringSet(const StringSet &);	// undefined
  void operator=(const StringSet &); // undefined
  OwnerTable<StringC, StringC, Hash, StringSetKey> table_;
};

inline
void StringSet::clear()
{
  table_.clear();
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not StringSet_INCLUDED */
