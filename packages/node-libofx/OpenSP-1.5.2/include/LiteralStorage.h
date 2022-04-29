// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifndef LiteralStorage_INCLUDED
#define LiteralStorage_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "StorageManager.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API LiteralStorageManager : public StorageManager {
public:
  LiteralStorageManager(const char *type);
  StorageObject *makeStorageObject(const StringC &id,
				   const StringC &,
				   Boolean,
				   Boolean mayRewind,
				   Messenger &,
				   StringC &found); 
  const InputCodingSystem *requiredCodingSystem() const;
  Boolean requiresCr() const;
  const char *type() const;
  Boolean inheritable() const;
private:
  LiteralStorageManager(const LiteralStorageManager &); // undefined
  void operator=(const LiteralStorageManager &);	// undefined

  const char *type_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not LiteralStorage_INCLUDED */
