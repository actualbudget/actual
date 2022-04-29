// Copyright (c) 1994, 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "PosixStorage.h"
#include "RewindStorageObject.h"
#include "StorageManager.h"
#include "DescriptorManager.h"
#include "MessageArg.h"
#include "ErrnoMessageArg.h"
#include "SearchResultMessageArg.h"
#include "Message.h"
#include "StringC.h"
#include "StringOf.h"
#include "CharsetInfo.h"
#include "CodingSystem.h"
#include "macros.h"
#include "PosixStorageMessages.h"

#include <sys/types.h>
#include <stdio.h>
#include <ctype.h>

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
#include <stddef.h>

#ifndef S_ISREG
#ifndef S_IFREG
#define S_IFREG _S_IFREG
#endif
#ifndef S_IFMT
#define S_IFMT _S_IFMT
#endif
#define S_ISREG(m) (((m) & S_IFMT) == S_IFREG)
#endif /* not S_ISREG */

#ifndef O_BINARY
#define O_BINARY 0
#endif

#ifdef SP_WIDE_SYSTEM
#include <windows.h>
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef SP_WIDE_SYSTEM
typedef wchar_t FChar;
#else
typedef char FChar;
#endif

class PosixBaseStorageObject : public RewindStorageObject {
public:
  PosixBaseStorageObject(int fd, Boolean mayRewind);
  size_t getBlockSize() const;
protected:
  enum { defaultBlockSize = 8192 };
  int fd_;
  PackedBoolean eof_;

  Boolean seekToStart(Messenger &);
  virtual Boolean seek(off_t, Messenger &) = 0;
  static int xclose(int fd);
private:
  Boolean canSeek(int fd);
  off_t startOffset_;
};

PosixBaseStorageObject::PosixBaseStorageObject(int fd, Boolean mayRewind)
: fd_(fd), eof_(0),
  RewindStorageObject(mayRewind, mayRewind && canSeek(fd))
{
}

Boolean PosixBaseStorageObject::canSeek(int fd)
{
  struct stat sb;
  if (fstat(fd, &sb) < 0 || !S_ISREG(sb.st_mode)
      || (startOffset_ = lseek(fd, off_t(0), SEEK_CUR)) < 0)
    return 0;
  else
    return 1;
}

Boolean PosixBaseStorageObject::seekToStart(Messenger &mgr)
{
  eof_ = 0;
  return seek(startOffset_, mgr);
}

int PosixBaseStorageObject::xclose(int fd)
{
  int ret;
  do {
    ret = ::close(fd);
  } while (ret < 0 && errno == EINTR);
  return ret;
}

class PosixStorageObject : public PosixBaseStorageObject, private DescriptorUser {
public:
  PosixStorageObject(int fd,
		     const StringC &,
		     const String<FChar> &,
		     Boolean mayRewind,
		     DescriptorManager *);
  ~PosixStorageObject();
  Boolean read(char *buf, size_t bufSize, Messenger &mgr, size_t &nread);
  Boolean suspend();
  Boolean seek(off_t, Messenger &);
  void willNotRewind();
private:
  void resume(Messenger &);

  PackedBoolean suspended_;
  off_t suspendPos_;
  const MessageType2 *suspendFailedMessage_;
  int suspendErrno_;
  StringC filename_;
  String<FChar> cfilename_;

  void systemError(Messenger &, const MessageType2 &, int);
};

inline int openFile(const FChar *s) {
#ifdef SP_WIDE_SYSTEM
   int fd = _wopen(s, O_RDONLY|O_BINARY);
   if (fd < 0 && errno != ENOENT) {
     String<char> buf;
     int len = WideCharToMultiByte(CP_ACP, 0, s, -1, 0, 0, 0, 0);
     buf.resize(len + 1);
     WideCharToMultiByte(CP_ACP, 0, s, -1, buf.begin(), len, 0, 0);
     buf[len] = '\0';
     return ::open(buf.data(), O_RDONLY|O_BINARY);
   }
   return fd;
#else
    return ::open(s, O_RDONLY|O_BINARY);
#endif
  }

PosixStorageManager::PosixStorageManager(const char *type,
					 const CharsetInfo *filenameCharset,
#ifndef SP_WIDE_SYSTEM
					 const OutputCodingSystem *filenameCodingSystem,
#endif
					 int maxFDs,
					 Boolean restrictFileReading)
: IdStorageManager(filenameCharset),
  type_(type),
#ifndef SP_WIDE_SYSTEM
  filenameCodingSystem_(filenameCodingSystem),
#endif
  descriptorManager_(maxFDs),
  restrictFileReading_(restrictFileReading)
{
  Char newline = idCharset()->execToDesc('\n');
  reString_.assign(&newline, 1);
}

const char *PosixStorageManager::type() const
{
  return type_;
}

void PosixStorageManager::addSearchDir(const StringC &str)
{
  searchDirs_.push_back(str);
}

Boolean PosixStorageManager::isSafe(const StringC &file) const
{
  size_t i = 0;
  for (; i < file.size(); i++) {
    if (file[i] == '.' && i > 0 && file[i - 1] == '.') return 0;
    if (!(   (file[i] >= 'a' && file[i] <= 'z')
          || (file[i] >= 'A' && file[i] <= 'Z')
          || (file[i] >= '0' && file[i] <= '9')
          || file[i] == '/'
          || file[i] == '.'
          || file[i] == '-'
          || file[i] == '_'
#ifdef SP_MSDOS_FILENAMES
          || file[i] == '\\'
          || file[i] == ':'
#endif
       )) return 0;
  }

  const StringC &dir = extractDir(file);

  for (i = 0; i < searchDirs_.size(); i++) {
    const StringC &searchDir = searchDirs_[i];

    if (dir.size() >= searchDir.size()) {
      size_t j = 0;
      for (; j < searchDir.size(); j++) {
        if (searchDir[j] != dir[j]
#ifdef SP_MSDOS_FILENAMES
        && ((searchDir[j] != '/' && dir[j] == '\\') ||
            (searchDir[j] != '\\' && dir[j] == '/'))
#endif
        ) break;
      }

      if (j == searchDir.size() &&
           (dir.size() == searchDir.size() || dir[j] == '/'
#ifdef SP_MSDOS_FILENAMES
                                           || dir[j] == '\\'
#endif
           )) return 1;
    }
  }

  return 0;
}

#ifdef SP_POSIX_FILENAMES

#define FILENAME_TYPE_DEFINED

// FIXME should use idCharset.

Boolean PosixStorageManager::isAbsolute(const StringC &file) const
{
  return file.size() > 0 && file[0] == '/';
}

StringC PosixStorageManager::extractDir(const StringC &str) const
{
  for (size_t i = str.size(); i > 0; i--)
    if (str[i - 1] == '/')
      return StringC(str.data(), i);	// include slash for root case
  return StringC();
}

StringC PosixStorageManager::combineDir(const StringC &dir,
					const StringC &base) const
{
  StringC result(dir);
  if (dir.size() > 0 && dir[dir.size() - 1] != '/')
    result += '/';
  result += base;
  return result;
}

Boolean PosixStorageManager::transformNeutral(StringC &str, Boolean fold,
					      Messenger &) const
{
  if (fold)
    for (size_t i = 0; i < str.size(); i++) {
      Char c = str[i];
      if (c <= (unsigned char)-1)
	str[i] = tolower(str[i]);
    }
  return 1;
}

#endif /* SP_POSIX_FILENAMES */

#ifdef SP_MSDOS_FILENAMES

#define FILENAME_TYPE_DEFINED

Boolean PosixStorageManager::isAbsolute(const StringC &s) const
{
  if (s.size() == 0)
    return 0;
  return s[0] == '/' || s[0] == '\\' || (s.size() > 1 && s[1] == ':');
}

StringC PosixStorageManager::extractDir(const StringC &str) const
{
  for (size_t i = str.size(); i > 0; i--)
    if (str[i - 1] == '/' || str[i - 1] == '\\'
	|| (i == 2  && str[i - 1] == ':'))
      return StringC(str.data(), i);	// include separator
  return StringC();
}

StringC PosixStorageManager::combineDir(const StringC &dir,
					const StringC &base) const
{
  StringC result(dir);
  if (dir.size() > 0) {
    Char lastChar = dir[dir.size() - 1];
    if (lastChar != '/' && lastChar != '\\'
	&& !(dir.size() == 2 && lastChar == ':'))
    result += '\\';
  }
  result += base;
  return result;
}

Boolean PosixStorageManager::transformNeutral(StringC &str, Boolean,
					      Messenger &) const
{
  for (size_t i = 0; i < str.size(); i++)
    if (str[i] == '/')
      str[i] = '\\';
  return 1;
}

#endif /* SP_MSDOS_FILENAMES */

#ifdef SP_MAC_FILENAMES
// Colons separate directory names
// relative path-names start with a colon, or have no colons
// absolute path-names don't start with a colon and have at least one colon
#define FILENAME_TYPE_DEFINED

Boolean PosixStorageManager::isAbsolute(const StringC &s) const
{
  if (s.size() == 0)
    return 0;
  if (s[0] == ':')
    return 0;	// starts with a colon => relative
  size_t ss = s.size();
  for (size_t i = 0; i < ss; i++)
    if (s[i] == ':')
      return 1; // absolute
  return 0; // no colons => relative
}

StringC PosixStorageManager::extractDir(const StringC &str) const
{
  for (size_t i = str.size(); i > 0; i--)
    if (str[i - 1] == ':')
      return StringC(str.data(), i);	// include separator
  return StringC();
}

StringC PosixStorageManager::combineDir(const StringC &dir,
					const StringC &base) const
{
  StringC result(dir);
  if (dir.size() > 0) {
    Char lastChar = dir[dir.size() - 1];
    if (lastChar != ':')
    result += ':';
  }
  if (base[0] == ':') {
    StringC newbase(base.data() + 1,base.size() - 1);
    result += newbase;
  }
  else result += base;
  return result;
}

Boolean PosixStorageManager::transformNeutral(StringC &str, Boolean,
					      Messenger &) const
{
  if (str[0] == '/') {	// absolute
    StringC nstr(str.data() + 1,str.size()-1);
    str = nstr;
  }
  else {	// relative
    Char cc = ':';
    StringC colon(&cc,1);
    str.insert(0,colon);
  }
  for (size_t i = 0; i < str.size(); i++)
    if (str[i] == '/')
      str[i] = ':';
  return 1;
}

#endif /* SP_MAC_FILENAMES */

#ifndef FILENAME_TYPE_DEFINED

Boolean PosixStorageManager::isAbsolute(const StringC &) const
{
  return 1;
}

StringC PosixStorageManager::extractDir(const StringC &) const
{
  return StringC();
}

StringC PosixStorageManager::combineDir(const StringC &,
					const StringC &base) const
{
  return base;
}

Boolean PosixStorageManager::transformNeutral(StringC &, Boolean,
					      Messenger &) const
{
  return 1;
}

#endif /* not FILENAME_TYPE_DEFINED */

Boolean PosixStorageManager::resolveRelative(const StringC &baseId,
					     StringC &specId,
					     Boolean search) const
{
  if (isAbsolute(specId))
    return 1;
  if (!search || searchDirs_.size() == 0) {
    specId = combineDir(extractDir(baseId), specId);
    return 1;
  }
  return 0;
}

StorageObject *
PosixStorageManager::makeStorageObject(const StringC &spec,
				       const StringC &base,
				       Boolean search,
				       Boolean mayRewind,
				       Messenger &mgr,
				       StringC &found)
{
  if (spec.size() == 0) {
    mgr.message(PosixStorageMessages::invalidFilename,
		StringMessageArg(spec));
    return 0;
  }
  descriptorManager_.acquireD();
  Boolean absolute = isAbsolute(spec);
  SearchResultMessageArg sr;
  for (size_t i = 0; i < searchDirs_.size() + 1; i++) {
    StringC filename;
    if (absolute)
      filename = spec;
    else if (i == 0)
    	filename = combineDir(extractDir(base), spec);
    else
      filename = combineDir(searchDirs_[i - 1], spec);

    if (restrictFileReading_ && !isSafe(filename)) continue;

#ifdef SP_WIDE_SYSTEM
    String<FChar> cfilename;
    for (size_t j = 0; j < filename.size(); j++)
      cfilename += FChar(filename[j]);
    cfilename += FChar(0);
#else
    String<FChar> cfilename = filenameCodingSystem_->convertOut(filename);
#endif
    int fd;
    do {
      fd = openFile(cfilename.data());
    } while (fd < 0 && errno == EINTR);
    if (fd >= 0) {
      found = filename;
      return new PosixStorageObject(fd,
				    filename,
				    cfilename,
				    mayRewind,
				    &descriptorManager_);
    }
    int savedErrno = errno;
    if ((absolute || !search || searchDirs_.size() == 0) && !restrictFileReading_) {
      ParentLocationMessenger(mgr).message(PosixStorageMessages::openSystemCall,
					   StringMessageArg(filename),
					   ErrnoMessageArg(savedErrno));
      descriptorManager_.releaseD();
      return 0;
    }
    if (!restrictFileReading_) sr.add(filename, savedErrno);
  }
  descriptorManager_.releaseD();
  ParentLocationMessenger(mgr).message(PosixStorageMessages::cannotFind,
				       StringMessageArg(spec), sr);
  return 0;
}

PosixStorageObject::PosixStorageObject(int fd,
				       const StringC &filename,
				       const String<FChar> &cfilename,
				       Boolean mayRewind,
				       DescriptorManager *manager)
: DescriptorUser(manager),
  PosixBaseStorageObject(fd, mayRewind),
  suspended_(0),
  filename_(filename),
  cfilename_(cfilename)
{
}

PosixStorageObject::~PosixStorageObject()
{
  if (fd_ >= 0) {
    (void)xclose(fd_);
    releaseD();
  }
}

Boolean PosixStorageObject::seek(off_t off, Messenger &mgr)
{
  if (lseek(fd_, off, SEEK_SET) < 0) {
    fd_ = -1;
    systemError(mgr, PosixStorageMessages::lseekSystemCall, errno);
    return 0;
  }
  else
    return 1;
}

Boolean PosixStorageObject::read(char *buf, size_t bufSize, Messenger &mgr,
				 size_t &nread)
{
  if (readSaved(buf, bufSize, nread))
    return 1;
  if (suspended_)
    resume(mgr);
  if (fd_ < 0 || eof_)
    return 0;
  long n;
  do {
    n = ::read(fd_, buf, bufSize);
  } while (n < 0 && errno == EINTR);
  if (n > 0) {
    nread = size_t(n);
    saveBytes(buf, nread);
    return 1;
  }
  if (n < 0) {
    int saveErrno = errno;
    releaseD();
    (void)xclose(fd_);
    systemError(mgr, PosixStorageMessages::readSystemCall, saveErrno);
    fd_ = -1;
  }
  else {
    eof_ = 1;
    // n == 0, so end of file
    if (!mayRewind_) {
      releaseD();
      if (xclose(fd_) < 0)
	systemError(mgr, PosixStorageMessages::closeSystemCall, errno);
      fd_ = -1;
    }
    
  }
  return 0;
}

void PosixStorageObject::willNotRewind()
{
  RewindStorageObject::willNotRewind();
  if (eof_ && fd_ >= 0) {
    releaseD();
    (void)xclose(fd_);
    fd_ = -1;
  }
}

Boolean PosixStorageObject::suspend()
{
  if (fd_ < 0 || suspended_)
    return 0;
  struct stat sb;
  if (fstat(fd_, &sb) < 0 || !S_ISREG(sb.st_mode))
    return 0;
  suspendFailedMessage_ = 0;
  suspendPos_ = lseek(fd_, 0, SEEK_CUR);
  if (suspendPos_ == (off_t)-1) {
    suspendFailedMessage_ = &PosixStorageMessages::lseekSystemCall;
    suspendErrno_ = errno;
  }
  if (xclose(fd_) < 0 && !suspendFailedMessage_) {
    suspendFailedMessage_ = &PosixStorageMessages::closeSystemCall;
    suspendErrno_ = errno;
  }
  fd_ = -1;
  suspended_ = 1;
  releaseD();
  return 1;
}

void PosixStorageObject::resume(Messenger &mgr)
{
  ASSERT(suspended_);
  if (suspendFailedMessage_) {
    systemError(mgr, *suspendFailedMessage_, suspendErrno_);
    suspended_ = 0;
    return;
  }
  acquireD();
  // suspended_ must be 1 until after acquireD() is called,
  // so that we don't try to suspend this one before it is resumed.
  suspended_ = 0;
  do {
    fd_ = openFile(cfilename_.data());
  } while (fd_ < 0 && errno == EINTR);
  if (fd_ < 0) {
    releaseD();
    systemError(mgr, PosixStorageMessages::openSystemCall, errno);
    return;
  }
  if (lseek(fd_, suspendPos_, SEEK_SET) < 0) {
    systemError(mgr, PosixStorageMessages::lseekSystemCall, errno);
    (void)xclose(fd_);
    fd_ = -1;
    releaseD();
  }
}

#ifdef SP_STAT_BLKSIZE

size_t PosixBaseStorageObject::getBlockSize() const
{
  struct stat sb;
  long sz;
  if (fstat(fd_, &sb) < 0)
    return defaultBlockSize;
  if (!S_ISREG(sb.st_mode))
    return defaultBlockSize;
  if ((unsigned long)sb.st_blksize > size_t(-1))
    sz = size_t(-1);
  else
    sz = sb.st_blksize;
  return sz;
}

#else /* not SP_STAT_BLKSIZE */

size_t PosixBaseStorageObject::getBlockSize() const
{
  return defaultBlockSize;
}

#endif /* not SP_STAT_BLKSIZE */

void PosixStorageObject::systemError(Messenger &mgr,
				     const MessageType2 &msg,
				     int err)
{
  ParentLocationMessenger(mgr).message(msg,
				       StringMessageArg(filename_),
				       ErrnoMessageArg(err));
}

class PosixFdStorageObject : public PosixBaseStorageObject {
public:
  PosixFdStorageObject(int, Boolean mayRewind);
  Boolean read(char *buf, size_t bufSize, Messenger &mgr, size_t &nread);
  Boolean seek(off_t, Messenger &);
  enum {
    noError,
    readError,
    invalidNumberError,
    lseekError
  };
private:
  int origFd_;
};

PosixFdStorageManager::PosixFdStorageManager(const char *type,
					     const CharsetInfo *idCharset)
: IdStorageManager(idCharset), type_(type)
{
}

Boolean PosixFdStorageManager::inheritable() const
{
  return 0;
}

StorageObject *PosixFdStorageManager::makeStorageObject(const StringC &id,
							const StringC &,
							Boolean,
							Boolean mayRewind,
							Messenger &mgr,
							StringC &foundId)
{
  int n = 0;
  size_t i;
  for (i = 0; i < id.size(); i++) {
    UnivChar ch;
    if (!idCharset()->descToUniv(id[i], ch))
      break;
    if (ch < UnivCharsetDesc::zero || ch > UnivCharsetDesc::zero + 9)
      break;
    int digit = ch - UnivCharsetDesc::zero;
    // Allow the division to be done at compile-time.
    if (n > INT_MAX/10)
      break;
    n *= 10;
    if (n > INT_MAX - digit)
      break;
    n += digit;
  }
  if (i < id.size() || i == 0) {
    mgr.message(PosixStorageMessages::invalidNumber,
		StringMessageArg(id));
    return 0;
  }
  foundId = id;
  // Could check access mode with fcntl(n, F_GETFL).
  return new PosixFdStorageObject(n, mayRewind);
}

PosixFdStorageObject::PosixFdStorageObject(int fd, Boolean mayRewind)
: PosixBaseStorageObject(fd, mayRewind), origFd_(fd)
{
}

const char *PosixFdStorageManager::type() const
{
  return type_;
}

Boolean PosixFdStorageObject::read(char *buf, size_t bufSize, Messenger &mgr,
				   size_t &nread)
{
  if (readSaved(buf, bufSize, nread))
    return 1;
  if (fd_ < 0 || eof_)
    return 0;
  long n;
  do {
    n = ::read(fd_, buf, bufSize);
  } while (n < 0 && errno == EINTR);
  if (n > 0) {
    nread = size_t(n);
    saveBytes(buf, nread);
    return 1;
  }
  if (n < 0) {
    ParentLocationMessenger(mgr).message(PosixStorageMessages::fdRead,
					 NumberMessageArg(fd_),
					 ErrnoMessageArg(errno));
    fd_ = -1;
  }
  else
    eof_ = 1;
  return 0;
}

Boolean PosixFdStorageObject::seek(off_t off, Messenger &mgr)
{
  if (lseek(fd_, off, SEEK_SET) < 0) {
    ParentLocationMessenger(mgr).message(PosixStorageMessages::fdLseek,
					 NumberMessageArg(fd_),
					 ErrnoMessageArg(errno));
    return 0;
  }
  else
    return 1;
}

#ifdef SP_NAMESPACE
}
#endif
