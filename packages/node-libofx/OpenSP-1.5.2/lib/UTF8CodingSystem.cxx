// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"

#ifdef SP_MULTI_BYTE

#include "UTF8CodingSystem.h"
#include "constant.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

enum {
  // cmaskN is mask for first byte to test for N byte sequence
  cmask1 = 0x80,
  cmask2 = 0xe0,
  cmask3 = 0xf0,
  cmask4 = 0xf8,
  cmask5 = 0xfc,
  cmask6 = 0xfe,
  // cvalN is value of masked first byte of N byte sequence
  cval1 = 0x00,
  cval2 = 0xc0,
  cval3 = 0xe0,
  cval4 = 0xf0,
  cval5 = 0xf8,
  cval6 = 0xfc,
  // vmaskN is mask to get value from first byte in N byte sequence
  vmask2 = 0x1f,
  vmask3 = 0xf,
  vmask4 = 0x7,
  vmask5 = 0x3,
  vmask6 = 0x1,
  // minN is minimum legal resulting value for N byte sequence
  min2 = 0x80,
  min3 = 0x800,
  min4 = 0x10000,
  min5 = 0x200000,
  min6 = 0x4000000,
  max6 = 0x7fffffff
};

class UTF8Decoder : public Decoder {
public:
  UTF8Decoder();
  size_t decode(Char *, const char *, size_t, const char **);
  Boolean convertOffset(unsigned long &offset) const;
private:
  // value for encoding error
  enum { invalid = 0xfffd };
  Boolean recovering_;
  PackedBoolean hadFirstChar_;
  PackedBoolean hadByteOrderMark_;
};

class UTF8Encoder : public Encoder {
public:
  UTF8Encoder();
  void output(const Char *, size_t, OutputByteStream *);
};

Decoder *UTF8CodingSystem::makeDecoder() const
{
  return new UTF8Decoder;
}

Encoder *UTF8CodingSystem::makeEncoder() const
{
  return new UTF8Encoder;
}


UTF8Decoder::UTF8Decoder()
: recovering_(0), hadFirstChar_(0), hadByteOrderMark_(0)
{
}

size_t UTF8Decoder::decode(Char *to, const char *s,
			  size_t slen, const char **result)
{
  // Check for byte-order mark
  if (!hadFirstChar_ && slen >= 3) {
    hadFirstChar_ = 1;

    if ((unsigned char)s[0] == 0xEF &&
        (unsigned char)s[1] == 0xBB &&
        (unsigned char)s[2] == 0xBF) {
      s += 3;
      slen -= 3;
      hadByteOrderMark_ = 1;
    }
  }
  Char *start = to;
  const unsigned char *us = (const unsigned char *)s;
  if (recovering_) {
    recovering_ = 0;
    goto recover;
  }
  while (slen > 0) {
    unsigned c0;
    c0 = us[0];
    if ((c0 & cmask1) == cval1) {
      *to++ = c0;
      us++;
      slen--;
    }
    else if ((c0 & cmask2) == cval2) {
      if (slen < 2)
	goto done;
      unsigned c1 = us[1] ^ 0x80;
      if (c1 & 0xc0)
	goto error;
      unsigned c = ((c0 & vmask2) << 6) | c1;
      if (c < min2)
	c = invalid;
      *to++ = c;
      slen -= 2;
      us += 2;
    }
    else if ((c0 & cmask3) == cval3) {
      if (slen < 3)
	goto done;
      unsigned c1 = us[1] ^ 0x80;
      unsigned c2 = us[2] ^ 0x80;
      if ((c1 | c2) & 0xc0)
	goto error;
      unsigned c = ((((c0 & vmask3) << 6) | c1) << 6) | c2;
      if (c < min3)
	c = invalid;
      *to++ = c;
      slen -= 3;
      us += 3;
    }
    else if ((c0 & cmask4) == cval4) {
      if (slen < 4)
	goto done;
      unsigned c1 = us[1] ^ 0x80;
      unsigned c2 = us[2] ^ 0x80;
      unsigned c3 = us[3] ^ 0x80;
      if ((c1 | c2 | c3) & 0xc0)
	goto error;
      if (charMax < min5 - 1)
	*to++ = invalid;
      else {
	unsigned long c = ((((c0 & vmask4) << 6) | c1) << 6) | c2;
	c = (c << 6) | c3;
	if (c < min4)
	  c = invalid;
	*to++ = c;
      }
      slen -= 4;
      us += 4;
    }
    else if ((c0 & cmask5) == cval5) {
      if (slen < 5)
	goto done;
      unsigned c1 = us[1] ^ 0x80;
      unsigned c2 = us[2] ^ 0x80;
      unsigned c3 = us[3] ^ 0x80;
      unsigned c4 = us[4] ^ 0x80;
      if ((c1 | c2 | c3 | c4) & 0xc0)
	goto error;
      if (charMax < min6 - 1)
	*to++ = invalid;
      else {
	unsigned long c = ((((c0 & vmask5) << 6) | c1) << 6) | c2;
	c = (((c << 6) | c3) << 6) | c4;
	if (c < min5)
	  c = invalid;
	*to++ = c;
      }
      slen -= 5;
      us += 5;
    }
    else if ((c0 & cmask6) == cval6) {
      if (slen < 6)
	goto done;
      unsigned c1 = us[1] ^ 0x80;
      unsigned c2 = us[2] ^ 0x80;
      unsigned c3 = us[3] ^ 0x80;
      unsigned c4 = us[4] ^ 0x80;
      unsigned c5 = us[5] ^ 0x80;
      if ((c1 | c2 | c3 | c4 | c5) & 0xc0)
	goto error;
      if (charMax < max6)
	*to++ = invalid;
      else {
	unsigned long c = ((((c0 & vmask6) << 6) | c1) << 6) | c2;
	c = (((((c << 6) | c3) << 6) | c4) << 6) | c5;
	if (c < min6)
	  c = invalid;
	*to++ = c;
      }
      slen -= 6;
      us += 6;
    }
    else {
    error:
      us++;
      slen--;
      *to++ = invalid;
    recover:
      for (;;) {
	if (slen == 0) {
	  recovering_ = 1;
	  goto done;
	}
	if ((*us & 0xc0) != 0x80)
	  break;
	us++;
	slen--;
      }
    }
  }
 done:
  *result = (char *)us;
  return to - start;
}

Boolean UTF8Decoder::convertOffset(unsigned long &n) const
{
  if (hadByteOrderMark_)
    n += 3;

  return true;
}

UTF8Encoder::UTF8Encoder()
{
}

void UTF8Encoder::output(const Char *s, size_t n, OutputByteStream *sb)
{
  for (; n > 0; s++, n--) {
    Char c = *s;
    if (c < min2)
      sb->sputc((unsigned char)c);
    else if (c < min3) {
      sb->sputc((c >> 6) | cval2);
      sb->sputc((c & 0x3f) | 0x80);
    }
    else if (c < min4) {
      sb->sputc((c >> 12) | cval3);
      sb->sputc(((c >> 6) & 0x3f) | 0x80);
      sb->sputc((c & 0x3f) | 0x80);
    }
    else if (c < min5) {
      sb->sputc((c >> 18) | cval4);
      sb->sputc(((c >> 12) & 0x3f) | 0x80);
      sb->sputc(((c >> 6) & 0x3f) | 0x80);
      sb->sputc((c & 0x3f) | 0x80);
    }
    else if (c < min6) {
      sb->sputc((c >> 24) | cval5);
      sb->sputc(((c >> 18) & 0x3f) | 0x80);
      sb->sputc(((c >> 12) & 0x3f) | 0x80);
      sb->sputc(((c >> 6) & 0x3f) | 0x80);
      sb->sputc((c & 0x3f) | 0x80);
    }
    else if (c <= max6) {
      sb->sputc((c >> 30) | cval6);
      sb->sputc(((c >> 24) & 0x3f) | 0x80);
      sb->sputc(((c >> 18) & 0x3f) | 0x80);
      sb->sputc(((c >> 12) & 0x3f) | 0x80);
      sb->sputc(((c >> 6) & 0x3f) | 0x80);
      sb->sputc((c & 0x3f) | 0x80);
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
