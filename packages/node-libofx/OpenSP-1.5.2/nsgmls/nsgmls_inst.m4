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

__instantiate(`PointerTable<StringC *, StringC, Hash, StringSetKey>')
__instantiate(`OwnerTable<StringC, StringC, Hash, StringSetKey>')
__instantiate(Vector<StringC *>)
__instantiate(Owner<EndPrologEvent>)
__instantiate(IQueue<LinkRulePi>)
__instantiate(Vector<Vector<size_t> >)

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MANUAL_INST */
