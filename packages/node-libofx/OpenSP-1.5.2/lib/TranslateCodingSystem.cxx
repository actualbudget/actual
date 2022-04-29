// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#include "splib.h"

#include "TranslateCodingSystem.h"
#include "types.h"
#include "Owner.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class TranslateDecoder : public Decoder {
public:
  TranslateDecoder(Decoder *, const ConstPtr<CharMapResource<Char> > &);
  size_t decode(Char *, const char *, size_t, const char **);
  Boolean convertOffset(unsigned long &offset) const;
private:
  Owner<Decoder> decoder_;
  ConstPtr<CharMapResource<Char> > map_;
};

TranslateDecoder::TranslateDecoder(Decoder *decoder,
				   const ConstPtr<CharMapResource<Char> > &map)
: Decoder(decoder->minBytesPerChar()), decoder_(decoder), map_(map)
{
}


Boolean TranslateDecoder::convertOffset(unsigned long &offset) const
{
  return decoder_->convertOffset(offset);
}

size_t TranslateDecoder::decode(Char *to, const char *s,
				size_t slen, const char **rest)
{
  size_t n = decoder_->decode(to, s, slen, rest);
  for (size_t i = 0; i < n; i++)
    to[i] = (*map_)[to[i]];
  return n;
}

// FIXME set unencodeable handler for underlying encoder

class TranslateEncoder : public RecoveringEncoder {
public:
  TranslateEncoder(Encoder *, const ConstPtr<CharMapResource<Char> > &map,
		   Char illegalChar);
  void output(const Char *, size_t, OutputByteStream *);
  void output(Char *, size_t, OutputByteStream *);
  void startFile(OutputByteStream *);
private:
  Owner<Encoder> encoder_;
  ConstPtr<CharMapResource<Char> > map_;
  Char illegalChar_;
  enum { bufSize = 256 };
  Char buf_[bufSize];
};

TranslateEncoder::TranslateEncoder(Encoder *encoder,
				   const ConstPtr<CharMapResource<Char> > &map,
				   Char illegalChar)
: encoder_(encoder), map_(map), illegalChar_(illegalChar)
{
}

void TranslateEncoder::startFile(OutputByteStream *sbuf)
{
  encoder_->startFile(sbuf);
}

void TranslateEncoder::output(const Char *s, size_t n, OutputByteStream *sbuf)
{
  size_t j = 0;
  for (; n > 0; s++, n--) {
    Char c = (*map_)[*s];
    if (c == illegalChar_) {
      if (j > 0) {
	encoder_->output(buf_, j, sbuf);
	j = 0;
      }
      handleUnencodable(*s, sbuf);
    }
    else {
      if (j >= bufSize) {
	encoder_->output(buf_, j, sbuf);
	j = 0;
      }
      buf_[j++] = c;
    }
  }
  if (j > 0)
    encoder_->output(buf_, j, sbuf);
}

void TranslateEncoder::output(Char *s, size_t n, OutputByteStream *sbuf)
{
  size_t i = 0;
  for (;;) {
    if (i == n) {
      if (n > 0)
	encoder_->output(s, n, sbuf);
      break;
    }
    Char c = (*map_)[s[i]];
    if (c == illegalChar_) {
      if (i > 0)
	encoder_->output(s, i, sbuf);
      handleUnencodable(s[i], sbuf);
      i++;
      s += i;
      n -= i;
      i = 0;
    }
    else
      s[i++] = c;
  }
}

TranslateCodingSystem::TranslateCodingSystem(const CodingSystem *sub,
					     const Desc *desc,
					     const CharsetInfo *charset,
					     Char illegalChar,
					     Char replacementChar)
: sub_(sub),
  desc_(desc),
  charset_(charset),
  illegalChar_(illegalChar),
  replacementChar_(replacementChar)
{
}
 
Decoder *TranslateCodingSystem::makeDecoder() const
{
  if (decodeMap_.isNull()) {
    CharMapResource<Char> *map = new CharMapResource<Char>(replacementChar_);
    *(ConstPtr<CharMapResource<Char> > *)&decodeMap_ = map;
    for (const Desc *d = desc_; d->number != CharsetRegistry::UNREGISTERED; d++) {
      Owner<CharsetRegistry::Iter> iter(CharsetRegistry::makeIter(d->number));
      if (iter) {
	WideChar min;
	WideChar max;
	UnivChar univ;
	while (iter->next(min, max, univ)) {
	  do {
	    ISet<WideChar> set;
	    WideChar sysChar;
	    WideChar count;
	    int n = charset_->univToDesc(univ, sysChar, set, count);
	    if (count > (max - min) + 1)
	      count = (max - min) + 1;
	    if (n) {
	      for (WideChar i = 0; i < count; i++)
		map->setChar(min + d->add + i, sysChar + i);
	    }
	    min += count - 1;
	    univ += count;
	  } while (min++ != max);
	}
      }
    }
  }
  return new TranslateDecoder(sub_->makeDecoder(), decodeMap_);
}

Encoder *TranslateCodingSystem::makeEncoder() const
{
  if (encodeMap_.isNull()) {
    CharMapResource<Char> *map = new CharMapResource<Char>(illegalChar_);
    *(ConstPtr<CharMapResource<Char> > *)&encodeMap_ = map;
    for (const Desc *d = desc_; d->number != CharsetRegistry::UNREGISTERED; d++) {
      Owner<CharsetRegistry::Iter> iter(CharsetRegistry::makeIter(d->number));
      if (iter) {
	WideChar min;
	WideChar max;
	UnivChar univ;
	while (iter->next(min, max, univ)) {
	  do {
	    ISet<WideChar> set;
	    WideChar sysChar;
	    WideChar count;
	    int n = charset_->univToDesc(univ, sysChar, set, count);
	    if (count > (max - min) + 1)
	      count = (max - min) + 1;
	    if (n) {
	      for (WideChar i = 0; i < count; i++)
		map->setChar(sysChar + i, min + d->add + i);
	    }
	    min += count - 1;
	    univ += count;
	  } while (min++ != max);
	}
      }
    }
  }
  return new TranslateEncoder(sub_->makeEncoder(), encodeMap_, illegalChar_);
}

unsigned TranslateCodingSystem::fixedBytesPerChar() const
{
  return sub_->fixedBytesPerChar();
}

#ifdef SP_NAMESPACE
}
#endif

