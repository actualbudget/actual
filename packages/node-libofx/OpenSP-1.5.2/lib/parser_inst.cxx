#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif


#ifdef SP_NAMESPACE
}
#endif
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

#ifdef __DECCXX
#pragma define_template Ptr<Entity>
#else
#ifdef __xlC__
#pragma define(Ptr<Entity>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<Entity>;
#else
typedef Ptr<Entity> Dummy_0;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<Entity>
#else
#ifdef __xlC__
#pragma define(ConstPtr<Entity>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<Entity>;
#else
typedef ConstPtr<Entity> Dummy_1;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<Notation>
#else
#ifdef __xlC__
#pragma define(Ptr<Notation>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<Notation>;
#else
typedef Ptr<Notation> Dummy_2;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<Notation>
#else
#ifdef __xlC__
#pragma define(ConstPtr<Notation>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<Notation>;
#else
typedef ConstPtr<Notation> Dummy_3;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<Recognizer>
#else
#ifdef __xlC__
#pragma define(Ptr<Recognizer>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<Recognizer>;
#else
typedef Ptr<Recognizer> Dummy_4;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<Recognizer>
#else
#ifdef __xlC__
#pragma define(ConstPtr<Recognizer>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<Recognizer>;
#else
typedef ConstPtr<Recognizer> Dummy_5;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<EntityOrigin>
#else
#ifdef __xlC__
#pragma define(Ptr<EntityOrigin>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<EntityOrigin>;
#else
typedef Ptr<EntityOrigin> Dummy_6;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<EntityOrigin>
#else
#ifdef __xlC__
#pragma define(ConstPtr<EntityOrigin>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<EntityOrigin>;
#else
typedef ConstPtr<EntityOrigin> Dummy_7;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<AttributeValue>
#else
#ifdef __xlC__
#pragma define(Ptr<AttributeValue>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<AttributeValue>;
#else
typedef Ptr<AttributeValue> Dummy_8;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<AttributeValue>
#else
#ifdef __xlC__
#pragma define(ConstPtr<AttributeValue>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<AttributeValue>;
#else
typedef ConstPtr<AttributeValue> Dummy_9;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<AttributeDefinitionList>
#else
#ifdef __xlC__
#pragma define(Ptr<AttributeDefinitionList>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<AttributeDefinitionList>;
#else
typedef Ptr<AttributeDefinitionList> Dummy_10;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<AttributeDefinitionList>
#else
#ifdef __xlC__
#pragma define(ConstPtr<AttributeDefinitionList>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<AttributeDefinitionList>;
#else
typedef ConstPtr<AttributeDefinitionList> Dummy_11;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<ElementDefinition>
#else
#ifdef __xlC__
#pragma define(Ptr<ElementDefinition>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<ElementDefinition>;
#else
typedef Ptr<ElementDefinition> Dummy_12;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<ElementDefinition>
#else
#ifdef __xlC__
#pragma define(ConstPtr<ElementDefinition>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<ElementDefinition>;
#else
typedef ConstPtr<ElementDefinition> Dummy_13;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<Dtd>
#else
#ifdef __xlC__
#pragma define(Ptr<Dtd>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<Dtd>;
#else
typedef Ptr<Dtd> Dummy_14;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<Dtd>
#else
#ifdef __xlC__
#pragma define(ConstPtr<Dtd>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<Dtd>;
#else
typedef ConstPtr<Dtd> Dummy_15;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<Sd>
#else
#ifdef __xlC__
#pragma define(Ptr<Sd>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<Sd>;
#else
typedef Ptr<Sd> Dummy_16;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<Sd>
#else
#ifdef __xlC__
#pragma define(ConstPtr<Sd>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<Sd>;
#else
typedef ConstPtr<Sd> Dummy_17;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<Syntax>
#else
#ifdef __xlC__
#pragma define(Ptr<Syntax>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<Syntax>;
#else
typedef Ptr<Syntax> Dummy_18;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<Syntax>
#else
#ifdef __xlC__
#pragma define(ConstPtr<Syntax>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<Syntax>;
#else
typedef ConstPtr<Syntax> Dummy_19;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<SourceLinkRuleResource>
#else
#ifdef __xlC__
#pragma define(Ptr<SourceLinkRuleResource>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<SourceLinkRuleResource>;
#else
typedef Ptr<SourceLinkRuleResource> Dummy_20;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<SourceLinkRuleResource>
#else
#ifdef __xlC__
#pragma define(ConstPtr<SourceLinkRuleResource>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<SourceLinkRuleResource>;
#else
typedef ConstPtr<SourceLinkRuleResource> Dummy_21;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<Lpd>
#else
#ifdef __xlC__
#pragma define(Ptr<Lpd>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<Lpd>;
#else
typedef Ptr<Lpd> Dummy_22;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<Lpd>
#else
#ifdef __xlC__
#pragma define(ConstPtr<Lpd>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<Lpd>;
#else
typedef ConstPtr<Lpd> Dummy_23;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<ComplexLpd>
#else
#ifdef __xlC__
#pragma define(Ptr<ComplexLpd>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<ComplexLpd>;
#else
typedef Ptr<ComplexLpd> Dummy_24;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<ComplexLpd>
#else
#ifdef __xlC__
#pragma define(ConstPtr<ComplexLpd>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<ComplexLpd>;
#else
typedef ConstPtr<ComplexLpd> Dummy_25;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CopyOwner<BlankTrie>
#else
#ifdef __xlC__
#pragma define(CopyOwner<BlankTrie>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CopyOwner<BlankTrie>;
#else
typedef CopyOwner<BlankTrie> Dummy_26;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CopyOwner<AttributeSemantics>
#else
#ifdef __xlC__
#pragma define(CopyOwner<AttributeSemantics>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CopyOwner<AttributeSemantics>;
#else
typedef CopyOwner<AttributeSemantics> Dummy_27;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CopyOwner<AttributeDefinition>
#else
#ifdef __xlC__
#pragma define(CopyOwner<AttributeDefinition>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CopyOwner<AttributeDefinition>;
#else
typedef CopyOwner<AttributeDefinition> Dummy_28;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CopyOwner<DeclaredValue>
#else
#ifdef __xlC__
#pragma define(CopyOwner<DeclaredValue>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CopyOwner<DeclaredValue>;
#else
typedef CopyOwner<DeclaredValue> Dummy_29;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template NCVector<Owner<ContentToken> >
#else
#ifdef __xlC__
#pragma define(NCVector<Owner<ContentToken> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class NCVector<Owner<ContentToken> >;
#else
typedef NCVector<Owner<ContentToken> > Dummy_30;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<CopyOwner<AttributeDefinition> >
#else
#ifdef __xlC__
#pragma define(Vector<CopyOwner<AttributeDefinition> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<CopyOwner<AttributeDefinition> >;
#else
typedef Vector<CopyOwner<AttributeDefinition> > Dummy_31;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template NCVector<Owner<AttributeList> >
#else
#ifdef __xlC__
#pragma define(NCVector<Owner<AttributeList> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class NCVector<Owner<AttributeList> >;
#else
typedef NCVector<Owner<AttributeList> > Dummy_32;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<AttributeList>
#else
#ifdef __xlC__
#pragma define(Vector<AttributeList>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<AttributeList>;
#else
typedef Vector<AttributeList> Dummy_33;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template HashTableItem<StringC, int>
#else
#ifdef __xlC__
#pragma define(HashTableItem<StringC, int>)
#else
#ifdef SP_ANSI_CLASS_INST
template class HashTableItem<StringC, int>;
#else
typedef HashTableItem<StringC, int> Dummy_34;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template HashTable<StringC,int>
#else
#ifdef __xlC__
#pragma define(HashTable<StringC,int>)
#else
#ifdef SP_ANSI_CLASS_INST
template class HashTable<StringC,int>;
#else
typedef HashTable<StringC,int> Dummy_35;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template HashTableItem<StringC,Char>
#else
#ifdef __xlC__
#pragma define(HashTableItem<StringC,Char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class HashTableItem<StringC,Char>;
#else
typedef HashTableItem<StringC,Char> Dummy_36;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template HashTable<StringC,Char>
#else
#ifdef __xlC__
#pragma define(HashTable<StringC,Char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class HashTable<StringC,Char>;
#else
typedef HashTable<StringC,Char> Dummy_37;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IList<EquivClass>
#else
#ifdef __xlC__
#pragma define(IList<EquivClass>)
#else
#ifdef SP_ANSI_CLASS_INST
template class IList<EquivClass>;
#else
typedef IList<EquivClass> Dummy_38;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IList<InputSource>
#else
#ifdef __xlC__
#pragma define(IList<InputSource>)
#else
#ifdef SP_ANSI_CLASS_INST
template class IList<InputSource>;
#else
typedef IList<InputSource> Dummy_39;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IList<OpenElement>
#else
#ifdef __xlC__
#pragma define(IList<OpenElement>)
#else
#ifdef SP_ANSI_CLASS_INST
template class IList<OpenElement>;
#else
typedef IList<OpenElement> Dummy_40;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IList<Event>
#else
#ifdef __xlC__
#pragma define(IList<Event>)
#else
#ifdef SP_ANSI_CLASS_INST
template class IList<Event>;
#else
typedef IList<Event> Dummy_41;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IList<OutputStateLevel>
#else
#ifdef __xlC__
#pragma define(IList<OutputStateLevel>)
#else
#ifdef SP_ANSI_CLASS_INST
template class IList<OutputStateLevel>;
#else
typedef IList<OutputStateLevel> Dummy_42;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IList<SdFormalError>
#else
#ifdef __xlC__
#pragma define(IList<SdFormalError>)
#else
#ifdef SP_ANSI_CLASS_INST
template class IList<SdFormalError>;
#else
typedef IList<SdFormalError> Dummy_43;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IList<Undo>
#else
#ifdef __xlC__
#pragma define(IList<Undo>)
#else
#ifdef SP_ANSI_CLASS_INST
template class IList<Undo>;
#else
typedef IList<Undo> Dummy_44;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IQueue<MessageEvent>
#else
#ifdef __xlC__
#pragma define(IQueue<MessageEvent>)
#else
#ifdef SP_ANSI_CLASS_INST
template class IQueue<MessageEvent>;
#else
typedef IQueue<MessageEvent> Dummy_45;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IQueue<Event>
#else
#ifdef __xlC__
#pragma define(IQueue<Event>)
#else
#ifdef SP_ANSI_CLASS_INST
template class IQueue<Event>;
#else
typedef IQueue<Event> Dummy_46;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template OwnerTable<Named,StringC,Hash,NamedTableKeyFunction>
#else
#ifdef __xlC__
#pragma define(OwnerTable<Named,StringC,Hash,NamedTableKeyFunction>)
#else
#ifdef SP_ANSI_CLASS_INST
template class OwnerTable<Named,StringC,Hash,NamedTableKeyFunction>;
#else
typedef OwnerTable<Named,StringC,Hash,NamedTableKeyFunction> Dummy_47;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template OwnerTableIter<Named,StringC,Hash,NamedTableKeyFunction>
#else
#ifdef __xlC__
#pragma define(OwnerTableIter<Named,StringC,Hash,NamedTableKeyFunction>)
#else
#ifdef SP_ANSI_CLASS_INST
template class OwnerTableIter<Named,StringC,Hash,NamedTableKeyFunction>;
#else
typedef OwnerTableIter<Named,StringC,Hash,NamedTableKeyFunction> Dummy_48;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<AndInfo>
#else
#ifdef __xlC__
#pragma define(Owner<AndInfo>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<AndInfo>;
#else
typedef Owner<AndInfo> Dummy_49;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<BlankTrie>
#else
#ifdef __xlC__
#pragma define(Owner<BlankTrie>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<BlankTrie>;
#else
typedef Owner<BlankTrie> Dummy_50;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<EquivClass>
#else
#ifdef __xlC__
#pragma define(Owner<EquivClass>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<EquivClass>;
#else
typedef Owner<EquivClass> Dummy_51;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<ModelGroup>
#else
#ifdef __xlC__
#pragma define(Owner<ModelGroup>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<ModelGroup>;
#else
typedef Owner<ModelGroup> Dummy_52;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<OpenElement>
#else
#ifdef __xlC__
#pragma define(Owner<OpenElement>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<OpenElement>;
#else
typedef Owner<OpenElement> Dummy_53;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<ContentToken>
#else
#ifdef __xlC__
#pragma define(Owner<ContentToken>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<ContentToken>;
#else
typedef Owner<ContentToken> Dummy_54;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<DeclaredValue>
#else
#ifdef __xlC__
#pragma define(Owner<DeclaredValue>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<DeclaredValue>;
#else
typedef Owner<DeclaredValue> Dummy_55;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<LeafContentToken>
#else
#ifdef __xlC__
#pragma define(Owner<LeafContentToken>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<LeafContentToken>;
#else
typedef Owner<LeafContentToken> Dummy_56;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<AttributeSemantics>
#else
#ifdef __xlC__
#pragma define(Owner<AttributeSemantics>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<AttributeSemantics>;
#else
typedef Owner<AttributeSemantics> Dummy_57;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<CompiledModelGroup>
#else
#ifdef __xlC__
#pragma define(Owner<CompiledModelGroup>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<CompiledModelGroup>;
#else
typedef Owner<CompiledModelGroup> Dummy_58;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<AttributeDefinition>
#else
#ifdef __xlC__
#pragma define(Owner<AttributeDefinition>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<AttributeDefinition>;
#else
typedef Owner<AttributeDefinition> Dummy_59;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<AttributeList>
#else
#ifdef __xlC__
#pragma define(Owner<AttributeList>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<AttributeList>;
#else
typedef Owner<AttributeList> Dummy_60;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<Trie>
#else
#ifdef __xlC__
#pragma define(Owner<Trie>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<Trie>;
#else
typedef Owner<Trie> Dummy_61;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<Markup>
#else
#ifdef __xlC__
#pragma define(Owner<Markup>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<Markup>;
#else
typedef Owner<Markup> Dummy_62;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template PointerTableIter<Named*,StringC,Hash,NamedTableKeyFunction>
#else
#ifdef __xlC__
#pragma define(PointerTableIter<Named*,StringC,Hash,NamedTableKeyFunction>)
#else
#ifdef SP_ANSI_CLASS_INST
template class PointerTableIter<Named*,StringC,Hash,NamedTableKeyFunction>;
#else
typedef PointerTableIter<Named*,StringC,Hash,NamedTableKeyFunction> Dummy_63;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template PointerTable<Named*,StringC,Hash,NamedTableKeyFunction>
#else
#ifdef __xlC__
#pragma define(PointerTable<Named*,StringC,Hash,NamedTableKeyFunction>)
#else
#ifdef SP_ANSI_CLASS_INST
template class PointerTable<Named*,StringC,Hash,NamedTableKeyFunction>;
#else
typedef PointerTable<Named*,StringC,Hash,NamedTableKeyFunction> Dummy_64;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template PointerTable<Ptr<NamedResource>,StringC,Hash,NamedResourceKeyFunction>
#else
#ifdef __xlC__
#pragma define(PointerTable<Ptr<NamedResource>,StringC,Hash,NamedResourceKeyFunction>)
#else
#ifdef SP_ANSI_CLASS_INST
template class PointerTable<Ptr<NamedResource>,StringC,Hash,NamedResourceKeyFunction>;
#else
typedef PointerTable<Ptr<NamedResource>,StringC,Hash,NamedResourceKeyFunction> Dummy_65;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template PointerTableIter<Ptr<NamedResource>,StringC,Hash,NamedResourceKeyFunction>
#else
#ifdef __xlC__
#pragma define(PointerTableIter<Ptr<NamedResource>,StringC,Hash,NamedResourceKeyFunction>)
#else
#ifdef SP_ANSI_CLASS_INST
template class PointerTableIter<Ptr<NamedResource>,StringC,Hash,NamedResourceKeyFunction>;
#else
typedef PointerTableIter<Ptr<NamedResource>,StringC,Hash,NamedResourceKeyFunction> Dummy_66;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<ConstPtr<Entity> >
#else
#ifdef __xlC__
#pragma define(Vector<ConstPtr<Entity> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<ConstPtr<Entity> >;
#else
typedef Vector<ConstPtr<Entity> > Dummy_67;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<NameToken>
#else
#ifdef __xlC__
#pragma define(Vector<NameToken>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<NameToken>;
#else
typedef Vector<NameToken> Dummy_68;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<CharsetDeclRange>
#else
#ifdef __xlC__
#pragma define(Vector<CharsetDeclRange>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<CharsetDeclRange>;
#else
typedef Vector<CharsetDeclRange> Dummy_69;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<CharsetDeclSection>
#else
#ifdef __xlC__
#pragma define(Vector<CharsetDeclSection>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<CharsetDeclSection>;
#else
typedef Vector<CharsetDeclSection> Dummy_70;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<Ptr<Dtd> >
#else
#ifdef __xlC__
#pragma define(Vector<Ptr<Dtd> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<Ptr<Dtd> >;
#else
typedef Vector<Ptr<Dtd> > Dummy_71;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<Attribute>
#else
#ifdef __xlC__
#pragma define(Vector<Attribute>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<Attribute>;
#else
typedef Vector<Attribute> Dummy_72;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<TextItem>
#else
#ifdef __xlC__
#pragma define(Vector<TextItem>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<TextItem>;
#else
typedef Vector<TextItem> Dummy_73;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<SdTextItem>
#else
#ifdef __xlC__
#pragma define(Vector<SdTextItem>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<SdTextItem>;
#else
typedef Vector<SdTextItem> Dummy_74;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<MarkupItem>
#else
#ifdef __xlC__
#pragma define(Vector<MarkupItem>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<MarkupItem>;
#else
typedef Vector<MarkupItem> Dummy_75;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<RankStem*>
#else
#ifdef __xlC__
#pragma define(Vector<RankStem*>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<RankStem*>;
#else
typedef Vector<RankStem*> Dummy_76;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<const RankStem*>
#else
#ifdef __xlC__
#pragma define(Vector<const RankStem*>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<const RankStem*>;
#else
typedef Vector<const RankStem*> Dummy_77;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<Attributed*>
#else
#ifdef __xlC__
#pragma define(Vector<Attributed*>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<Attributed*>;
#else
typedef Vector<Attributed*> Dummy_78;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<ElementType*>
#else
#ifdef __xlC__
#pragma define(Vector<ElementType*>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<ElementType*>;
#else
typedef Vector<ElementType*> Dummy_79;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<const ElementType*>
#else
#ifdef __xlC__
#pragma define(Vector<const ElementType*>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<const ElementType*>;
#else
typedef Vector<const ElementType*> Dummy_80;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<ConstPtr<Notation> >
#else
#ifdef __xlC__
#pragma define(Vector<ConstPtr<Notation> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<ConstPtr<Notation> >;
#else
typedef Vector<ConstPtr<Notation> > Dummy_81;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<Ptr<NamedResource> >
#else
#ifdef __xlC__
#pragma define(Vector<Ptr<NamedResource> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<Ptr<NamedResource> >;
#else
typedef Vector<Ptr<NamedResource> > Dummy_82;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<LastSet>
#else
#ifdef __xlC__
#pragma define(Vector<LastSet>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<LastSet>;
#else
typedef Vector<LastSet> Dummy_83;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<ConstPtr<AttributeValue> >
#else
#ifdef __xlC__
#pragma define(Vector<ConstPtr<AttributeValue> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<ConstPtr<AttributeValue> >;
#else
typedef Vector<ConstPtr<AttributeValue> > Dummy_84;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<SrInfo>
#else
#ifdef __xlC__
#pragma define(Vector<SrInfo>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<SrInfo>;
#else
typedef Vector<SrInfo> Dummy_85;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<Named*>
#else
#ifdef __xlC__
#pragma define(Vector<Named*>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<Named*>;
#else
typedef Vector<Named*> Dummy_86;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<FirstSet>
#else
#ifdef __xlC__
#pragma define(Vector<FirstSet>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<FirstSet>;
#else
typedef Vector<FirstSet> Dummy_87;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<const AttributeList *>
#else
#ifdef __xlC__
#pragma define(Vector<const AttributeList *>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<const AttributeList *>;
#else
typedef Vector<const AttributeList *> Dummy_88;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<ConstPtr<ElementDefinition> >
#else
#ifdef __xlC__
#pragma define(Vector<ConstPtr<ElementDefinition> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<ConstPtr<ElementDefinition> >;
#else
typedef Vector<ConstPtr<ElementDefinition> > Dummy_89;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<Text>
#else
#ifdef __xlC__
#pragma define(Vector<Text>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<Text>;
#else
typedef Vector<Text> Dummy_90;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<Location>
#else
#ifdef __xlC__
#pragma define(Vector<Location>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<Location>;
#else
typedef Vector<Location> Dummy_91;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<NamedResourceTable<Entity> >
#else
#ifdef __xlC__
#pragma define(Vector<NamedResourceTable<Entity> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<NamedResourceTable<Entity> >;
#else
typedef Vector<NamedResourceTable<Entity> > Dummy_92;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<ContentModelAmbiguity>
#else
#ifdef __xlC__
#pragma define(Vector<ContentModelAmbiguity>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<ContentModelAmbiguity>;
#else
typedef Vector<ContentModelAmbiguity> Dummy_93;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<Transition>
#else
#ifdef __xlC__
#pragma define(Vector<Transition>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<Transition>;
#else
typedef Vector<Transition> Dummy_94;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<LeafContentToken*>
#else
#ifdef __xlC__
#pragma define(Vector<LeafContentToken*>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<LeafContentToken*>;
#else
typedef Vector<LeafContentToken*> Dummy_95;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<size_t>
#else
#ifdef __xlC__
#pragma define(Vector<size_t>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<size_t>;
#else
typedef Vector<size_t> Dummy_96;
#endif
#endif
#endif
 // we really just want to test if size_t == unsigned int
#if !defined(SIZEOF_SIZE_T) || !defined(SIZEOF_UNSIGNED_INT) || (SIZEOF_SIZE_T != SIZEOF_UNSIGNED_INT)
#ifdef __DECCXX
#pragma define_template Vector<unsigned int>
#else
#ifdef __xlC__
#pragma define(Vector<unsigned int>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<unsigned int>;
#else
typedef Vector<unsigned int> Dummy_97;
#endif
#endif
#endif
#endif

#ifdef __DECCXX
#pragma define_template NamedTable<Id>
#else
#ifdef __xlC__
#pragma define(NamedTable<Id>)
#else
#ifdef SP_ANSI_CLASS_INST
template class NamedTable<Id>;
#else
typedef NamedTable<Id> Dummy_98;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template NamedTableIter<Id>
#else
#ifdef __xlC__
#pragma define(NamedTableIter<Id>)
#else
#ifdef SP_ANSI_CLASS_INST
template class NamedTableIter<Id>;
#else
typedef NamedTableIter<Id> Dummy_99;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IListIter<EquivClass>
#else
#ifdef __xlC__
#pragma define(IListIter<EquivClass>)
#else
#ifdef SP_ANSI_CLASS_INST
template class IListIter<EquivClass>;
#else
typedef IListIter<EquivClass> Dummy_100;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IListIter<InputSource>
#else
#ifdef __xlC__
#pragma define(IListIter<InputSource>)
#else
#ifdef SP_ANSI_CLASS_INST
template class IListIter<InputSource>;
#else
typedef IListIter<InputSource> Dummy_101;
#endif
#endif
#endif

#ifdef __DECCXX
#pragma define_template NamedResourceTable<Notation>
#else
#ifdef __xlC__
#pragma define(NamedResourceTable<Notation>)
#else
#ifdef SP_ANSI_CLASS_INST
template class NamedResourceTable<Notation>;
#else
typedef NamedResourceTable<Notation> Dummy_102;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template NamedResourceTable<Entity>
#else
#ifdef __xlC__
#pragma define(NamedResourceTable<Entity>)
#else
#ifdef SP_ANSI_CLASS_INST
template class NamedResourceTable<Entity>;
#else
typedef NamedResourceTable<Entity> Dummy_103;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template NamedResourceTableIter<Entity>
#else
#ifdef __xlC__
#pragma define(NamedResourceTableIter<Entity>)
#else
#ifdef SP_ANSI_CLASS_INST
template class NamedResourceTableIter<Entity>;
#else
typedef NamedResourceTableIter<Entity> Dummy_104;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template NamedResourceTableIter<Notation>
#else
#ifdef __xlC__
#pragma define(NamedResourceTableIter<Notation>)
#else
#ifdef SP_ANSI_CLASS_INST
template class NamedResourceTableIter<Notation>;
#else
typedef NamedResourceTableIter<Notation> Dummy_105;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstNamedResourceTableIter<Entity>
#else
#ifdef __xlC__
#pragma define(ConstNamedResourceTableIter<Entity>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstNamedResourceTableIter<Entity>;
#else
typedef ConstNamedResourceTableIter<Entity> Dummy_106;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstNamedResourceTableIter<Notation>
#else
#ifdef __xlC__
#pragma define(ConstNamedResourceTableIter<Notation>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstNamedResourceTableIter<Notation>;
#else
typedef ConstNamedResourceTableIter<Notation> Dummy_107;
#endif
#endif
#endif

#ifdef __DECCXX
#pragma define_template Vector<IdLinkRule>
#else
#ifdef __xlC__
#pragma define(Vector<IdLinkRule>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<IdLinkRule>;
#else
typedef Vector<IdLinkRule> Dummy_108;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<ConstPtr<SourceLinkRuleResource> >
#else
#ifdef __xlC__
#pragma define(Vector<ConstPtr<SourceLinkRuleResource> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<ConstPtr<SourceLinkRuleResource> >;
#else
typedef Vector<ConstPtr<SourceLinkRuleResource> > Dummy_109;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<Vector<ConstPtr<SourceLinkRuleResource> > >
#else
#ifdef __xlC__
#pragma define(Vector<Vector<ConstPtr<SourceLinkRuleResource> > >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<Vector<ConstPtr<SourceLinkRuleResource> > >;
#else
typedef Vector<Vector<ConstPtr<SourceLinkRuleResource> > > Dummy_110;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<ResultElementSpec>
#else
#ifdef __xlC__
#pragma define(Vector<ResultElementSpec>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<ResultElementSpec>;
#else
typedef Vector<ResultElementSpec> Dummy_111;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<ConstPtr<AttributeDefinitionList> >
#else
#ifdef __xlC__
#pragma define(Vector<ConstPtr<AttributeDefinitionList> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<ConstPtr<AttributeDefinitionList> >;
#else
typedef Vector<ConstPtr<AttributeDefinitionList> > Dummy_112;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<ConstPtr<Lpd> >
#else
#ifdef __xlC__
#pragma define(Vector<ConstPtr<Lpd> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<ConstPtr<Lpd> >;
#else
typedef Vector<ConstPtr<Lpd> > Dummy_113;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<LpdEntityRef *>
#else
#ifdef __xlC__
#pragma define(Vector<LpdEntityRef *>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<LpdEntityRef *>;
#else
typedef Vector<LpdEntityRef *> Dummy_114;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template PointerTable<LpdEntityRef *, LpdEntityRef, LpdEntityRef, LpdEntityRef>
#else
#ifdef __xlC__
#pragma define(PointerTable<LpdEntityRef *, LpdEntityRef, LpdEntityRef, LpdEntityRef>)
#else
#ifdef SP_ANSI_CLASS_INST
template class PointerTable<LpdEntityRef *, LpdEntityRef, LpdEntityRef, LpdEntityRef>;
#else
typedef PointerTable<LpdEntityRef *, LpdEntityRef, LpdEntityRef, LpdEntityRef> Dummy_115;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template PointerTableIter<LpdEntityRef *, LpdEntityRef, LpdEntityRef, LpdEntityRef>
#else
#ifdef __xlC__
#pragma define(PointerTableIter<LpdEntityRef *, LpdEntityRef, LpdEntityRef, LpdEntityRef>)
#else
#ifdef SP_ANSI_CLASS_INST
template class PointerTableIter<LpdEntityRef *, LpdEntityRef, LpdEntityRef, LpdEntityRef>;
#else
typedef PointerTableIter<LpdEntityRef *, LpdEntityRef, LpdEntityRef, LpdEntityRef> Dummy_116;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template OwnerTable<LpdEntityRef, LpdEntityRef, LpdEntityRef, LpdEntityRef>
#else
#ifdef __xlC__
#pragma define(OwnerTable<LpdEntityRef, LpdEntityRef, LpdEntityRef, LpdEntityRef>)
#else
#ifdef SP_ANSI_CLASS_INST
template class OwnerTable<LpdEntityRef, LpdEntityRef, LpdEntityRef, LpdEntityRef>;
#else
typedef OwnerTable<LpdEntityRef, LpdEntityRef, LpdEntityRef, LpdEntityRef> Dummy_117;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template OwnerTableIter<LpdEntityRef, LpdEntityRef, LpdEntityRef, LpdEntityRef>
#else
#ifdef __xlC__
#pragma define(OwnerTableIter<LpdEntityRef, LpdEntityRef, LpdEntityRef, LpdEntityRef>)
#else
#ifdef SP_ANSI_CLASS_INST
template class OwnerTableIter<LpdEntityRef, LpdEntityRef, LpdEntityRef, LpdEntityRef>;
#else
typedef OwnerTableIter<LpdEntityRef, LpdEntityRef, LpdEntityRef, LpdEntityRef> Dummy_118;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IList<LinkProcessOpenElement>
#else
#ifdef __xlC__
#pragma define(IList<LinkProcessOpenElement>)
#else
#ifdef SP_ANSI_CLASS_INST
template class IList<LinkProcessOpenElement>;
#else
typedef IList<LinkProcessOpenElement> Dummy_119;
#endif
#endif
#endif

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MANUAL_INST */
