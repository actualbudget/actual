#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif


#ifdef SP_NAMESPACE
}
#endif
// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "config.h"

#ifdef SP_MANUAL_INST

#define SP_DEFINE_TEMPLATES
#include "Vector.h"
#include "PointerTable.h"
#include "OwnerTable.h"
#include "Vector.h"
#include "IQueue.h"
#include "Owner.h"
#undef SP_DEFINE_TEMPLATES

#include "StringSet.h"
#include "RastEventHandler.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef __DECCXX
#pragma define_template PointerTable<StringC *, StringC, Hash, StringSetKey>
#else
#ifdef __xlC__
#pragma define(PointerTable<StringC *, StringC, Hash, StringSetKey>)
#else
#ifdef SP_ANSI_CLASS_INST
template class PointerTable<StringC *, StringC, Hash, StringSetKey>;
#else
typedef PointerTable<StringC *, StringC, Hash, StringSetKey> Dummy_0;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template OwnerTable<StringC, StringC, Hash, StringSetKey>
#else
#ifdef __xlC__
#pragma define(OwnerTable<StringC, StringC, Hash, StringSetKey>)
#else
#ifdef SP_ANSI_CLASS_INST
template class OwnerTable<StringC, StringC, Hash, StringSetKey>;
#else
typedef OwnerTable<StringC, StringC, Hash, StringSetKey> Dummy_1;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<StringC *>
#else
#ifdef __xlC__
#pragma define(Vector<StringC *>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<StringC *>;
#else
typedef Vector<StringC *> Dummy_2;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<EndPrologEvent>
#else
#ifdef __xlC__
#pragma define(Owner<EndPrologEvent>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<EndPrologEvent>;
#else
typedef Owner<EndPrologEvent> Dummy_3;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template IQueue<LinkRulePi>
#else
#ifdef __xlC__
#pragma define(IQueue<LinkRulePi>)
#else
#ifdef SP_ANSI_CLASS_INST
template class IQueue<LinkRulePi>;
#else
typedef IQueue<LinkRulePi> Dummy_4;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Vector<Vector<size_t> >
#else
#ifdef __xlC__
#pragma define(Vector<Vector<size_t> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class Vector<Vector<size_t> >;
#else
typedef Vector<Vector<size_t> > Dummy_5;
#endif
#endif
#endif

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MANUAL_INST */
