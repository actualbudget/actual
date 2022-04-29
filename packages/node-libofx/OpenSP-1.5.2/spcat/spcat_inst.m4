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

__instantiate(CharMapPage<unsigned int>)
__instantiate(ISet<unsigned int>)
__instantiate(ISet<unsigned short>)
__instantiate(`OwnerTable<HashTableItemBase<String<unsigned short> >, String<unsigned short>, Hash, HashTableKeyFunction<String<unsigned short> > >')
__instantiate(Ptr<CodingSystemKit>)
__instantiate(Ptr<EntityCatalog>)
__instantiate(Ptr<EntityManager>)
__instantiate(Ptr<ExtendEntityManager>)
__instantiate(Ptr<Origin>)
__instantiate(Ptr<SharedXcharMap<unsigned char> >)
__instantiate(String<unsigned short>)
__instantiate(Vector<CharsetDeclSection>)
__instantiate(`Vector<RangeMapRange<unsigned int, unsigned int> >')
__instantiate(Vector<String<unsigned short> >)
__instantiate(Vector<TextItem>)
__instantiate(Vector<char const *>)

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MANUAL_INST */
