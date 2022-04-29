#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif


#ifdef SP_NAMESPACE
}
#endif
// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#include "config.h"

#ifdef SP_MANUAL_INST

#define SP_DEFINE_TEMPLATES
#include "Owner.h"
#undef SP_DEFINE_TEMPLATES

#include "InputSource.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef __DECCXX
#pragma define_template Owner<InputSource>
#else
#ifdef __xlC__
#pragma define(Owner<InputSource>)
#else
#ifdef SP_ANSI_CLASS_INST
template class Owner<InputSource>;
#else
typedef Owner<InputSource> Dummy_0;
#endif
#endif
#endif

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MANUAL_INST */
