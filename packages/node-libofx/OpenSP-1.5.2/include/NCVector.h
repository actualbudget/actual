#ifndef NCVector_INCLUDED
#define NCVector_INCLUDED 1

#define Vector NCVector
#define NC

#ifdef SP_DEFINE_TEMPLATES

#undef SP_DEFINE_TEMPLATES
#ifdef Vector_INCLUDED
#undef Vector_INCLUDED
#include "Vector.h"
#define Vector_INCLUDED 1
#else
#include "Vector.h"
#undef Vector_INCLUDED
#endif
#define SP_DEFINE_TEMPLATES 1

#else /* not SP_DEFINE_TEMPLATES */

#ifdef Vector_INCLUDED
#undef Vector_INCLUDED
#include "Vector.h"
#define Vector_INCLUDED 1
#else
#include "Vector.h"
#undef Vector_INCLUDED
#endif

#endif /* not SP_DEFINE_TEMPLATES */

#undef Vector
#undef NC

#endif /* not NCVector_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES

#ifndef NCVector_DEF_INCLUDED
#define NCVector_DEF_INCLUDED 1

#define Vector NCVector
#define NC

#ifdef Vector_DEF_INCLUDED
#undef Vector_DEF_INCLUDED
#include "Vector.cxx"
#define Vector_DEF_INCLUDED 1
#else
#include "Vector.cxx"
#undef Vector_DEF_INCLUDED
#endif

#undef Vector
#undef NC

#endif /* not NCVector_DEF_INCLUDED */

#endif /* SP_DEFINE_TEMPLATES */
