#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif


#ifdef SP_NAMESPACE
}
#endif
// Copyright (c) 1994, 1995 James Clark
// See the file COPYING for copying permission.

#include "splib.h"

#ifdef SP_MANUAL_INST

#define SP_DEFINE_TEMPLATES
#include "StringOf.h"
#include "Vector.h"
#include "NCVector.h"
#include "ListIter.h"
#include "IList.h"
#include "List.h"
#include "Owner.h"
#include "OwnerTable.h"
#include "PointerTable.h"
#include "HashTableItemBase.h"
#include "HashTable.h"
#include "Ptr.h"
#include "CharMap.h"
#undef SP_DEFINE_TEMPLATES

#include "StorageManager.h"
#include "ExtendEntityManager.h"
#include "OffsetOrderedList.h"
#include "CodingSystem.h"
#include "CodingSystemKit.h"
#include "types.h"
#include "StringOf.h"
#include "DescriptorManager.h"
#include "StorageManager.h"
#include "Boolean.h"
#include "StorageObjectPosition.h"
#include "CatalogEntry.h"
#include "CharsetRegistry.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef __DECCXX
#pragma define_template String<char>
#else
#ifdef __xlC__
#pragma define(String<char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class String<char>;
#else
typedef String<char> Dummy_0;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template NCVector<Owner<StorageObject> >
#else
#ifdef __xlC__
#pragma define(NCVector<Owner<StorageObject> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class NCVector<Owner<StorageObject> >;
#else
typedef NCVector<Owner<StorageObject> > Dummy_1;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<StorageObjectSpec>
#else
#ifdef __xlC__
#pragma define(Vector<StorageObjectSpec>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<StorageObjectSpec>;
#else
typedef Vector<StorageObjectSpec> Dummy_2;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template NCVector<Owner<OffsetOrderedListBlock> >
#else
#ifdef __xlC__
#pragma define(NCVector<Owner<OffsetOrderedListBlock> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class NCVector<Owner<OffsetOrderedListBlock> >;
#else
typedef NCVector<Owner<OffsetOrderedListBlock> > Dummy_3;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template NCVector<StorageObjectPosition>
#else
#ifdef __xlC__
#pragma define(NCVector<StorageObjectPosition>)
#else
#ifdef SP_ANSI_CLASS_INST
template class NCVector<StorageObjectPosition>;
#else
typedef NCVector<StorageObjectPosition> Dummy_4;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IList<ListItem<DescriptorUser*> >
#else
#ifdef __xlC__
#pragma define(IList<ListItem<DescriptorUser*> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class IList<ListItem<DescriptorUser*> >;
#else
typedef IList<ListItem<DescriptorUser*> > Dummy_5;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template List<DescriptorUser*>
#else
#ifdef __xlC__
#pragma define(List<DescriptorUser*>)
#else
#ifdef SP_ANSI_CLASS_INST
template class List<DescriptorUser*>;
#else
typedef List<DescriptorUser*> Dummy_6;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ListIter<DescriptorUser *>
#else
#ifdef __xlC__
#pragma define(ListIter<DescriptorUser *>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ListIter<DescriptorUser *>;
#else
typedef ListIter<DescriptorUser *> Dummy_7;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ListItem<DescriptorUser *>
#else
#ifdef __xlC__
#pragma define(ListItem<DescriptorUser *>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ListItem<DescriptorUser *>;
#else
typedef ListItem<DescriptorUser *> Dummy_8;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IListIter<ListItem<DescriptorUser*> >
#else
#ifdef __xlC__
#pragma define(IListIter<ListItem<DescriptorUser*> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class IListIter<ListItem<DescriptorUser*> >;
#else
typedef IListIter<ListItem<DescriptorUser*> > Dummy_9;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<StorageObject>
#else
#ifdef __xlC__
#pragma define(Owner<StorageObject>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<StorageObject>;
#else
typedef Owner<StorageObject> Dummy_10;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<Decoder>
#else
#ifdef __xlC__
#pragma define(Owner<Decoder>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<Decoder>;
#else
typedef Owner<Decoder> Dummy_11;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<OffsetOrderedListBlock>
#else
#ifdef __xlC__
#pragma define(Owner<OffsetOrderedListBlock>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<OffsetOrderedListBlock>;
#else
typedef Owner<OffsetOrderedListBlock> Dummy_12;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<ExtendEntityManager::CatalogManager>
#else
#ifdef __xlC__
#pragma define(Owner<ExtendEntityManager::CatalogManager>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<ExtendEntityManager::CatalogManager>;
#else
typedef Owner<ExtendEntityManager::CatalogManager> Dummy_13;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<StorageManager>
#else
#ifdef __xlC__
#pragma define(Owner<StorageManager>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<StorageManager>;
#else
typedef Owner<StorageManager> Dummy_14;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template NCVector<Owner<StorageManager> >
#else
#ifdef __xlC__
#pragma define(NCVector<Owner<StorageManager> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class NCVector<Owner<StorageManager> >;
#else
typedef NCVector<Owner<StorageManager> > Dummy_15;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template HashTable<String<Char>,CatalogEntry>
#else
#ifdef __xlC__
#pragma define(HashTable<String<Char>,CatalogEntry>)
#else
#ifdef SP_ANSI_CLASS_INST
template class HashTable<String<Char>,CatalogEntry>;
#else
typedef HashTable<String<Char>,CatalogEntry> Dummy_16;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template HashTableIter<String<Char>,CatalogEntry>
#else
#ifdef __xlC__
#pragma define(HashTableIter<String<Char>,CatalogEntry>)
#else
#ifdef SP_ANSI_CLASS_INST
template class HashTableIter<String<Char>,CatalogEntry>;
#else
typedef HashTableIter<String<Char>,CatalogEntry> Dummy_17;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template HashTableItem<String<Char>,CatalogEntry>
#else
#ifdef __xlC__
#pragma define(HashTableItem<String<Char>,CatalogEntry>)
#else
#ifdef SP_ANSI_CLASS_INST
template class HashTableItem<String<Char>,CatalogEntry>;
#else
typedef HashTableItem<String<Char>,CatalogEntry> Dummy_18;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template HashTableItemBase<String<Char> >
#else
#ifdef __xlC__
#pragma define(HashTableItemBase<String<Char> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class HashTableItemBase<String<Char> >;
#else
typedef HashTableItemBase<String<Char> > Dummy_19;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template OwnerTable<HashTableItemBase<String<Char> >,String<Char>,Hash,HashTableKeyFunction<String<Char> > >
#else
#ifdef __xlC__
#pragma define(OwnerTable<HashTableItemBase<String<Char> >,String<Char>,Hash,HashTableKeyFunction<String<Char> > >)
#else
#ifdef SP_ANSI_CLASS_INST
template class OwnerTable<HashTableItemBase<String<Char> >,String<Char>,Hash,HashTableKeyFunction<String<Char> > >;
#else
typedef OwnerTable<HashTableItemBase<String<Char> >,String<Char>,Hash,HashTableKeyFunction<String<Char> > > Dummy_20;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CopyOwnerTable<HashTableItemBase<String<Char> >,String<Char>,Hash,HashTableKeyFunction<String<Char> > >
#else
#ifdef __xlC__
#pragma define(CopyOwnerTable<HashTableItemBase<String<Char> >,String<Char>,Hash,HashTableKeyFunction<String<Char> > >)
#else
#ifdef SP_ANSI_CLASS_INST
template class CopyOwnerTable<HashTableItemBase<String<Char> >,String<Char>,Hash,HashTableKeyFunction<String<Char> > >;
#else
typedef CopyOwnerTable<HashTableItemBase<String<Char> >,String<Char>,Hash,HashTableKeyFunction<String<Char> > > Dummy_21;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template OwnerTableIter<HashTableItemBase<String<Char> >, String<Char>, Hash, HashTableKeyFunction<String<Char> > >
#else
#ifdef __xlC__
#pragma define(OwnerTableIter<HashTableItemBase<String<Char> >, String<Char>, Hash, HashTableKeyFunction<String<Char> > >)
#else
#ifdef SP_ANSI_CLASS_INST
template class OwnerTableIter<HashTableItemBase<String<Char> >, String<Char>, Hash, HashTableKeyFunction<String<Char> > >;
#else
typedef OwnerTableIter<HashTableItemBase<String<Char> >, String<Char>, Hash, HashTableKeyFunction<String<Char> > > Dummy_22;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template PointerTable<HashTableItemBase<String<Char> >*,String<Char>,Hash,HashTableKeyFunction<String<Char> > >
#else
#ifdef __xlC__
#pragma define(PointerTable<HashTableItemBase<String<Char> >*,String<Char>,Hash,HashTableKeyFunction<String<Char> > >)
#else
#ifdef SP_ANSI_CLASS_INST
template class PointerTable<HashTableItemBase<String<Char> >*,String<Char>,Hash,HashTableKeyFunction<String<Char> > >;
#else
typedef PointerTable<HashTableItemBase<String<Char> >*,String<Char>,Hash,HashTableKeyFunction<String<Char> > > Dummy_23;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template PointerTableIter<HashTableItemBase<String<Char> > *, String<Char>, Hash, HashTableKeyFunction<String<Char> > >
#else
#ifdef __xlC__
#pragma define(PointerTableIter<HashTableItemBase<String<Char> > *, String<Char>, Hash, HashTableKeyFunction<String<Char> > >)
#else
#ifdef SP_ANSI_CLASS_INST
template class PointerTableIter<HashTableItemBase<String<Char> > *, String<Char>, Hash, HashTableKeyFunction<String<Char> > >;
#else
typedef PointerTableIter<HashTableItemBase<String<Char> > *, String<Char>, Hash, HashTableKeyFunction<String<Char> > > Dummy_24;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<HashTableItemBase<String<Char> >*>
#else
#ifdef __xlC__
#pragma define(Vector<HashTableItemBase<String<Char> >*>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<HashTableItemBase<String<Char> >*>;
#else
typedef Vector<HashTableItemBase<String<Char> >*> Dummy_25;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<ExtendEntityManager>
#else
#ifdef __xlC__
#pragma define(Ptr<ExtendEntityManager>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<ExtendEntityManager>;
#else
typedef Ptr<ExtendEntityManager> Dummy_26;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<ExtendEntityManager>
#else
#ifdef __xlC__
#pragma define(ConstPtr<ExtendEntityManager>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<ExtendEntityManager>;
#else
typedef ConstPtr<ExtendEntityManager> Dummy_27;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<ParsedSystemId::Map>
#else
#ifdef __xlC__
#pragma define(Vector<ParsedSystemId::Map>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<ParsedSystemId::Map>;
#else
typedef Vector<ParsedSystemId::Map> Dummy_28;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<InputCodingSystemKit>
#else
#ifdef __xlC__
#pragma define(ConstPtr<InputCodingSystemKit>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<InputCodingSystemKit>;
#else
typedef ConstPtr<InputCodingSystemKit> Dummy_29;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<InputCodingSystemKit>
#else
#ifdef __xlC__
#pragma define(Ptr<InputCodingSystemKit>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<InputCodingSystemKit>;
#else
typedef Ptr<InputCodingSystemKit> Dummy_30;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<CodingSystemKit>
#else
#ifdef __xlC__
#pragma define(ConstPtr<CodingSystemKit>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<CodingSystemKit>;
#else
typedef ConstPtr<CodingSystemKit> Dummy_31;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<CodingSystemKit>
#else
#ifdef __xlC__
#pragma define(Ptr<CodingSystemKit>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<CodingSystemKit>;
#else
typedef Ptr<CodingSystemKit> Dummy_32;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CharMap<Char>
#else
#ifdef __xlC__
#pragma define(CharMap<Char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMap<Char>;
#else
typedef CharMap<Char> Dummy_33;
#endif
#endif
#endif
#ifdef SP_MULTI_BYTE
#ifdef __DECCXX
#pragma define_template CharMapPlane<Char>
#else
#ifdef __xlC__
#pragma define(CharMapPlane<Char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMapPlane<Char>;
#else
typedef CharMapPlane<Char> Dummy_34;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CharMapPage<Char>
#else
#ifdef __xlC__
#pragma define(CharMapPage<Char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMapPage<Char>;
#else
typedef CharMapPage<Char> Dummy_35;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CharMapColumn<Char>
#else
#ifdef __xlC__
#pragma define(CharMapColumn<Char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMapColumn<Char>;
#else
typedef CharMapColumn<Char> Dummy_36;
#endif
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CharMapResource<Char>
#else
#ifdef __xlC__
#pragma define(CharMapResource<Char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMapResource<Char>;
#else
typedef CharMapResource<Char> Dummy_37;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<CharMapResource<Char> >
#else
#ifdef __xlC__
#pragma define(Ptr<CharMapResource<Char> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<CharMapResource<Char> >;
#else
typedef Ptr<CharMapResource<Char> > Dummy_38;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<CharMapResource<Char> >
#else
#ifdef __xlC__
#pragma define(ConstPtr<CharMapResource<Char> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<CharMapResource<Char> >;
#else
typedef ConstPtr<CharMapResource<Char> > Dummy_39;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<CharsetRegistry::Iter>
#else
#ifdef __xlC__
#pragma define(Owner<CharsetRegistry::Iter>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<CharsetRegistry::Iter>;
#else
typedef Owner<CharsetRegistry::Iter> Dummy_40;
#endif
#endif
#endif
#ifdef SP_MULTI_BYTE
#ifdef __DECCXX
#pragma define_template CharMap<unsigned char>
#else
#ifdef __xlC__
#pragma define(CharMap<unsigned char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMap<unsigned char>;
#else
typedef CharMap<unsigned char> Dummy_41;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CharMapPlane<unsigned char>
#else
#ifdef __xlC__
#pragma define(CharMapPlane<unsigned char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMapPlane<unsigned char>;
#else
typedef CharMapPlane<unsigned char> Dummy_42;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CharMapPage<unsigned char>
#else
#ifdef __xlC__
#pragma define(CharMapPage<unsigned char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMapPage<unsigned char>;
#else
typedef CharMapPage<unsigned char> Dummy_43;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CharMapColumn<unsigned char>
#else
#ifdef __xlC__
#pragma define(CharMapColumn<unsigned char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMapColumn<unsigned char>;
#else
typedef CharMapColumn<unsigned char> Dummy_44;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CharMapResource<unsigned char>
#else
#ifdef __xlC__
#pragma define(CharMapResource<unsigned char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMapResource<unsigned char>;
#else
typedef CharMapResource<unsigned char> Dummy_45;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<CharMapResource<unsigned char> >
#else
#ifdef __xlC__
#pragma define(Ptr<CharMapResource<unsigned char> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<CharMapResource<unsigned char> >;
#else
typedef Ptr<CharMapResource<unsigned char> > Dummy_46;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<CharMapResource<unsigned char> >
#else
#ifdef __xlC__
#pragma define(ConstPtr<CharMapResource<unsigned char> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<CharMapResource<unsigned char> >;
#else
typedef ConstPtr<CharMapResource<unsigned char> > Dummy_47;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template String<unsigned short>
#else
#ifdef __xlC__
#pragma define(String<unsigned short>)
#else
#ifdef SP_ANSI_CLASS_INST
template class String<unsigned short>;
#else
typedef String<unsigned short> Dummy_48;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template String<wchar_t>
#else
#ifdef __xlC__
#pragma define(String<wchar_t>)
#else
#ifdef SP_ANSI_CLASS_INST
template class String<wchar_t>;
#else
typedef String<wchar_t> Dummy_49;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<String<unsigned short> >
#else
#ifdef __xlC__
#pragma define(Vector<String<unsigned short> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<String<unsigned short> >;
#else
typedef Vector<String<unsigned short> > Dummy_50;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<CharMapResource<bool> >
#else
#ifdef __xlC__
#pragma define(Ptr<CharMapResource<bool> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<CharMapResource<bool> >;
#else
typedef Ptr<CharMapResource<bool> > Dummy_51;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<CharMapResource<unsigned short> >
#else
#ifdef __xlC__
#pragma define(Ptr<CharMapResource<unsigned short> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<CharMapResource<unsigned short> >;
#else
typedef Ptr<CharMapResource<unsigned short> > Dummy_52;
#endif
#endif
#endif
#endif

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MANUAL_INST */
