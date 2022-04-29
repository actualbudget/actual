// Copyright (c) 2000 Matthias Clasen
// See the file COPYING for copying permission.

#include "splib.h"

#ifdef SP_MULTI_BYTE

#include "UTF16CodingSystem.h"
#include "constant.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class UTF16Decoder : public Decoder {
public:
  UTF16Decoder(Boolean lsbFirst);
  size_t decode(Char *, const char *, size_t, const char **);
private:
  // value for encoding error
  enum { invalid = 0xfffd };
  Boolean lsbFirst_;
};

class UTF16Encoder : public Encoder {
public:
  UTF16Encoder();
  void output(const Char *, size_t, OutputByteStream *);
};

Decoder *UTF16CodingSystem::makeDecoder(Boolean lsbFirst) const
{
  return new UTF16Decoder(lsbFirst);
}

Encoder *UTF16CodingSystem::makeEncoder() const
{
  return new UTF16Encoder;
}


UTF16Decoder::UTF16Decoder(Boolean lsbFirst)
: lsbFirst_(lsbFirst)
{
}

size_t UTF16Decoder::decode(Char *to, const char *from,
			  size_t fromLen, const char **rest)
{
  Char *start = to;
  const unsigned char *us = (const unsigned char *)from;
  for (;;) {
    if (fromLen < 2) 
      break;
    Unsigned32 x = lsbFirst_ ? (us[1] << 8) + us[0]
                             : (us[0] << 8) + us[1];
    if (x < 0xd800 || x > 0xdfff) {
      *to++ = x;
      us += 2;
      fromLen -= 2;
      continue;
    } 
    if (x > 0xdbff) {
      // FIXME: unpaired RC element
      *to++ = invalid;
      us += 2;
      fromLen -= 2;
      continue;
    }
    if (fromLen < 4)
      break;
    Unsigned32 y = lsbFirst_ ? (us[3] << 8) + us[2]
                             : (us[2] << 8) + us[3];
    if (y < 0xd800 || y > 0xdfff) {
      // FIXME: unpaired RC element
      *to++ = invalid;
      *to++ = y;
      us += 4;
      fromLen -= 4;
      continue;
    }
    if (y < 0xdc00) {
      // FIXME: unpaired RC element
      *to++ = invalid;
      us += 2;
      fromLen -= 2;
      continue;
    } 
    *to++ = ((x - 0xd800) * 0x400 + (y - 0xdc00)) + 0x10000; 
    us += 4;
    fromLen -= 4;
  } 
  *rest = (char *)us;
  return to - start;
}

UTF16Encoder::UTF16Encoder()
{
}

void UTF16Encoder::output(const Char *s, size_t n, OutputByteStream *sb)
{
  for (;n > 0;n--, s++) {
    Char c = *s;
    if (c < 0x10000) {
      sb->sputc((c >> 8) & 0xff);
      sb->sputc(c & 0xff);
    } 
    else { 
      Unsigned32 y = ((c - 0x10000) / 0x400) + 0xd800;
      Unsigned32 z = ((c - 0x10000) % 0x400) + 0xdc00;
      sb->sputc((y >> 8) & 0xff);
      sb->sputc(y & 0xff);
      sb->sputc((z >> 8) & 0xff);
      sb->sputc(z & 0xff);
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
