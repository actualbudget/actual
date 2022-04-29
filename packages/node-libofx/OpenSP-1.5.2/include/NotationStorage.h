// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#ifndef NotationStorage_INCLUDED
#define NotationStorage_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "StorageManager.h"
#include "CharsetInfo.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API NotationStorageManager : public StorageManager {
public:
  NotationStorageManager(const char *type);
  StorageObject *makeStorageObject(const StringC &id,
				   const StringC &baseId,
				   Boolean search,
				   Boolean mayRewind,
				   Messenger &,
				   StringC &foundId);
  const char *type() const;
  Boolean inheritable() const;
private:
  NotationStorageManager(const NotationStorageManager &); // undefined
  void operator=(const NotationStorageManager &);	  // undefined
  const char *type_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not NotationStorage_INCLUDED */
