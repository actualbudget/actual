// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef types_INCLUDED
#define types_INCLUDED 1

#include <limits.h>
#include <stddef.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#if UINT_MAX >= 0xffffffffL /* 2^32 - 1 */
typedef unsigned int Unsigned32;
typedef int Signed32;
#else
typedef unsigned long Unsigned32;
typedef long Signed32;
#endif

// Number holds values between 0 and 99999999 (eight nines).
typedef Unsigned32 Number;
typedef Unsigned32 Offset;
typedef Unsigned32 Index;

#ifdef SP_MULTI_BYTE

typedef Unsigned32 Char;
typedef Signed32 Xchar;

#else /* not SP_MULTI_BYTE */

typedef unsigned char Char;
// This holds any value of type Char plus InputSource:eE (= -1).
typedef int Xchar;

#endif /* not SP_MULTI_BYTE */

typedef Unsigned32 UnivChar;
typedef Unsigned32 WideChar;

// A character in a syntax reference character set.
// We might want to compile with wide syntax reference characters
// (since they're cheap) but not with wide document characters.
typedef Unsigned32 SyntaxChar;

typedef unsigned short CharClassIndex;

typedef unsigned Token;

#ifdef SP_MULTI_BYTE
typedef unsigned short EquivCode;
#else
typedef unsigned char EquivCode;
#endif

#ifdef SP_NAMESPACE
}
#endif

#endif /* not types_INCLUDED */
