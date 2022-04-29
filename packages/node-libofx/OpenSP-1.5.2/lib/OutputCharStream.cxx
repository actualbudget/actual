// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
#include "OutputCharStream.h"
#include "CodingSystem.h"
#include "macros.h"
#include <stdio.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

OutputCharStream::OutputCharStream()
: ptr_(0), end_(0)
{
}

OutputCharStream::~OutputCharStream()
{
}

void OutputCharStream::setEscaper(Escaper)
{
}

OutputCharStream &OutputCharStream::write(const Char *s, size_t n)
{
  for (;;) {
    size_t spare = end_ - ptr_;
    if (n <= spare) {
      memcpy(ptr_, s, n*sizeof(Char));
      ptr_ += n;
      break;
    }
    if (spare > 0) {
      memcpy(ptr_, s, spare*sizeof(Char));
      ptr_ += spare;
      s += spare;
      n -= spare;
    }
    n--;
    flushBuf(*s++);
  }
  return *this;
}

OutputCharStream &OutputCharStream::operator<<(const char *s)
{
  while (*s)
    put(*s++);
  return *this;
}

// FIXME Avoid stdio

OutputCharStream &OutputCharStream::operator<<(unsigned long n)
{
  char buf[sizeof(unsigned long)*3 + 1];
  sprintf(buf, "%lu", n);
  return *this << buf;
}

OutputCharStream &OutputCharStream::operator<<(int n)
{
  char buf[sizeof(int)*3 + 2];
  sprintf(buf, "%d", n);
  return *this << buf;
}

EncodeOutputCharStream::EncodeOutputCharStream()
: buf_(0), byteStream_(0), escaper_(0)
{
}

EncodeOutputCharStream::EncodeOutputCharStream(OutputByteStream *byteStream,
					       const OutputCodingSystem *codingSystem)
: buf_(0),
  byteStream_(byteStream),
  escaper_(0),
  ownedEncoder_(codingSystem->makeEncoder())
{
  encoder_ = ownedEncoder_.pointer();
  encoder_->setUnencodableHandler(this);
  allocBuf(codingSystem->fixedBytesPerChar());
  encoder_->startFile(byteStream_);
}

EncodeOutputCharStream::EncodeOutputCharStream(OutputByteStream *byteStream,
					       Encoder *encoder)
: buf_(0),
  byteStream_(byteStream),
  escaper_(0),
  encoder_(encoder)
{
  allocBuf(0);
}

EncodeOutputCharStream::~EncodeOutputCharStream()
{
  if (byteStream_)
    flush();
  delete [] buf_;
}

void EncodeOutputCharStream::open(OutputByteStream *byteStream,
				  const OutputCodingSystem *codingSystem)
{
  if (byteStream_)
    flush();
  byteStream_ = byteStream;
  ownedEncoder_ = codingSystem->makeEncoder();
  encoder_ = ownedEncoder_.pointer();
  encoder_->setUnencodableHandler(this);
  delete [] buf_;
  buf_ = 0;
  ptr_ = end_ = buf_;
  allocBuf(codingSystem->fixedBytesPerChar());
  encoder_->startFile(byteStream_);
}

void EncodeOutputCharStream::flush()
{
  if (ptr_ > buf_) {
    encoder_->output(buf_, ptr_ - buf_, byteStream_);
    ptr_ = buf_;
  }
  byteStream_->flush();
}

void EncodeOutputCharStream::flushBuf(Char c)
{
  ASSERT(buf_ != 0);
  encoder_->output(buf_, ptr_ - buf_, byteStream_);
  ptr_ = buf_;
  *ptr_++ = c;
}

void EncodeOutputCharStream::allocBuf(int bytesPerChar)
{
  const int blockSize = 1024;
  size_t bufSize = bytesPerChar ? blockSize/bytesPerChar : blockSize;
  ptr_ = buf_ = new Char[bufSize];
  end_ = buf_ + bufSize;
}

void EncodeOutputCharStream::setEscaper(Escaper f)
{
  escaper_ = f;
}

void EncodeOutputCharStream::handleUnencodable(Char c, OutputByteStream *)
{
  EncodeOutputCharStream tem(byteStream_, encoder_);
  if (escaper_)
    (*escaper_)(tem, c);
}

StrOutputCharStream::StrOutputCharStream()
: buf_(0), bufSize_(0)
{
  sync(0);
}

StrOutputCharStream::~StrOutputCharStream()
{
  delete [] buf_;
}

void StrOutputCharStream::extractString(StringC &str)
{
  str.assign(buf_, ptr_ - buf_);
  sync(0);
}

void StrOutputCharStream::flushBuf(Char c)
{
  size_t used = ptr_ - buf_;
  size_t oldSize = bufSize_;
  bufSize_ = oldSize ? 2*oldSize : 10;
  Char *oldBuf = buf_;
  buf_ = new Char[bufSize_];
  if (oldSize) {
    memcpy(buf_, oldBuf, oldSize * sizeof(Char));
    delete [] oldBuf;
  }
  sync(used);
  *ptr_++ = c;
}

void StrOutputCharStream::flush()
{
}

void StrOutputCharStream::sync(size_t length)
{
  ptr_ = buf_ + length;
  end_ = buf_ + bufSize_;
}

RecordOutputCharStream::RecordOutputCharStream(OutputCharStream *os)
: os_(os)
{
  ptr_ = buf_;
  end_ = buf_ + bufSize_;
}

RecordOutputCharStream::~RecordOutputCharStream()
{
  outputBuf();
  delete os_;
}

void RecordOutputCharStream::setEscaper(Escaper f)
{
  os_->setEscaper(f);
}

void RecordOutputCharStream::flush()
{
  outputBuf();
  os_->flush();
}

void RecordOutputCharStream::flushBuf(Char c)
{
  outputBuf();
  *ptr_++ = c;
}

void RecordOutputCharStream::outputBuf()
{
  Char *start = buf_;
  Char *p = start;
  while (p < ptr_) {
    switch (*p) {
    case '\r':			// translate RE to newline
      if (start < p)
	os_->write(start, p - start);
      start = ++p;
      *os_ << newline;
      break;
    case '\n':			// ignore RS
      if (start < p)
	os_->write(start, p - start);
      start = ++p;
      break;
    default:
      ++p;
      break;
    }
  }
  if (start < p)
    os_->write(start, p - start);
  ptr_ = buf_;
  end_ = buf_ + bufSize_;
}

#ifdef SP_NAMESPACE
}
#endif
