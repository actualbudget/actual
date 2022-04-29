#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif


#ifdef SP_NAMESPACE
}
#endif
// Copyright (c) 1999 Brandon Ibach
// See the file COPYING for copying permission.

#include "config.h"

#ifdef SP_MANUAL_INST

#define SP_DEFINE_TEMPLATES
#include "CharMap.h"
#include "Hash.h"
#include "HashTable.h"
#include "HashTableItemBase.h"
#include "ISet.h"
#include "OwnerTable.h"
#include "Ptr.h"
#include "RangeMap.h"
#include "StringC.h"
#include "StringOf.h"
#include "Vector.h"
#include "XcharMap.h"
#undef SP_DEFINE_TEMPLATES

#include "CharsetDecl.h"
#include "CodingSystemKit.h"
#include "EntityCatalog.h"
#include "EntityManager.h"
#include "ExtendEntityManager.h"
#include "Text.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef __DECCXX
#pragma define_template CharMapPage<unsigned int>
#else
#ifdef __xlC__
#pragma define(CharMapPage<unsigned int>)
#else
#ifdef SP_ANSI_CLASS_INST
template class CharMapPage<unsigned int>;
#else
typedef CharMapPage<unsigned int> Dummy_0;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ISet<unsigned int>
#else
#ifdef __xlC__
#pragma define(ISet<unsigned int>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ISet<unsigned int>;
#else
typedef ISet<unsigned int> Dummy_1;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template ISet<unsigned short>
#else
#ifdef __xlC__
#pragma define(ISet<unsigned short>)
#else
#ifdef SP_ANSI_CLASS_INST
template class ISet<unsigned short>;
#else
typedef ISet<unsigned short> Dummy_2;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template OwnerTable<HashTableItemBase<String<unsigned short> >, String<unsigned short>, Hash, HashTableKeyFunction<String<unsigned short> > >
#else
#ifdef __xlC__
#pragma define(OwnerTable<HashTableItemBase<String<unsigned short> >, String<unsigned short>, Hash, HashTableKeyFunction<String<unsigned short> > >)
#else
#ifdef SP_ANSI_CLASS_INST
template class OwnerTable<HashTableItemBase<String<unsigned short> >, String<unsigned short>, Hash, HashTableKeyFunction<String<unsigned short> > >;
#else
typedef OwnerTable<HashTableItemBase<String<unsigned short> >, String<unsigned short>, Hash, HashTableKeyFunction<String<unsigned short> > > Dummy_3;
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
typedef Ptr<CodingSystemKit> Dummy_4;
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
typedef Ptr<EntityCatalog> Dummy_5;
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
typedef Ptr<EntityManager> Dummy_6;
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
typedef Ptr<ExtendEntityManager> Dummy_7;
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
typedef Ptr<Origin> Dummy_8;
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
typedef Ptr<SharedXcharMap<unsigned char> > Dummy_9;
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
typedef String<unsigned short> Dummy_10;
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
typedef Vector<CharsetDeclSection> Dummy_11;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<RangeMapRange<unsigned int, unsigned int> >
#else
#ifdef __xlC__
#pragma define(Vector<RangeMapRange<unsigned int, unsigned int> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<RangeMapRange<unsigned int, unsigned int> >;
#else
typedef Vector<RangeMapRange<unsigned int, unsigned int> > Dummy_12;
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
typedef Vector<String<unsigned short> > Dummy_13;
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
typedef Vector<TextItem> Dummy_14;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<char const *>
#else
#ifdef __xlC__
#pragma define(Vector<char const *>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<char const *>;
#else
typedef Vector<char const *> Dummy_15;
#endif
#endif
#endif

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MANUAL_INST */
