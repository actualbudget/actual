// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef TypeId_INCLUDED
#define TypeId_INCLUDED 1

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API TypeId {
public:
  TypeId(const void *const *bases) : bases_(bases) { }
  // Is this object of type ti?
  int isA(TypeId ti) const;
  // Can an object with this dynamic type be cast from a static type FROM
  // to a static type TO?
  int canCast(TypeId to, TypeId from) const;
  int operator==(TypeId ti) const { return bases_ == ti.bases_; }
  int operator!=(TypeId ti) const { return bases_ != ti.bases_; }
private:
  const void *const *bases_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not TypeId_INCLUDED */
