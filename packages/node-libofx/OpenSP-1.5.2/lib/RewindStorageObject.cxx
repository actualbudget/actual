// Copyright (c) 1994, 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "RewindStorageObject.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

RewindStorageObject::RewindStorageObject(Boolean mayRewind, Boolean canSeek)
: mayRewind_(mayRewind), canSeek_(canSeek),
  savingBytes_(mayRewind && !canSeek), readingSaved_(0)
{
}

Boolean RewindStorageObject::rewind(Messenger &mgr)
{
  ASSERT(mayRewind_);
  if (canSeek_)
    return seekToStart(mgr);
  else {
    readingSaved_ = 1;
    nBytesRead_ = 0;
    return 1;
  }
}

void RewindStorageObject::unread(const char *s, size_t n)
{
  savedBytes_.append(s, n);
  if (!readingSaved_) {
    readingSaved_ = 1;
    nBytesRead_ = 0;
  }
}

void RewindStorageObject::willNotRewind()
{
  mayRewind_ = 0;
  savingBytes_ = 0;
  if (!readingSaved_) {
    // Ensure that memory is released now.
    String<char> tem;
    tem.swap(savedBytes_);
  }
}

Boolean RewindStorageObject::readSaved(char *buf, size_t bufSize,
				       size_t &nread)
{
  if (!readingSaved_)
    return 0;
  if (nBytesRead_ >= savedBytes_.size()) {
    if (!mayRewind_) {
      // Ensure that memory is released now.
      String<char> tem;
      tem.swap(savedBytes_);
    }
    readingSaved_ = 0;
    return 0;
  }
  nread = savedBytes_.size() - nBytesRead_;
  if (nread > bufSize)
    nread = bufSize;
  memcpy(buf, savedBytes_.data() + nBytesRead_, nread);
  nBytesRead_ += nread;
  return 1;
}

#ifdef SP_NAMESPACE
}
#endif
