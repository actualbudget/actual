// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#include "splib.h"

#ifdef SP_MULTI_BYTE

#include "Big5CodingSystem.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Big5Decoder : public Decoder {
public:
  Big5Decoder() { }
  size_t decode(Char *, const char *, size_t, const char **);
private:
};

class Big5Encoder : public Encoder {
public:
  Big5Encoder() { }
  void output(const Char *, size_t, OutputByteStream *);
};

Decoder *Big5CodingSystem::makeDecoder() const
{
  return new Big5Decoder;
}

Encoder *Big5CodingSystem::makeEncoder() const
{
  return new Big5Encoder;
}

size_t Big5Decoder::decode(Char *to, const char *s,
			   size_t slen, const char **rest)
{
  Char *start = to;
  const unsigned char *us = (const unsigned char *)s;
  while (slen > 0) {
    if (!(*us & 0x80)) {
      *to++ = *us++;
      slen--;
    }
    else {
      if (slen < 2)
	break;
      slen -= 2;
      unsigned short n = *us++ << 8;
      n |= *us++;
      *to++ = n;
    }
  }
  *rest = (const char *)us;
  return to - start;
}

void Big5Encoder::output(const Char *s, size_t n, OutputByteStream *sb)
{
  for (; n > 0; s++, n--) {
    Char c = *s;
    if (c < 0x80)
      sb->sputc((unsigned char)c);
    else if (c & 0x8000) {
      sb->sputc((unsigned char)(c >> 8));
      sb->sputc((unsigned char)(c & 0xff));
    }
    else
      handleUnencodable(c, sb);
  }
}

#ifdef SP_NAMESPACE
}
#endif

#else /* not SP_MULTI_BYTE */

#ifndef __GNUG__
static char non_empty_translation_unit;	// sigh
#endif

#endif /* not SP_MULTI_BYTE */
