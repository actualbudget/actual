// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#include "splib.h"

#ifdef SP_WININET

#include "WinInetStorage.h"
#include "WinInetStorageMessages.h"
#include "RewindStorageObject.h"
#include "UnivCharsetDesc.h"
#include "MessageArg.h"
#include "MessageBuilder.h"
#include "macros.h"

#define STRICT
#include <windows.h>
#include <wininet.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

static UnivCharsetDesc::Range range = { 0, 128, 0 };
static CharsetInfo iso646Charset(UnivCharsetDesc(&range, 1));

String<char> toAscii(const StringC &buf)
{
  String<char> s;
  for (size_t i = 0; i < buf.size(); i++)
    s += buf[i];
  s += '\0';
  return s;
}
class Win32MessageArg : public MessageArg {
public:
  Win32MessageArg(DWORD n) : n_(n) { }
  MessageArg *copy() const { return new Win32MessageArg(*this); }
  void append(MessageBuilder &) const;
private:
  DWORD n_;
};

void Win32MessageArg::append(MessageBuilder &builder) const
{
  void *msg;
  if (!FormatMessageA(FORMAT_MESSAGE_FROM_SYSTEM
		      |FORMAT_MESSAGE_ALLOCATE_BUFFER,
		      0,
		      n_,
		      MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
		      (LPSTR)&msg,
		      0,
		      0)) {
    // FIXME interpret common internet messages here
    builder.appendNumber(n_);
    return;
  }
  String<Char> s;
  for (char *tem = (char *)msg; *tem; tem++)
    s += *tem;
  LocalFree(msg);
  builder.appendChars(s.data(), s.size());
}

class WinInetStorageObject : public RewindStorageObject {
public:
  WinInetStorageObject(HINTERNET fd, Boolean mayRewind, const StringC &url);
  ~WinInetStorageObject();
  Boolean read(char *buf, size_t bufSize, Messenger &mgr, size_t &nread);
  Boolean seekToStart(Messenger &);
private:
  WinInetStorageObject(const WinInetStorageObject &); // undefined
  void operator=(const WinInetStorageObject &); // undefined
  Boolean eof_;
  HINTERNET fd_;
  StringC url_;
};

WinInetStorageManager::WinInetStorageManager(const char *type)
: type_(type), IdStorageManager(&iso646Charset), session_(0)
{
}

WinInetStorageManager::~WinInetStorageManager()
{
  if (session_) {
    InternetCloseHandle(session_);
    session_ = 0;
  }
}

const char *WinInetStorageManager::type() const
{
  return type_;
}

Boolean WinInetStorageManager::initSession()
{
  if (!session_) {
    session_ = InternetOpenA("SP",
                             INTERNET_OPEN_TYPE_PRECONFIG,
			     0,
			     0,
			     0);
  }
  return 1;
}

Boolean WinInetStorageManager::guessIsId(const StringC &id,
				     const CharsetInfo &charset) const
{
  if (id.size() < 8)
    return 0;
  size_t i = 0;
  // guess other schemes supported by download protocols
  for (const char *s = "http://"; *s; s++, i++)
    if (id[i] != charset.execToDesc(*s)
	&& (!islower(*s) || id[i] != charset.execToDesc(toupper(*s))))
      return 0;
  return 1;
}

StorageObject *WinInetStorageManager::makeStorageObject(const StringC &specId,
							const StringC &baseId,
							Boolean,
							Boolean mayRewind,
						        Messenger &mgr,
						        StringC &id)
{
  if (!initSession())
    return 0;
  id = specId;
  resolveRelative(baseId, id, 0);
  String<char> tem(toAscii(id));
  HINTERNET fd = InternetOpenUrlA(session_, tem.data(), 0, 0, 0, 0); 
  if (!fd) {
    DWORD err = GetLastError();
    mgr.message(WinInetStorageMessages::cannotOpen,
                StringMessageArg(id),
		Win32MessageArg(err));
    return 0;
  }
  // FIXME report an error
  return new WinInetStorageObject(fd, mayRewind, id);
}

Boolean WinInetStorageManager::resolveRelative(const StringC &baseId,
					       StringC &id,
					       Boolean) const
{
  DWORD bufSize = baseId.size() + id.size() + 1;
  char *buf = new char[bufSize];
  String<char> baseIdA (toAscii(baseId));
  String<char> idA(toAscii(id));
  if (InternetCombineUrlA(baseIdA.data(),
			  idA.data(),
			  buf,
			  &bufSize,
			  0)) {
    id.resize(0);
    for (size_t i = 0; i < bufSize; i++)
      id += buf[i];
    delete [] buf;
    return 1;
  }
  delete [] buf;
  return 0;
}

Boolean WinInetStorageManager::transformNeutral(StringC &str, Boolean fold,
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


WinInetStorageObject::WinInetStorageObject(HINTERNET fd,
					   Boolean mayRewind,
					   const StringC &url)
: RewindStorageObject(mayRewind, 0), fd_(fd), url_(url), eof_(0)
{
}

WinInetStorageObject::~WinInetStorageObject()
{
  if (fd_ != 0) {
    (void)InternetCloseHandle(fd_);
    fd_ = 0;
  }
}

Boolean WinInetStorageObject::read(char *buf, size_t bufSize, Messenger &mgr,
				   size_t &nread)
{
  if (readSaved(buf, bufSize, nread))
    return 1;
  if (fd_ == 0 || eof_)
    return 0;
  DWORD n;
  if (!InternetReadFile(fd_, buf, bufSize, &n)) {
    DWORD err = GetLastError();
    mgr.message(WinInetStorageMessages::readFailed,
                StringMessageArg(url_),
		Win32MessageArg(err));
    return 0;
  }
  if (n) {
    nread = n;
    return 1;
  }
  eof_ = 1;
  InternetCloseHandle(fd_);
  fd_ = 0;
  return 0;
}

Boolean WinInetStorageObject::seekToStart(Messenger &)
{
  CANNOT_HAPPEN();
  return 0;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_WININET */
