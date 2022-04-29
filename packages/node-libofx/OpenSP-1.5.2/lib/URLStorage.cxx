// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

// FIXME This implementation won't work on an EBCDIC machine.

#include "splib.h"
#ifdef WINSOCK
#include <winsock.h>
#define readsocket(s, p, n) ::recv(s, p, n, 0)
#define writesocket(s, p, n) ::send(s, p, n, 0)
#define errnosocket (WSAGetLastError())
#define SocketMessageArg(n) WinsockMessageArg(n)
#define SOCKET_EINTR (WSAEINTR)
#define SP_HAVE_SOCKET
#else
#ifdef SP_HAVE_SOCKET
#include <stdio.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netdb.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#ifdef SP_INCLUDE_UNISTD_H
#include <unistd.h>
#endif

#ifdef SP_INCLUDE_OSFCN_H
#include <osfcn.h>
#endif

#ifdef SP_DECLARE_H_ERRNO
extern int h_errno;
#endif

typedef int SOCKET;
#define SOCKET_ERROR (-1)
#define INVALID_SOCKET (-1)
#define SOCKET_EINTR (EINTR)
#define closesocket(s) close(s)
#define writesocket(fd, p, n) ::write(fd, p, n)
#define readsocket(s, p, n) ::read(s, p, n)
#define errnosocket (errno)
#define SocketMessageArg(n) ErrnoMessageArg(n)
#include "ErrnoMessageArg.h"

#endif /* SP_HAVE_SOCKET */

#endif /* not WINSOCK */

#include "URLStorage.h"
#include "URLStorageMessages.h"
#include "RewindStorageObject.h"
#include "UnivCharsetDesc.h"
#include "MessageArg.h"
#include "MessageBuilder.h"
#include "macros.h"

#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <stddef.h>
#include <ctype.h>
#include <stdio.h>


#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

static UnivCharsetDesc::Range range = { 0, 128, 0 };
static CharsetInfo iso646Charset(UnivCharsetDesc(&range, 1));

#ifdef SP_HAVE_SOCKET

typedef enum {
	HTTP_OK ,
	HTTP_REDIRECT ,
	HTTP_ERROR
} HTTP_RESPONSE_TYPE ;

class HttpSocketStorageObject : public RewindStorageObject {
public:
  HttpSocketStorageObject(SOCKET fd, Boolean mayRewind, const StringC &hostStr);
  ~HttpSocketStorageObject();
  HTTP_RESPONSE_TYPE open(const String<char> &host,
               unsigned short port,
               const String<char> &path,
               Messenger &,
		char[]);
  Boolean read(char *buf, size_t bufSize, Messenger &mgr, size_t &nread);
  Boolean seekToStart(Messenger &);
  static SOCKET openHttp(const String<char> &host,
			 unsigned short port,
			 const StringC &hostStr,
			 Messenger &mgr);
private:
  HttpSocketStorageObject(const HttpSocketStorageObject &); // undefined
  void operator=(const HttpSocketStorageObject &); // undefined
  HTTP_RESPONSE_TYPE readHeader(Messenger &, char[]);
  Boolean readLine(Messenger &mgr, String<char> &line, String<char> &leftOver);
  static Boolean parseStatus(const char *&ptr, int &val);
  StringC hostStr_;
  String<char> path_;
  Boolean eof_;
  SOCKET fd_;
};

#ifdef WINSOCK

class WinsockMessageArg : public MessageArg {
public:
  WinsockMessageArg(int n) : n_(n) { }
  MessageArg *copy() const { return new WinsockMessageArg(*this); }
  void append(MessageBuilder &) const;
private:
  int n_;
};

void WinsockMessageArg::append(MessageBuilder &builder) const
{
  // I can't figure out how to get a string associated
  // with this error number.  FormatMessage() doesn't seem
  // to work.
  builder.appendFragment(URLStorageMessages::winsockErrorNumber);
  builder.appendNumber(n_);
}

class WinsockIniter {
public:
  WinsockIniter();
  ~WinsockIniter();
  Boolean init(Messenger &mgr);
private:
  Boolean inited_;
  Boolean initSuccess_;
};

static WinsockIniter winsockIniter;

WinsockIniter::WinsockIniter()
: inited_(0)
{
}

WinsockIniter::~WinsockIniter()
{
  if (inited_ && initSuccess_)
    (void)WSACleanup();
}

Boolean WinsockIniter::init(Messenger &mgr)
{
  if (!inited_) {
    inited_ = 1;
    initSuccess_ = 0;
    WORD version = MAKEWORD(1, 1);
    WSADATA wsaData;
    int err = WSAStartup(version, &wsaData);
    if (err)
      mgr.message(URLStorageMessages::winsockInitialize,
		  WinsockMessageArg(err));
    else if (LOBYTE(wsaData.wVersion) != 1
	     || HIBYTE(wsaData.wVersion) != 1) {
      mgr.message(URLStorageMessages::winsockVersion);
      WSACleanup();
    }
    else
      initSuccess_ = 1;
  }
  return initSuccess_;
}

#endif /* WINSOCK */

#endif /* SP_HAVE_SOCKET */

URLStorageManager::URLStorageManager(const char *type)
: type_(type), IdStorageManager(&iso646Charset)
{
}

const char *URLStorageManager::type() const
{
  return type_;
}

Boolean URLStorageManager::guessIsId(const StringC &id,
				     const CharsetInfo &charset) const
{
  if (id.size() < 8)
    return 0;
  size_t i = 0;
  for (const char *s = "http://"; *s; s++, i++)
    if (id[i] != charset.execToDesc(*s)
	&& (!islower(*s) || id[i] != charset.execToDesc(toupper(*s))))
      return 0;
  return 1;
}

inline int strdiff(const char* str, char* buf) {
  if ( ! *buf )
    return 1 ;
  if ( strlen(buf) <= strlen (str) )
    return 2 ;
//  if ( strncasecmp(buf, str, strlen(str)) )
  for ( int i = 0; i < strlen(str); ++i)
    if ( tolower(buf[i]) != tolower(str[i]) )
      return 3 ;
  return 0 ;
}

StorageObject *URLStorageManager::makeStorageObject(const StringC &specId,
						    const StringC &baseId,
						    Boolean,
						    Boolean mayRewind,
						    Messenger &mgr,
						    StringC &id)
{
#ifdef SP_HAVE_SOCKET
  id = specId;
  resolveRelative(baseId, id, 0);
  if (id.size() < 5
      || (id[0] != 'h' && id[0] != 'H')
      || (id[1] != 't' && id[1] != 'T')
      || (id[2] != 't' && id[2] != 'T')
      || (id[3] != 'p' && id[3] != 'P')
      || id[4] != ':') {
    mgr.message(URLStorageMessages::onlyHTTP);
    return 0;
  }
  if (id.size() < 7 || id[5] != '/' || id[6] != '/') {
    mgr.message(URLStorageMessages::badRelative,
		StringMessageArg(id));
    return 0;
  }
  size_t i = 7;
  String<char> host;
  while (i < id.size()) {
    if (id[i] == '/')
      break;
    if (id[i] == ':')
      break;
    host += char(id[i]);
    i++;
  }
  if (host.size() == 0) {
    mgr.message(URLStorageMessages::emptyHost,
		StringMessageArg(id));
    return 0;
  }
  unsigned short port;
  if (i < id.size() && id[i] == ':') {
    i++;
    String<char> digits;
    while (i < id.size() && id[i] != '/') {
      digits += char(id[i]);
      i++;
    }
    if (digits.size() == 0) {
      mgr.message(URLStorageMessages::emptyPort,
		  StringMessageArg(id));
      return 0;
    }
    digits += '\0';
    char *endptr;
    long n = strtol(digits.data(), &endptr, 10);
    if (endptr != digits.data() + digits.size() - 1
	|| n < 0
	|| n > 65535L) {
      mgr.message(URLStorageMessages::invalidPort,
		  StringMessageArg(id));
      return 0;
    }
    port = (unsigned short)n;
  }
  else
    port = 80;
  String<char> path;
  if (i < id.size()) {
    while (i < id.size() && id[i] != '#') {
      path += char(id[i]);
      i++;
    }
  }

  for ( int tries=0; tries<20; ++tries ) {
    if (path.size() == 0)
      path += '/';
    StringC hostStr;
    for (i = 0; i < host.size(); i++)
      hostStr += host[i];

// Support HTTP redirect but limit number against an infinite loop

    SOCKET fd = HttpSocketStorageObject::openHttp(host, port, hostStr, mgr);
    if (fd == INVALID_SOCKET)
      return 0;
    HttpSocketStorageObject *p
      = new HttpSocketStorageObject(fd, mayRewind, hostStr);
    char locbuf[256] ;
    static String<char> nullStringC("", 0) ;
    char* line ;
    switch (p->open(host, port, path, mgr, locbuf)) {
      case HTTP_OK:
        return p ;
      case HTTP_REDIRECT:
//        (void)closesocket(fd);
	delete p ;

	// reassign host, port and path
	// and go round the loop again
	line = locbuf ;

	if ( strdiff ("location:", line) )
	  return 0 ;
     	line += strlen("location:") ;


      while ( isspace(*line) )
	++line ;

	// call ourself recursively with our new URL

	// construct message - there must be a better way even without
	// hacking on other source files
	{ 
          StringC sline ;
	  for ( char* x = line; *x; ++x)
	    sline +=  (Char)(*x) ;
	  mgr.message(URLStorageMessages::Redirect, StringMessageArg(sline)) ;
	}

	host = nullStringC ;
	path = nullStringC ;
	port = 0 ;

	if ( strdiff ("http://", line) )
	  return 0 ;
	line += strlen("http://") ;

	while ( *line != ':' && *line != '/' )
	  host += *line++ ;

	if ( *line == ':' )
          while ( isdigit(*++line) )
	    port = 10 * port + ( *line - '0' ) ;
	else
	  port = 80 ;

	while ( *line && ! isspace(*line) )
          path += *line++ ;

	break ;

      case HTTP_ERROR:
        delete p;
        return 0;
    }
  }
  return 0 ;	// we were in an infinite redirection loop

#else /* not SP_HAVE_SOCKET */
  ParentLocationMessenger(mgr).message(URLStorageMessages::notSupported);
  return 0;
#endif /* not SP_HAVE_SOCKET */
}

Boolean URLStorageManager::resolveRelative(const StringC &baseId,
					   StringC &id,
					   Boolean) const
{
  static const char schemeChars[] = 
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "01234567879"
    "+-.";
  size_t i;
  // If it has a scheme, it is absolute.
  for (i = 0; i < id.size(); i++) {
    if (id[i] == ':') {
      if (i == 0)
	break;
      else
	return 1;
    }
    else if (!strchr(schemeChars, id[i]))
      break;
  }
  for (i = 0; i < id.size(); i++) {
    if (id[i] != '/')
      break;
  }
  size_t slashCount = i;
  if (slashCount > 0) {
    Boolean foundSameSlash = 0;
    size_t sameSlashPos;
    for (size_t j = 0; j < baseId.size(); j++) {
      size_t thisSlashCount = 0;
      for (size_t k = j; k < baseId.size() && baseId[k] == '/'; k++)
	thisSlashCount++;
      if (thisSlashCount == slashCount && !foundSameSlash) {
	foundSameSlash = 1;
	sameSlashPos = j;
      }
      else if (thisSlashCount > slashCount)
	foundSameSlash = 0;
    }
    if (foundSameSlash) {
      StringC tem(baseId.data(), sameSlashPos);
      tem += id;
      tem.swap(id);
    }
  }
  else {
    size_t j;
    for (j = baseId.size(); j > 0; j--)
      if (baseId[j - 1] == '/')
	break;
    if (j > 0) {
      StringC tem(baseId.data(), j);
      tem += id;
      tem.swap(id);
    }
  }
  // FIXME remove xxx/../, and /.
  return 1;
}

Boolean URLStorageManager::transformNeutral(StringC &str, Boolean fold,
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

#ifdef SP_HAVE_SOCKET

SOCKET HttpSocketStorageObject::openHttp(const String<char> &theHost,
					unsigned short port,
					const StringC &hostStr,
					Messenger &mgr)
{
  String<char> host = theHost;
  host += '\0';

#ifdef WINSOCK
  if (!winsockIniter.init(mgr))
    return INVALID_SOCKET;
#endif
  struct sockaddr_in sock;
  sock.sin_family = AF_INET;
  sock.sin_port = htons(port);
  if (isdigit((unsigned char)host[0])) {
    unsigned long n = inet_addr(host.data());
    if (n == (unsigned long)-1) {
      ParentLocationMessenger(mgr).message(URLStorageMessages::invalidHostNumber,
					   StringMessageArg(hostStr));
      return INVALID_SOCKET;
    }
    sock.sin_addr.s_addr = n;
  }
  else {
    struct hostent *hp = gethostbyname(host.data());
    if (!hp) {
      const MessageType1 *message;
      switch (h_errno) {
      case HOST_NOT_FOUND:
	message = &URLStorageMessages::hostNotFound;
	break;
      case TRY_AGAIN:
	message = &URLStorageMessages::hostTryAgain;
	break;
      case NO_RECOVERY:
	message = &URLStorageMessages::hostNoRecovery;
	break;
      case NO_DATA:
#ifdef NO_ADDRESS
#if NO_ADDRESS != NO_DATA
      case NO_ADDRESS:
#endif
#endif
	message = &URLStorageMessages::hostNoData;
	break;
      default:
#ifdef WINSOCK
	ParentLocationMessenger(mgr).message(URLStorageMessages::hostOtherError,
					     StringMessageArg(hostStr),
					     WinsockMessageArg(h_errno));
	return INVALID_SOCKET;
#else
	message = &URLStorageMessages::hostUnknownError;
	break;
#endif
      }
      ParentLocationMessenger(mgr).message(*message,
					   StringMessageArg(hostStr));
      return INVALID_SOCKET;
    }
    memcpy(&sock.sin_addr, hp->h_addr, hp->h_length);
  }
  SOCKET fd = socket(PF_INET, SOCK_STREAM, 0);
  if (fd == INVALID_SOCKET) {
    ParentLocationMessenger(mgr).message(URLStorageMessages::cannotCreateSocket,
					 SocketMessageArg(errnosocket));
    return INVALID_SOCKET;
  }
  if (connect(fd, (struct sockaddr *)&sock, sizeof(sock)) == SOCKET_ERROR) {
    ParentLocationMessenger(mgr).message(URLStorageMessages::cannotConnect,
					 StringMessageArg(hostStr),
					 SocketMessageArg(errnosocket));
    (void)closesocket(fd);
    return INVALID_SOCKET;
  }
  return fd;
}

HttpSocketStorageObject::HttpSocketStorageObject(SOCKET fd,
					       Boolean mayRewind,
					       const StringC &hostStr)

: RewindStorageObject(mayRewind, 0), hostStr_(hostStr), fd_(fd), eof_(0)
{
}

HttpSocketStorageObject::~HttpSocketStorageObject()
{
  if (fd_ != INVALID_SOCKET)
    (void)closesocket(fd_);
}

HTTP_RESPONSE_TYPE HttpSocketStorageObject::open(const String<char> &host,
				     unsigned short port,
	 	 		     const String<char> &path,
				     Messenger &mgr,
					char locbuf[])
{
  path_ = path;
  String<char> request;
  request.append("GET ", 4);
  request += path_;
  request += ' ';
  request.append("HTTP/1.0\r\n", 10);
  request.append("Host: ", 6);
  if (!isdigit((unsigned char)host[0])) {
    request += host;
    if (port != 80) {
      char portstr[sizeof(unsigned short)*3 + 1];
      sprintf(portstr, "%u", port);
      request.append(":", 1);
      request.append(portstr, strlen(portstr));
    } 
  }
  request.append("\r\n", 2);
  char* http_ua = getenv("SP_HTTP_USER_AGENT") ;
  if ( ! http_ua )
    http_ua = "libosp 1.5" ;
  request.append("User-Agent: ", 12) ;
  request.append(http_ua, strlen(http_ua)) ;
  request.append("\r\n", 2);
  const char* http_accept = getenv("SP_HTTP_ACCEPT") ;
  if ( http_accept ) {
    request.append("Accept: ", 8) ;
    request.append(http_accept, strlen(http_accept)) ;
    request.append("\r\n", 2);
  }
  request.append("\r\n", 2);

  // FIXME check length of write
  if (writesocket(fd_, request.data(), request.size()) == SOCKET_ERROR) {
    ParentLocationMessenger(mgr).message(URLStorageMessages::writeError,
					 StringMessageArg(hostStr_),
					 SocketMessageArg(errnosocket));
    (void)closesocket(fd_);
    fd_ = INVALID_SOCKET;
    return HTTP_ERROR ;
  }
  switch ( readHeader(mgr, locbuf) ) {
    case HTTP_OK:
	return HTTP_OK ;
    case HTTP_REDIRECT:
      (void)closesocket(fd_);
	return HTTP_REDIRECT ;
    case HTTP_ERROR:
      (void)closesocket(fd_);
      fd_ = INVALID_SOCKET;
      return HTTP_ERROR ;
  }
  return HTTP_ERROR ;
}

HTTP_RESPONSE_TYPE HttpSocketStorageObject::readHeader(Messenger &mgr,
							char locbuf[])
{
  String<char> buf ;
  String<char> leftOver;
  if (!readLine(mgr, buf, leftOver))
    return HTTP_ERROR;
  buf += '\0';
  const char *ptr = &buf[0];
  int val;
  if (!parseStatus(ptr, val)) {
    if (buf.size() > 0)
      unread(buf.data(), buf.size() - 1);
    return HTTP_OK;
  }
  if (val < 200 || val >= 400) {
    StringC reason;
    while (*ptr && *ptr != '\n' && *ptr != '\r') {
      reason += Char(*ptr);
      ptr++;
    }
    StringC pathStr;
    for (size_t i = 0; i < path_.size(); i++)
      pathStr += path_[i];
    ParentLocationMessenger(mgr).message(URLStorageMessages::getFailed,
					 StringMessageArg(hostStr_),
					 StringMessageArg(pathStr),
					 StringMessageArg(reason));
    return HTTP_ERROR;
  }
  for (;;) {
    if (!readLine(mgr, buf, leftOver))
      return HTTP_ERROR;
    if ( ! strdiff("location:", (char*) buf.data() ) ) {
      unsigned int sz = buf.size() > 255 ? 255 : buf.size() ;
      strncpy(locbuf, buf.data(), sz) ;
      locbuf[sz] = 0 ;
      for (int i=0; i<sz; ++i)
	if ( locbuf[i] == '\r' || locbuf[i] == '\n' ) {
	  locbuf[i] = 0 ;
	  break ;
	}
    }
    if (buf.size() == 0 || buf[0] == '\r' || buf[0] == '\n')
      break;
  }
  if (leftOver.size())
    unread(leftOver.data(), leftOver.size());
  return ( val < 300 ) ? HTTP_OK : HTTP_REDIRECT ;
}

// Status line must start with: "HTTP/" 1*DIGIT "." 1*DIGIT SP 3DIGIT SP

Boolean HttpSocketStorageObject::parseStatus(const char *&ptr, int &val)
{
  static const char ver[] = "HTTP/";
  for (const char *v = ver; *v; v++, ptr++)
    if (*v != *ptr)
      return 0;
  if (!isdigit((unsigned char)*ptr))
    return 0;
  do {
    ++ptr;
  } while (isdigit((unsigned char)*ptr));
  if (*ptr != '.')
    return 0;
  ptr++;
  if (!isdigit((unsigned char)*ptr))
    return 0;
  do {
    ++ptr;
  } while (isdigit((unsigned char)*ptr));
  if (*ptr != ' ')
    return 0;
  ptr++;
  val = 0;
  for (int i = 0; i < 3; i++, ptr++) {
    if (!isdigit((unsigned char)*ptr))
      return 0;
    val = val*10 + *ptr - '0';
  }
  if (*ptr != ' ')
    return 0;
  ptr++;
  return 1;
}

// True will be returned for an empty line.

Boolean HttpSocketStorageObject::readLine(Messenger &mgr,
					  String<char> &line,
					  String<char> &leftOver)
{
  line.resize(0);
  Boolean hadCr = 0;
  Boolean gotLine = 0;
  size_t li;
  for (li = 0; li < leftOver.size(); li++) {
    if (leftOver[li] == '\r') {
      if (hadCr) {
	gotLine = 1;
	break;
      }
      line += '\r';
      hadCr = 1;
    }
    else if (leftOver[li] == '\n') {
      line += '\n';
      li++;
      gotLine = 1;
      break;
    }
    else if (hadCr) {
      gotLine = 1;
      break;
    }
    else
      line += leftOver[li];
  }
  if (gotLine) {
    for (size_t i = li; i < leftOver.size(); i++)
      leftOver[i - li] = leftOver[i];
    leftOver.resize(leftOver.size() - li);
    return 1;
  }
  leftOver.resize(0);
  if (eof_)
    return 1;
  for (;;) {
    char c;
    long n;
    do {
      n = readsocket(fd_, &c, 1);
    } while (n < 0 && errnosocket == SOCKET_EINTR);
    if (n == 0) {
      (void)closesocket(fd_);
      eof_ = 1;
      return 1;
    }
    if (n < 0) {
      ParentLocationMessenger(mgr).message(URLStorageMessages::readError,
					   StringMessageArg(hostStr_),
					   SocketMessageArg(errnosocket));
      (void)closesocket(fd_);
      fd_ = INVALID_SOCKET;
      return 0;
    }
    switch (c) {
    case '\r':
      if (hadCr) {
	leftOver += c;
	return 1;
      }
      hadCr = 1;
      line += c;
      break;
    case '\n':
      line += c;
      return 1;
    default:
      if (hadCr) {
	leftOver += c;
	return 1;
      }
      line += c;
      break;
    }
  }
  return 0;			// not reached
}

Boolean HttpSocketStorageObject::read(char *buf, size_t bufSize, Messenger &mgr,
				     size_t &nread)
{
  if (readSaved(buf, bufSize, nread))
    return 1;
  if (fd_ == INVALID_SOCKET || eof_)
    return 0;
  long n;
  do {
    n = readsocket(fd_, buf, bufSize);
  } while (n < 0 && errnosocket == SOCKET_EINTR);
  if (n > 0) {
    nread = size_t(n);
    saveBytes(buf, nread);
    return 1;
  }
  if (n < 0) {
    ParentLocationMessenger(mgr).message(URLStorageMessages::readError,
					 StringMessageArg(hostStr_),
					 SocketMessageArg(errnosocket));
    fd_ = INVALID_SOCKET;
  }
  else {
    eof_ = 1;
    if (closesocket(fd_) == SOCKET_ERROR)
      ParentLocationMessenger(mgr).message(URLStorageMessages::closeError,
					   StringMessageArg(hostStr_),
					   SocketMessageArg(errnosocket));
    fd_ = INVALID_SOCKET;
  }
  return 0;
}

Boolean HttpSocketStorageObject::seekToStart(Messenger &)
{
  CANNOT_HAPPEN();
  return 0;
}

#endif /* SP_HAVE_SOCKET */

#ifdef SP_NAMESPACE
}
#endif
