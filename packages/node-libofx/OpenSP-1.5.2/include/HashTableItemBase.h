// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef HashTableItemBase_INCLUDED
#define HashTableItemBase_INCLUDED 1

// All hash tables with the same type of key share object code.
// The cost of this is a virtual dtor in HashTableItemBase.

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class K>
class HashTableItemBase {
public:
  HashTableItemBase(const K &k);
  virtual ~HashTableItemBase();
  virtual HashTableItemBase<K> *copy() const = 0;
  K key;
};

template<class K>
struct HashTableKeyFunction {
  static inline const K &key(const HashTableItemBase<K> &obj) {
    return obj.key;
  }
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not HashTableItemBase_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES
#include "HashTableItemBase.cxx"
#endif
