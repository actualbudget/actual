// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#ifndef OutputByteStream_INCLUDED
#define OutputByteStream_INCLUDED 1

#include "Link.h"
#include "StringOf.h"
#include "Boolean.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API OutputByteStream : public Link {
public:
  OutputByteStream();
  virtual ~OutputByteStream();
  virtual void flush() = 0;
  void sputc(char c);
  void sputn(const char *, size_t);
  OutputByteStream &operator<<(char);
  OutputByteStream &operator<<(unsigned char);
  OutputByteStream &operator<<(const char *);
  OutputByteStream &operator<<(int);
  OutputByteStream &operator<<(unsigned);
  OutputByteStream &operator<<(long);
  OutputByteStream &operator<<(unsigned long);
  OutputByteStream &operator<<(const String<char> &);
  char *getBufferPtr() const;
  size_t getBufferSize() const;
  void usedBuffer(size_t);
  virtual void flushBuf(char) = 0;
protected:
  char *ptr_;
  char *end_;
};

inline
char *OutputByteStream::getBufferPtr() const
{
  return ptr_;
}

inline
size_t OutputByteStream::getBufferSize() const
{
  return end_ - ptr_;
}

inline
void OutputByteStream::usedBuffer(size_t n)
{
  ptr_ += n;
}

inline
void OutputByteStream::sputc(char c)
{
  if (ptr_ < end_)
    *ptr_++ = c;
  else
    flushBuf(c);
}

inline
OutputByteStream &OutputByteStream::operator<<(char c)
{
  sputc(c);
  return *this;
}

inline
OutputByteStream &OutputByteStream::operator<<(unsigned char c)
{
  sputc(char(c));
  return *this;
}

inline
OutputByteStream &OutputByteStream::operator<<(int n)
{
  return *this << long(n);
}

inline
OutputByteStream &OutputByteStream::operator<<(unsigned n)
{
  return *this << (unsigned long)n;
}

inline
OutputByteStream &OutputByteStream::operator<<(const String<char> &s)
{
  sputn(s.data(), s.size());
  return *this;
}

class SP_API StrOutputByteStream : public OutputByteStream {
public:
  StrOutputByteStream();
  virtual ~StrOutputByteStream() { /* no-op */ };
  void extractString(String<char> &);
protected:
  StrOutputByteStream(const StrOutputByteStream &); // undefined
  void operator=(const StrOutputByteStream &); // undefined
  void flush();
  void flushBuf(char);
  String<char> buf_;
};

class SP_API FileOutputByteStream : public OutputByteStream {
public:
  FileOutputByteStream();
  FileOutputByteStream(int fd, Boolean closeFd = 1);
  virtual ~FileOutputByteStream();
#ifdef SP_WIDE_SYSTEM
  Boolean open(const wchar_t *);
#else
  Boolean open(const char *);
#endif
  Boolean attach(int fd, Boolean closeFd = 1);
  Boolean close();
private:
  FileOutputByteStream(const FileOutputByteStream &); // undefined
  void operator=(const FileOutputByteStream &); // undefined
  void flush();
  void flushBuf(char);
  String<char> buf_;
  int fd_;
  Boolean closeFd_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not OutputByteStream_INCLUDED */
