// Copyright (c) 1994, 1995 James Clark
// See the file COPYING for copying permission.

#ifndef StdioStorage_INCLUDED
#define StdioStorage_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "StorageManager.h"
#include "DescriptorManager.h"
#include "StringC.h"
#include "CharsetInfo.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Messenger;
class CharsetInfo;
class UnivCharsetDesc;
class OutputCodingSystem;

class SP_API StdioStorageManager : public IdStorageManager {
public:
  StdioStorageManager(const char *type,
		      const CharsetInfo *filenameCharset,
		      const OutputCodingSystem *filenameCodingSystem);
  StorageObject *makeStorageObject(const StringC &id,
				   const StringC &baseId,
				   Boolean,
				   Boolean mayRewind,
				   Messenger &,
				   StringC &foundId);
  const char *type() const;
private:
  StdioStorageManager(const StdioStorageManager &); // undefined
  void operator=(const StdioStorageManager &);	    // undefined
  const OutputCodingSystem *filenameCodingSystem_;
  const char *type_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not StdioStorage_INCLUDED */
