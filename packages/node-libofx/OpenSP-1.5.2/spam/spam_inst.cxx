#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif


#ifdef SP_NAMESPACE
}
#endif
// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#include "config.h"

#ifdef SP_MANUAL_INST

#define SP_DEFINE_TEMPLATES
#include "NCVector.h"
#undef SP_DEFINE_TEMPLATES

#include "CopyEventHandler.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef __DECCXX
#pragma define_template NCVector<CopyEventHandlerEntityInfo>
#else
#ifdef __xlC__
#pragma define(NCVector<CopyEventHandlerEntityInfo>)
#else
#ifdef SP_ANSI_CLASS_INST
template class NCVector<CopyEventHandlerEntityInfo>;
#else
typedef NCVector<CopyEventHandlerEntityInfo> Dummy_0;
#endif
#endif
#endif

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MANUAL_INST */
