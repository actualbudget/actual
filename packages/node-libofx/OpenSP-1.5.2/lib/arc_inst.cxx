#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif


#ifdef SP_NAMESPACE
}
#endif
// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#include "splib.h"

#ifdef SP_MANUAL_INST

#define SP_DEFINE_TEMPLATES
#include "Vector.h"
#include "NCVector.h"
#include "Owner.h"
#undef SP_DEFINE_TEMPLATES

#include "ArcProcessor.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef __DECCXX
#pragma define_template NCVector<ArcProcessor>
#else
#ifdef __xlC__
#pragma define(NCVector<ArcProcessor>)
#else
#ifdef SP_ANSI_CLASS_INST
template class NCVector<ArcProcessor>;
#else
typedef NCVector<ArcProcessor> Dummy_0;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template Owner<ArcProcessor::MetaMapCache>
#else
#ifdef __xlC__
#pragma define(Owner<ArcProcessor::MetaMapCache>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<ArcProcessor::MetaMapCache>;
#else
typedef Owner<ArcProcessor::MetaMapCache> Dummy_1;
#endif
#endif
#endif
#ifdef __DECCXX
#pragma define_template NCVector<Owner<ArcProcessor::MetaMapCache> >
#else
#ifdef __xlC__
#pragma define(NCVector<Owner<ArcProcessor::MetaMapCache> >)
#else
#ifdef SP_ANSI_CLASS_INST
template class NCVector<Owner<ArcProcessor::MetaMapCache> >;
#else
typedef NCVector<Owner<ArcProcessor::MetaMapCache> > Dummy_2;
#endif
#endif
#endif

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MANUAL_INST */
