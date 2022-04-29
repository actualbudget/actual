// Copyright (c) 1994, 1995, 1996 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "CharsetInfo.h"
#include "MessageArg.h"
#include "CatalogMessages.h"
#include "SOEntityCatalog.h"
#include "EntityDecl.h"
#include "EntityCatalog.h"
#include "Message.h"
#include "StringC.h"
#include "types.h"
#include "HashTable.h"
#include "InputSource.h"
#include "Boolean.h"
#include "SubstTable.h"
#include "CatalogEntry.h"
#include "Vector.h"
#include "StorageManager.h"
#include "macros.h"
#include "ParserOptions.h"
#include "SgmlParser.h"
#include "DtdDeclEventHandler.h"
#include <stdio.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class CatalogParser;
class SOEntityCatalog;

class SOCatalogManagerImpl : public SOCatalogManager {
public:
  SOCatalogManagerImpl(const Vector<StringC> &sysids,
		       size_t nSysidsMustExist,
		       const CharsetInfo *sysidCharset,
		       const CharsetInfo *catalogCharset,
		       Boolean useDocCatalog);
  ConstPtr<EntityCatalog> makeCatalog(StringC &systemId,
				      const CharsetInfo &charset,
				      ExtendEntityManager *,
				      Messenger &) const;
  Boolean mapCatalog(ParsedSystemId &systemId,
		     ExtendEntityManager *em,
		     Messenger &mgr) const;
private:
  void addCatalogsForDocument(CatalogParser &parser,
			      StringC &sysid,
			      SOEntityCatalog *,
			      const CharsetInfo &charset,
			      Messenger &mgr) const;
  size_t nSystemCatalogsMustExist_;
  Vector<StringC> systemCatalogs_;
  const CharsetInfo *sysidCharset_;
  const CharsetInfo *catalogCharset_;
  Boolean useDocCatalog_;
};

class SOEntityCatalog : public EntityCatalog {
public:
  SOEntityCatalog(Ptr<ExtendEntityManager> em);
  typedef EntityDecl::DeclType DeclType;
  Boolean document(const CharsetInfo &, Messenger &, StringC &) const;
  Boolean sgmlDecl(const CharsetInfo &, Messenger &, const StringC &, StringC &) const;
  Boolean lookup(const EntityDecl &entity,
		 const Syntax &,
		 const CharsetInfo &,
		 Messenger &,
		 StringC &) const;
  Boolean lookupPublic(const StringC &,
		       const CharsetInfo &,
		       Messenger &,
		       StringC &) const;
  Boolean lookupChar(const StringC &,
                     const CharsetInfo &,
		     Messenger &,
		     UnivChar &) const;
  void addPublicId(StringC &publicId, StringC &systemId, const Location &,
		   Boolean override);
  void addDtdDecl(StringC &publicId, StringC &systemId, const Location &,
		   Boolean override);
  void addDelegate(StringC &prefix, StringC &systemId, const Location &,
		   Boolean override);
  void addSystemId(StringC &systemId, StringC &replSystemId, const Location &);
  void addName(StringC &name, DeclType, StringC &systemId, const Location &,
	       Boolean override);
  void setSgmlDecl(StringC &str, const Location &loc);
  void setDocument(StringC &str, const Location &loc);
  void setBase(const Location &loc);
  void endCatalog();
  const Ptr<ExtendEntityManager> &entityManager() {
    return em_;
  }
private:
  SOEntityCatalog(const SOEntityCatalog &);	// undefined
  void operator=(const SOEntityCatalog &);	// undefined

  Boolean expandCatalogSystemId(const StringC &str,
				const Location &loc,
				size_t baseNumber,
				Boolean isNdata,
				const CharsetInfo &charset,
				const StringC *lookupPublicId,
				Messenger &mgr,
				StringC &result) const;
  const CatalogEntry *
    findBestPublicEntry(const StringC &publicId, Boolean overrideOnly,
			const CharsetInfo &charset, Boolean &delegated) const;

  class Table {
  public:
    Table();
    const CatalogEntry *lookup(const StringC &, Boolean overrideOnly) const;
    const CatalogEntry *lookup(const StringC &key,
			       const SubstTable &substTable,
			       Boolean overrideOnly) const;
    void insert(const StringC &, const CatalogEntry &, Boolean override);
    size_t count() const;
  private:
    Table(const Table &);	// undefined
    void operator=(const Table &); // undefined
    // These are entries that are applicable when an explicit system id
    // was specified in the external identifier.
    HashTable<StringC,CatalogEntry> overrideEntries_;
    // This specifies the entries that should substitute for the
    // overrideEntries_ when an explicit system identifier was not specified.
    HashTable<StringC,CatalogEntry> normalEntries_;
  };

  Table publicIds_;
  Table delegates_;
  HashTable<StringC,CatalogEntry> dtdDecls_;
  static StringC dtdDeclSpec_;
  static Boolean dtdDeclRunning_;
  HashTable<StringC,CatalogEntry> systemIds_;
  Table names_[5];
  size_t catalogNumber_;
  Boolean haveSgmlDecl_;
  StringC sgmlDecl_;
  Location sgmlDeclLoc_;
  size_t sgmlDeclBaseNumber_;
  StringC document_;
  Boolean haveDocument_;
  Location documentLoc_;
  size_t documentBaseNumber_;
  Boolean haveCurrentBase_;
  Vector<Location> base_;
  Ptr<ExtendEntityManager> em_;
};

class CatalogParser : private Messenger {
public:
  CatalogParser(const CharsetInfo &);
  void parseCatalog(const StringC &sysid,
		    Boolean mustExist,
		    const CharsetInfo &sysidCharset,
		    const CharsetInfo &catalogCharset,
		    InputSourceOrigin *origin,
		    SOEntityCatalog *catalog,
		    Messenger &mgr);
public:
  // Since it's a return type, it has to be public to keep some 
  // (broken) compilers happy.
  enum Param {
    eofParam,
    literalParam,
    nameParam,
    percentParam
  };
private:
  enum {
    data,
    eof,
    nul,
    lit,
    lita,
    minus,
    s,
    min				// other minimum data characters
  };
  enum { minimumLiteral = 01 };

  Messenger &messenger() { return *this; }
  void dispatchMessage(Message &);
  void dispatchMessage(const Message &);
  void initMessage(Message &);
  void parsePublic();
  void parseDelegate();
  void parseDtddecl();
  void parseSystem();
  void parseNameMap(EntityDecl::DeclType declType);
  void parseOverride();
  Param parseParam(unsigned flags = 0);
  Boolean parseArg();
  void parseLiteral(Char delim, unsigned flags);
  void parseName();
  void skipComment();
  void upcase(StringC &);
  Boolean inLoop(const Location &loc);
  Boolean isMinimumData(Xchar c) {
    int cat = categoryTable_[c];
    return (cat == min || (cat == s && c != tab_)
	    || cat == minus || cat == lita);
  }
  Xchar get() { return in_->get(messenger()); }
  void unget() { in_->ungetToken(); }
  Messenger *mgr_;
  InputSource *in_;
  SOEntityCatalog *catalog_;
  StringC param_;
  Location paramLoc_;
  Char minus_;
  Char tab_;
  Char rs_;
  Char re_;
  Char space_;
  StringC publicKey_;
  StringC systemKey_;
  StringC entityKey_;
  StringC doctypeKey_;
  StringC linktypeKey_;
  StringC notationKey_;
  StringC overrideKey_;
  StringC sgmlDeclKey_;
  StringC documentKey_;
  StringC catalogKey_;
  StringC yesKey_;
  StringC noKey_;
  StringC baseKey_;
  StringC delegateKey_;
  StringC dtddeclKey_;
  StringC sgmlKey_;
  XcharMap<unsigned char> categoryTable_;
  SubstTable substTable_;
  Boolean override_;
};

ExtendEntityManager::CatalogManager *
SOCatalogManager::make(const Vector<StringC> &sysids,
		       size_t nSysidsMustExist,
		       const CharsetInfo *sysidCharset,
		       const CharsetInfo *catalogCharset,
		       Boolean useDocCatalog)
{
  return new SOCatalogManagerImpl(sysids,
				  nSysidsMustExist,
				  sysidCharset,
				  catalogCharset,
				  useDocCatalog);
}
		       
SOCatalogManagerImpl::SOCatalogManagerImpl(const Vector<StringC> &systemCatalogs,
					   size_t nSystemCatalogsMustExist,
					   const CharsetInfo *sysidCharset,
					   const CharsetInfo *catalogCharset,
					   Boolean useDocCatalog)
: systemCatalogs_(systemCatalogs),
  nSystemCatalogsMustExist_(nSystemCatalogsMustExist),
  sysidCharset_(sysidCharset),
  catalogCharset_(catalogCharset),
  useDocCatalog_(useDocCatalog)
{
}

Boolean SOCatalogManagerImpl::mapCatalog(ParsedSystemId &systemId,
					 ExtendEntityManager *em,
					 Messenger &mgr) const
{
  Vector<ParsedSystemId::Map> maps;
  systemId.maps.swap(maps);
  while (maps.size() > 0) {
    StringC catalogSystemId;
    systemId.unparse(*sysidCharset_, 0, catalogSystemId);
    SOEntityCatalog *catalog = new SOEntityCatalog(em);
    ConstPtr<EntityCatalog> deleter(catalog);
    CatalogParser parser(*catalogCharset_);
    parser.parseCatalog(catalogSystemId, 1, *sysidCharset_, *catalogCharset_,
			InputSourceOrigin::make(), catalog, mgr);
    // FIXME do catalog caching here
    StringC s;
    if (maps.back().type == ParsedSystemId::Map::catalogDocument) {
      if (!catalog->document(*sysidCharset_, mgr, s)) {
	mgr.message(CatalogMessages::noDocumentEntry,
		    StringMessageArg(catalogSystemId));
	return 0;
      }
    }
    else {
      ASSERT(maps.back().type == ParsedSystemId::Map::catalogPublic);
      if (!catalog->lookupPublic(maps.back().publicId, *sysidCharset_, mgr,
				 s)) {
	mgr.message(CatalogMessages::noPublicEntry,
		    StringMessageArg(maps.back().publicId),
		    StringMessageArg(catalogSystemId));
	return 0;
      }
    }
    ParsedSystemId tem;
    if (!em->parseSystemId(s, *sysidCharset_, 0, 0, mgr, tem))
      return 0;
    systemId = tem;
    maps.resize(maps.size() - 1);
    for (size_t i = 0; i < systemId.maps.size(); i++)
      maps.push_back(systemId.maps[i]);
    systemId.maps.clear();
  }
  return 1;
}

ConstPtr<EntityCatalog>
SOCatalogManagerImpl::makeCatalog(StringC &systemId,
				  const CharsetInfo &charset,
				  ExtendEntityManager *em,
				  Messenger &mgr) const
{
  SOEntityCatalog *entityCatalog = new SOEntityCatalog(em);
  CatalogParser parser(*catalogCharset_);
  size_t i;
  for (i = 0; i < nSystemCatalogsMustExist_; i++)
    parser.parseCatalog(systemCatalogs_[i], 1,
			*sysidCharset_, *catalogCharset_,
			InputSourceOrigin::make(), entityCatalog,
			mgr);
  if (useDocCatalog_)
    addCatalogsForDocument(parser, systemId, entityCatalog, charset, mgr);
  for (i = nSystemCatalogsMustExist_; i < systemCatalogs_.size(); i++)
    parser.parseCatalog(systemCatalogs_[i], 0,
			*sysidCharset_, *catalogCharset_,
			InputSourceOrigin::make(), entityCatalog,
			mgr);

  return entityCatalog;
}


void SOCatalogManagerImpl::addCatalogsForDocument(CatalogParser &parser,
						  StringC &sysid,
						  SOEntityCatalog *impl,
						  const CharsetInfo &charset,
						  Messenger &mgr) const
{
  ParsedSystemId v;
  if (!impl->entityManager()->parseSystemId(sysid, charset, 0, 0, mgr, v))
    return;
  if (v.maps.size() > 0) {
    if (v.maps[0].type == ParsedSystemId::Map::catalogDocument) {
      v.maps.erase(v.maps.begin(), v.maps.begin() + 1);
      StringC tem;
      v.unparse(charset, 0, tem);
      parser.parseCatalog(tem, 1, charset, *catalogCharset_,
			  InputSourceOrigin::make(), impl, mgr);
      if (!impl->document(charset, mgr, sysid)) {
	mgr.message(CatalogMessages::noDocumentEntry, StringMessageArg(tem));
	sysid.resize(0);
      }
    }
    return;
  }
  Vector<StringC> catalogs;
  size_t i;
  for (i = 0; i < v.size(); i++)
    if (v[i].storageManager->inheritable()) {
      ParsedSystemId catalogId;
      catalogId.resize(1);
      StorageObjectSpec &spec = catalogId.back();
      spec.storageManager = v[i].storageManager;
      spec.codingSystemType = v[i].codingSystemType;
      spec.codingSystemName = v[i].codingSystemName;
      spec.specId = spec.storageManager->idCharset()->execToDesc("catalog");
      spec.storageManager->resolveRelative(v[i].specId, spec.specId, 0);
      spec.baseId = v[i].baseId;
      spec.records = v[i].records;
      StringC tem;
      catalogId.unparse(charset, 0, tem);
      for (size_t j = 0; j < catalogs.size(); j++)
	if (tem == catalogs[j]) {
	  tem.resize(0);
	  break;
	}
      if (tem.size() > 0) {
	catalogs.resize(catalogs.size() + 1);
	tem.swap(catalogs.back());
      }
    }
  for (i = 0; i < catalogs.size(); i++)
    parser.parseCatalog(catalogs[i], 0, charset,
			*catalogCharset_, InputSourceOrigin::make(), impl,
			mgr);
}

SOEntityCatalog::SOEntityCatalog(Ptr<ExtendEntityManager> em)
: em_(em), catalogNumber_(0), haveSgmlDecl_(0), haveDocument_(0),
  haveCurrentBase_(0)
{
}

void SOEntityCatalog::endCatalog()
{
  catalogNumber_++;
  haveCurrentBase_ = 0;
}

Boolean SOEntityCatalog::expandCatalogSystemId(const StringC &str,
					       const Location &loc,
					       size_t baseNumber,
					       Boolean isNdata,
					       const CharsetInfo &charset,
					       const StringC *lookupPublicId,
					       Messenger &mgr,
					       StringC &result) const
{
  return em_->expandSystemId(str,
			     (baseNumber ? base_[baseNumber - 1] : loc),
			     isNdata,
			     charset,
			     lookupPublicId,
			     mgr,
			     result);
}

Boolean SOEntityCatalog::lookup(const EntityDecl &entity,
				const Syntax &syntax,
				const CharsetInfo &charset,
				Messenger &mgr,
				StringC &result) const
{
  const CatalogEntry *entry = 0;
  const CatalogEntry *delegatedEntry = 0;
  if (entity.systemIdPointer())
    entry = systemIds_.lookup(*entity.systemIdPointer());
  if (entity.publicIdPointer()) {
    const CatalogEntry *publicEntry;
    Boolean delegated;
    publicEntry = findBestPublicEntry(*entity.publicIdPointer(),
				      entity.systemIdPointer() != 0,
				      charset,
				      delegated);
    if (publicEntry && delegated)
      delegatedEntry = publicEntry;
    // match for system id has priority over match for public id in same
    // catalog
    if (publicEntry
	&& (!entry || publicEntry->catalogNumber < entry->catalogNumber))
      entry = publicEntry;
  }
  if (entity.name().size() > 0
      && (!entry || entry->catalogNumber > 0)) {
    const CatalogEntry *entityEntry; 
    int tableIndex = (entity.declType() >= EntityDecl::parameterEntity
		      ? int(entity.declType()) - 1
		      : int(entity.declType()));
    StringC name(entity.name());
    Boolean subst;
    switch (entity.declType()) {
    case EntityDecl::parameterEntity:
      {
	StringC tem(name);
	name = syntax.peroDelim();
	name += tem;
      }
      // fall through
    case EntityDecl::generalEntity:
      subst = syntax.namecaseEntity();
      break;
    default:
      subst = syntax.namecaseGeneral();
      break;
    }
    if (!subst)
      entityEntry = names_[tableIndex].lookup(name,
					      entity.systemIdPointer() != 0);
    else
      entityEntry = names_[tableIndex].lookup(name,
					      syntax.upperSubstTable(),
					      entity.systemIdPointer() != 0);
    // match for public id has priority over match for entity in same
    // catalog
    if (entityEntry
	&& (!entry || entityEntry->catalogNumber < entry->catalogNumber))
      entry = entityEntry;
  }
  if (entry)
    return expandCatalogSystemId(entry->to,
				 entry->loc,
				 entry->baseNumber,
				 entity.dataType() == EntityDecl::ndata,
				 charset,
				 entry == delegatedEntry
				 ? entity.publicIdPointer()
				 : 0,
				 mgr,
				 result);
  if (entity.systemIdPointer())
    return em_->expandSystemId(*entity.systemIdPointer(),
			       entity.defLocation(),
			       entity.dataType() == EntityDecl::ndata,
			       charset,
			       0,
			       mgr,
			       result);
  return 0;
}

Boolean SOEntityCatalog::lookupPublic(const StringC &publicId,
				      const CharsetInfo &charset,
				      Messenger &mgr,
				      StringC &result) const
{
  Boolean delegated;
  const CatalogEntry *entry = findBestPublicEntry(publicId, 0, charset,
						  delegated);
  return (entry
	  && expandCatalogSystemId(entry->to, entry->loc, entry->baseNumber,
				   0, charset, delegated ? &publicId : 0,
				   mgr, result));
				 
}

Boolean SOEntityCatalog::lookupChar(const StringC &name,
				    const CharsetInfo &charset,
				    Messenger &mgr,
				    UnivChar &result) const
{
  Boolean delegated;
  const CatalogEntry *entry = findBestPublicEntry(name, 0, charset,
						  delegated);
  if (!entry)
    return 0;
  if (delegated)
    return 0;  // FIXME
  const StringC &number = entry->to;
  if (number.size() == 0)
    return 0;
  UnivChar n = 0;
  for (size_t i = 0; i < number.size(); i++) {
    int d = charset.digitWeight(number[i]);
    if (d < 0)
      return 0;
    if (n <= univCharMax/10 && (n *= 10) <= univCharMax - d)
      n += d;
  }
  result = n;
  return 1;
}

const CatalogEntry *
SOEntityCatalog::findBestPublicEntry(const StringC &publicId,
				     Boolean overrideOnly,
				     const CharsetInfo &charset,
				     Boolean &delegated) const
{
  Char slash = charset.execToDesc('/');
  Char colon = charset.execToDesc(':');
  const CatalogEntry *bestEntry = 0;
  for (size_t i = 0; i <= publicId.size(); i++) {
    if ((i + 1 < publicId.size()
	 && (publicId[i] == slash || publicId[i] == colon)
	 && publicId[i + 1] == publicId[i])
	|| (i >= 2
	    && (publicId[i - 1] == slash || publicId[i - 1] == colon)
	    && publicId[i - 2] == publicId[i - 1])) {
      StringC tem(publicId.data(), i);
      const CatalogEntry *entry = delegates_.lookup(tem, overrideOnly);
      if (entry
	  && (!bestEntry
	      || entry->catalogNumber <= bestEntry->catalogNumber)) {
	bestEntry = entry;
	delegated = 1;
      }
    }
  }
  const CatalogEntry *entry = publicIds_.lookup(publicId, overrideOnly);
  if (entry
      && (!bestEntry || entry->catalogNumber <= bestEntry->catalogNumber)) {
    bestEntry = entry;
    delegated = 0;
  }
  return bestEntry;
}


Boolean SOEntityCatalog::dtdDeclRunning_ = 0;
StringC SOEntityCatalog::dtdDeclSpec_;

Boolean SOEntityCatalog::sgmlDecl(const CharsetInfo &charset,
				  Messenger &mgr,
				  const StringC &sysid,
				  StringC &result) const

{
#if SP_DTDDECL
  if (dtdDeclRunning_) {
    result = dtdDeclSpec_;
    return 1;
  }
  HashTableIter<StringC,CatalogEntry> iter(dtdDecls_);
  const StringC *key;
  const CatalogEntry *entry;
  while (iter.next(key, entry)) {
    expandCatalogSystemId(entry->to, entry->loc, entry->baseNumber,
                          0, charset, 0, mgr, dtdDeclSpec_);
    ParserOptions options;
    SgmlParser::Params params;
    params.sysid = sysid;
    params.entityType = SgmlParser::Params::document;
    params.entityManager = em_.pointer(); 
    params.options = &options;
    SgmlParser parser(params);
    DtdDeclEventHandler eh(*key);  
    dtdDeclRunning_ = 1;
    parser.parseAll(eh, eh.cancelPtr());
    dtdDeclRunning_ = 0;
    if (eh.match()) {
      result = dtdDeclSpec_;
      return 1; 
    }
  }
#endif

  return haveSgmlDecl_ && expandCatalogSystemId(sgmlDecl_, sgmlDeclLoc_,
						sgmlDeclBaseNumber_,
						0, charset, 0, mgr, result);
}

Boolean SOEntityCatalog::document(const CharsetInfo &charset,
				  Messenger &mgr,
				  StringC &result) const

{
  return haveDocument_ && expandCatalogSystemId(document_, documentLoc_,
						documentBaseNumber_,
						0, charset, 0, mgr, result);
}

void SOEntityCatalog::addPublicId(StringC &publicId, StringC &systemId,
				  const Location &loc, Boolean override)
{
  CatalogEntry entry;
  entry.loc = loc;
  entry.catalogNumber = catalogNumber_;
  entry.baseNumber = haveCurrentBase_ ? base_.size() : 0;
  systemId.swap(entry.to);
  publicIds_.insert(publicId, entry, override);
}

void SOEntityCatalog::addDtdDecl(StringC &publicId, StringC &systemId,
				 const Location &loc, Boolean override)
{
  CatalogEntry entry;
  entry.loc = loc;
  entry.catalogNumber = catalogNumber_;
  entry.baseNumber = haveCurrentBase_ ? base_.size() : 0;
  systemId.swap(entry.to);
  dtdDecls_.insert(publicId, entry);
}

void SOEntityCatalog::addDelegate(StringC &prefix, StringC &systemId,
				  const Location &loc, Boolean override)
{
  CatalogEntry entry;
  entry.loc = loc;
  entry.catalogNumber = catalogNumber_;
  entry.baseNumber = haveCurrentBase_ ? base_.size() : 0;
  systemId.swap(entry.to);
  delegates_.insert(prefix, entry, override);
}

void SOEntityCatalog::addSystemId(StringC &systemId, StringC &toSystemId,
				  const Location &loc)
{
  CatalogEntry entry;
  entry.loc = loc;
  entry.catalogNumber = catalogNumber_;
  entry.baseNumber = haveCurrentBase_ ? base_.size() : 0;
  toSystemId.swap(entry.to);
  systemIds_.insert(systemId, entry, false);
}

void SOEntityCatalog::addName(StringC &name, DeclType declType,
			      StringC &systemId, const Location &loc,
			      Boolean override)
{
  CatalogEntry entry;
  entry.loc = loc;
  entry.catalogNumber = catalogNumber_;
  entry.baseNumber = haveCurrentBase_ ? base_.size() : 0;
  int tableIndex = (declType >= EntityDecl::parameterEntity
		    ? int(declType) - 1
		    : int(declType));
  entry.serial = names_[tableIndex].count();
  systemId.swap(entry.to);
  names_[tableIndex].insert(name, entry, override);
}

void SOEntityCatalog::setSgmlDecl(StringC &str, const Location &loc)
{
  if (!haveSgmlDecl_) {
    haveSgmlDecl_ = true;
    str.swap(sgmlDecl_);
    sgmlDeclLoc_ = loc;
    sgmlDeclBaseNumber_ = haveCurrentBase_ ? base_.size() : 0;

  }
}

void SOEntityCatalog::setDocument(StringC &str, const Location &loc)
{
  if (!haveDocument_) {
    haveDocument_ = true;
    str.swap(document_);
    documentLoc_ = loc;
    documentBaseNumber_ = haveCurrentBase_ ? base_.size() : 0;
  }
}

void SOEntityCatalog::setBase(const Location &loc)
{
  if (loc.origin().isNull())
    haveCurrentBase_ = 0;
  else {
    haveCurrentBase_ = 1;
    base_.push_back(loc);
  }
}

SOEntityCatalog::Table::Table()
{
}

void SOEntityCatalog::Table::insert(const StringC &key,
				    const CatalogEntry &entry,
				    Boolean override)
{
  if (override)
    overrideEntries_.insert(key, entry, false);
  else {
    const CatalogEntry *e = overrideEntries_.lookup(key);
    if (!e)
      normalEntries_.insert(key, entry, false);
  }
}

const CatalogEntry *SOEntityCatalog::Table::lookup(const StringC &key,
						   Boolean overrideOnly) const
{
  if (!overrideOnly) {
    const CatalogEntry *e = normalEntries_.lookup(key);
    if (e)
      return e;
  }
  return overrideEntries_.lookup(key);
}

const CatalogEntry *
SOEntityCatalog::Table::lookup(const StringC &name,
			       const SubstTable &substTable,
			       Boolean overrideOnly) const
{
  HashTableIter<StringC,CatalogEntry> iter1(overrideEntries_);
  HashTableIter<StringC,CatalogEntry> iter2(normalEntries_);
  HashTableIter<StringC,CatalogEntry> *iters[2];
  int nIter = 0;
  iters[nIter++] = &iter1;
  if (!overrideOnly)
    iters[nIter++] = &iter2;
  const CatalogEntry *entry = 0;
  for (int i = 0; i < nIter; i++) {
    HashTableIter<StringC,CatalogEntry> &iter = *iters[i];
    const StringC *key;
    const CatalogEntry *value;
    StringC buffer;
    while (iter.next(key, value)) {
      buffer = *key;
      substTable.subst(buffer);
      if (buffer == name) {
	if (!entry || value->serial < entry->serial)
	  entry = value;
      }
    }
  }
  return entry;
}

size_t SOEntityCatalog::Table::count() const
{
  return normalEntries_.count() + overrideEntries_.count();
}

CatalogParser::CatalogParser(const CharsetInfo &charset)
: categoryTable_(data),
  entityKey_(charset.execToDesc("ENTITY")),
  publicKey_(charset.execToDesc("PUBLIC")),
  systemKey_(charset.execToDesc("SYSTEM")),
  doctypeKey_(charset.execToDesc("DOCTYPE")),
  linktypeKey_(charset.execToDesc("LINKTYPE")),
  notationKey_(charset.execToDesc("NOTATION")),
  overrideKey_(charset.execToDesc("OVERRIDE")),
  sgmlDeclKey_(charset.execToDesc("SGMLDECL")),
  documentKey_(charset.execToDesc("DOCUMENT")),
  catalogKey_(charset.execToDesc("CATALOG")),
  yesKey_(charset.execToDesc("YES")),
  noKey_(charset.execToDesc("NO")),
  baseKey_(charset.execToDesc("BASE")),
  delegateKey_(charset.execToDesc("DELEGATE")),
  dtddeclKey_(charset.execToDesc("DTDDECL")),
  sgmlKey_(charset.execToDesc("SGML"))
{
  static const char lcletters[] = "abcdefghijklmnopqrstuvwxyz";
  static const char ucletters[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // minimum data other than lcletter, ucletter
  static const char minChars[] = "0123456789-.'()+,/:=?";
  static const char wwwMinChars[] = { 33, 35, 36, 37, 42, 59, 64, 95, 0 };
  static const char sChars[] = " \n\r\t";
  categoryTable_.setChar(0, nul);
  const char *p;
  const char *q;
  for (p = lcletters, q = ucletters; *p; p++, q++) {
    Char lc = charset.execToDesc(*p);
    Char uc = charset.execToDesc(*q);
    substTable_.addSubst(lc, uc);
    categoryTable_.setChar(lc, min);
    categoryTable_.setChar(uc, min);
  }
  for (p = sChars; *p; p++)
    categoryTable_.setChar(charset.execToDesc(*p), s);
  for (p = minChars; *p; p++)
    categoryTable_.setChar(charset.execToDesc(*p), min);
  for (p = wwwMinChars; *p; p++) {
    WideChar c;
    ISet<WideChar> set;
    if (charset.univToDesc(*p, c, set) > 0 && c <= charMax)
      categoryTable_.setChar(Char(c), min);
  }
  categoryTable_.setChar(charset.execToDesc('\''), lita);
  categoryTable_.setChar(charset.execToDesc('"'), lit);
  minus_ = charset.execToDesc('-');
  categoryTable_.setChar(minus_, minus);
  tab_ = charset.execToDesc('\t');
  re_ = charset.execToDesc('\r');
  rs_ = charset.execToDesc('\n');
  space_ = charset.execToDesc(' ');
  categoryTable_.setEe(eof);
}

void CatalogParser::parseCatalog(const StringC &sysid,
				 Boolean mustExist,
				 const CharsetInfo &sysidCharset,
				 const CharsetInfo &catalogCharset,
				 InputSourceOrigin *origin,
				 SOEntityCatalog *catalog,
				 Messenger &mgr)
{
  const Ptr<ExtendEntityManager> &em = catalog->entityManager();
  in_ = em->open(sysid, sysidCharset, origin,
		 mustExist ? 0 : ExtendEntityManager::mayNotExist, mgr);
  if (!in_)
    return;
  catalog_ = catalog;
  mgr_ = &mgr;
  override_ = 0;
  Boolean recovering = false;
  Vector<StringC> subSysids;
  Vector<Location> subSysidLocs;
  for (;;) {
    Param parm = parseParam();
    if (parm == nameParam) {
      upcase(param_);
      Boolean wasRecovering = recovering;
      recovering = false;
      if (param_ == publicKey_)
	parsePublic();
      else if (param_ == systemKey_)
	parseSystem();
      else if (param_ == entityKey_)
	parseNameMap(EntityDecl::generalEntity);
      else if (param_ == doctypeKey_)
	parseNameMap(EntityDecl::doctype);
      else if (param_ == linktypeKey_)
	parseNameMap(EntityDecl::linktype);
      else if (param_ == notationKey_)
	parseNameMap(EntityDecl::notation);
      else if (param_ == sgmlKey_)
	parseNameMap(EntityDecl::sgml);
      else if (param_ == sgmlDeclKey_) {
	if (parseArg())
	  catalog_->setSgmlDecl(param_, paramLoc_);
      }
      else if (param_ == documentKey_) {
	if (parseArg())
	  catalog_->setDocument(param_, paramLoc_);
      }
      else if (param_ == overrideKey_)
	parseOverride();
      else if (param_ == catalogKey_) {
	if (parseArg()) {
	  if (inLoop(paramLoc_))
	    break;
	  subSysids.resize(subSysids.size() + 1);
	  param_.swap(subSysids.back());
	  subSysidLocs.push_back(paramLoc_);
	}
      }
      else if (param_ == baseKey_) {
	if (parseArg()) {
	  StringC tem;
	  if (em->expandSystemId(param_,
				 paramLoc_,
				 0,
				 catalogCharset,
				 0,
				 mgr,
				 tem)) {
	    InputSource *in = em->open(tem,
				       catalogCharset,
				       InputSourceOrigin::make(paramLoc_),
				       0,
				       mgr);
	    if (in && (in->get(mgr) != InputSource::eE || !in->accessError()))
	      catalog->setBase(in->currentLocation());
	  }
	}
      }
      else if (param_ == delegateKey_)
	parseDelegate();
      else if (param_ == dtddeclKey_)
	parseDtddecl();
      else {
	if (!wasRecovering && parseParam() == eofParam)
	  break;
	recovering = true;
      }
    }
    else if (parm == eofParam)
      break;
    else if (!recovering) {
      recovering = true;
      message(CatalogMessages::nameExpected);
    }
  }
  delete in_;
  catalog->endCatalog();
  for (size_t i = 0; i < subSysids.size(); i++) {
    StringC tem;
    if (em->expandSystemId(subSysids[i], subSysidLocs[i], 0, catalogCharset,
			   0, mgr, tem))
      parseCatalog(tem, 1, catalogCharset, catalogCharset,
		   InputSourceOrigin::make(subSysidLocs[i]), catalog, mgr);
  }
}

Boolean CatalogParser::inLoop(const Location &loc)
{
  const InputSourceOrigin *origin = paramLoc_.origin()->asInputSourceOrigin();
  if (!origin)
    return 0;
  const ExternalInfo *info = origin->externalInfo();
  if (!info)
    return 0;
  StorageObjectLocation soLoc;
  if (!ExtendEntityManager::externalize(info,
					origin->startOffset(paramLoc_.index()),
					soLoc))
    return 0;
  for (;;) {
    const Location &parent = origin->parent();
    if (parent.origin().isNull())
      break;
    origin = parent.origin()->asInputSourceOrigin();
    if (!origin)
      break;
    const ExternalInfo *info1 = origin->externalInfo();
    if (info1) {
      StorageObjectLocation soLoc1;
      if (ExtendEntityManager::externalize(info1,
					   origin->startOffset(parent.index()),
					   soLoc1)) {
	if (soLoc.storageObjectSpec->storageManager
	    == soLoc1.storageObjectSpec->storageManager
	    && soLoc.actualStorageId == soLoc1.actualStorageId) {
	  setNextLocation(loc.origin()->parent());
	  message(CatalogMessages::inLoop);
	  return 1;
	}
      }
    }
  }
  return 0;
}

void CatalogParser::parseOverride()
{
  if (parseParam() != nameParam) {
    message(CatalogMessages::overrideYesOrNo);
    return;
  }
  upcase(param_);
  if (param_ == yesKey_)
    override_ = 1;
  else if (param_ == noKey_)
    override_ = 0;
  else
    message(CatalogMessages::overrideYesOrNo);
}

void CatalogParser::parsePublic()
{
  if (parseParam(minimumLiteral) != literalParam) {
    message(CatalogMessages::literalExpected);
    return;
  }
  StringC publicId;
  param_.swap(publicId);
  if (!parseArg())
    return;
  catalog_->addPublicId(publicId, param_, paramLoc_, override_);
}

void CatalogParser::parseDelegate()
{
  if (parseParam(minimumLiteral) != literalParam) {
    message(CatalogMessages::literalExpected);
    return;
  }
  StringC publicId;
  param_.swap(publicId);
  if (!parseArg())
    return;
  catalog_->addDelegate(publicId, param_, paramLoc_, override_);
}

void CatalogParser::parseDtddecl()
{
  if (parseParam(minimumLiteral) != literalParam) {
    message(CatalogMessages::literalExpected);
    return;
  }
  StringC publicId;
  param_.swap(publicId);
  if (!parseArg())
    return;
  catalog_->addDtdDecl(publicId, param_, paramLoc_, override_);
}

void CatalogParser::parseSystem()
{
  if (!parseArg())
    return;
  StringC systemId;
  param_.swap(systemId);
  Param parm = parseParam();
  if (parm == nameParam)
    message(CatalogMessages::systemShouldQuote);
  else if (parm != literalParam) {
    message(CatalogMessages::literalExpected);
    return;
  }
  catalog_->addSystemId(systemId, param_, paramLoc_);
}

void CatalogParser::parseNameMap(EntityDecl::DeclType declType)
{
  if (!parseArg())
    return;
  StringC name;
  param_.swap(name);
  if (!parseArg())
    return;
  catalog_->addName(name, declType, param_, paramLoc_, override_);
}

Boolean CatalogParser::parseArg()
{
  Param parm = parseParam();
  if (parm != nameParam && parm != literalParam) {
    message(CatalogMessages::nameOrLiteralExpected);
    return false;
  }
  return true;
}

CatalogParser::Param CatalogParser::parseParam(unsigned flags)
{
  for (;;) {
    Xchar c = get();
    switch (categoryTable_[c]) {
    case eof:
      return eofParam;
    case lit:
    case lita:
      parseLiteral(c, flags);
      return literalParam;
    case s:
      break;
    case nul:
      message(CatalogMessages::nulChar);
      break;
    case minus:
      c = get();
      if (c == minus_) {
	skipComment();
	break;
      }
      unget();
      // fall through
    default:
      parseName();
      return nameParam;
    }
  }
}

void CatalogParser::skipComment()
{
  for (;;) {
    Xchar c = get();
    if (c == minus_) {
      c = get();
      if (c == minus_)
	break;
    }
    if (c == InputSource::eE) {
      message(CatalogMessages::eofInComment);
      break;
    }
  }
}

void CatalogParser::parseLiteral(Char delim, unsigned flags)
{
  paramLoc_ = in_->currentLocation();
  enum { no, yesBegin, yesMiddle } skipping = yesBegin;
  param_.resize(0);
  for (;;) {
    Xchar c = get();
    if (c == InputSource::eE) {
      message(CatalogMessages::eofInLiteral);
      break;
    }
    if (Char(c) == delim)
      break;
    if (flags & minimumLiteral) {
      if (!isMinimumData(c))
	message(CatalogMessages::minimumData);
      if (c == rs_)
	;
      else if (c == space_ || c == re_) {
	if (skipping == no) {
	  param_ += space_;
	  skipping = yesMiddle;
	}
      }
      else {
	skipping = no;
	param_ += Char(c);
      }
    }
    else
      param_ += Char(c);
  }
  if (skipping == yesMiddle)
    param_.resize(param_.size() - 1);
}

void CatalogParser::parseName()
{
  paramLoc_ = in_->currentLocation();
  size_t length;
  for (length = 1;; length++) {
    Xchar c = in_->tokenChar(messenger());
    int cat = categoryTable_[c];
    if (cat == eof || cat == s)
      break;
    // FIXME maybe check for LIT or LITA
    if (cat == nul)
      message(CatalogMessages::nulChar);
  }
  in_->endToken(length);
  param_.assign(in_->currentTokenStart(), in_->currentTokenLength());
}

void CatalogParser::upcase(StringC &str)
{
  substTable_.subst(str);
}

void CatalogParser::dispatchMessage(const Message &msg)
{
  mgr_->dispatchMessage(msg);
}

void CatalogParser::dispatchMessage(Message &msg)
{
  mgr_->dispatchMessage(msg);
}

void CatalogParser::initMessage(Message &msg)
{
  msg.loc = in_->currentLocation();
}

#ifdef SP_NAMESPACE
}
#endif
