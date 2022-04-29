// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef NamedResourceTable_INCLUDED
#define NamedResourceTable_INCLUDED 1

#include "NamedResource.h"
#include "PointerTable.h"
#include "StringC.h"
#include "Hash.h"
#include "Ptr.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct NamedResourceKeyFunction {
  static inline
    const StringC &key(const NamedResource &p) {
      return p.name();
    }
};

template<class T> class NamedResourceTableIter;
template<class T> class ConstNamedResourceTableIter;

template<class T>
class NamedResourceTable {
#ifdef __lucid
  struct X {
    Ptr<T> _X; // work around lcc bug
  };
#endif
public:
  NamedResourceTable() { }
  Ptr<T> insert(const Ptr<T> &p, Boolean replace = 0) {
    return (T *)table_.insert((NamedResource *)p.pointer(), replace).pointer();
  }
  Ptr<T> lookup(const StringC &str) const {
    return (T *)table_.lookup(str).pointer();
  }
  ConstPtr<T> lookupConst(const StringC &str) const {
    return (T *)table_.lookup(str).pointer();
  }
  const T *lookupTemp(const StringC &str) const {
    return (const T *)table_.lookup(str).pointer();
  }
  Ptr<T> remove(const StringC &str) {
    return (T *)table_.remove(str).pointer();
  }
  size_t count() const { return table_.count(); }
  void clear() { table_.clear(); }
  void swap(NamedResourceTable<T> &to) { table_.swap(to.table_); }
private:
  PointerTable<Ptr<NamedResource>, StringC, Hash,
	       NamedResourceKeyFunction> table_;
  friend class NamedResourceTableIter<T>;
  friend class ConstNamedResourceTableIter<T>;
};

template<class T>
class NamedResourceTableIter {
public:
  NamedResourceTableIter(const NamedResourceTable<T> &table)
  : iter_(table.table_) { }
  Ptr<T> next() {
    return (T *)iter_.next().pointer();
  }
private:
  PointerTableIter<Ptr<NamedResource>, StringC, Hash,
                   NamedResourceKeyFunction> iter_;
};

template<class T>
class ConstNamedResourceTableIter {
public:
  ConstNamedResourceTableIter(const NamedResourceTable<T> &table)
  : iter_(table.table_) { }
  ConstPtr<T> next() {
    return (T *)iter_.next().pointer();
  }
  const T *nextTemp() {
    return (const T *)iter_.next().pointer();
  }
private:
  PointerTableIter<Ptr<NamedResource>, StringC, Hash,
                   NamedResourceKeyFunction> iter_;
};
  
#ifdef SP_NAMESPACE
}
#endif

#endif /* not NamedResourceTable_INCLUDED */
