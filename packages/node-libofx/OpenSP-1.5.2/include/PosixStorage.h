// Copyright (c) 1994, 1995 James Clark
// See the file COPYING for copying permission.

#ifndef PosixStorage_INCLUDED
#define PosixStorage_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "StorageManager.h"
#include "DescriptorManager.h"
#include "Vector.h"
#include "StringC.h"
#include "CharsetInfo.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Messenger;
class CharsetInfo;
class UnivCharsetDesc;
class Filename;
class OutputCodingSystem;

class SP_API PosixStorageManager : public IdStorageManager {
public:
  PosixStorageManager(const char *type,
		      const CharsetInfo *filenameCharset,
#ifndef SP_WIDE_SYSTEM
		      const OutputCodingSystem *filenameCodingSystem,
#endif
		      int maxFDs,
		      Boolean restrictFileReading = 0);
  StorageObject *makeStorageObject(const StringC &id,
				   const StringC &baseId,
				   Boolean search,
				   Boolean mayRewind,
				   Messenger &,
				   StringC &foundId);
  Boolean resolveRelative(const StringC &, StringC &, Boolean syntactic = 0)
    const;
  const char *type() const;
  void addSearchDir(const StringC &);
  Boolean transformNeutral(StringC &, Boolean fold, Messenger &) const;
private:
  Boolean isAbsolute(const StringC &) const;
  Boolean isSafe(const StringC &) const;
  StringC extractDir(const StringC &) const;
  StringC combineDir(const StringC &, const StringC &) const;
  PosixStorageManager(const PosixStorageManager &); // undefined
  void operator=(const PosixStorageManager &);	    // undefined
  DescriptorManager descriptorManager_;
  Boolean restrictFileReading_;
#ifndef SP_WIDE_SYSTEM
  const OutputCodingSystem *filenameCodingSystem_;
#endif
  const char *type_;
  Vector<StringC> searchDirs_;
};

class SP_API PosixFdStorageManager : public IdStorageManager {
public:
  PosixFdStorageManager(const char *type,
			const CharsetInfo *filenameCharset);
  StorageObject *makeStorageObject(const StringC &id,
				   const StringC &baseId,
				   Boolean,
				   Boolean mayRewind,
				   Messenger &mgr,
				   StringC &foundId);
  const char *type() const;
  Boolean inheritable() const;
private:
  PosixFdStorageManager(const PosixFdStorageManager &); // undefined
  void operator=(const PosixFdStorageManager &);	    // undefined
  const char *type_;

};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not PosixStorage_INCLUDED */
