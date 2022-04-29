// Copyright (c) 1994 James Clark, 2000 Matthias Clasen
// See the file COPYING for copying permission.

#include "splib.h"

#ifdef SP_MULTI_BYTE

#include "Fixed2CodingSystem.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Fixed2Decoder : public Decoder {
public:
  Fixed2Decoder(Boolean lsbFirst);
  size_t decode(Char *to, const char *from, size_t fromLen,
		const char **rest);
  Boolean convertOffset(unsigned long &offset) const;
private:
  Boolean lsbFirst_;
};

class Fixed2Encoder : public RecoveringEncoder {
public:
  Fixed2Encoder();
  void output(const Char *, size_t, OutputByteStream *);
};

Decoder *Fixed2CodingSystem::makeDecoder(Boolean lsbFirst) const
{
  return new Fixed2Decoder(lsbFirst);
}

Encoder *Fixed2CodingSystem::makeEncoder() const
{
  return new Fixed2Encoder;
}

unsigned Fixed2CodingSystem::fixedBytesPerChar() const
{
  return 2;
}

Fixed2Decoder::Fixed2Decoder(Boolean lsbFirst)
: Decoder(2), lsbFirst_(lsbFirst)
{
}

size_t Fixed2Decoder::decode(Char *to, const char *from, size_t fromLen,
			   const char **rest)
{
  if (sizeof(Char) == 2 && from == (char *)to
      && 
#ifndef SP_BIG_ENDIAN
      !
#endif
       lsbFirst_) {
    *rest = from + (fromLen & ~1);
    return fromLen/2;
  }
  fromLen &= ~1;
  *rest = from + fromLen;
  for (size_t n = fromLen; n > 0; n -= 2) {
    *to++ = lsbFirst_ 
             ? ((unsigned char)from[1] << 8) + (unsigned char)from[0] 
             : ((unsigned char)from[0] << 8) + (unsigned char)from[1];
    from += 2;
  }
  return fromLen/2;
}

Boolean Fixed2Decoder::convertOffset(unsigned long &n) const
{
  n *= 2;
  return true;
}

Fixed2Encoder::Fixed2Encoder()
{
}

void Fixed2Encoder::output(const Char *s, size_t n, OutputByteStream *sb)
{
  for (size_t i = 0; i < n; i++) {
    Char c = s[i];
    if (c > 0xffff)
      handleUnencodable(c, sb);
    else {
     sb->sputc((c >> 8) & 0xff);
     sb->sputc(c & 0xff);
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
