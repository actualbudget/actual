#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif


#ifdef SP_NAMESPACE
}
#endif
// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#include "splib.h"

#ifdef SP_MANUAL_INST

#define SP_DEFINE_TEMPLATES
#include "Owner.h"
#include "CopyOwner.h"
#include "RangeMap.h"
#include "Ptr.h"
#include "StringOf.h"
#include "StringC.h"
#include "Vector.h"
#include "ISet.h"
#include "ISetIter.h"
#include "XcharMap.h"
#include "StringResource.h"
#include "SubstTable.h"
#include "CharMap.h"
#undef SP_DEFINE_TEMPLATES

#include "types.h"
#include "Location.h"
#include "Message.h"
#include "NamedResource.h"
#include "EntityManager.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef __DECCXX
#pragma define_template Ptr<InputSourceOrigin>
#else
#ifdef __xlC__
#pragma define(Ptr<InputSourceOrigin>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<InputSourceOrigin>;
#else
typedef Ptr<InputSourceOrigin> Dummy_0;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<InputSourceOrigin>
#else
#ifdef __xlC__
#pragma define(ConstPtr<InputSourceOrigin>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<InputSourceOrigin>;
#else
typedef ConstPtr<InputSourceOrigin> Dummy_1;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<Origin>
#else
#ifdef __xlC__
#pragma define(Ptr<Origin>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<Origin>;
#else
typedef Ptr<Origin> Dummy_2;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<Origin>
#else
#ifdef __xlC__
#pragma define(ConstPtr<Origin>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<Origin>;
#else
typedef ConstPtr<Origin> Dummy_3;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<SharedXcharMap<unsigned char> >
#else
#ifdef __xlC__
#pragma define(Ptr<SharedXcharMap<unsigned char> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<SharedXcharMap<unsigned char> >;
#else
typedef Ptr<SharedXcharMap<unsigned char> > Dummy_4;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<SharedXcharMap<unsigned char> >
#else
#ifdef __xlC__
#pragma define(ConstPtr<SharedXcharMap<unsigned char> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<SharedXcharMap<unsigned char> >;
#else
typedef ConstPtr<SharedXcharMap<unsigned char> > Dummy_5;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<SharedXcharMap<PackedBoolean> >
#else
#ifdef __xlC__
#pragma define(Ptr<SharedXcharMap<PackedBoolean> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<SharedXcharMap<PackedBoolean> >;
#else
typedef Ptr<SharedXcharMap<PackedBoolean> > Dummy_6;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<SharedXcharMap<PackedBoolean> >
#else
#ifdef __xlC__
#pragma define(ConstPtr<SharedXcharMap<PackedBoolean> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<SharedXcharMap<PackedBoolean> >;
#else
typedef ConstPtr<SharedXcharMap<PackedBoolean> > Dummy_7;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<SharedXcharMap<EquivCode> >
#else
#ifdef __xlC__
#pragma define(Ptr<SharedXcharMap<EquivCode> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<SharedXcharMap<EquivCode> >;
#else
typedef Ptr<SharedXcharMap<EquivCode> > Dummy_8;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<SharedXcharMap<EquivCode> >
#else
#ifdef __xlC__
#pragma define(ConstPtr<SharedXcharMap<EquivCode> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<SharedXcharMap<EquivCode> >;
#else
typedef ConstPtr<SharedXcharMap<EquivCode> > Dummy_9;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<StringResource<Char> >
#else
#ifdef __xlC__
#pragma define(Ptr<StringResource<Char> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<StringResource<Char> >;
#else
typedef Ptr<StringResource<Char> > Dummy_10;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<StringResource<Char> >
#else
#ifdef __xlC__
#pragma define(ConstPtr<StringResource<Char> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<StringResource<Char> >;
#else
typedef ConstPtr<StringResource<Char> > Dummy_11;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<NamedResource>
#else
#ifdef __xlC__
#pragma define(Ptr<NamedResource>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<NamedResource>;
#else
typedef Ptr<NamedResource> Dummy_12;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<NamedResource>
#else
#ifdef __xlC__
#pragma define(ConstPtr<NamedResource>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<NamedResource>;
#else
typedef ConstPtr<NamedResource> Dummy_13;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<EntityManager>
#else
#ifdef __xlC__
#pragma define(Ptr<EntityManager>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<EntityManager>;
#else
typedef Ptr<EntityManager> Dummy_14;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<EntityManager>
#else
#ifdef __xlC__
#pragma define(ConstPtr<EntityManager>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<EntityManager>;
#else
typedef ConstPtr<EntityManager> Dummy_15;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<EntityCatalog>
#else
#ifdef __xlC__
#pragma define(Ptr<EntityCatalog>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<EntityCatalog>;
#else
typedef Ptr<EntityCatalog> Dummy_16;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<EntityCatalog>
#else
#ifdef __xlC__
#pragma define(ConstPtr<EntityCatalog>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<EntityCatalog>;
#else
typedef ConstPtr<EntityCatalog> Dummy_17;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<MessageArg>
#else
#ifdef __xlC__
#pragma define(Owner<MessageArg>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<MessageArg>;
#else
typedef Owner<MessageArg> Dummy_18;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CopyOwner<MessageArg>
#else
#ifdef __xlC__
#pragma define(CopyOwner<MessageArg>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CopyOwner<MessageArg>;
#else
typedef CopyOwner<MessageArg> Dummy_19;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template String<Char>
#else
#ifdef __xlC__
#pragma define(String<Char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class String<Char>;
#else
typedef String<Char> Dummy_20;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<OpenElementInfo>
#else
#ifdef __xlC__
#pragma define(Vector<OpenElementInfo>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<OpenElementInfo>;
#else
typedef Vector<OpenElementInfo> Dummy_21;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<CopyOwner<MessageArg> >
#else
#ifdef __xlC__
#pragma define(Vector<CopyOwner<MessageArg> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<CopyOwner<MessageArg> >;
#else
typedef Vector<CopyOwner<MessageArg> > Dummy_22;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template SharedXcharMap<unsigned char>
#else
#ifdef __xlC__
#pragma define(SharedXcharMap<unsigned char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class SharedXcharMap<unsigned char>;
#else
typedef SharedXcharMap<unsigned char> Dummy_23;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template XcharMap<unsigned char>
#else
#ifdef __xlC__
#pragma define(XcharMap<unsigned char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class XcharMap<unsigned char>;
#else
typedef XcharMap<unsigned char> Dummy_24;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<RangeMapRange<WideChar,UnivChar> >
#else
#ifdef __xlC__
#pragma define(Vector<RangeMapRange<WideChar,UnivChar> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<RangeMapRange<WideChar,UnivChar> >;
#else
typedef Vector<RangeMapRange<WideChar,UnivChar> > Dummy_25;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template RangeMapIter<WideChar,UnivChar>
#else
#ifdef __xlC__
#pragma define(RangeMapIter<WideChar,UnivChar>)
#else
#ifdef SP_ANSI_CLASS_INST
template class RangeMapIter<WideChar,UnivChar>;
#else
typedef RangeMapIter<WideChar,UnivChar> Dummy_26;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template RangeMap<WideChar,UnivChar>
#else
#ifdef __xlC__
#pragma define(RangeMap<WideChar,UnivChar>)
#else
#ifdef SP_ANSI_CLASS_INST
template class RangeMap<WideChar,UnivChar>;
#else
typedef RangeMap<WideChar,UnivChar> Dummy_27;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<InputSourceOriginNamedCharRef>
#else
#ifdef __xlC__
#pragma define(Vector<InputSourceOriginNamedCharRef>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<InputSourceOriginNamedCharRef>;
#else
typedef Vector<InputSourceOriginNamedCharRef> Dummy_28;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<StringC>
#else
#ifdef __xlC__
#pragma define(Vector<StringC>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<StringC>;
#else
typedef Vector<StringC> Dummy_29;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<ExternalInfo>
#else
#ifdef __xlC__
#pragma define(Owner<ExternalInfo>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<ExternalInfo>;
#else
typedef Owner<ExternalInfo> Dummy_30;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ISet<Char>
#else
#ifdef __xlC__
#pragma define(ISet<Char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ISet<Char>;
#else
typedef ISet<Char> Dummy_31;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<ISetRange<Char> >
#else
#ifdef __xlC__
#pragma define(Vector<ISetRange<Char> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<ISetRange<Char> >;
#else
typedef Vector<ISetRange<Char> > Dummy_32;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ISet<WideChar>
#else
#ifdef __xlC__
#pragma define(ISet<WideChar>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ISet<WideChar>;
#else
typedef ISet<WideChar> Dummy_33;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ISetIter<Char>
#else
#ifdef __xlC__
#pragma define(ISetIter<Char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ISetIter<Char>;
#else
typedef ISetIter<Char> Dummy_34;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ISetIter<WideChar>
#else
#ifdef __xlC__
#pragma define(ISetIter<WideChar>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ISetIter<WideChar>;
#else
typedef ISetIter<WideChar> Dummy_35;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<ISetRange<WideChar> >
#else
#ifdef __xlC__
#pragma define(Vector<ISetRange<WideChar> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<ISetRange<WideChar> >;
#else
typedef Vector<ISetRange<WideChar> > Dummy_36;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template SharedXcharMap<PackedBoolean>
#else
#ifdef __xlC__
#pragma define(SharedXcharMap<PackedBoolean>)
#else
#ifdef SP_ANSI_CLASS_INST
template class SharedXcharMap<PackedBoolean>;
#else
typedef SharedXcharMap<PackedBoolean> Dummy_37;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template SharedXcharMap<EquivCode>
#else
#ifdef __xlC__
#pragma define(SharedXcharMap<EquivCode>)
#else
#ifdef SP_ANSI_CLASS_INST
template class SharedXcharMap<EquivCode>;
#else
typedef SharedXcharMap<EquivCode> Dummy_38;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template String<SyntaxChar>
#else
#ifdef __xlC__
#pragma define(String<SyntaxChar>)
#else
#ifdef SP_ANSI_CLASS_INST
template class String<SyntaxChar>;
#else
typedef String<SyntaxChar> Dummy_39;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template XcharMap<PackedBoolean>
#else
#ifdef __xlC__
#pragma define(XcharMap<PackedBoolean>)
#else
#ifdef SP_ANSI_CLASS_INST
template class XcharMap<PackedBoolean>;
#else
typedef XcharMap<PackedBoolean> Dummy_40;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template XcharMap<EquivCode>
#else
#ifdef __xlC__
#pragma define(XcharMap<EquivCode>)
#else
#ifdef SP_ANSI_CLASS_INST
template class XcharMap<EquivCode>;
#else
typedef XcharMap<EquivCode> Dummy_41;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<char>
#else
#ifdef __xlC__
#pragma define(Vector<char>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<char>;
#else
typedef Vector<char> Dummy_42;
#endif
#endif
#endif
#if defined(SP_HAVE_BOOL) && defined(SP_SIZEOF_BOOL_1)
#ifdef __DECCXX
#pragma define_template Vector<PackedBoolean>
#else
#ifdef __xlC__
#pragma define(Vector<PackedBoolean>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<PackedBoolean>;
#else
typedef Vector<PackedBoolean> Dummy_43;
#endif
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CharMap<Unsigned32>
#else
#ifdef __xlC__
#pragma define(CharMap<Unsigned32>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMap<Unsigned32>;
#else
typedef CharMap<Unsigned32> Dummy_44;
#endif
#endif
#endif
#ifdef SP_MULTI_BYTE
#ifdef __DECCXX
#pragma define_template CharMapPlane<Unsigned32>
#else
#ifdef __xlC__
#pragma define(CharMapPlane<Unsigned32>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMapPlane<Unsigned32>;
#else
typedef CharMapPlane<Unsigned32> Dummy_45;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CharMapPage<Unsigned32>
#else
#ifdef __xlC__
#pragma define(CharMapPage<Unsigned32>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMapPage<Unsigned32>;
#else
typedef CharMapPage<Unsigned32> Dummy_46;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CharMapColumn<Unsigned32>
#else
#ifdef __xlC__
#pragma define(CharMapColumn<Unsigned32>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMapColumn<Unsigned32>;
#else
typedef CharMapColumn<Unsigned32> Dummy_47;
#endif
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template CharMapResource<Unsigned32>
#else
#ifdef __xlC__
#pragma define(CharMapResource<Unsigned32>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMapResource<Unsigned32>;
#else
typedef CharMapResource<Unsigned32> Dummy_48;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Ptr<CharMapResource<Unsigned32> >
#else
#ifdef __xlC__
#pragma define(Ptr<CharMapResource<Unsigned32> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Ptr<CharMapResource<Unsigned32> >;
#else
typedef Ptr<CharMapResource<Unsigned32> > Dummy_49;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ConstPtr<CharMapResource<Unsigned32> >
#else
#ifdef __xlC__
#pragma define(ConstPtr<CharMapResource<Unsigned32> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class ConstPtr<CharMapResource<Unsigned32> >;
#else
typedef ConstPtr<CharMapResource<Unsigned32> > Dummy_50;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<SubstTable::Pair>
#else
#ifdef __xlC__
#pragma define(Vector<SubstTable::Pair>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<SubstTable::Pair>;
#else
typedef Vector<SubstTable::Pair> Dummy_51;
#endif
#endif
#endif

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MANUAL_INST */
