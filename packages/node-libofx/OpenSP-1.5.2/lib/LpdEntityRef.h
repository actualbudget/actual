// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef LpdEntityRef_INCLUDED
#define LpdEntityRef_INCLUDED 1

#include "Entity.h"
#include "Boolean.h"
#include "Ptr.h"

// Information about a reference to an entity that
// used a definition in an LPD.

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct LpdEntityRef {
  ConstPtr<Entity> entity;
  PackedBoolean lookedAtDefault;
  PackedBoolean foundInPass1Dtd;
  static inline const LpdEntityRef &key(const LpdEntityRef &r) { return r; }
  static inline unsigned long hash(const LpdEntityRef &r) {
    return Hash::hash(r.entity->name());
  }
};

inline
Boolean operator==(const LpdEntityRef &r1, const LpdEntityRef &r2)
{
  return (r1.entity == r2.entity
	  && r1.foundInPass1Dtd == r2.foundInPass1Dtd
	  && r1.lookedAtDefault == r2.lookedAtDefault);
}

inline
Boolean operator!=(const LpdEntityRef &r1, const LpdEntityRef &r2)
{
  return !(r1 == r2);
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not LpdEntityRef_INCLUDED */
