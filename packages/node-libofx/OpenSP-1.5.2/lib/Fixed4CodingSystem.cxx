// Copyright (c) 2000 Matthias Clasen
// See the file COPYING for copying permission.

#include "splib.h"

#ifdef SP_MULTI_BYTE

#include "Fixed4CodingSystem.h"
#include "macros.h"
#include "constant.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Fixed4Decoder : public Decoder {
public:
  Fixed4Decoder(Boolean lsbFirst, Boolean lswFirst);
  size_t decode(Char *to, const char *from, size_t fromLen,
		const char **rest);
  Boolean convertOffset(unsigned long &offset) const;
private:
  // value for encoding error
  enum { invalid = 0xfffd };
  Boolean lsbFirst_;
  Boolean lswFirst_;
};

class Fixed4Encoder : public Encoder {
public:
  Fixed4Encoder();
  ~Fixed4Encoder();
  void output(Char *, size_t, OutputByteStream *);
  void output(const Char *, size_t, OutputByteStream *);
private:
  void allocBuf(size_t);
  char *buf_;
  size_t bufSize_;
};

Decoder *Fixed4CodingSystem::makeDecoder(Boolean lsbFirst, Boolean lswFirst) const
{
  return new Fixed4Decoder(lsbFirst, lswFirst);
}

Encoder *Fixed4CodingSystem::makeEncoder() const
{
  return new Fixed4Encoder;
}

unsigned Fixed4CodingSystem::fixedBytesPerChar() const
{
  return 4;
}

Fixed4Decoder::Fixed4Decoder(Boolean lsbFirst, Boolean lswFirst)
: Decoder(4), lsbFirst_(lsbFirst), lswFirst_(lswFirst)
{
}

size_t Fixed4Decoder::decode(Char *to, const char *from, size_t fromLen,
			   const char **rest)
{
#if 0
  // FIXME for this optimization I need autoconf macros that tell
  // me the byte order in 32bit words: 1234, 4321, 2143 or 3412.
  // Look at the corresponding optimization in Fixed2Decoder.
  if (sizeof(Char) == 4 && from == (char *)to) {
    *rest = from + (fromLen & ~3);
    for (size_t n = 0; n < fromLen/4; n++)
      if (charMax < to[n])
        to[n] = invalid;
    return fromLen/4;
  }
#endif
  fromLen &= ~3;
  *rest = from + fromLen;
  //  lsbFirst,  lswFirst: 0123
  //  lsbFirst, !lswFirst: 2301
  // !lsbFirst,  lswFirst: 1032
  // !lsbFirst, !lswFirst: 3210   
  size_t shift0 = 8*(!lsbFirst_ + 2*!lswFirst_); 
  size_t shift1 = 8*(lsbFirst_ + 2*!lswFirst_); 
  size_t shift2 = 8*(!lsbFirst_ + 2*lswFirst_); 
  size_t shift3 = 8*(lsbFirst_ + 2*lswFirst_); 
  for (size_t n = fromLen; n > 0; n -= 4) {
    Unsigned32 c = ((unsigned char)from[0] << shift0) 
                 + ((unsigned char)from[1] << shift1) 
                 + ((unsigned char)from[2] << shift2) 
	         + ((unsigned char)from[3] << shift3);
    *to++ = charMax < c ? invalid : c;
    from += 4;
  }
  return fromLen/4;
}

Boolean Fixed4Decoder::convertOffset(unsigned long &n) const
{
  n *= 4;
  return true;
}

Fixed4Encoder::Fixed4Encoder()
: buf_(0), bufSize_(0)
{
}

Fixed4Encoder::~Fixed4Encoder()
{
  delete [] buf_;
}

void Fixed4Encoder::allocBuf(size_t n)
{
  if (bufSize_ < n) {
    delete [] buf_;
    buf_ = new char[bufSize_ = n];
  }
}

void Fixed4Encoder::output(Char *s, size_t n, OutputByteStream *sb)
{
#ifdef SP_BIG_ENDIAN
  if (sizeof(Char) == 4) {
    sb->sputn((char *)s, n*4);
    return;
  }
#endif
  ASSERT(sizeof(Char) >= 4);
  char *p = (char *)s;
  for (size_t i = 0; i < n; i++) {
    Char c = s[i];
    *p++ = (c >> 24) & 0xff;
    *p++ = (c >> 16) & 0xff;
    *p++ = (c >> 8) & 0xff;
    *p++ = c & 0xff;
  }
  sb->sputn((char *)s, n*4);
}

void Fixed4Encoder::output(const Char *s, size_t n, OutputByteStream *sb)
{
#ifdef SP_BIG_ENDIAN
  if (sizeof(Char) == 4) {
    sb->sputn((char *)s, n*4);
    return;
  }
#endif
  allocBuf(n*4);
  for (size_t i = 0; i < n; i++) {
    buf_[i*4] = (s[i] >> 24) & 0xff;
    buf_[i*4 + 1] = (s[i] >> 16) & 0xff;
    buf_[i*4 + 2] = (s[i] >> 8) & 0xff;
    buf_[i*4 + 3] = s[i] & 0xff;
  }
  sb->sputn(buf_, n*4);
}

#ifdef SP_NAMESPACE
}
#endif

#else /* not SP_MULTI_BYTE */

#ifndef __GNUG__
static char non_empty_translation_unit;	// sigh
#endif

#endif /* not SP_MULTI_BYTE */
