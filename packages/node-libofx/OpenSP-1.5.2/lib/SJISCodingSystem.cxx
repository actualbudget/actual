// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"

#ifdef SP_MULTI_BYTE

#include "SJISCodingSystem.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SJISDecoder : public Decoder {
public:
  SJISDecoder();
  size_t decode(Char *, const char *, size_t, const char **);
private:
};

class SJISEncoder : public RecoveringEncoder {
public:
  SJISEncoder();
  void output(const Char *, size_t, OutputByteStream *);
};

Decoder *SJISCodingSystem::makeDecoder() const
{
  return new SJISDecoder;
}

Encoder *SJISCodingSystem::makeEncoder() const
{
  return new SJISEncoder;
}


SJISDecoder::SJISDecoder()
{
}

size_t SJISDecoder::decode(Char *to, const char *s,
			   size_t slen, const char **rest)
{
  Char *start = to;
  while (slen > 0) {
    unsigned char c = *(unsigned char *)s;
    if (!(c & 0x80)) {
      *to++ = c;
      s++;
      slen--;
    }
    else if (129 <= c && c <= 159) {
      if (slen < 2)
	break;
      s++;
      slen -= 2;
      unsigned char c2 = *(unsigned char *)s++;
      unsigned short n = ((c - 112) << 9) | c2;
      if (64 <= c2 && c2 <= 127)
	n -= 31 + (1 << 8);
      else if (c2 <= 158)
	n -= 32 + (1 << 8);
      else if (c2 <= 252)
	n -= 126;
      else
	continue;
      n |= 0x8080;
      *to++ = n;
    }
    else if (224 <= c && c <= 239) {
      if (slen < 2)
	break;
      s++;
      slen -= 2;
      unsigned char c2 = *(unsigned char *)s++;
      unsigned short n = ((c - 176) << 9) | c2;
      if (64 <= c2 && c2 <= 127)
	n -= 31 + (1 << 8);
      else if (c2 <= 158)
	n -= 32 + (1 << 8);
      else if (c2 <= 252)
	n -= 126;
      else
	continue;
      n |= 0x8080;
      *to++ = n;
    }
    else if (161 <= c && c <= 223) {
      slen--;
      s++;
      *to++ = c;
    }
    else {
      // 128, 160, 240-255
      slen--;
      s++;
    }
  }
  *rest = s;
  return to - start;
}

SJISEncoder::SJISEncoder()
{
}

void SJISEncoder::output(const Char *s, size_t n, OutputByteStream *sb)
{
  for (; n > 0; s++, n--) {
    Char c = *s;
    unsigned short mask = (unsigned short)(c & 0x8080);
    if (mask == 0)
      sb->sputc((unsigned char)(c & 0xff));
    else if (mask == 0x8080) {
      unsigned char c1 = (c >> 8) & 0x7f;
      unsigned char c2 = c & 0x7f;
      unsigned char out1;
      if (c1 < 33)
	out1 = 0;
      else if (c1 < 95)
	out1 = ((c1 + 1) >> 1) + 112;
      else if (c1 < 127)
	out1 = ((c1 + 1) >> 1) + 176;
      else
	out1 = 0;
      if (out1) {
	unsigned char out2;
	if (c1 & 1) {
	  if (c2 < 33)
	    out2 = 0;
	  else if (c2 <= 95)
	    out2 = c2 + 31;
	  else if (c2 <= 126)
	    out2 = c2 + 32;
	  else
	    out2 = 0;
	}
	else {
	  if (33 <= c2 && c2 <= 126)
	    out2 = c2 + 126;
	  else
	    out2 = 0;
	}
	if (out2) {
	  sb->sputc(out1);
	  sb->sputc(out2);
	}
	else
	  handleUnencodable(c, sb);
      }
      else
	handleUnencodable(c, sb);
    }
    else if (mask == 0x0080) {
      if (161 <= c && c <= 223)
	sb->sputc((unsigned char)(c & 0xff));
      else
	handleUnencodable(c, sb);
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
