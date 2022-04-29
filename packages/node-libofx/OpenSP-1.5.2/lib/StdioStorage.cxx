// Copyright (c) 1994, 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "StdioStorage.h"
#include "Message.h"
#include "types.h"
#include "ErrnoMessageArg.h"
#include "StringOf.h"
#include "StringC.h"
#include "CodingSystem.h"

#include "StdioStorageMessages.h"

#include <stdio.h>
#include <string.h>
#include <stddef.h>
#include <errno.h>

#ifndef SEEK_SET
#define SEEK_SET 0
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class StdioStorageObject : public StorageObject {
public:
  StdioStorageObject(FILE *fp, const StringC &filename);
  ~StdioStorageObject();
  Boolean read(char *buf, size_t bufSize, Messenger &mgr, size_t &nread);
  Boolean rewind(Messenger &mgr);
  size_t getBlockSize() const;
private:
  enum ErrorIndex {
    invalidErrorIndex,
    fopenFailed,
    readError,
    seekError
  };
  void error(Messenger &mgr, const MessageType2 &, int err);

  FILE *fp_;
  StringC filename_;
  String<char> filenameBytes_;
};

StdioStorageManager::StdioStorageManager(const char *type,
					 const CharsetInfo *filenameCharset,
					 const OutputCodingSystem *filenameCodingSystem)
: IdStorageManager(filenameCharset),
  type_(type),
  filenameCodingSystem_(filenameCodingSystem)
{
}

StorageObject *StdioStorageManager::makeStorageObject(const StringC &str,
						      const StringC &,
						      Boolean,
						      Boolean,
						      Messenger &mgr,
						      StringC &filename)
{
  filename = str;
  String<char> filenameBytes = filenameCodingSystem_->convertOut(filename);
  errno = 0;
  FILE *fp = fopen(filenameBytes.data(), "r");
  if (!fp) {
    ParentLocationMessenger(mgr).message(StdioStorageMessages::openFailed,
					 StringMessageArg(filename),
					 ErrnoMessageArg(errno));

    return 0;
  }
  return new StdioStorageObject(fp, filename);
}

const char *StdioStorageManager::type() const
{
  return type_;
}

StdioStorageObject::StdioStorageObject(FILE *fp, const StringC &filename)
: fp_(fp), filename_(filename)
{
}

StdioStorageObject::~StdioStorageObject()
{
  if (fp_) {
    fclose(fp_);
    fp_ = 0;
  }
}

Boolean StdioStorageObject::rewind(Messenger &mgr)
{
  if (fp_) {
    errno = 0;
    if (fseek(fp_, 0L, SEEK_SET) < 0) {
      error(mgr, StdioStorageMessages::seekFailed, errno);
      return 0;
    }
    return 1;
  }
  return 1;
}

size_t StdioStorageObject::getBlockSize() const
{
  return BUFSIZ;
}

Boolean StdioStorageObject::read(char *buf, size_t bufSize, Messenger &mgr,
				 size_t &nread)
{
  if (!fp_)
    return 0;
  errno = 0;
  size_t n = 0;
  FILE *fp = fp_;
  while (n < bufSize) {
    int c = getc(fp);
    if (c == EOF) {
      if (ferror(fp)) {
	error(mgr, StdioStorageMessages::readFailed, errno);
	(void)fclose(fp);
	return 0;
      }
      fclose(fp);
      fp_ = 0;
      break;
    }
    buf[n++] = c;
  }
  nread = n;
  return n > 0;
}

void StdioStorageObject::error(Messenger &mgr,
			       const MessageType2 &msg,
			       int err)
{
  ParentLocationMessenger(mgr).message(msg,
				       StringMessageArg(filename_),
				       ErrnoMessageArg(err));
}

#ifdef SP_NAMESPACE
}
#endif
