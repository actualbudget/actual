// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef rtti_INCLUDED
#define rtti_INCLUDED 1

#ifdef SP_HAVE_RTTI

#define DYNAMIC_CAST_PTR(T, p) dynamic_cast<T *>(p)
#define DYNAMIC_CAST_CONST_PTR(T, p) dynamic_cast<const T *>(p)

#define RTTI_CLASS

#define RTTI_DEF0(T)
#define RTTI_DEF1(T, B1)
#define RTTI_DEF2(T, B1, B2)
#define RTTI_DEF3(T, B1, B2, B3)

#else /* not SP_HAVE_RTTI */

#include "TypeId.h"

#define RTTI_CLASS \
public: \
  virtual TypeId dynamicType() const; \
  static inline TypeId staticType() { return TypeId(RTTI_bases_); } \
protected: \
  static const void *RTTI_bases_[]; \
private:

#define RTTI_DEF0(T) \
  const void *T::RTTI_bases_[] = { 0 }; \
  TypeId T::dynamicType() const { return staticType(); }

#define RTTI_DEF1(T, B1) \
  const void *T::RTTI_bases_[] = { B1::RTTI_bases_, 0 }; \
  TypeId T::dynamicType() const { return staticType(); }

#define RTTI_DEF2(T, B1, B2) \
  const void *T::RTTI_bases_[] = { B1::RTTI_bases_, B2::RTTI_bases_, 0 }; \
  TypeId T::dynamicType() const { return staticType(); }

#define RTTI_DEF3(T, B1, B2, B3) \
  const void *T::RTTI_bases_[] = { \
    B1::RTTI_bases_, B2::RTTI_bases_, B3::RTTI_bases_, 0 }; \
  TypeId T::dynamicType() const { return staticType(); }

#define DYNAMIC_CAST_PTR(T, p) \
((p) && (p)->dynamicType().canCast(T::staticType(), (p)->staticType()) \
 ? (T *)(p) \
 : 0)
#define DYNAMIC_CAST_CONST_PTR(T, p) \
((p) && (p)->dynamicType().canCast(T::staticType(), (p)->staticType()) \
 ? (const T *)p \
 : 0)

#endif /* not SP_HAVE_RTTI */

#endif /* not rtti_INCLUDED */
