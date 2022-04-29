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

__instantiate(Owner<InputSource>)

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_MANUAL_INST */
