// Copyright (c) 1994, 1997 James Clark, 2000 Matthias Clasen
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"

#ifdef SP_MULTI_BYTE

#include "XMLCodingSystem.h"
#include "UTF8CodingSystem.h"
#include "UTF16CodingSystem.h"
#include "Fixed4CodingSystem.h"
#include "CodingSystemKit.h"
#include "Boolean.h"
#include "Owner.h"
#include "macros.h"
#include <stddef.h>
#include <string.h>

#ifdef SP_DECLARE_MEMMOVE
extern "C" {
  void *memmove(void *, const void *, size_t);
}
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

const Char ISO646_TAB = 0x9;
const Char ISO646_LF = 0xA;
const Char ISO646_CR = 0xD;
const Char ISO646_SPACE = 0x20;
const Char ISO646_QUOT = 0x22;
const Char ISO646_APOS = 0x27;
const Char ISO646_LT = 0x3C;
const Char ISO646_EQUAL = 0x3D;
const Char ISO646_GT = 0x3E;
const Char ISO646_QUEST = 0x3F;
const Char ISO646_LETTER_a = 0x61;
const Char ISO646_LETTER_c = 0x63;
const Char ISO646_LETTER_d = 0x64;
const Char ISO646_LETTER_e = 0x65;
const Char ISO646_LETTER_g = 0x67;
const Char ISO646_LETTER_i = 0x69;
const Char ISO646_LETTER_l = 0x6C;
const Char ISO646_LETTER_m = 0x6D;
const Char ISO646_LETTER_n = 0x6E;
const Char ISO646_LETTER_o = 0x6F;
const Char ISO646_LETTER_x = 0x78;

class XMLDecoder : public Decoder {
public:
  XMLDecoder(const InputCodingSystemKit *);
  size_t decode(Char *to, const char *from, size_t fromLen,
		const char **rest);
  Boolean convertOffset(unsigned long &offset) const;
private:

  // Don't keep parsing a PI longer than this.
  // We want to avoid reading some enormous file into memory just because
  // some quote was left off.
  enum { piMaxSize = 1024*32 };

  void initDecoderDefault();
  void initDecoderPI();
  Boolean extractEncoding(StringC &name);
  static Boolean isWS(Char);

  enum DetectPhase {
    phaseInit,
    phasePI,
    phaseFinish
  };
  DetectPhase phase_;
  Boolean byteOrderMark_;
  Boolean lsbFirst_;
  Boolean lswFirst_;
  int guessBytesPerChar_;
  Owner<Decoder> subDecoder_;
  // Contains all the characters passed to caller that were
  // not produced by subDecoder_.
  StringC pi_;
  Char piLiteral_;
  const InputCodingSystemKit *kit_;
};

XMLCodingSystem::XMLCodingSystem(const InputCodingSystemKit *kit)
: kit_(kit)
{
}

Decoder *XMLCodingSystem::makeDecoder() const
{
  return new XMLDecoder(kit_);
}

Encoder *XMLCodingSystem::makeEncoder() const
{
  UTF8CodingSystem utf8;
  return utf8.makeEncoder();
}

XMLDecoder::XMLDecoder(const InputCodingSystemKit *kit)
: Decoder(1),
  kit_(kit),
  phase_(phaseInit),
  byteOrderMark_(0),
  lsbFirst_(0),
  lswFirst_(0),
  guessBytesPerChar_(1),
  piLiteral_(0)
{
}

size_t XMLDecoder::decode(Char *to, const char *from, size_t fromLen,
			  const char **rest)
{
  if (phase_ == phaseFinish)
    return subDecoder_->decode(to, from, fromLen, rest);
  if (phase_ == phaseInit) {
    if (fromLen == 0) {
      *rest = from;
      return 0;
    }
    switch ((unsigned char)*from) {
    case 0x00:
    case 0x3C:
    case 0xFF:
    case 0xFE:
      if (fromLen < 2) {
	*rest = from;
	return 0;
      }
      switch (((unsigned char)from[0] << 8) | (unsigned char)from[1]) {
      case 0xFEFF:
	phase_ = phasePI;
	byteOrderMark_ = 1;
	guessBytesPerChar_ = 2;
	from += 2;
	fromLen -= 2;
	break;
      case 0xFFFE:
	lsbFirst_ = 1;
	phase_ = phasePI;
	byteOrderMark_ = 1;
	guessBytesPerChar_ = 2;
	from += 2;
	fromLen -= 2;
	break;
      case 0x3C3F:
	phase_ = phasePI;
	break;
      case 0x0000:
      case 0x3C00:
      case 0x003C:
        if (fromLen < 4) {
          *rest = from;
          return 0;
        }
        switch (((unsigned char)from[0] << 24) 
		| ((unsigned char)from[1] << 16) 
		| ((unsigned char)from[2] << 8)
		| (unsigned char)from[3]) {
	case 0x0000003C:
	  lsbFirst_ = 0;
	  lswFirst_ = 0;
	  phase_ = phasePI;
	  guessBytesPerChar_ = 4;
	  break;
	case 0x00003C00:
	  lsbFirst_ = 1;
	  lswFirst_ = 0;
	  phase_ = phasePI;
	  guessBytesPerChar_ = 4;
	  break;
	case 0x003C0000:
	  lsbFirst_ = 0;
	  lswFirst_ = 1;
	  phase_ = phasePI;
	  guessBytesPerChar_ = 4;
	  break;
	case 0x3C000000:
	  lsbFirst_ = 1;
	  lswFirst_ = 1;
	  phase_ = phasePI;
	  guessBytesPerChar_ = 4;
	  break;
	case 0x003C003F:
	  lsbFirst_ = 1;
	  phase_ = phasePI;
	  guessBytesPerChar_ = 2;
	  break;
	case 0x3C003F00:
	  lsbFirst_ = 0;
	  phase_ = phasePI;
	  guessBytesPerChar_ = 2;
	  break;
	default:
	  break;
	}
      default:
	break;
      }
      if (phase_ == phasePI)
	break;
      // fall through
    default:
      phase_ = phaseFinish;
      guessBytesPerChar_ = 1;
      initDecoderDefault();
      return subDecoder_->decode(to, from, fromLen, rest);
    }
  }
  ASSERT(phase_ == phasePI);
  Char *p = to;
  for (; fromLen > guessBytesPerChar_;
       fromLen -= guessBytesPerChar_, from += guessBytesPerChar_) {
    if (!piLiteral_ && pi_.size() > 0 && pi_[pi_.size() - 1] == ISO646_GT) {
      initDecoderPI();
      phase_ = phaseFinish;
      return (p - to) + subDecoder_->decode(p, from, fromLen, rest);
    }
    Char c;
    switch (guessBytesPerChar_) {
    case 1:
      c = (unsigned char)from[0];
      break;
    case 2:
      c = lsbFirst_ ? ((unsigned char)from[1] << 8) | (unsigned char)from[0]
	            : ((unsigned char)from[0] << 8) | (unsigned char)from[1];
      break;
    case 4: 
       {
        size_t shift0 = 8*(!lsbFirst_ + 2*!lswFirst_); 
        size_t shift1 = 8*(lsbFirst_ + 2*!lswFirst_); 
        size_t shift2 = 8*(!lsbFirst_ + 2*lswFirst_); 
        size_t shift3 = 8*(lsbFirst_ + 2*lswFirst_); 
        c = ((unsigned char)from[0] << shift0)
	  | ((unsigned char)from[1] << shift1)
	  | ((unsigned char)from[2] << shift2)
	  | ((unsigned char)from[3] << shift3);
      }
      break;
    default:
      CANNOT_HAPPEN();
    }
    static const Char startBytes[] = {
      ISO646_LT, ISO646_QUEST, ISO646_LETTER_x, ISO646_LETTER_m, ISO646_LETTER_l
    };
    // Stop accumulating the PI if we get characters that are illegal in the PI.
    if (c == 0
        || c >= 0x7F
	|| (pi_.size() > 0 && c == ISO646_LT)
	|| pi_.size() > piMaxSize
	|| (pi_.size() < 5 && c != startBytes[pi_.size()])
	|| (pi_.size() == 5 && !isWS(c))) {
      initDecoderDefault();
      phase_ = phaseFinish;
      break;
    }
    *p++ = c;
    pi_ += c;
    if (piLiteral_) {
      if (c == piLiteral_)
	piLiteral_ = 0;
    }
    else if (c == ISO646_QUOT || c == ISO646_APOS)
      piLiteral_ = c;
  }
  size_t n = p - to;
  if (phase_ == phaseFinish && fromLen > 0)
    n += subDecoder_->decode(p, from, fromLen, rest);
  else
    *rest = from;
  return n;
}

Boolean XMLDecoder::convertOffset(unsigned long &n) const
{
  if (n <= pi_.size())
    n *= guessBytesPerChar_;
  else {
    if (!subDecoder_)
      return 0;
    unsigned long tem = n - pi_.size();
    if (!subDecoder_->convertOffset(tem))
      return 0;
    n = tem + pi_.size() * guessBytesPerChar_;
  }
  if (byteOrderMark_)
    n += 2;
  return 1;
}

void XMLDecoder::initDecoderDefault()
{
  switch (guessBytesPerChar_) {
  case 1:
    {
      UTF8CodingSystem utf8;
      subDecoder_ = utf8.makeDecoder();
    }
    break;
  case 2:
    {
      UTF16CodingSystem utf16;
      subDecoder_ = utf16.makeDecoder(lsbFirst_); 
    }
    break;
  case 4:
    {
      Fixed4CodingSystem utf32;
      subDecoder_ = utf32.makeDecoder(lsbFirst_, lswFirst_); 
    }
    break;
  default:
    CANNOT_HAPPEN();
  }
  minBytesPerChar_ = subDecoder_->minBytesPerChar();
}

void XMLDecoder::initDecoderPI()
{
  StringC name;
  if (!extractEncoding(name))
    initDecoderDefault();
  const char *dummy;
  static const UnivCharsetDesc::Range range = { 0, 128, 0 };
  CharsetInfo piCharset(UnivCharsetDesc(&range, 1));
  const InputCodingSystem *ics
    = kit_->makeInputCodingSystem(name,
				  piCharset,
				  0,
				  dummy);
  if (ics) {
    subDecoder_ = ics->makeDecoder(lsbFirst_, lswFirst_); 
    minBytesPerChar_ = subDecoder_->minBytesPerChar();
  }
  if (!subDecoder_)
    initDecoderDefault();
}

Boolean XMLDecoder::isWS(Char c)
{
  switch (c) {
  case ISO646_CR:
  case ISO646_LF:
  case ISO646_SPACE:
  case ISO646_TAB:
    return 1;
  }
  return 0;
}

Boolean XMLDecoder::extractEncoding(StringC &name)
{
  Char lit = 0;
  for (size_t i = 5; i < pi_.size(); i++) {
    if (!lit) {
      if (pi_[i] == ISO646_APOS || pi_[i] == ISO646_QUOT)
	lit = pi_[i];
      else if (pi_[i] == ISO646_EQUAL) {
	size_t j = i;
	for (; j > 0; j--) {
	  if (!isWS(pi_[j - 1]))
	    break;
	}
	size_t nameEnd = j;
	for (; j > 0; j--) {
	  if (isWS(pi_[j - 1]) || pi_[j - 1] == ISO646_QUOT || pi_[j - 1] == ISO646_APOS)
	    break;
	}
	static const Char encodingName[] = {
	  ISO646_LETTER_e, ISO646_LETTER_n, ISO646_LETTER_c, ISO646_LETTER_o,
	  ISO646_LETTER_d, ISO646_LETTER_i, ISO646_LETTER_n, ISO646_LETTER_g,
	  0
	};
	const Char *s = encodingName;
	for (; *s && j < nameEnd; j++, s++)
	  if (pi_[j] != *s)
	    break;
	if (j == nameEnd && *s == 0) {
	  size_t j = i + 1;
	  for (; j < pi_.size(); j++) {
	    if (!isWS(pi_[j]))
	      break;
	  }
	  if (pi_[j] == ISO646_QUOT || pi_[j] == ISO646_APOS) {
	    Char lit = pi_[j];
	    size_t nameStart = j + 1;
	    for (++j; j < pi_.size(); j++) {
	      if (pi_[j] == lit) {
		if (j > nameStart) {
		  name.assign(&pi_[nameStart], j - nameStart);
		  return 1;
		}
		break;
	      }
	    }
	  }
	  return 0;
	}
      }
    }
    else if (pi_[i] == lit)
      lit = 0;
  }
  return 0;
}

#ifdef SP_NAMESPACE
}
#endif

#else /* not SP_MULTI_BYTE */

#ifndef __GNUG__
static char non_empty_translation_unit;	// sigh
#endif

#endif /* not SP_MULTI_BYTE */
