// Copyright (c) 1994 James Clark, 2000 Matthias Clasen
// See the file COPYING for copying permission.

#include "splib.h"

#ifdef SP_MULTI_BYTE

#include "UnicodeCodingSystem.h"
#include "UTF16CodingSystem.h"
#include "macros.h"
#include "Owner.h"

#include <stddef.h>
#include <string.h>
#ifdef DECLARE_MEMMOVE
extern "C" {
  void *memmove(void *, const void *, size_t);
}
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

const unsigned short byteOrderMark = 0xfeff;
const unsigned short swappedByteOrderMark = 0xfffe;

class UnicodeDecoder : public Decoder {
public:
  UnicodeDecoder(const InputCodingSystem *sub);
  size_t decode(Char *to, const char *from, size_t fromLen,
		const char **rest);
  Boolean convertOffset(unsigned long &offset) const;
private:
  PackedBoolean hadByteOrderMark_;
  PackedBoolean swapBytes_;
  Owner<Decoder> subDecoder_;
  const InputCodingSystem *subCodingSystem_;
};

class UnicodeEncoder : public Encoder {
public:
  UnicodeEncoder();
  void output(const Char *, size_t, OutputByteStream *);
  void startFile(OutputByteStream *);
private:
  Owner<Encoder> subEncoder_;
};

UnicodeCodingSystem::UnicodeCodingSystem(const InputCodingSystem *sub)
: sub_(sub)
{
}

Decoder *UnicodeCodingSystem::makeDecoder() const
{
  return new UnicodeDecoder(sub_);
}

Encoder *UnicodeCodingSystem::makeEncoder() const
{
  return new UnicodeEncoder;
}

UnicodeDecoder::UnicodeDecoder(const InputCodingSystem *subCodingSystem)
: Decoder(subCodingSystem ? 1 : 2), subCodingSystem_(subCodingSystem),
  hadByteOrderMark_(0), swapBytes_(0)
{
}


size_t UnicodeDecoder::decode(Char *to, const char *from, size_t fromLen,
			      const char **rest)
{
  union U {
    unsigned short word;
    char bytes[2];
  };
    
  if (subDecoder_)
    return subDecoder_->decode(to, from, fromLen, rest);
    if (fromLen < 2) {
      *rest = from;
      return 0;
    }
    minBytesPerChar_ = 2;
    U u;
    u.bytes[0] = from[0];
    u.bytes[1] = from[1];
    if (u.word == byteOrderMark) {
      hadByteOrderMark_ = 1;
      from += 2;
      fromLen -= 2;
    }
    else if (u.word == swappedByteOrderMark) {
      hadByteOrderMark_ = 1;
      from += 2;
      fromLen -= 2;
      swapBytes_ = 1;
    }
  if (hadByteOrderMark_ || !subCodingSystem_)
    subCodingSystem_ = new UTF16CodingSystem;
  subDecoder_ = subCodingSystem_->makeDecoder(swapBytes_);
      minBytesPerChar_ = subDecoder_->minBytesPerChar();
      return subDecoder_->decode(to, from, fromLen, rest);
}

Boolean UnicodeDecoder::convertOffset(unsigned long &n) const
{
  subDecoder_->convertOffset(n);
  if (hadByteOrderMark_)
    n += 2;
  return true;
}

UnicodeEncoder::UnicodeEncoder()
{
  UTF16CodingSystem utf16;
  subEncoder_ = utf16.makeEncoder();
}

void UnicodeEncoder::startFile(OutputByteStream *sb)
{
  const unsigned short n = byteOrderMark;
  sb->sputn((char *)&n, 2);
}

void UnicodeEncoder::output(const Char *s, size_t n, OutputByteStream *sb)
{
  subEncoder_->output(s, n, sb);
}

#ifdef SP_NAMESPACE
}
#endif

#else /* not SP_MULTI_BYTE */

#ifndef __GNUG__
static char non_empty_translation_unit;	// sigh
#endif

#endif /* not SP_MULTI_BYTE */
