// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
#include "IdentityCodingSystem.h"
#include <limits.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class IdentityDecoder : public Decoder {
public:
  size_t decode(Char *to, const char *from, size_t fromLen,
		const char **rest);
  Boolean convertOffset(unsigned long &offset) const;
};

class IdentityEncoder : public RecoveringEncoder {
public:
  IdentityEncoder();
  void output(const Char *, size_t, OutputByteStream *);
};

IdentityCodingSystem::IdentityCodingSystem()
{
}

Decoder *IdentityCodingSystem::makeDecoder() const
{
  return new IdentityDecoder;
}

Encoder *IdentityCodingSystem::makeEncoder() const
{
  return new IdentityEncoder;
}

Boolean IdentityCodingSystem::isIdentity() const
{
  return 1;
}

size_t IdentityDecoder::decode(Char *to, const char *from, size_t fromLen,
			       const char **rest)
{
  if (sizeof(Char) == sizeof(char) && from == (char *)to) {
    *rest = from + fromLen;
    return fromLen;
  }
  for (size_t n = fromLen; n > 0; n--)
    *to++ = (unsigned char)*from++; // zero extend
  *rest = from;
  return fromLen;
}

Boolean IdentityDecoder::convertOffset(unsigned long &) const
{
  return true;
}

IdentityEncoder::IdentityEncoder()
{
}

void IdentityEncoder::output(const Char *s, size_t n, OutputByteStream *sb)
{
  if (sizeof(Char) != sizeof(char)) {
    for (size_t i = 0; i < n; i++) {
      Char c = s[i];
      if (c > UCHAR_MAX)
	handleUnencodable(c, sb);
      else
	sb->sputc((unsigned char)c);
    }
  }
  else
    sb->sputn((const char *)s, n);
}

#ifdef SP_NAMESPACE
}
#endif
