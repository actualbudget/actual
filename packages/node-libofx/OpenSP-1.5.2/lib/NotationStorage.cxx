// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "NotationStorage.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

NotationStorageManager::NotationStorageManager(const char *type)
: type_(type)
{
}

Boolean NotationStorageManager::inheritable() const
{
  return 0;
}

const char *NotationStorageManager::type() const
{
  return type_;
}

StorageObject *NotationStorageManager::makeStorageObject(const StringC &,
							 const StringC &,
							 Boolean,
							 Boolean,
							 Messenger &,
							 StringC &)
{
  return 0;
}

#ifdef SP_NAMESPACE
}
#endif
