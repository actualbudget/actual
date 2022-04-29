// Copyright (c) 1994, 1995 James Clark
// See the file COPYING for copying permission.

#ifndef ExtendEntityManager_INCLUDED
#define ExtendEntityManager_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "EntityManager.h"
#include "CharsetInfo.h"
#include "types.h"
#include "Boolean.h"
#include "StringC.h"
#include "types.h"
#include "Vector.h"
#include "Location.h"
#include "CodingSystemKit.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class StorageManager;
class InputCodingSystem;
class Messenger;

struct SP_API StorageObjectSpec {
  StorageObjectSpec();
  ~StorageObjectSpec();
  StorageObjectSpec(const StorageObjectSpec&);
  StorageObjectSpec& operator=(const StorageObjectSpec&);
  StorageManager *storageManager;
  const char *codingSystemName;
  const InputCodingSystem *codingSystem;
  StringC specId;		// specified id
  StringC baseId;		// id that specified id is relative to
  enum Records {
    find,
    cr,
    lf,
    crlf,
    asis
    };
  Records records;
  PackedBoolean notrack;
  PackedBoolean zapEof;		// zap a final Ctrl-Z
  PackedBoolean search;
  enum {
    encoding,
    bctf,
    special
  };
  char codingSystemType;
};


struct SP_API ParsedSystemId : public Vector<StorageObjectSpec> {
  ParsedSystemId();
  void unparse(const CharsetInfo &resultCharset, Boolean isNdata, StringC &result) const;
  struct SP_API Map {
    enum Type {
      catalogDocument,
      catalogPublic
    };
    Type type;
    StringC publicId;
    Map();
    Map(const Map&);
    ~Map();
    Map& operator=(const Map&);
  };
  Vector<Map> maps;
};

struct SP_API StorageObjectLocation {
  const StorageObjectSpec *storageObjectSpec;
  StringC actualStorageId;
  unsigned long lineNumber;
  unsigned long columnNumber;
  unsigned long byteIndex;
  unsigned long storageObjectOffset;
};

class SP_API ExtendEntityManager : public EntityManager {
public:
  virtual ~ExtendEntityManager();
  class SP_API CatalogManager {
  public:
    virtual ~CatalogManager();
    virtual ConstPtr<EntityCatalog>
      makeCatalog(StringC &systemId,
		  const CharsetInfo &docCharset,
		  ExtendEntityManager *,
		  Messenger &) const = 0;
    virtual Boolean mapCatalog(ParsedSystemId &systemId,
			       ExtendEntityManager *em,
			       Messenger &mgr) const = 0;
  };
  // Additional flags for open.
  enum { mayNotExist = 0100, isNdata = 0200 };
  virtual void registerStorageManager(StorageManager *) = 0;
  virtual void setCatalogManager(CatalogManager *) = 0;
  virtual Boolean expandSystemId(const StringC &,
				 const Location &,
				 Boolean isNdata,
				 const CharsetInfo &,
				 const StringC *mapCatalogPublic,
				 Messenger &,
				 StringC &) = 0;
  virtual Boolean mergeSystemIds(const Vector<StringC> &sysids,
				 Boolean mapCatalogDocument,
				 const CharsetInfo &,
				 Messenger &mgr,
				 StringC &) const = 0;
  virtual Boolean parseSystemId(const StringC &str,
				const CharsetInfo &docCharset,
				Boolean isNdata,
				const StorageObjectLocation *defLoc,
				Messenger &mgr,
				ParsedSystemId &parsedSysid) const = 0;
  static const ParsedSystemId *externalInfoParsedSystemId(const ExternalInfo *);
  static Boolean externalize(const ExternalInfo *,
			     Offset,
			     StorageObjectLocation &);
  static ExtendEntityManager *make(StorageManager *,
				   const InputCodingSystem *,
				   const ConstPtr<InputCodingSystemKit> &,
				   Boolean internalCharsetIsDocCharset);
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ExtendEntityManager_INCLUDED */
