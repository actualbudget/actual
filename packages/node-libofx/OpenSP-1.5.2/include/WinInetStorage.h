// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifndef WinInetStorage_INCLUDED
#define WinInetStorage_INCLUDED 1

#include "StorageManager.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API WinInetStorageManager : public IdStorageManager {
public:
  WinInetStorageManager(const char *type);
  ~WinInetStorageManager();
  StorageObject *makeStorageObject(const StringC &id,
				   const StringC &baseId,
				   Boolean search,
				   Boolean mayRewind,
				   Messenger &,
				   StringC &found); 
  const char *type() const;
  Boolean guessIsId(const StringC &, const CharsetInfo &) const;
  Boolean transformNeutral(StringC &, Boolean fold, Messenger &) const;
private:
  Boolean resolveRelative(const StringC &base, StringC &specId, Boolean) const;
  WinInetStorageManager(const WinInetStorageManager &); // undefined
  void operator=(const WinInetStorageManager &);	// undefined
  Boolean initSession();
  const char *type_;
  void *session_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not WinInetStorage_INCLUDED */
