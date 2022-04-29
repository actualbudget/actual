// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Boolean_INCLUDED
#define Boolean_INCLUDED 1

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef SP_HAVE_BOOL

typedef bool Boolean;
#ifdef SP_SIZEOF_BOOL_1
typedef bool PackedBoolean;
#else
typedef char PackedBoolean;
#endif

#else /* not SP_HAVE_BOOL */

typedef int Boolean;
typedef char PackedBoolean;

#endif /* not SP_HAVE_BOOL */

#ifdef SP_NAMESPACE
}
#endif

#ifndef SP_HAVE_BOOL

typedef int bool;

const int true = 1;
const int false = 0;

#endif /* not SP_HAVE_BOOL */

#endif /* not Boolean_INCLUDED */
