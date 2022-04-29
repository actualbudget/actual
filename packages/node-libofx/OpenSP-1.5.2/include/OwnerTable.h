// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef OwnerTable_INCLUDED
#define OwnerTable_INCLUDED 1

#include "PointerTable.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T, class K, class HF, class KF>
class OwnerTable : public PointerTable<T *, K, HF, KF> {
public:
  OwnerTable() { }
  ~OwnerTable();
  void clear();
  void swap(OwnerTable<T, K, HF, KF> &x) {
    PointerTable<T *, K, HF, KF>::swap(x);
  }
private:
  OwnerTable(const OwnerTable<T, K, HF, KF> &);
  void operator=(const OwnerTable<T, K, HF, KF> &);
};

template<class T, class K, class HF, class KF>
class OwnerTableIter : public PointerTableIter<T *, K, HF, KF> {
public:
  OwnerTableIter(const OwnerTable<T, K, HF, KF> &table)
    : PointerTableIter<T *, K, HF, KF>(table) { }
};

template<class T, class K, class HF, class KF>
class CopyOwnerTable : public OwnerTable<T, K, HF, KF> {
public:
  CopyOwnerTable() { }
  CopyOwnerTable(const CopyOwnerTable<T, K, HF, KF> &tab) { *this = tab; }
  void operator=(const CopyOwnerTable<T, K, HF, KF> &tab);
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not OwnerTable_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES
#include "OwnerTable.cxx"
#endif
