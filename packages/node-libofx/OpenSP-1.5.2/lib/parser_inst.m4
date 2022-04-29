// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"

#ifdef SP_MANUAL_INST

#define SP_DEFINE_TEMPLATES
#include "Owner.h"
#include "CopyOwner.h"
#include "Vector.h"
#include "NCVector.h"
#include "Ptr.h"
#include "IList.h"
#include "IQueue.h"
#include "List.h"
#include "OwnerTable.h"
#include "PointerTable.h"
#include "HashTable.h"
#include "HashTableItemBase.h"
#include "StringOf.h"
#include "IListIter.h"
#include "ListIter.h"
#include "NamedResourceTable.h"
#undef SP_DEFINE_TEMPLATES

#include <stddef.h>
#include "Attribute.h"
#include "Attributed.h"
#include "CharsetDecl.h"
#include "ContentToken.h"
#include "Dtd.h"
#include "ElementType.h"
#include "Entity.h"
#include "EntityCatalog.h"
#include "EntityManager.h"
#include "EquivClass.h"
#include "Event.h"
#include "Hash.h"
#include "HashTable.h"
#include "HashTableItemBase.h"
#include "InputSource.h"
#include "LinkProcess.h"
#include "Lpd.h"
#include "LpdEntityRef.h"
#include "Markup.h"
#include "NamedResource.h"
#include "NamedTable.h"
#include "Named.h"
#include "NameToken.h"
#include "OpenElement.h"
#include "OutputState.h"
#include "Recognizer.h"
#include "Sd.h"
#include "SdText.h"
#include "SdFormalError.h"
#include "SrInfo.h"
#include "StringResource.h"
#include "Syntax.h"
#include "Text.h"
#include "Trie.h"
#include "Undo.h"
#include "Boolean.h"
#include "types.h"
#include "Id.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

__instantiate(Ptr<Entity>)
__instantiate(ConstPtr<Entity>)
__instantiate(Ptr<Notation>)
__instantiate(ConstPtr<Notation>)
__instantiate(Ptr<Recognizer>)
__instantiate(ConstPtr<Recognizer>)
__instantiate(Ptr<EntityOrigin>)
__instantiate(ConstPtr<EntityOrigin>)
__instantiate(Ptr<AttributeValue>)
__instantiate(ConstPtr<AttributeValue>)
__instantiate(Ptr<AttributeDefinitionList>)
__instantiate(ConstPtr<AttributeDefinitionList>)
__instantiate(Ptr<ElementDefinition>)
__instantiate(ConstPtr<ElementDefinition>)
__instantiate(Ptr<Dtd>)
__instantiate(ConstPtr<Dtd>)
__instantiate(Ptr<Sd>)
__instantiate(ConstPtr<Sd>)
__instantiate(Ptr<Syntax>)
__instantiate(ConstPtr<Syntax>)
__instantiate(Ptr<SourceLinkRuleResource>)
__instantiate(ConstPtr<SourceLinkRuleResource>)
__instantiate(Ptr<Lpd>)
__instantiate(ConstPtr<Lpd>)
__instantiate(Ptr<ComplexLpd>)
__instantiate(ConstPtr<ComplexLpd>)
__instantiate(CopyOwner<BlankTrie>)
__instantiate(CopyOwner<AttributeSemantics>)
__instantiate(CopyOwner<AttributeDefinition>)
__instantiate(CopyOwner<DeclaredValue>)
__instantiate(NCVector<Owner<ContentToken> >)
__instantiate(Vector<CopyOwner<AttributeDefinition> >)
__instantiate(NCVector<Owner<AttributeList> >)
__instantiate(Vector<AttributeList>)
__instantiate(`HashTableItem<StringC, int>')
__instantiate(`HashTable<StringC,int>')
__instantiate(`HashTableItem<StringC,Char>')
__instantiate(`HashTable<StringC,Char>')
__instantiate(IList<EquivClass>)
__instantiate(IList<InputSource>)
__instantiate(IList<OpenElement>)
__instantiate(IList<Event>)
__instantiate(IList<OutputStateLevel>)
__instantiate(IList<SdFormalError>)
__instantiate(IList<Undo>)
__instantiate(IQueue<MessageEvent>)
__instantiate(IQueue<Event>)
__instantiate(`OwnerTable<Named,StringC,Hash,NamedTableKeyFunction>')
__instantiate(`OwnerTableIter<Named,StringC,Hash,NamedTableKeyFunction>')
__instantiate(Owner<AndInfo>)
__instantiate(Owner<BlankTrie>)
__instantiate(Owner<EquivClass>)
__instantiate(Owner<ModelGroup>)
__instantiate(Owner<OpenElement>)
__instantiate(Owner<ContentToken>)
__instantiate(Owner<DeclaredValue>)
__instantiate(Owner<LeafContentToken>)
__instantiate(Owner<AttributeSemantics>)
__instantiate(Owner<CompiledModelGroup>)
__instantiate(Owner<AttributeDefinition>)
__instantiate(Owner<AttributeList>)
__instantiate(Owner<Trie>)
__instantiate(Owner<Markup>)
__instantiate(`PointerTableIter<Named*,StringC,Hash,NamedTableKeyFunction>')
__instantiate(`PointerTable<Named*,StringC,Hash,NamedTableKeyFunction>')
__instantiate(`PointerTable<Ptr<NamedResource>,StringC,Hash,NamedResourceKeyFunction>')
__instantiate(`PointerTableIter<Ptr<NamedResource>,StringC,Hash,NamedResourceKeyFunction>')
__instantiate(Vector<ConstPtr<Entity> >)
__instantiate(Vector<NameToken>)
__instantiate(Vector<CharsetDeclRange>)
__instantiate(Vector<CharsetDeclSection>)
__instantiate(Vector<Ptr<Dtd> >)
__instantiate(Vector<Attribute>)
__instantiate(Vector<TextItem>)
__instantiate(Vector<SdTextItem>)
__instantiate(Vector<MarkupItem>)
__instantiate(Vector<RankStem*>)
__instantiate(Vector<const RankStem*>)
__instantiate(Vector<Attributed*>)
__instantiate(Vector<ElementType*>)
__instantiate(Vector<const ElementType*>)
__instantiate(Vector<ConstPtr<Notation> >)
__instantiate(Vector<Ptr<NamedResource> >)
__instantiate(Vector<LastSet>)
__instantiate(Vector<ConstPtr<AttributeValue> >)
__instantiate(Vector<SrInfo>)
__instantiate(Vector<Named*>)
__instantiate(Vector<FirstSet>)
__instantiate(Vector<const AttributeList *>)
__instantiate(Vector<ConstPtr<ElementDefinition> >)
__instantiate(Vector<Text>)
__instantiate(Vector<Location>)
__instantiate(Vector<NamedResourceTable<Entity> >)
__instantiate(Vector<ContentModelAmbiguity>)
__instantiate(Vector<Transition>)
__instantiate(Vector<LeafContentToken*>)
__instantiate(Vector<size_t>)
 // we really just want to test if size_t == unsigned int
#if !defined(SIZEOF_SIZE_T) || !defined(SIZEOF_UNSIGNED_INT) || (SIZEOF_SIZE_T != SIZEOF_UNSIGNED_INT)
__instantiate(Vector<unsigned int>)
#endif

__instantiate(NamedTable<Id>)
__instantiate(NamedTableIter<Id>)
__instantiate(IListIter<EquivClass>)
__instantiate(IListIter<InputSource>)

__instantiate(NamedResourceTable<Notation>)
__instantiate(NamedResourceTable<Entity>)
__instantiate(NamedResourceTableIter<Entity>)
__instantiate(NamedResourceTableIter<Notation>)
__instantiate(ConstNamedResourceTableIter<Entity>)
__instantiate(ConstNamedResourceTableIter<Notation>)

__instantiate(Vector<IdLinkRule>)
__instantiate(Vector<ConstPtr<SourceLinkRuleResource> >)
__instantiate(Vector<Vector<ConstPtr<SourceLinkRuleResource> > >)
__instantiate(Vector<ResultElementSpec>)
__instantiate(Vector<ConstPtr<AttributeDefinitionList> >)
__instantiate(Vector<ConstPtr<Lpd> >)
__instantiate(Vector<LpdEntityRef *>)
__instantiate(`PointerTable<LpdEntityRef *, LpdEntityRef, LpdEntityRef, LpdEntityRef>')
__instantiate(`PointerTableIter<LpdEntityRef *, LpdEntityRef, LpdEntityRef, LpdEntityRef>')
__instantiate(`OwnerTable<LpdEntityRef, LpdEntityRef, LpdEntityRef, LpdEntityRef>')
__instantiate(`OwnerTableIter<LpdEntityRef, LpdEntityRef, LpdEntityRef, LpdEntityRef>')
__instantiate(IList<LinkProcessOpenElement>)

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MANUAL_INST */
