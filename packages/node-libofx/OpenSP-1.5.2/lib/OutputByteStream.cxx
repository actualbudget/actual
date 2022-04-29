// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
#include "OutputByteStream.h"

#include <sys/types.h>

#ifdef SP_INCLUDE_IO_H
#include <io.h>		// for open, fstat, lseek, read prototypes
#endif

#ifdef SP_INCLUDE_UNISTD_H
#include <unistd.h>
#endif

#ifdef SP_INCLUDE_OSFCN_H
#include <osfcn.h>
#endif

#include <fcntl.h>
#include <sys/stat.h>
#include <errno.h>
#include <stdio.h>

#ifdef SP_WIDE_SYSTEM
#define STRICT
#include <windows.h>
#endif

#ifndef O_CREAT
#ifdef _O_CREAT
#define O_CREAT _O_CREAT
#endif
#endif

#ifndef O_WRONLY
#ifdef _O_WRONLY
#define O_WRONLY _O_WRONLY
#endif
#endif

#ifndef O_TRUNC
#ifdef _O_TRUNC
#define O_TRUNC _O_TRUNC
#endif
#endif

#ifndef O_BINARY
#ifdef _O_BINARY
#define O_BINARY _O_BINARY
#else
#define O_BINARY 0
#endif
#endif

#ifndef S_IRUSR
#if defined(S_IREAD)
#define S_IRUSR S_IREAD
#elif defined(_S_IREAD)
#define S_IRUSR _S_IREAD
#else
#define S_IRUSR 0400
#endif
#endif

#ifndef S_IWUSR
#if defined(S_IWRITE)
#define S_IWUSR S_IWRITE
#elif defined(_S_IWRITE)
#define S_IWUSR _S_IWRITE
#else
#define S_IWUSR 0200
#endif
#endif

#ifndef S_IRGRP
#if defined(S_IREAD)
#define S_IRGRP S_IREAD
#elif defined(_S_IREAD)
#define S_IRGRP _S_IREAD
#else
#define S_IRGRP 0040
#endif
#endif

#ifndef S_IWGRP
#if defined(S_IWRITE)
#define S_IWGRP S_IWRITE
#elif defined(_S_IWRITE)
#define S_IWGRP _S_IWRITE
#else
#define S_IWGRP 0020
#endif
#endif

#ifndef S_IROTH
#if defined(S_IREAD)
#define S_IROTH S_IREAD
#elif defined(_S_IREAD)
#define S_IROTH _S_IREAD
#else
#define S_IROTH 0004
#endif
#endif

#ifndef S_IWOTH
#if defined(S_IWRITE)
#define S_IWOTH S_IWRITE
#elif defined(_S_IWRITE)
#define S_IWOTH _S_IWRITE
#else
#define S_IWOTH 0002
#endif
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

const int openFlags = O_CREAT|O_WRONLY|O_TRUNC|O_BINARY;
const int protMode = S_IRUSR|S_IWUSR|S_IRGRP|S_IWGRP|S_IROTH|S_IWOTH;
const int bufSize = 8192;

OutputByteStream::OutputByteStream()
: ptr_(0), end_(0)
{
}

OutputByteStream::~OutputByteStream()
{
}

void OutputByteStream::sputn(const char *s, size_t n)
{
  for (; n > 0; n--, s++)
    sputc(*s);
}

OutputByteStream &OutputByteStream::operator<<(long n)
{
  char buf[32];
  sprintf(buf, "%ld", n);
  return *this << buf;
}

OutputByteStream &OutputByteStream::operator<<(unsigned long n)
{
  char buf[32];
  sprintf(buf, "%lu", n);
  return *this << buf;
}

OutputByteStream &OutputByteStream::operator<<(const char *s)
{
  while (*s)
    sputc(*s++);
  return *this;
}

StrOutputByteStream::StrOutputByteStream()
{
}

void StrOutputByteStream::extractString(String<char> &str)
{
  if (ptr_)
    buf_.resize(ptr_ - &buf_[0]);
  str.resize(0);
  buf_.swap(str);
  ptr_ = end_ = 0;
}

void StrOutputByteStream::flush()
{
}

void StrOutputByteStream::flushBuf(char c)
{
  if (!ptr_) {
    buf_.resize(16);
    ptr_ = &buf_[0];
  }
  else {
    size_t i = ptr_ - &buf_[0];
    buf_.resize(buf_.size()*2);
    ptr_ = &buf_[0] + i;
  }
  end_ = &buf_[0] + buf_.size();
  *ptr_++ = c;
}

FileOutputByteStream::FileOutputByteStream()
: fd_(-1)
{
}

FileOutputByteStream::FileOutputByteStream(int fd, Boolean closeFd)
: fd_(-1)
{
  attach(fd, closeFd);
}

FileOutputByteStream::~FileOutputByteStream()
{
  close();
}

#ifdef SP_WIDE_SYSTEM

Boolean FileOutputByteStream::open(const wchar_t *filename)
{
  int fd = _wopen(filename, openFlags, protMode);
  if (fd >= 0)
    return attach(fd);
  // _wopen will always fail on Windows 95
  String<char> buf;
  int len = WideCharToMultiByte(CP_ACP, 0, filename, -1, 0, 0, 0, 0);
  buf.resize(len + 1);
  WideCharToMultiByte(CP_ACP, 0, filename, -1, buf.begin(), len, 0, 0);
  buf[len] = '\0';
  return attach(::open(buf.data(), openFlags, protMode));
}

#else /* not SP_WIDE_SYSTEM */

Boolean FileOutputByteStream::open(const char *filename)
{
  return attach(::open(filename, openFlags, protMode));
}

#endif /* not SP_WIDE_SYSTEM */

Boolean FileOutputByteStream::attach(int fd, Boolean closeFd)
{
  close();
  fd_ = fd;
  closeFd_ = closeFd;
  return fd_ >= 0;
}

Boolean FileOutputByteStream::close()
{
  if (fd_ < 0)
    return 0;
  flush();
  int fd = fd_;
  fd_ = -1;
  if (!closeFd_)
    return 1;
  return ::close(fd) == 0;
}

void FileOutputByteStream::flush()
{
  if (!buf_.size()) {
    if (fd_ < 0)
      return;
    buf_.resize(bufSize);
    ptr_ = &buf_[0];
    end_ = ptr_ + buf_.size();
  }
  size_t n = ptr_ - &buf_[0];
  const char *s = buf_.data();
  while (n > 0) {
    int nw = ::write(fd_, s, n);
    if (nw < 0)
      break;
    n -= nw;
    s += nw;
  }
  ptr_ = &buf_[0];
}

void FileOutputByteStream::flushBuf(char c)
{
  flush();
  *ptr_++ = c;
}

#ifdef SP_NAMESPACE
}
#endif
