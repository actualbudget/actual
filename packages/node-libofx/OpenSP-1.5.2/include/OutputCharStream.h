// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef OutputCharStream_INCLUDED
#define OutputCharStream_INCLUDED 1

#include "types.h"
#include <stddef.h>
#include "Link.h"
#include "StringC.h"
#include "Owner.h"
#include "CodingSystem.h"
#include "OutputByteStream.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API OutputCharStream : public Link {
public:
  enum Newline { newline };
  typedef void (*Escaper)(OutputCharStream &, Char);
  OutputCharStream();
  virtual ~OutputCharStream();
  OutputCharStream &put(Char);
  OutputCharStream &write(const Char *, size_t);
  virtual void flush() = 0;
  virtual void setEscaper(Escaper);

  OutputCharStream &operator<<(char);
  OutputCharStream &operator<<(const char *);
  OutputCharStream &operator<<(const StringC &);
  OutputCharStream &operator<<(unsigned long);
  OutputCharStream &operator<<(int);
  OutputCharStream &operator<<(Newline);
private:
  OutputCharStream(const OutputCharStream &);	// undefined
  void operator=(const OutputCharStream &);	// undefined

  virtual void flushBuf(Char) = 0;
protected:
  Char *ptr_;
  Char *end_;
};

class SP_API EncodeOutputCharStream : public OutputCharStream,
                            private Encoder::Handler {
public:
  EncodeOutputCharStream();
  // the OutputByteStream will not be deleted
  EncodeOutputCharStream(OutputByteStream *, const OutputCodingSystem *);
  ~EncodeOutputCharStream();
  void open(OutputByteStream *, const OutputCodingSystem *);
  void flush();
  void setEscaper(Escaper);
private:
  EncodeOutputCharStream(const EncodeOutputCharStream &); // undefined
  void operator=(const EncodeOutputCharStream &);	    // undefined
  EncodeOutputCharStream(OutputByteStream *, Encoder *);
  void allocBuf(int bytesPerChar);
  void flushBuf(Char);
  void handleUnencodable(Char c, OutputByteStream *);
  Char *buf_;
  OutputByteStream *byteStream_;
  Encoder *encoder_;
  Owner<Encoder> ownedEncoder_;
  Escaper escaper_;
};

class SP_API StrOutputCharStream : public OutputCharStream {
public:
  StrOutputCharStream();
  ~StrOutputCharStream();
  void extractString(StringC &);
  void flush();
private:
  void flushBuf(Char);
  void sync(size_t);
  StrOutputCharStream(const StrOutputCharStream &); // undefined
  void operator=(const StrOutputCharStream &);	    // undefined
  Char *buf_;
  size_t bufSize_;
};

class SP_API RecordOutputCharStream : public OutputCharStream {
public:
  RecordOutputCharStream(OutputCharStream *);
  ~RecordOutputCharStream();
  void flush();
  void setEscaper(Escaper);
private:
  RecordOutputCharStream(const RecordOutputCharStream &); // undefined
  void operator=(const RecordOutputCharStream &);	  // undefined
  void flushBuf(Char);
  void outputBuf();

  OutputCharStream *os_;
  enum { bufSize_ = 1024 };
  Char buf_[bufSize_];
};

inline
OutputCharStream &OutputCharStream::put(Char c)
{
  if (ptr_ < end_)
    *ptr_++ = c;
  else
    flushBuf(c);
  return *this;
}

inline
OutputCharStream &OutputCharStream::operator<<(char c)
{
  return put(Char(c));
}

inline
OutputCharStream &OutputCharStream::operator<<(Newline)
{
  put(Char(SP_LINE_TERM1));
#ifdef SP_LINE_TERM2
  put(Char(SP_LINE_TERM2));
#endif
  return *this;
}

inline
OutputCharStream &OutputCharStream::operator<<(const StringC &str)
{
  return write(str.data(), str.size());
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not OutputCharStream_INCLUDED */
