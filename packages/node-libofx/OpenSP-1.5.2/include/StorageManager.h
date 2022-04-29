// Copyright (c) 1994, 1995 James Clark
// See the file COPYING for copying permission.

#ifndef StorageManager_INCLUDED
#define StorageManager_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "StringC.h"
#include "types.h"
#include "CharsetInfo.h"
#include <stddef.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class StorageManager;
class CharsetInfo;
class Messenger;
class InputCodingSystem;

class SP_API StorageObject {
public:
  StorageObject();
  virtual ~StorageObject();
  virtual Boolean read(char *buf, size_t bufSize, Messenger &,
		       size_t &nread) = 0;
  virtual Boolean rewind(Messenger &) = 0;
  virtual void willNotRewind();
  virtual size_t getBlockSize() const;
private:
  StorageObject(const StorageObject &);	// undefined
  void operator=(const StorageObject &); // undefined
};

class SP_API StorageManager {
public:
  StorageManager();
  virtual StorageObject *makeStorageObject(const StringC &specId,
					   const StringC &baseId,
					   Boolean search,
					   Boolean mayRewind,
					   Messenger &mgr,
					   StringC &actualId) = 0;
  virtual const char *type() const = 0;
  virtual Boolean inheritable() const;
  virtual Boolean transformNeutral(StringC &, Boolean fold, Messenger &) const;
  // Resolve a possibly relative ID by examining the base and specified IDs.
  // Put the resolved ID in specID.
  // Return 0 if it cannot be resolved yet becase the specified ID is relative
  // and physical searching is required to resolve it and search is true;
  // in this case the base will be passed to makeStorageObject.
  // Otherwise return 1; in this case the base will be discarded, and the
  // resolved ID will be passed to makeStorageObject.
  virtual Boolean resolveRelative(const StringC &base,
				  StringC &specId,
				  Boolean search) const;
  virtual Boolean guessIsId(const StringC &, const CharsetInfo &) const;
  virtual const InputCodingSystem *requiredCodingSystem() const;
  virtual Boolean requiresCr() const;
  virtual ~StorageManager();
  virtual const CharsetInfo *idCharset() const;
  virtual const StringC *reString() const;
private:
  StorageManager(const StorageManager &); // undefined
  void operator=(const StorageManager &); // undefined
};

class SP_API IdStorageManager : public StorageManager {
public:
  IdStorageManager(const CharsetInfo *idCharset);
  const CharsetInfo *idCharset() const;
  const StringC *reString() const;
protected:
  StringC reString_;
private:
  IdStorageManager(const IdStorageManager &); // undefined
  void operator=(const IdStorageManager &); // undefined

  const CharsetInfo *idCharset_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not StorageManager_INCLUDED */
