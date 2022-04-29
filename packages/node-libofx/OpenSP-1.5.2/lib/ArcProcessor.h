// Copyright (c) 1996 James Clark, 2000 Matthias Clasen
// See the file COPYING for copying permission.

#ifndef ArcProcessor_INCLUDED
#define ArcProcessor_INCLUDED 1

#include "Event.h"
#include "ContentState.h"
#include "Id.h"
#include "NamedTable.h"
#include "Vector.h"
#include "ArcEngine.h"
#include "SgmlParser.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Allocator;

// Processor for a single architecture

class ArcProcessor : private ContentState, private AttributeContext {
public:
  struct MetaMap {
    MetaMap();
    void clear();
    const Attributed *attributed;
    unsigned suppressFlags;
    // #ARCCONT and #CONTENT are handled with a special index
    // list of indexes into element's attlist of architectural attributes
    Vector<unsigned> attMapFrom;
    // corresponding list of indexes in form's attlist
    Vector<unsigned> attMapTo;
    // corresponding list of pointers in the token maps
    Vector<size_t> attTokenMapBase;
    Vector<StringC> tokenMapFrom;
    Vector<StringC> tokenMapTo;
  };
  struct MetaMapCache {
    MetaMapCache();
    void clear();
    MetaMap map;
    enum { nNoSpec = 4 };
    // Prerequisites for this cached entry to be valid.
    // The cache is only valid if for each member of noSpec != -1
    // the attribute with that index was not specified (or current)
    unsigned noSpec[nNoSpec];
    unsigned suppressFlags;
    const AttributeList *linkAtts;
  };
  ArcProcessor();
  void setName(const StringC &, const Location &);
  void init(const EndPrologEvent &,
	    const ConstPtr<Sd> &,
	    const ConstPtr<Syntax> &,
	    const SgmlParser *parser,
	    Messenger *,
	    const Vector<StringC> &superName,
	    const NCVector<ArcProcessor> &arcProcessors,
	    ArcDirector &director,
	    const volatile sig_atomic_t *cancelPtr);
  // Return 0 if the content is needed, but wasn't supplied
  Boolean processStartElement(const StartElementEvent &,
			      const AttributeList *linkAttributes,
			      const Text *content,
			      Allocator &);
  void processEndElement(const EndElementEvent &,
			 Allocator &);
  // Return true if its architectural.
  Boolean processData();
  ConstPtr<Dtd> dtdPointer() const { return metaDtd_; }
  Boolean valid() const { return valid_; }
  void checkIdrefs();
  const StringC &name() const { return name_; }
  Boolean piDecl() const { return piDecl_; }
  EventHandler &docHandler() const { return *docHandler_; }
  void setPiDecl(const Location &loc, const StringC &attspecText, Index attspecIndex,
		 const ConstPtr<AttributeDefinitionList> &archPiAttributeDefs);
private:
  ArcProcessor(const ArcProcessor &); // undefined
  void operator=(const ArcProcessor &);	// undefined
  const Syntax &attributeSyntax() const;
  ConstPtr<Notation> getAttributeNotation(const StringC &,
					  const Location &);
  ConstPtr<Entity> getAttributeEntity(const StringC &,
				      const Location &);
  void noteCurrentAttribute(size_t, AttributeValue *);
  ConstPtr<AttributeValue> getCurrentAttribute(size_t) const;
  Boolean defineId(const StringC &, const Location &, Location &);
  void noteIdref(const StringC &, const Location &);
  Id *lookupCreateId(const StringC &);
  void dispatchMessage(const Message &);
  void dispatchMessage(Message &);
  void initMessage(Message &);
  const MetaMap &buildMetaMap(const ElementType *,
			      const Notation *,
			      const AttributeList &,
			      const AttributeList *linkAtts,
			      unsigned suppressFlags);
  void considerSupr(const AttributeList &atts,
		    const AttributeList *linkAtts,
		    unsigned &thisSuppressFlags,
		    unsigned &newSuppressFlags,
		    Boolean &inhibitCache,
		    unsigned &arcSuprIndex);
  void considerIgnD(const AttributeList &atts,
		    const AttributeList *linkAtts,
		    unsigned thisSuppressFlags,
		    unsigned &newSuppressFlags,
		    Boolean &inhibitCache,
		    unsigned &arcSuprIndex);
  const Attributed *considerForm(const AttributeList &atts,
				 const AttributeList *linkAtts,
				 const StringC &name,
				 Boolean isNotation,
				 unsigned thisSuppressFlags,
				 unsigned &newSuppressFlags,
				 Boolean &inhibitCache,
				 unsigned &arcFormIndex);
  const Attributed *autoForm(const AttributeList &atts,
			     const StringC &name,
			     Boolean isNotation,
			     unsigned thisSuppressFlags,
			     unsigned &newSuppressFlags,
			     Boolean &inhibitCache,
			     unsigned &idIndex);
  const Text *considerNamer(const AttributeList &atts,
			    Boolean &inhibitCache,
			    unsigned &arcNamerIndex);
  void buildAttributeMapRename(MetaMap &map,
			       const Text &rename,
			       const AttributeList &atts,
			       const AttributeList *linkAtts,
			       Vector<PackedBoolean> &attRenamed,
			       Vector<PackedBoolean> &attSubstituted,
                               Boolean isNotation);
  void buildAttributeMapRest(MetaMap &map,
			     const AttributeList &atts,
			     const AttributeList *linkAtts,
			     const Vector<PackedBoolean> &attRenamed);
  Boolean matchName(const StringC &name, const char *key);
  void split(const Text &text,
	     Char space,
	     Vector<StringC> &tokens,
	     Vector<size_t> &tokenPos);
  Boolean mapAttributes(const AttributeList &from,
			const AttributeList *fromLink,
			const Text *content,
			AttributeList &to,
			ConstPtr<AttributeValue> &arcContent,
			const MetaMap &map);
  void supportAttributes(const AttributeList &, Boolean piDecl);
  void processArcOpts(const AttributeList &atts, Boolean piDecl);
  void processArcQuant(const Text &);
  ConstPtr<Entity> makeDtdEntity(const Notation *);
  void mungeMetaDtd(Dtd &metaDtd, const Dtd &docDtd);
  Boolean mungeDataEntity(ExternalDataEntity &entity);
  void emitArcContent(const Text &text,
		      EventHandler &handler,
		      Allocator &allocator);

  Boolean valid_;
  StringC name_;
  Messenger *mgr_;
  ConstPtr<Dtd> docDtd_;
  Ptr<Dtd> metaDtd_;
  ConstPtr<Syntax> docSyntax_;
  ConstPtr<Syntax> metaSyntax_;
  ConstPtr<Sd> docSd_;
  enum ReservedName {
    rArcName,
    rArcPubid,
    rArcFormA,
    rArcNamrA,
    rArcSuprA,
    rArcIgnDA,
    rArcDocF,
    rArcSuprF,
    rArcBridF,
    rArcDataF,
    rArcAuto,
    rArcDTD,
    rArcDtdPubid,
    rArcDtdSysid,
    rArcQuant
  };
  enum { nReserve = rArcQuant + 1 };
  StringC supportAtts_[nReserve];
  const Text *supportAttsText_[nReserve];
  Boolean piDecl_;
  Location declLoc_;
  StringC piDeclAttspecText_;
  Index piDeclAttspecIndex_;
  ConstPtr<AttributeDefinitionList> archPiAttributeDefs_;
  Boolean arcDtdIsParam_;
  Boolean arcAuto_;
  Vector<StringC> arcOpts_;
  StringC rniContent_;
  StringC rniArcCont_;
  StringC rniDefault_;
  StringC rniMaptoken_;
  enum {
    isArc = 01,
    suppressForm = 02,
    suppressSupr = 04,
    ignoreData = 010,
    condIgnoreData = 020,
    // recovering from invalid data
    recoverData = 040
    };
  Vector<unsigned> openElementFlags_;
  AttributeList attributeList_;
  NCVector<Owner<MetaMapCache> > metaMapCache_;
  MetaMap noCacheMetaMap_;
  NamedTable<Id> idTable_;
  Vector<ConstPtr<AttributeValue> > currentAttributes_;
  ConstPtr<Notation> defaultNotation_;
  Boolean errorIdref_;
  ArcDirector *director_;
  EventHandler *docHandler_;
  Owner<EventHandler> ownEventHandler_;
  size_t docIndex_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ArcProcessor_INCLUDED */
