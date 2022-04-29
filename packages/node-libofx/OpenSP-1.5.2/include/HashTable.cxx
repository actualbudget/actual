// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef HashTable_DEF_INCLUDED
#define HashTable_DEF_INCLUDED 1

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class K, class V>
void HashTable<K,V>::insert(const K &key, const V &value, Boolean replace)
{
  HashTableItem<K, V> *newItem = new HashTableItem<K, V>(key, value);
  HashTableItem<K, V> *tem = (HashTableItem<K, V> *)table_.insert(newItem);
  if (tem) {
    delete newItem;
    if (replace) {
      tem->key = key;
      tem->value = value;
    }
  }
}

template<class K, class V>
HashTableItem<K,V>::HashTableItem(const K &k, const V &v)
: HashTableItemBase<K>(k), value(v)
{
}

template<class K, class V>
HashTableItemBase<K> *HashTableItem<K,V>::copy() const
{
  return new HashTableItem<K, V>(*this);
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not HashTable_DEF_INCLUDED */
