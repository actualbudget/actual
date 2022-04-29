// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef NamedTable_INCLUDED
#define NamedTable_INCLUDED 1

#include "Hash.h"
#include "StringC.h"
#include "Named.h"
#include "OwnerTable.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class NamedTableKeyFunction {
public:
  static inline const StringC &key(const Named &obj) { return obj.name(); }
};

template<class T> class NamedTableIter;
template<class T> class ConstNamedTableIter;

template<class T>
class NamedTable {
public:
  NamedTable() { }
  T *insert(T *p) { return (T *)table_.insert(p); }
  T *lookup(const StringC &str) const { return (T *)table_.lookup(str); }
  T *remove(const StringC &str) { return (T *)table_.remove(str); }
  size_t count() const { return table_.count(); }
  void clear() { table_.clear(); }
  void swap(NamedTable<T> &to) { table_.swap(to.table_); }
private:
  NamedTable(const NamedTable<T> &); // undefined
  void operator=(const NamedTable<T> &); // undefined
  OwnerTable<Named, StringC, Hash, NamedTableKeyFunction>
    table_;
  friend class NamedTableIter<T>;
  friend class ConstNamedTableIter<T>;
};

template<class T>
class NamedTableIter {
public:
  NamedTableIter(const NamedTable<T> &table) : iter_(table.table_) { }
  T *next() { return (T *)iter_.next(); }
private:
  OwnerTableIter<Named, StringC, Hash, NamedTableKeyFunction> iter_;
};

template<class T>
class ConstNamedTableIter {
public:
  ConstNamedTableIter(const NamedTable<T> &table) : iter_(table.table_) { }
  const T *next() { return (T *)iter_.next(); }
private:
  OwnerTableIter<Named, StringC, Hash, NamedTableKeyFunction> iter_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not NamedTable_INCLUDED */
