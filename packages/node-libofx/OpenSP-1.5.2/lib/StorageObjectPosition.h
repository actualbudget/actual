// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef StorageObjectPosition_INCLUDED
#define StorageObjectPosition_INCLUDED 1

#include "Boolean.h"
#include "types.h"
#include "Owner.h"
#include "CodingSystem.h"
#include <stddef.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct StorageObjectPosition {
  StorageObjectPosition();
  // the number of RSs preceding line 1 of this storage object
  // or -1 if this hasn't been computed yet.
  size_t line1RS;
  Owner<Decoder> decoder;
  // Does the storage object start with an RS?
  PackedBoolean startsWithRS;
  // Were the RSs other than the first in the storage object inserted?
  PackedBoolean insertedRSs;
  Offset endOffset;
  StringC id;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not StorageObjectPosition_INCLUDED */
