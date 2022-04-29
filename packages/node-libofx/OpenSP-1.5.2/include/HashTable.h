// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef HashTable_INCLUDED
#define HashTable_INCLUDED 1

#include <stddef.h>
#include "OwnerTable.h"
#include "Hash.h"
#include "Boolean.h"
#include "HashTableItemBase.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class K, class V>
class HashTableItem : public HashTableItemBase<K> {
public:
  HashTableItem(const K &k, const V &v);
  HashTableItemBase<K> *copy() const;
  V value;
};

template<class K, class V> class HashTableIter;

template<class K, class V>
class HashTable {
public:
  HashTable() { }
  void insert(const K &key, const V &value, Boolean replace = 1);
  const V *lookup(const K &key) const {
    HashTableItem<K, V> *tem = (HashTableItem<K, V> *)table_.lookup(key);
    return tem ? &tem->value : 0;
  }
  size_t count() const { return table_.count(); }
private:
  CopyOwnerTable<HashTableItemBase<K>, K, Hash, HashTableKeyFunction<K> > table_;
friend class HashTableIter<K,V>;
};

template<class K, class V>
class HashTableIter {
public:
  HashTableIter(const HashTable<K, V> &table) : iter_(table.table_) { }
  Boolean next(const K *&key, const V *&value) {
    HashTableItem<K, V> *p = (HashTableItem<K, V> *)iter_.next();
    if (p) {
      key = &p->key;
      value = &p->value;
      return 1;
    }
    else
      return 0;
  }
private:
  OwnerTableIter<HashTableItemBase<K>, K, Hash, HashTableKeyFunction<K> > iter_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not HashTable_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES
#include "HashTable.cxx"
#endif
