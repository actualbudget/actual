// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"

#ifdef SP_MULTI_BYTE

#include "EUCJPCodingSystem.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class EUCJPDecoder : public Decoder {
public:
  EUCJPDecoder() { }
  size_t decode(Char *, const char *, size_t, const char **);
private:
};

class EUCJPEncoder : public Encoder {
public:
  EUCJPEncoder() { }
  void output(const Char *, size_t, OutputByteStream *);
};

Decoder *EUCJPCodingSystem::makeDecoder() const
{
  return new EUCJPDecoder;
}

Encoder *EUCJPCodingSystem::makeEncoder() const
{
  return new EUCJPEncoder;
}

size_t EUCJPDecoder::decode(Char *to, const char *s,
			    size_t slen, const char **rest)
{
  Char *start = to;
  const unsigned char *us = (const unsigned char *)s;
  while (slen > 0) {
    if (!(*us & 0x80)) {
      // G0
      *to++ = *us++;
      slen--;
    }
    else if (*us == 0x8e) {
      // G2
      if (slen < 2)
	break;
      slen -= 2;
      ++us;
      *to++ = *us++ | 0x80;
    }
    else if (*us == 0x8f) {
      // G3
      if (slen < 3)
	break;
      slen -= 3;
      ++us;
      unsigned short n = (*us++ | 0x80) << 8;
      n |= (*us++ & ~0x80);
      *to++ = n;
    }
    else {
      // G1
      if (slen < 2)
	break;
      slen -= 2;
      unsigned short n = *us++ << 8;
      n |= (*us++ | 0x80);
      *to++ = n;
    }
  }
  *rest = (const char *)us;
  return to - start;
}


void EUCJPEncoder::output(const Char *s, size_t n, OutputByteStream *sb)
{
  for (; n > 0; s++, n--) {
    Char c = *s;
    unsigned short mask = (unsigned short)(c & 0x8080);
    if (mask == 0)
      sb->sputc((unsigned char)(c & 0xff));
    else if (mask == 0x8080) {
      sb->sputc((unsigned char)((c >> 8) & 0xff));
      sb->sputc((unsigned char)(c & 0xff));
    }
    else if (mask == 0x0080) {
      sb->sputc((unsigned char)0x8e);
      sb->sputc((unsigned char)(c & 0xff));
    }
    else {
      // mask == 0x8000
      sb->sputc((unsigned char)0x8f);
      sb->sputc((unsigned char)((c >> 8) & 0xff));
      sb->sputc((unsigned char)(c & 0x7f));
    }
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
