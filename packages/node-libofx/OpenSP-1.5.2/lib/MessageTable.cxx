// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "MessageTable.h"
#include "MessageModule.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

MessageModule libModule;
MessageModule appModule;

#ifdef SP_NAMESPACE
}
#endif

#ifdef SP_NO_MESSAGE_TEXT

// Windows only

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class WinMessageTable : public MessageTable {
public:
  Boolean getText(const MessageFragment &,
		  String<SP_TCHAR> &) const;
  
};

Boolean WinMessageTable::getText(const MessageFragment &frag,
				 String<SP_TCHAR> &str) const
{
  static const int bufSize = 4096;
  SP_TCHAR buf[bufSize];
#ifdef SP_WIDE_SYSTEM
  int len = LoadStringW(frag.module()->dllInstanceHandle,
		       frag.number(),
		       buf,
		       bufSize);
  if (len == 0 && GetLastError() != 0) {
    char bufmb[bufSize*2];
    len = LoadStringA(frag.module()->dllInstanceHandle,
		      frag.number(),
		      bufmb,
		      bufSize*2);
    if (len != 0) {
      len = MultiByteToWideChar(CP_ACP, 0, bufmb, len, buf, bufSize);
      if (len == 0 && GetLastError() != 0)
	return 0;
    }
    else if (GetLastError() != 0)
      return 0;
  }
#else /* not SP_WIDE_SYSTEM */
  int len = LoadStringA(frag.module()->dllInstanceHandle,
		        frag.number(),
		        buf,
		        bufSize);
  if (len == 0 && GetLastError() != 0)
    return 0;
#endif /* not SP_WIDE_SYSTEM */
  if (len == 0) {
    str.resize(0);
    return 1;
  }
  str.assign(buf, len);
  return 1;
}

static WinMessageTable theMessageTable;

#ifdef SP_NAMESPACE
}
#endif

#ifdef SP_USE_DLL
extern "C"
BOOL WINAPI DllMain(HINSTANCE inst, ULONG reason, LPVOID)
{
  if (reason == DLL_PROCESS_ATTACH)
    SP_NAMESPACE_SCOPE libModule.dllInstanceHandle = inst;
  return TRUE;
}
#endif

#else /* not SP_NO_MESSAGE_TEXT */

#ifdef SP_HAVE_GETTEXT
extern "C" {
extern char *dgettext(const char *, const char *);
extern char *gettext(const char *);
extern char *textdomain(const char *);
extern char *bindtextdomain(const char *, const char *);
}

#include <stdlib.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class GettextMessageTable : public MessageTable {
public:
  Boolean getText(const MessageFragment &, String<SP_TCHAR> &) const;
  void registerMessageDomain(MessageModule &module, char *domain, char *dir) const;
};

void GettextMessageTable::registerMessageDomain(MessageModule &module, 
                                                char *domain, char *dir) const  
{
  module.domain = domain; 
  if (dir) 
    bindtextdomain(domain, dir);
}

Boolean GettextMessageTable::getText(const MessageFragment &frag,
				     String<SP_TCHAR> &str) const
{
  const char *s = frag.text();
  if (!s)
    return 0;
  s = dgettext(frag.module()->domain, s);
  if (!s)
    return 0;
  str.assign(s, strlen(s));
  return 1;
}

static GettextMessageTable theMessageTable;

#ifdef SP_NAMESPACE
}
#endif

#else /* not SP_HAVE_GETTEXT */

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class DefaultMessageTable : public MessageTable {
public:
  Boolean getText(const MessageFragment &, String<SP_TCHAR> &) const;
};

Boolean DefaultMessageTable::getText(const MessageFragment &frag,
				     String<SP_TCHAR> &str) const
{
  if (!frag.text())
    return 0;
  str.resize(0);
  for (const char *s = frag.text(); *s; s++)
    str += SP_TCHAR((unsigned char)*s);
  return 1;
}

static DefaultMessageTable theMessageTable;

#ifdef SP_NAMESPACE
}
#endif

#endif /* not SP_HAVE_GETTEXT */

#endif /* not SP_NO_MESSAGE_TEXT */

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

const MessageTable *MessageTable::instance()
{
  return &theMessageTable;
}

#ifdef SP_NAMESPACE
}
#endif
