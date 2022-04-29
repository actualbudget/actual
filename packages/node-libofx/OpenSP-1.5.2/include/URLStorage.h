// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifndef URLStorage_INCLUDED
#define URLStorage_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "StorageManager.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API URLStorageManager : public IdStorageManager {
public:
  URLStorageManager(const char *type);
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
  URLStorageManager(const URLStorageManager &); // undefined
  void operator=(const URLStorageManager &);	// undefined
  const char *type_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not URLStorage_INCLUDED */
